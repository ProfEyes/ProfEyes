import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Lock, Mail, User as UserIcon, Eye, EyeOff, KeyRound, AlertOctagon, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User } from "@/types/auth";
import { resizeImage, blobToFile } from "@/utils/imageUtils";

export function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordUpdateMode, setPasswordUpdateMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifyPasswordOpen, setIsVerifyPasswordOpen] = useState(false);
  const [isConfirmEmailOpen, setIsConfirmEmailOpen] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [emailToConfirm, setEmailToConfirm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actualPassword, setActualPassword] = useState<string>("");

  useEffect(() => {
    if (user) {
      // Inicializa o nome de usuário a partir do perfil ou metadados
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || null);
      
      // Inicializa a URL do avatar a partir do perfil ou metadados
      setAvatarUrl(user.user_metadata?.avatar_url || null);
      
      if (user.email) {
        setEmailToConfirm(user.email);
      }
      
      console.log("User metadata:", user.user_metadata);
    }
  }, [user]);

  useEffect(() => {
    const getPasswordFromStorage = async () => {
      // Em um ambiente real, isso seria obtido de forma segura
      // usando algum mecanismo de cache criptografado.
      // Para demonstração, estamos usando localStorage
      const storedPassword = localStorage.getItem('demo_password');
      if (storedPassword) {
        setActualPassword(storedPassword);
      } else {
        // Senha padrão para usuários que não têm uma senha armazenada
        setActualPassword("Senha@123");
        localStorage.setItem('demo_password', "Senha@123");
      }
    };
    
    getPasswordFromStorage();
  }, []);

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast.error(t('profile.error.needLogin') || "Você precisa estar logado para fazer upload de imagens");
      return null;
    }
    
    try {
      setUploading(true);
      
      // Cria um nome de arquivo único baseado no timestamp
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      
      console.log("Iniciando upload para:", fileName);
      
      // Redimensiona a imagem mantendo a proporção para 300x300 pixels
      const resizedImageBlob = await resizeImage(file, 300, 300, 0.8);
      const resizedFile = blobToFile(resizedImageBlob, fileName, file.type);
      
      // Faz upload para o bucket 'avatars' no Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .upload(fileName, resizedFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error("Erro no upload:", error);
        throw error;
      }
      
      console.log("Upload concluído:", data);
      
      // Obtém a URL pública do avatar
      const { data: urlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(data.path);
      
      console.log("URL pública:", urlData);
      
      // Atualiza o estado local com a nova URL
      setAvatarUrl(urlData.publicUrl);
      
      toast.success(t('profile.success.updated') || "Foto de perfil atualizada com sucesso!");
      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload do avatar:", error);
      toast.error(t('profile.error.updateFailed') || "Falha ao atualizar a foto de perfil. Tente novamente.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verifica o tipo do arquivo
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.error.invalidImage') || "Por favor, selecione uma imagem válida.");
      return;
    }
    
    // Verifica o tamanho do arquivo (10MB máximo para o upload inicial)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('profile.error.imageSize') || "A imagem deve ter menos de 10MB.");
      return;
    }
    
    // Faz upload do avatar (que já inclui o redimensionamento)
    const newAvatarUrl = await uploadAvatar(file);
    console.log("Nova URL do avatar:", newAvatarUrl);
    
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!user) {
      toast.error(t('profile.error.needLogin') || "Você precisa estar logado para salvar alterações");
      return;
    }
    
    try {
      setSaving(true);
      console.log("Salvando perfil com:", { name: userName, avatar_url: avatarUrl });
      
      // Salvar no localStorage para persistência local
      if (userName) {
        localStorage.setItem("user-name", userName);
      }
      
      if (avatarUrl) {
        localStorage.setItem("user-avatar", avatarUrl);
      }
      
      // Atualiza o perfil do usuário com o nome e avatar
      const { error } = await supabase.auth.updateUser({
        data: {
          name: userName,
          avatar_url: avatarUrl
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Disparar evento para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('profile-updated', { 
        detail: { name: userName, avatarUrl: avatarUrl }
      }));
      
      toast.success(t('profile.success.updated') || "Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(t('profile.error.updateFailed') || "Falha ao atualizar o perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Função para verificar senha atual
  const verifyPassword = async () => {
    if (!user?.email) return;
    
    try {
      setVerificationError("");
      
      // Verificação real da senha usando credenciais do Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: verificationPassword,
      });
      
      if (error) {
        console.error("Erro na verificação de senha:", error);
        setVerificationError("Senha incorreta. Tente novamente ou redefina sua senha.");
        return;
      }
      
      // Se a senha estiver correta, obtém a senha do usuário
      try {
        // Em ambiente real, você usaria uma API segura para obter a senha
        // Para fins de demonstração, simplesmente mostramos a senha que o usuário digitou
        // já que foi verificada corretamente pelo Supabase
        setActualPassword(verificationPassword);
        setShowPassword(true);
        setIsVerifyPasswordOpen(false);
        setVerificationPassword("");
        
        toast.success("Senha verificada com sucesso", {
          description: "Sua senha está sendo exibida",
        });
      } catch (fetchError) {
        console.error("Erro ao obter dados do usuário:", fetchError);
        setVerificationError("Ocorreu um erro ao buscar suas informações.");
      }
    } catch (error) {
      console.error("Erro ao verificar senha:", error);
      setVerificationError("Ocorreu um erro. Tente novamente mais tarde.");
    }
  };

  // Função para atualizar senha
  const updateUserPassword = async () => {
    if (!user || !newPassword || newPassword !== confirmPassword) return;
    
    try {
      setSaving(true);
      
      // Verifica a senha atual antes de alterar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      
      if (signInError) {
        toast.error("Senha atual incorreta", {
          description: "Por favor, verifique sua senha atual e tente novamente",
        });
        setSaving(false);
        return;
      }
      
      // Atualiza a senha com a API do Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      // Salvar a nova senha no localStorage para uso da função de verificação
      // Em ambiente real, isto não seria feito desta forma por questões de segurança
      localStorage.setItem('demo_password', newPassword);
      setActualPassword(newPassword);
      
      toast.success("Senha atualizada com sucesso!");
      setPasswordUpdateMode(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      toast.error("Falha ao atualizar senha. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Função para validar email
  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Função para redefinir senha
  const handleResetPassword = async () => {
    if (!emailToConfirm) return;
    
    // Valida formato do email
    if (!validateEmail(emailToConfirm)) {
      toast.error(t('profile.error.invalidEmailFormat') || "Formato de email inválido", {
        description: "Por favor, forneça um endereço de email válido",
      });
      return;
    }
    
    try {
      // Enviar email de redefinição usando Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(emailToConfirm, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) throw error;
      
      setIsConfirmEmailOpen(false);
      
      // Exibe uma notificação de sucesso com animação
      toast.custom((t) => (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`max-w-md w-full bg-black/95 shadow-lg rounded-lg pointer-events-auto flex overflow-hidden`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-10 w-10 rounded-full bg-black border border-white/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  Email enviado com sucesso
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Um link para redefinir sua senha foi enviado para {emailToConfirm}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/10">
            <button
              onClick={() => toast.dismiss(t)}
              className="w-full border border-transparent rounded-none rounded-r-lg flex items-center justify-center p-4 text-sm font-medium text-white/50 hover:text-white/80 focus:outline-none"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      ), { duration: 5000 });
    } catch (error) {
      console.error("Erro ao solicitar redefinição de senha:", error);
      toast.error(t('profile.error.resetPasswordFailed') || "Falha ao enviar email de redefinição", {
        description: "Ocorreu um erro. Tente novamente mais tarde.",
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-8"
    >
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Avatar className="h-24 w-24 border-[0.5px] border-white/[0.05] relative overflow-hidden bg-black/20">
              <AvatarImage
                src={avatarUrl || undefined}
                alt={userName || "Usuário"}
                className="object-cover"
              />
              <AvatarFallback className="bg-black/30 text-white/80 text-lg font-light">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            
            <Button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-black/40 hover:bg-black/60 border-[0.5px] border-white/[0.05] flex items-center justify-center"
              aria-label="Alterar foto de perfil"
            >
              {uploading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-white/80" />
              )}
            </Button>
          </div>
          
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            ref={fileInputRef}
            onChange={handleImageChange}
            aria-label="Alterar foto de perfil"
          />
        </div>
        
        <span className="text-xs text-white/40 mt-3 tracking-wide font-light">
          {uploading ? "Enviando imagem..." : "Clique no ícone para alterar sua foto"}
        </span>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label 
            htmlFor="name" 
            className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center"
          >
            <UserIcon className="h-3 w-3 mr-1.5 opacity-40" />
            {t('settings.account.displayName')}
          </label>
          
          <Input
            id="name"
            value={userName || ""}
            onChange={(e) => setUserName(e.target.value)}
            className="bg-black/20 border-[0.5px] border-white/[0.03] h-10 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-lg placeholder:text-white/20"
            placeholder="Seu nome de exibição"
          />
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="email" 
            className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center"
          >
            <Mail className="h-3 w-3 mr-1.5 opacity-40" />
            {t('settings.account.email')}
          </label>
          
          <Input
            id="email"
            type="email"
            value={user?.email || ""}
            disabled
            className="bg-black/10 border-[0.5px] border-white/[0.02] h-10 px-4 text-white/30 rounded-lg cursor-not-allowed"
          />
          <p className="text-[10px] text-white/30 flex items-center tracking-wide">
            <Lock className="h-2.5 w-2.5 mr-1 opacity-50" />
            {t('settings.account.emailFixed')}
          </p>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="password" 
            className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center"
          >
            <KeyRound className="h-3 w-3 mr-1.5 opacity-40" />
            {t('settings.account.password')}
          </label>
          
          <div className="relative">
            <div className={`flex items-center gap-3 ${passwordUpdateMode ? 'mb-4' : ''}`}>
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={passwordUpdateMode ? newPassword : showPassword ? actualPassword : "••••••••••"}
                  onChange={passwordUpdateMode ? (e) => setNewPassword(e.target.value) : undefined}
                  disabled={!passwordUpdateMode}
                  placeholder={passwordUpdateMode ? "Digite sua nova senha" : ""}
                  className={`
                    pr-10 bg-gradient-to-r 
                    ${passwordUpdateMode 
                      ? "from-black/20 to-black/30 border-white/[0.05] text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10" 
                      : showPassword 
                        ? "from-black/10 to-black/15 border-white/[0.02] text-white cursor-not-allowed font-medium" 
                        : "from-black/10 to-black/15 border-white/[0.02] text-white/30 cursor-not-allowed"
                    } 
                    border-[0.5px] h-11 px-4 rounded-lg transition-all duration-300
                  `}
                />
                <Button
                  type="button"
                  onClick={() => showPassword ? setShowPassword(false) : setIsVerifyPasswordOpen(true)}
                  className={`
                    absolute right-0 top-0 h-full px-3 rounded-r-lg
                    bg-transparent hover:bg-black/20 border-none 
                    transition-colors duration-200
                    ${showPassword ? "text-white/80" : "text-white/50 hover:text-white/70"}
                  `}
                  disabled={passwordUpdateMode}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button 
                onClick={() => {
                  if (passwordUpdateMode) {
                    // Chama a função que verifica a senha atual e atualiza para a nova
                    updateUserPassword();
                  } else {
                    setIsConfirmEmailOpen(true);
                  }
                }}
                className={`
                  h-11 px-4 rounded-lg transition-all duration-300 group
                  ${passwordUpdateMode
                    ? "bg-gradient-to-r from-black to-[#006400]/50 hover:from-black hover:to-[#006400]/70 text-white/80 border-[0.5px] border-[#006400]/20" 
                    : "bg-black/20 hover:bg-black/30 text-white/70 hover:text-white/90 border-[0.5px] border-white/[0.03]"
                  }
                `}
                disabled={passwordUpdateMode && (
                  !newPassword || 
                  !confirmPassword || 
                  !currentPassword || 
                  newPassword !== confirmPassword ||
                  newPassword.length < 8
                )}
              >
                <KeyRound className="h-3.5 w-3.5 mr-2 opacity-50 group-hover:opacity-70 transition-opacity" />
                <span className="text-xs tracking-wide">
                  {passwordUpdateMode ? "Salvar senha" : "Alterar senha"}
                </span>
              </Button>
            </div>
            
            {passwordUpdateMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Input
                  id="currentPassword"
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="bg-gradient-to-r from-black/20 to-black/30 border-[0.5px] border-white/[0.05] text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 h-11 px-4 rounded-lg transition-all duration-300 mt-3"
                />
                
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="bg-gradient-to-r from-black/20 to-black/30 border-[0.5px] border-white/[0.05] text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 h-11 px-4 rounded-lg transition-all duration-300"
                />
                
                <div className="rounded-lg bg-gradient-to-r from-black/30 to-black/20 border border-white/[0.03] p-3">
                  <div className="flex items-start space-x-3">
                    <div className="min-w-5 mt-0.5">
                      <div className="h-4 w-4 rounded-full bg-[#006400]/20 flex items-center justify-center">
                        <Lock className="h-2 w-2 text-[#006400]/80" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-white/70">Requisitos de senha:</p>
                      <ul className="text-[11px] text-white/50 space-y-1 list-disc pl-3">
                        <li>Mínimo de 8 caracteres</li>
                        <li>Pelo menos uma letra maiúscula</li>
                        <li>Pelo menos um número</li>
                        <li>Pelo menos um caractere especial</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {!passwordUpdateMode && (
              <p className="text-[10px] text-white/30 flex items-center tracking-wide mt-1">
                <Lock className="h-2.5 w-2.5 mr-1 opacity-50" />
                {t('settings.account.passwordProtected')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Botões finais da seção */}
      <div className="flex justify-between pt-4 pb-2">
        <Button
          onClick={() => handleSave()}
          disabled={saving}
          className="bg-black/20 hover:bg-black/40 hover:text-white text-white/90 border border-white/5 shadow-lg shadow-black/5 h-10 px-5 rounded-lg transition-all duration-300 flex items-center space-x-2"
        >
          {saving ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mr-2" />
          ) : null}
          <span>{saving ? t('profile.submit.saving') || "Salvando..." : t('profile.submit.save') || "Salvar alterações"}</span>
        </Button>
      </div>

      {/* Dialog de verificação de senha */}
      <Dialog open={isVerifyPasswordOpen} onOpenChange={setIsVerifyPasswordOpen}>
        <DialogContent className="bg-gradient-to-b from-black/95 to-black/90 border border-white/10 shadow-2xl backdrop-blur-sm sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-medium flex items-center">
              <div className="mr-3 bg-white/5 p-1.5 rounded-full">
                <Lock className="h-5 w-5 text-white/80" />
              </div>
              Verificar identidade
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm mt-1.5">
              Para visualizar sua senha, precisamos verificar sua identidade por motivos de segurança.
            </DialogDescription>
          </DialogHeader>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5 py-3"
          >
            <div className="space-y-3">
              <label className="text-xs text-white/80 font-medium">Digite sua senha atual</label>
              <div className="relative group">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha atual"
                  value={verificationPassword}
                  onChange={(e) => setVerificationPassword(e.target.value)}
                  className="bg-black/60 border-white/10 focus:border-white/30 focus:ring-white/10 text-white h-11 pr-10 transition-all duration-200 group-hover:bg-black/70 rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && verificationPassword.length > 0) {
                      verifyPassword();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 rounded-r-lg bg-transparent hover:bg-black/20 border-none text-white/50 hover:text-white/80 transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <AnimatePresence>
                {verificationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center text-red-500/90 text-xs mt-1 bg-red-500/10 p-2 rounded-lg"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    <span>{verificationError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="bg-white/5 rounded-lg border border-white/5 p-3">
              <div className="flex items-start">
                <div className="mt-0.5 mr-2.5">
                  <div className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-white/70" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/70 leading-relaxed">
                    Após verificar sua identidade, você poderá visualizar sua senha.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 mt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsVerifyPasswordOpen(false);
                setVerificationPassword("");
                setVerificationError("");
              }}
              className="h-10 bg-transparent hover:bg-white/5 text-white/70 border border-white/10 rounded-lg transition-all duration-200 w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={() => {
                setIsVerifyPasswordOpen(false);
                setIsConfirmEmailOpen(true);
              }}
              className="h-10 bg-transparent hover:bg-white/5 text-white/70 border border-white/10 rounded-lg transition-all duration-200 w-full sm:w-auto order-3 sm:order-2"
            >
              {t('settings.account.forgotPassword')}
            </Button>
            
            <Button
              onClick={verifyPassword}
              disabled={!verificationPassword}
              className={`
                h-10 rounded-lg transition-all duration-300 w-full sm:w-auto order-1 sm:order-3
                relative overflow-hidden group
                ${!verificationPassword 
                  ? "bg-black/50 text-white/40 border border-white/5 cursor-not-allowed" 
                  : "bg-black border border-white/10 hover:bg-white/5 text-white shadow-sm"
                }
              `}
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center">
                <Lock className="h-3.5 w-3.5 mr-2 opacity-80" />
                Verificar
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de confirmação de email */}
      <Dialog open={isConfirmEmailOpen} onOpenChange={setIsConfirmEmailOpen}>
        <DialogContent className="bg-gradient-to-b from-black/95 to-black/90 border border-white/10 shadow-2xl backdrop-blur-sm sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-medium flex items-center">
              <div className="mr-3 bg-white/5 p-1.5 rounded-full">
                <Mail className="h-5 w-5 text-white/80" />
              </div>
              Redefinir sua senha
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm mt-1.5">
              Enviaremos um link para redefinir sua senha para o email abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5 py-3"
          >
            <div className="space-y-3">
              <label className="text-xs text-white/80 font-medium flex items-center">
                <Mail className="h-3 w-3 mr-1.5 opacity-70" />
                Confirme seu email
              </label>
              <div className="relative group">
                <Input
                  type="email"
                  value={emailToConfirm}
                  onChange={(e) => setEmailToConfirm(e.target.value)}
                  className={`
                    bg-black/60 border-white/10 focus:border-white/30 focus:ring-white/10 
                    text-white h-11 px-4 transition-all duration-200 group-hover:bg-black/70 rounded-lg
                    ${!validateEmail(emailToConfirm) && emailToConfirm ? 'border-red-500/50 focus:border-red-500/50' : ''}
                  `}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && validateEmail(emailToConfirm)) {
                      handleResetPassword();
                    }
                  }}
                />
                
                {!validateEmail(emailToConfirm) && emailToConfirm && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500/80 text-[10px] mt-1 flex items-center absolute right-2 -bottom-5"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Formato de email inválido
                  </motion.div>
                )}
              </div>
            </div>
            
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="flex items-start">
                <div className="mt-0.5 mr-3 flex-shrink-0">
                  <div className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-white/70" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-white/80 leading-relaxed">
                    Um link de redefinição será enviado para este email. Verifique também sua pasta de spam.
                  </p>
                  <div className="flex items-center text-[11px] text-white/50">
                    <Lock className="h-3 w-3 mr-1.5 text-white/50" />
                    O link expirará após 24 horas por motivos de segurança
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 mt-2">
            <Button
              variant="ghost"
              onClick={() => setIsConfirmEmailOpen(false)}
              className="h-10 bg-transparent hover:bg-white/5 text-white/70 border border-white/10 rounded-lg transition-all duration-200 w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={handleResetPassword}
              disabled={!emailToConfirm || !validateEmail(emailToConfirm)}
              className={`
                h-10 rounded-lg transition-all duration-300 w-full sm:w-auto order-1 sm:order-2
                relative overflow-hidden group
                ${!emailToConfirm || !validateEmail(emailToConfirm)
                  ? "bg-black/50 text-white/40 border border-white/5 cursor-not-allowed" 
                  : "bg-black border border-white/10 hover:bg-white/5 text-white shadow-sm"
                }
              `}
            >
              <span className="relative flex items-center">
                <Mail className="h-3.5 w-3.5 mr-2 opacity-80" />
                Enviar link
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
} 
import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Camera, Lock, Mail, Save, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      // Inicializa o nome de usuário a partir do perfil ou metadados
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || null);
      
      // Inicializa a URL do avatar a partir do perfil ou metadados
      setAvatarUrl(user.user_metadata?.avatar_url || null);
      
      console.log("User metadata:", user.user_metadata);
    }
  }, [user]);

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast.error("Você precisa estar logado para fazer upload de imagens");
      return null;
    }
    
    try {
      setUploading(true);
      
      // Cria um nome de arquivo único baseado no ID do usuário
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;
      
      console.log("Iniciando upload para:", fileName);
      
      // Faz upload para o bucket 'avatars' no Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .upload(fileName, file, {
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
      
      toast.success("Foto de perfil atualizada com sucesso!");
      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload do avatar:", error);
      toast.error("Falha ao atualizar a foto de perfil. Tente novamente.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verifica o tipo e tamanho do arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error("A imagem deve ter menos de 5MB.");
      return;
    }
    
    // Faz upload do avatar
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
      toast.error("Você precisa estar logado para salvar alterações");
      return;
    }
    
    try {
      setSaving(true);
      console.log("Salvando perfil com:", { name: userName, avatar_url: avatarUrl });
      
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
      
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Falha ao atualizar o perfil. Tente novamente.");
    } finally {
      setSaving(false);
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
            <User className="h-3 w-3 mr-1.5 opacity-40" />
            Nome de exibição
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
            Email
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
            Esta informação não pode ser alterada
          </p>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-black/20 hover:bg-black/30 text-white/70 hover:text-white/90 border-[0.5px] border-white/[0.03] h-9 px-5 rounded-lg transition-all duration-300 group"
        >
          {saving ? (
            <>
              <div className="h-3.5 w-3.5 mr-2 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              <span className="text-xs tracking-wide">Salvando...</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-2 opacity-50 group-hover:opacity-70 transition-opacity" />
              <span className="text-xs tracking-wide">Salvar alterações</span>
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
} 
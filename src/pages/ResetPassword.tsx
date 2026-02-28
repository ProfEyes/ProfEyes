import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff, ArrowLeft, AlertCircle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { passwordResetService } from "@/services/passwordResetService";
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Estilo global para barras de rolagem elegantes
const GlobalScrollbarStyle = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    
    ::-webkit-scrollbar-track {
      background: transparent;
      margin: 3px;
    }
    
    ::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      border: none;
      transition: background-color 0.3s ease;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background-color: rgba(255, 255, 255, 0.15);
    }
    
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px rgba(0, 0, 0, 0.2) inset !important;
      -webkit-text-fill-color: rgba(255, 255, 255, 0.7) !important;
      caret-color: rgba(255, 255, 255, 0.7) !important;
      transition: background-color 5000s ease-in-out 0s;
      background-color: rgba(0, 0, 0, 0.2) !important;
    }
    
    input::selection {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
    
    input:focus {
      border-color: rgba(255, 255, 255, 0.1) !important;
      background-color: rgba(0, 0, 0, 0.25) !important;
      box-shadow: none !important;
      outline: none !important;
    }
  `}} />
);

interface ErrorType {
  field: string;
  message: string;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Estados do formulário
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorType | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);
  
  // Estados de validação
  const [passwordStrength, setPasswordStrength] = useState<{ isStrong: boolean; message: string } | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState<{ isMatch: boolean; message: string } | null>(null);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [showPasswordMatch, setShowPasswordMatch] = useState(false);
  
  // Refs
  const passwordRef = useRef<HTMLInputElement>(null);
  
  // Verificar e validar token na URL
  useEffect(() => {
    const validateToken = async () => {
      const code = searchParams.get('code');
      const type = searchParams.get('type');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      // Extrair código do path se existir (formato /reset-password/CODE)
      const pathParts = window.location.pathname.split('/');
      const pathCode = pathParts[pathParts.length - 1];
      
      const resetCode = code || (pathParts.length > 2 && pathCode !== 'reset-password' ? pathCode : null);
      
      console.log('Validando token de redefinição:', { code, type, resetCode, accessToken });
      
      if (!resetCode && !accessToken && type !== 'recovery') {
        console.error('Token de verificação não encontrado');
        setTokenValid(false);
        setCheckingToken(false);
        return;
      }
      
      try {
        // Se temos access_token e refresh_token, usar para autenticar
        if (accessToken && refreshToken) {
          const { data, error } = await (supabase as SupabaseClient<Database>).auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Erro ao definir sessão:', error);
            setTokenValid(false);
          } else {
            console.log('Sessão definida com sucesso para redefinição de senha');
            setTokenValid(true);
          }
        }
        // Se temos um código, verificar através da API
        else if (resetCode) {
          // Verificar se o código ainda é válido
          const { data, error } = await (supabase as SupabaseClient<Database>).auth.verifyOtp({
            token_hash: resetCode,
            type: 'recovery'
          });
          
          if (error) {
            console.error('Token inválido ou expirado:', error);
            setTokenValid(false);
          } else {
            console.log('Token válido para redefinição de senha');
            setTokenValid(true);
          }
        }
        // Se é recovery type mas sem código, também considerar válido
        else if (type === 'recovery') {
          setTokenValid(true);
        }
        else {
          setTokenValid(false);
        }
      } catch (error) {
        console.error('Erro ao validar token:', error);
        setTokenValid(false);
      } finally {
        setCheckingToken(false);
      }
    };
    
    validateToken();
  }, [searchParams]);
  
  // Limpar erro
  const clearError = () => {
    setError(null);
  };
  
  // Validar força da senha
  const validatePasswordStrength = (pwd: string) => {
    const minLength = pwd.length >= 8;
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasNumbers = /\d/.test(pwd);
    const hasNonalphas = /\W/.test(pwd);
    
    const score = [minLength, hasLowerCase, hasUpperCase, hasNumbers, hasNonalphas].filter(Boolean).length;
    
    let message = '';
    let isStrong = false;
    
    if (pwd.length === 0) {
      message = '';
      isStrong = false;
    } else if (score < 3) {
      message = 'Senha muito fraca. Use pelo menos 8 caracteres com letras, números e símbolos.';
      isStrong = false;
    } else if (score < 4) {
      message = 'Senha fraca. Adicione mais variedade de caracteres.';
      isStrong = false;
    } else {
      message = 'Senha forte!';
      isStrong = true;
    }
    
    setPasswordStrength({ isStrong, message });
    setShowPasswordValidation(pwd.length > 0);
  };
  
  // Validar se as senhas coincidem
  const validatePasswordMatch = () => {
    if (password && confirmPassword) {
      const isMatch = password === confirmPassword;
      setPasswordsMatch({
        isMatch,
        message: isMatch ? 'Senhas coincidem!' : 'As senhas não coincidem'
      });
      setShowPasswordMatch(true);
    } else {
      setPasswordsMatch(null);
      setShowPasswordMatch(false);
    }
  };
  
  // Atualizar senha
  const handleUpdatePassword = async () => {
    clearError();
    
    // Validar campos
    if (!password) {
      setError({ field: 'password', message: 'Por favor, informe sua nova senha' });
      passwordRef.current?.focus();
      return;
    }
    
    if (password !== confirmPassword) {
      setError({ field: 'confirmPassword', message: 'As senhas não coincidem' });
      return;
    }
    
    // Verificar força da senha
    if (!passwordStrength?.isStrong) {
      setError({ field: 'password', message: 'Por favor, use uma senha mais forte' });
      return;
    }
    
    try {
      setLoading(true);
      
      // Obter o token da URL
      const code = searchParams.get('code');
      const accessToken = searchParams.get('access_token');
      const pathParts = window.location.pathname.split('/');
      const pathCode = pathParts[pathParts.length - 1];
      const resetCode = code || (pathParts.length > 2 && pathCode !== 'reset-password' ? pathCode : null);
      
      // Verificar se o token ainda é válido antes de tentar usar
      if (resetCode) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tokenValid, error: tokenError } = await (supabase as SupabaseClient<Database>).rpc('is_password_reset_token_valid' as any, {
            token_hash_param: resetCode
          });
        
        if (tokenError || !tokenValid) {
          setError({ field: 'password', message: 'Este link de redefinição já foi usado ou expirou. Solicite um novo link.' });
          return;
        }
      }
      
      // Atualizar a senha usando o Supabase
      const { error } = await (supabase as SupabaseClient<Database>).auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      // Marcar o token como usado para evitar reutilização
      if (resetCode) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: markUsedError } = await (supabase as SupabaseClient<Database>).rpc('mark_password_reset_token_used' as any, {
              token_hash_param: resetCode
            });
          
          if (markUsedError) {
            console.warn('Erro ao marcar token como usado:', markUsedError);
            // Não falhar a operação por causa disso
          }
        } catch (markError) {
          console.warn('Erro ao marcar token como usado:', markError);
          // Continuar mesmo com erro - a senha já foi alterada
        }
      }
      
      // Fazer logout para forçar novo login com a nova senha
      await (supabase as SupabaseClient<Database>).auth.signOut();
      
      // Sucesso - mostrar toast e redirecionar
      toast.success('Senha atualizada com sucesso! Você já pode fazer login.');
      setSuccess(true);
      
      // Redirecionar para login após um pequeno delay
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 3000);
      
    } catch (error: unknown) {
      console.error('Erro ao atualizar senha:', error);
      
      // Mensagens de erro específicas
      let errorMessage = 'Erro ao atualizar senha. Tente novamente.';
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg.includes('expired')) {
        errorMessage = 'Link de redefinição expirado. Solicite um novo link.';
      } else if (errorMsg.includes('invalid')) {
        errorMessage = 'Link de redefinição inválido. Solicite um novo link.';
      } else if (errorMsg.includes('same password')) {
        errorMessage = 'A nova senha deve ser diferente da senha atual.';
      }
      
      setError({ field: 'password', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };
  
  // Componente de mensagem de erro
  const ErrorMessage = ({ message }: { message: string }) => (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center space-x-2 text-rose-400 text-xs mt-2"
    >
      <AlertCircle className="h-3 w-3" />
      <span>{message}</span>
    </motion.div>
  );
  
  // Indicador de força da senha
  const PasswordStrengthIndicator = ({ strength }: { strength: { isStrong: boolean; message: string } }) => (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center space-x-2 text-xs mt-2 ${
        strength.isStrong ? 'text-emerald-400' : 'text-amber-400'
      }`}
    >
      <div className={`h-2 w-2 rounded-full ${
        strength.isStrong ? 'bg-emerald-400' : 'bg-amber-400'
      }`} />
      <span>{strength.message}</span>
    </motion.div>
  );
  
  // Indicador de coincidência de senhas
  const PasswordMatchIndicator = ({ match }: { match: { isMatch: boolean; message: string } }) => (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center space-x-2 text-xs mt-2 ${
        match.isMatch ? 'text-emerald-400' : 'text-rose-400'
      }`}
    >
      <div className={`h-2 w-2 rounded-full ${
        match.isMatch ? 'bg-emerald-400' : 'bg-rose-400'
      }`} />
      <span>{match.message}</span>
    </motion.div>
  );
  
  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    // Se ainda está verificando o token
    if (checkingToken) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="h-16 w-16 mx-auto relative">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-white/40 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl text-white/90">Verificando Link...</h2>
          <p className="text-white/60 text-sm">
            Aguarde enquanto validamos seu link de redefinição de senha.
          </p>
        </motion.div>
      );
    }
    
    // Se o token é inválido
    if (tokenValid === false) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto" />
          <h2 className="text-xl text-white/90">Link Inválido</h2>
          <p className="text-white/60 text-sm">
            Este link de redefinição de senha é inválido ou já foi usado. 
            Solicite um novo link de redefinição.
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            className="mt-4 bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o Login
          </Button>
        </motion.div>
      );
    }
    
    // Se a senha foi atualizada com sucesso
    if (success) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-xl text-white/90">Senha Atualizada!</h2>
          <p className="text-white/60 text-sm">
            Sua senha foi alterada com sucesso. Você será redirecionado para o login em alguns segundos.
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            className="mt-4 bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300"
          >
            Ir para o Login
          </Button>
        </motion.div>
      );
    }
    
    // Formulário de redefinição de senha
    return (
      <motion.div 
        className="space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h2 className="text-xl text-white/90 mb-2">Redefinir Senha</h2>
          <p className="text-white/60 text-sm">
            Digite sua nova senha abaixo para acessar sua conta.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
            <KeyRound className="h-3 w-3 mr-1.5 opacity-40" />
            Nova Senha
          </Label>
          <div className="relative group">
            <Input 
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validatePasswordStrength(e.target.value);
                validatePasswordMatch();
                clearError();
              }}
              placeholder="••••••••"
              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'password' ? 'border-rose-500/50 animate-pulse' : ''}`}
              disabled={loading}
              ref={passwordRef}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>
          <AnimatePresence>
            {error?.field === 'password' ? (
              <ErrorMessage message={error.message} />
            ) : (
              showPasswordValidation && passwordStrength && (
                <PasswordStrengthIndicator strength={passwordStrength} />
              )
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-new-password" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
            <KeyRound className="h-3 w-3 mr-1.5 opacity-40" />
            Confirmar Nova Senha
          </Label>
          <div className="relative group">
            <Input 
              id="confirm-new-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                validatePasswordMatch();
                clearError();
              }}
              placeholder="••••••••"
              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'confirmPassword' ? 'border-rose-500/50 animate-pulse' : ''}`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>
          <AnimatePresence>
            {error?.field === 'confirmPassword' ? (
              <ErrorMessage message={error.message} />
            ) : (
              showPasswordMatch && password && confirmPassword && passwordsMatch && (
                <PasswordMatchIndicator match={passwordsMatch} />
              )
            )}
          </AnimatePresence>
        </div>

        <div className="flex space-x-3">
          <Button 
            onClick={() => navigate('/auth')}
            className="flex-1 bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdatePassword}
            className="flex-1 bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300"
            disabled={loading || !passwordStrength?.isStrong || !passwordsMatch?.isMatch}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="h-4 w-4 relative">
                  <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-t-white/40 rounded-full animate-spin"></div>
                </div>
                <span className="text-sm tracking-wide text-white/50">Atualizando...</span>
              </div>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Alterar Senha
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/30 via-black to-black p-4 relative overflow-hidden">
      <GlobalScrollbarStyle />
      
      {/* Efeitos de fundo sutis */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/[0.01] to-transparent opacity-30"></div>
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-white/[0.01] rounded-full blur-3xl"
          animate={{ 
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        <motion.div 
          className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/[0.01] rounded-full blur-3xl"
          animate={{ 
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity,
            repeatType: "reverse",
            delay: 2
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        {/* Cartão principal com efeito de vidro */}
        <div className="p-8 bg-black/40 backdrop-blur-xl rounded-2xl border-[0.5px] border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="flex justify-center mb-5"
            >
              <img 
                src="https://arkrjextwpwqhrvcijyr.supabase.co/storage/v1/object/public/trending/icon.png" 
                alt="Trending Logo" 
                className="w-20 h-6"
                style={{ 
                  filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.1))"
                }}
              />
            </motion.div>
            <motion.h1 
              className="text-xl bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                fontFamily: 'Mollen, sans-serif',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
              }}
            >
              Redefinição de Senha
            </motion.h1>
          </motion.div>

          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
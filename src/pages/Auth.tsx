import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, UserPlus, KeyRound, Loader2, CheckCircle2, LogIn, AlertCircle, Mail, CheckCheck, Eye, EyeOff, ExternalLink, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Estilo global para barras de rolagem elegantes
const GlobalScrollbarStyle = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    /* Estilização para navegadores WebKit (Chrome, Safari, etc.) */
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
    
    /* Estilização específica para o modal de termos e condições */
    .terms-modal-content::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    .terms-modal-content::-webkit-scrollbar-track {
      margin: 4px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
    }
    
    .terms-modal-content::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(161, 161, 170, 0.3) 0%, rgba(82, 82, 91, 0.2) 100%);
      box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      min-height: 40px;
      max-height: 100px;
      border: 2px solid rgba(0, 0, 0, 0.2);
    }
    
    .terms-modal-content::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(161, 161, 170, 0.4) 0%, rgba(82, 82, 91, 0.3) 100%);
    }
    
    /* Animações para o modal */
    .terms-modal-content h3 {
      position: relative;
      padding-left: 15px;
      margin-top: 1.5rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    .terms-modal-content h3::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 3px;
      background: linear-gradient(180deg, rgba(161, 161, 170, 0.2) 0%, rgba(82, 82, 91, 0.1) 100%);
      border-radius: 2px;
    }
    
    .terms-modal-content p strong {
      color: rgba(212, 212, 216, 0.9);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
    
    .terms-modal-highlight {
      background: linear-gradient(90deg, rgba(82, 82, 91, 0.05) 0%, transparent 100%);
      border-left: 3px solid rgb(82, 82, 91);
      padding: 0.75rem 1rem;
      margin: 1rem 0;
      border-radius: 0 4px 4px 0;
      transition: all 0.3s ease;
    }
    
    .terms-modal-highlight:hover {
      background: linear-gradient(90deg, rgba(82, 82, 91, 0.08) 0%, transparent 100%);
      transform: translateX(2px);
    }
  `}} />
);

export default function Auth() {
  // Adicione este estilo global para corrigir o preenchimento automático
  useEffect(() => {
    // Criar um estilo global para corrigir o preenchimento automático
    const style = document.createElement('style');
    style.textContent = `
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
    `;
    document.head.appendChild(style);
    
    // Limpar o estilo quando o componente for desmontado
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const { signInWithEmail, signUp, verifyEmail, isStrongPassword, resetPassword, loading: authLoading } = useAuth();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [birthdateError, setBirthdateError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [verifyEmailState, setVerifyEmailState] = useState(false);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [error, setError] = useState<{field: string, message: string} | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<{isStrong: boolean, message: string} | null>(null);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [showPasswordMatch, setShowPasswordMatch] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<{isMatch: boolean, message: string} | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [forgotPasswordState, setForgotPasswordState] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const verifyEmailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);

  // Limpar erro quando o usuário digita em qualquer campo
  const clearError = () => {
    if (error) setError(null);
  };

  // Função para validar se o usuário tem pelo menos 18 anos
  const validateAge = (date: string): boolean => {
    if (date.length !== 8) return false;
    
    const day = parseInt(date.substring(0, 2));
    const month = parseInt(date.substring(2, 4));
    const year = parseInt(date.substring(4, 8));
    
    // Verificar se o ano é futuro
    const currentYear = new Date().getFullYear();
    if (year > currentYear) {
      setBirthdateError("Ano de nascimento não pode ser no futuro.");
      return false;
    }
    
    // Verificar se o ano é muito antigo (limite realista para idade humana)
    const minRealisticYear = currentYear - 120; // Assumindo 120 anos como idade máxima realista
    if (year < minRealisticYear) {
      setBirthdateError(`Ano de nascimento inválido. O ano informado (${year}) é muito antigo. A idade máxima permitida é de 120 anos.`);
      return false;
    }
    
    // Verificar se o dia é válido (entre 1 e 31)
    if (day < 1 || day > 31) {
      setBirthdateError("Dia inválido. Deve estar entre 1 e 31.");
      return false;
    }
    
    // Verificar se o mês é válido (entre 1 e 12)
    if (month < 1 || month > 12) {
      setBirthdateError("Mês inválido. Deve estar entre 1 e 12.");
      return false;
    }
    
    // Verificar se a data é válida (considerando meses com menos de 31 dias)
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      setBirthdateError(`Data inválida. O mês ${month} tem apenas ${daysInMonth} dias.`);
      return false;
    }
    
    // Criar data de nascimento
    const birthDate = new Date(year, month - 1, day);
    
    // Verificar se a data é válida (não permitir datas inválidas)
    if (isNaN(birthDate.getTime())) {
      setBirthdateError("Data de nascimento inválida. Por favor, verifique o formato (DD/MM/AAAA).");
      return false;
    }
    
    // Calcular idade
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Ajustar idade se ainda não fez aniversário este ano
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      setBirthdateError("Você deve ter pelo menos 18 anos para se cadastrar.");
      return false;
    }
    
    return age >= 18;
  };
  
  // Formatar o input de data de nascimento
  const formatBirthdate = (value: string): string => {
    // Remover qualquer caractere não numérico
    const numbers = value.replace(/\D/g, '');
    
    // Limitar a 8 dígitos (DDMMAAAA)
    const birthdate = numbers.substring(0, 8);
    
    // Formatar conforme o usuário digita
    if (birthdate.length > 0) {
      // Se tiver pelo menos 2 dígitos, separar o dia
      if (birthdate.length >= 2) {
        // Se tiver pelo menos 4 dígitos, separar o mês
        if (birthdate.length >= 4) {
          return `${birthdate.substring(0, 2)}/${birthdate.substring(2, 4)}/${birthdate.substring(4, 8)}`;
        }
        return `${birthdate.substring(0, 2)}/${birthdate.substring(2, 4)}`;
      }
      return birthdate;
    }
    
    return '';
  };
  
  // Função para lidar com a mudança no campo de data de nascimento
  const handleBirthdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, selectionStart } = e.target;
    
    // Resetar erro
    setBirthdateError(null);
    
    // Verificar se é uma operação de apagar (backspace ou delete)
    if (value.length < birthdate.length) {
      // Obter a posição do cursor
      const cursorPosition = selectionStart || 0;
      
      // Se estiver apagando uma barra (/), remover também o dígito anterior
      if (
        (birthdate[cursorPosition] === '/' && cursorPosition > 0) || 
        (birthdate[cursorPosition-1] === '/' && cursorPosition > 0)
      ) {
        // Remover a barra e o dígito
        const rawValue = birthdate.replace(/\D/g, '');
        const newPosition = cursorPosition === birthdate.length ? cursorPosition - 1 : cursorPosition;
        
        // Determinar qual caractere numérico apagar baseado na posição
        let digitsToKeep = 0;
        
        if (newPosition <= 2) { // Apagando no dia
          digitsToKeep = Math.max(0, Math.min(newPosition, rawValue.length));
        } else if (newPosition <= 5) { // Apagando no mês
          // Se estiver apagando logo após a barra entre dia e mês
          if (newPosition === 3 && birthdate[newPosition-1] === '/') {
            digitsToKeep = 1; // Manter apenas o primeiro dígito do dia
          } else {
            digitsToKeep = Math.max(0, Math.min(newPosition - 1, rawValue.length));
          }
        } else { // Apagando no ano
          // Se estiver apagando logo após a barra entre mês e ano
          if (newPosition === 6 && birthdate[newPosition-1] === '/') {
            digitsToKeep = 3; // Manter os dígitos do dia e primeiro do mês
          } else {
            digitsToKeep = Math.max(0, Math.min(newPosition - 2, rawValue.length));
          }
        }
        
        const newRawValue = rawValue.substring(0, digitsToKeep);
        const formattedValue = formatBirthdate(newRawValue);
        
        setBirthdate(formattedValue);
        
        // Programar um setTimeout para reposicionar o cursor na próxima renderização
        setTimeout(() => {
          const input = e.target as HTMLInputElement;
          const newCursorPos = formattedValue.length;
          input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
        
        return;
      }
    }
    
    // Para outros casos, continuar com o comportamento normal
    const rawValue = value.replace(/\D/g, '');
    
    // Atualizar o estado com o valor formatado
    setBirthdate(formatBirthdate(rawValue));
    
    // Validar idade se o campo estiver completo
    if (rawValue.length === 8) {
      validateAge(rawValue);
    }
  };

  // Validar campos e focalizar o primeiro campo vazio
  const validateFields = (isLogin: boolean) => {
    if (isLogin) {
      // Validação para login
      if (!email) {
        setError({ field: 'email', message: 'Por favor, informe seu email.' });
        return false;
      }
      
      if (!password) {
        setError({ field: 'password', message: 'Por favor, informe sua senha.' });
        return false;
      }
      
      return true;
    } else {
      // Validação para cadastro
      if (!email) {
        setError({ field: 'email', message: 'Por favor, informe seu email.' });
        return false;
      }
      
      if (!birthdate || birthdate.length < 10) {
        setError({ field: 'birthdate', message: 'Por favor, informe sua data de nascimento completa.' });
        return false;
      }
      
      // Validar se a data de nascimento é válida
      const rawBirthdate = birthdate.replace(/\D/g, '');
      if (rawBirthdate.length === 8) {
        const isValidAge = validateAge(rawBirthdate);
        if (!isValidAge) {
          if (birthdateError) {
            setError({ field: 'birthdate', message: birthdateError });
          } else {
            setError({ field: 'birthdate', message: 'Data de nascimento inválida.' });
          }
          return false;
        }
      } else {
        setError({ field: 'birthdate', message: 'Por favor, informe sua data de nascimento completa.' });
        return false;
      }
      
      if (!password) {
        setError({ field: 'password', message: 'Por favor, informe sua senha.' });
        return false;
      }
      
      if (password !== confirmPassword) {
        setError({ field: 'confirmPassword', message: 'As senhas não coincidem.' });
        return false;
      }
      
      if (!termsAccepted) {
        setShowTermsError(true);
        return false;
      }
      
      return true;
    }
  };
  
  // Validar força da senha durante a digitação
  const validatePasswordStrength = (password: string) => {
    if (password.length > 0) {
      const strength = isStrongPassword(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  };

  // Validar se as senhas correspondem
  const validatePasswordMatch = () => {
    if (password && confirmPassword) {
      if (password === confirmPassword) {
        setPasswordsMatch({ isMatch: true, message: "Senhas correspondem" });
      } else {
        setPasswordsMatch({ isMatch: false, message: "Senhas não correspondem" });
      }
    } else {
      setPasswordsMatch(null);
    }
  };

  // Função para lidar com o login
  const handleLogin = async () => {
    // Limpar qualquer erro anterior
    clearError();
    
    // Validar campos
    if (!validateFields(true)) {
      // Mostrar animação de erro
      animateErrorField();
      return;
    }
    
    try {
      setLoadingAction('login');
      const { error: authError } = await signInWithEmail(email, password, rememberMe);
      
      if (authError) {
        // Definir o campo de erro
        if (authError.message.includes('Senha incorreta')) {
          setError({ field: 'password', message: authError.message });
          passwordRef.current?.focus();
        } else if (authError.message.includes('Email não encontrado')) {
          setError({ field: 'email', message: authError.message });
          emailRef.current?.focus();
        } else if (authError.message.includes('Email não verificado')) {
          setError({ field: 'email', message: authError.message });
          // Mostrar opção de verificar email
          setVerifyEmailState(true);
          setVerifyEmailAddress(email);
        } else {
          setError({ field: 'email', message: authError.message });
          emailRef.current?.focus();
        }
        
        throw authError;
      }
      
      // Armazena o email do usuário para exibir na animação
      setLoggedInEmail(email);
      
      // Ativa a animação de sucesso
      setLoginSuccess(true);
      
      // Redireciona para a página inicial após a animação (3 segundos)
      setTimeout(() => {
        navigate("/");
      }, 3000);
      
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      if (!error.message.includes('Email não verificado')) {
        animateErrorField();
      }
      setLoadingAction(null);
      setPassword("");
    }
  };
  
  // Função para lidar com o cadastro
  const handleSignUp = async () => {
    // Limpar qualquer erro anterior
    clearError();
    
    // Validar campos
    if (!validateFields(false)) {
      // Mostrar animação de erro
      animateErrorField();
      return;
    }
    
    try {
      setLoadingAction('signup');
      
      // Extrair a data de nascimento do formato DD/MM/YYYY para o formato ISO (YYYY-MM-DD)
      const rawBirthdate = birthdate.replace(/\D/g, '');
      const day = rawBirthdate.substring(0, 2);
      const month = rawBirthdate.substring(2, 4);
      const year = rawBirthdate.substring(4, 8);
      const formattedBirthdate = `${year}-${month}-${day}`;
      
      const { error: authError } = await signUp(email, password, formattedBirthdate);
      
      if (authError) {
        // Definir o campo de erro
        if (authError.message.includes('já está cadastrado')) {
          setError({ field: 'email', message: authError.message });
          emailRef.current?.focus();
        } else if (authError.message.includes('A senha deve')) {
          setError({ field: 'password', message: authError.message });
          passwordRef.current?.focus();
        } else {
          setError({ field: 'email', message: authError.message });
          emailRef.current?.focus();
        }
        
        throw authError;
      }
      
      // Armazena o email registrado para exibir na mensagem de sucesso
      setRegisteredEmail(email);
      
      // Ativa o estado de sucesso
      setSignupSuccess(true);
      
      // Mostrar a opção de verificar email
      setVerifyEmailAddress(email);
      
      // Limpa os campos
      setEmail("");
      setBirthdate("");
      setPassword("");
      setConfirmPassword("");
      setPasswordStrength(null);
      setTermsAccepted(false);
      
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      animateErrorField();
      setLoadingAction(null);
      setPassword("");
      setConfirmPassword("");
      setPasswordStrength(null);
    } finally {
      setLoadingAction(null);
    }
  };
  
  // Função para abrir o Gmail em uma nova aba
  const openGmail = () => {
    window.open('https://mail.google.com', '_blank');
  };

  // Função para verificar email
  const handleVerifyEmail = async () => {
    if (!verifyEmailAddress) {
      setError({ field: 'verifyEmail', message: 'Por favor, informe seu email' });
      verifyEmailRef.current?.focus();
      return;
    }
    
    try {
      setLoadingAction('verify');
      const { error: authError } = await verifyEmail(verifyEmailAddress);
      
      if (authError) {
        setError({ field: 'verifyEmail', message: authError.message });
        throw authError;
      }
      
      // Sucesso na verificação
      toast.success("Email verificado com sucesso!", {
        description: "Agora você pode fazer login na sua conta."
      });
      
      // Abrir o Gmail em uma nova aba
      openGmail();
      
      // Voltar para a tela de login
      setVerifyEmailState(false);
      setVerifyEmailAddress("");
      
      // Se estamos na tela de sucesso do cadastro, redirecionar para login
      if (signupSuccess) {
        setTimeout(() => {
          setSignupSuccess(false);
        }, 2000);
      }
      
    } catch (error: any) {
      console.error('Erro ao verificar email:', error);
      animateErrorField();
    } finally {
      setLoadingAction(null);
    }
  };

  // Animar o campo com erro
  const animateErrorField = () => {
    // A animação é controlada pelo CSS e framer-motion
  };

  // Componente para exibir os termos e condições
  const TermsAndConditionsModal = ({ showTerms, setShowTerms }: { showTerms: boolean, setShowTerms: (show: boolean) => void }) => (
    <Dialog 
      open={showTerms} 
      onOpenChange={(open) => {
        // Permitir que o modal feche ao clicar no X, sem marcar como aceito
        setShowTerms(open);
      }}
      // Adicionando classe personalizada para o overlay do Dialog
      className="terms-dialog"
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        .terms-dialog .fixed.inset-0.z-50.bg-background\/80.backdrop-blur-sm.data-\[state\=open\]:animate-in.data-\[state\=closed\]:animate-out.data-\[state\=closed\]:fade-out-0.data-\[state\=open\]:fade-in-0 {
          background-color: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
      `}} />
      <DialogContent 
        className="bg-black/70 border border-neutral-800 text-neutral-200 p-6 rounded-xl max-w-5xl max-h-[85vh] overflow-y-auto terms-modal-content shadow-2xl"
        style={{
          scrollbarGutter: 'stable',
          scrollBehavior: 'smooth',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingRight: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.65)'
        }}
      >
        <DialogHeader className="border-b border-neutral-800 pb-4 mb-6">
          <DialogTitle className="text-xl font-light tracking-wider text-white uppercase">
            Termos e Condições
          </DialogTitle>
          <DialogDescription className="text-neutral-400 text-sm mt-2">
            Leia atentamente os termos antes de prosseguir
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-neutral-300 pt-4">
          <div className="bg-black/60 border border-neutral-800 p-4 rounded-lg">
            <p className="text-neutral-100 font-medium text-center">AVISO LEGAL IMPORTANTE: ESTE É UM CONTRATO VINCULANTE. LEIA ATENTAMENTE ANTES DE UTILIZAR O SERVIÇO.</p>
          </div>
          
          <p className="text-neutral-200">Ao acessar ou utilizar o ProfEyes, você concorda expressamente em renunciar a determinados direitos legais e aceitar limitações de responsabilidade conforme detalhado abaixo. Se você não concorda com qualquer parte destes termos, não utilize nossos serviços.</p>
          
          <p className="text-neutral-400 text-xs border-b border-neutral-800 pb-2 mb-2">Última atualização: {new Date().toLocaleDateString()}</p>
          
          <style dangerouslySetInnerHTML={{ __html: `
            .terms-modal-content {
              background-color: rgba(0, 0, 0, 0.65);
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
            }
            
            .terms-modal-content h3 {
              position: relative;
              padding-left: 12px;
              margin-top: 2rem;
              margin-bottom: 1rem;
              font-size: 0.95rem;
              color: #ffffff;
              letter-spacing: 0.03em;
              text-transform: uppercase;
              font-weight: 400;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }
            
            .terms-modal-content h3::before {
              content: '';
              position: absolute;
              left: 0;
              top: 50%;
              transform: translateY(-50%);
              height: 70%;
              width: 2px;
              background: #4b5563;
            }
            
            .terms-modal-content p {
              line-height: 1.7;
              color: #d1d5db;
              font-size: 0.875rem;
              margin-bottom: 1rem;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .terms-modal-content p strong {
              color: #ffffff;
              font-weight: 500;
              letter-spacing: 0.02em;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }
            
            .terms-modal-content ol {
              margin: 1.5rem 0;
            }
            
            .terms-modal-content ol li {
              margin-bottom: 0.75rem;
              line-height: 1.6;
              color: #d1d5db;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .terms-modal-content .bg-black\/60 {
              background-color: rgba(0, 0, 0, 0.7);
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .terms-modal-content::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            
            .terms-modal-content::-webkit-scrollbar-track {
              background: rgba(10, 10, 10, 0.5);
              border-radius: 8px;
              margin: 8px 0;
            }
            
            .terms-modal-content::-webkit-scrollbar-thumb {
              background: rgba(75, 85, 99, 0.6);
              border-radius: 8px;
              border: 2px solid rgba(0, 0, 0, 0.2);
              min-height: 50px;
            }
            
            .terms-modal-content::-webkit-scrollbar-thumb:hover {
              background: rgba(107, 114, 128, 0.7);
              cursor: pointer;
            }
          `}} />
          
          <p><strong>CONTEÚDO EXCLUSIVAMENTE INFORMATIVO:</strong> Todo o conteúdo disponibilizado em nossa plataforma, incluindo, mas não se limitando a: análises técnicas, gráficos, indicadores, sinais de mercado, notícias, relatórios, projeções, simulações, ferramentas de cálculo, e quaisquer outros materiais, tem caráter EXCLUSIVAMENTE INFORMATIVO e EDUCACIONAL. Nenhuma informação disponibilizada deve ser interpretada como recomendação de compra, venda ou manutenção de ativos financeiros.</p>
          
          <p><strong>AUSÊNCIA ABSOLUTA DE GARANTIA DE RESULTADOS:</strong> Não garantimos, sob nenhuma hipótese, rentabilidade, retorno ou resultado específico de qualquer natureza. Resultados passados NÃO são, em nenhuma circunstância, garantia ou indicativo de resultados futuros. Qualquer projeção, estimativa ou exemplificação de ganhos potenciais apresentada em nossa plataforma é meramente ilustrativa e hipotética, não representando promessa ou expectativa real de ganhos.</p>
          
          <p><strong>RISCOS INERENTES AO MERCADO FINANCEIRO:</strong> Investimentos em mercados financeiros envolvem riscos significativos, incluindo, mas não se limitando a: possibilidade de perda parcial ou total do capital investido, volatilidade de preços, liquidez dos ativos, riscos cambiais, riscos de crédito, riscos sistêmicos, riscos operacionais, riscos regulatórios e outros fatores que podem afetar negativamente o valor dos investimentos. O usuário reconhece, compreende e aceita integralmente todos estes riscos ao utilizar nossa plataforma.</p>
          
          <p><strong>DECISÕES DE INVESTIMENTO:</strong> Todas as decisões de investimento são tomadas exclusivamente pelo usuário, por sua própria conta e risco. Recomendamos enfaticamente que o usuário consulte profissionais de investimentos devidamente certificados e registrados nos órgãos competentes antes de tomar qualquer decisão de investimento.</p>
          
          <h3 className="text-white/90 font-medium">2. LIMITAÇÃO ABSOLUTA DE RESPONSABILIDADE</h3>
          <p><strong>RENÚNCIA EXPRESSA A QUALQUER RECLAMAÇÃO:</strong> Ao utilizar nossa plataforma, o usuário renuncia expressamente, na extensão máxima permitida pela legislação aplicável, a qualquer direito de apresentar reclamações, processos judiciais ou extrajudiciais, ações coletivas ou individuais, ou qualquer outro tipo de demanda contra a empresa, seus proprietários, diretores, funcionários, colaboradores, parceiros, afiliados ou quaisquer pessoas físicas ou jurídicas relacionadas à plataforma, por quaisquer danos ou prejuízos decorrentes do uso ou incapacidade de uso da plataforma.</p>
          
          <p><strong>ACORDO IRREVOGÁVEL DE NÃO PROCESSAR:</strong> O usuário concorda irrevogavelmente em não iniciar, participar ou prosseguir com qualquer ação judicial, arbitragem, mediação, reclamação administrativa ou qualquer outro procedimento legal contra o ProfEyes, seus proprietários, diretores, funcionários, colaboradores, parceiros ou afiliados, relacionado direta ou indiretamente ao uso da plataforma ou às informações nela contidas. Esta renúncia inclui, mas não se limita a, ações por perdas financeiras, danos morais, danos emergentes, lucros cessantes, ou quaisquer outros tipos de danos ou prejuízos.</p>
          
          <p><strong>FALHAS TÉCNICAS E OPERACIONAIS:</strong> Não nos responsabilizamos, em nenhuma hipótese, por falhas, interrupções, atrasos, erros, bugs, vírus, malwares ou quaisquer outros problemas no funcionamento da plataforma, incluindo, mas não se limitando a: problemas de conexão, indisponibilidade do serviço, atrasos na transmissão de dados, falhas de servidor, problemas de compatibilidade com dispositivos ou navegadores, ou quaisquer outras questões técnicas que possam afetar o acesso ou uso da plataforma.</p>
          
          <p><strong>PRECISÃO E ATUALIDADE DAS INFORMAÇÕES:</strong> Embora nos esforcemos para fornecer informações precisas e atualizadas, não garantimos, de forma alguma, a exatidão, integridade, atualidade, confiabilidade ou adequação das informações disponibilizadas. As informações podem conter erros, imprecisões, omissões ou desatualizações. O usuário reconhece que utiliza tais informações por sua própria conta e risco.</p>
          
          <p><strong>PERDAS FINANCEIRAS E OUTROS DANOS:</strong> Em nenhuma circunstância, independentemente da teoria legal invocada, seremos responsáveis por quaisquer perdas ou danos diretos, indiretos, incidentais, consequenciais, especiais, punitivos ou exemplares resultantes do uso ou incapacidade de uso de nossa plataforma, incluindo, mas não se limitando a: perdas financeiras, perda de lucros, perda de oportunidades de negócio, perda de dados, danos à reputação, ou quaisquer outros danos, mesmo que tenhamos sido previamente advertidos sobre a possibilidade de tais danos.</p>
          
          <p><strong>LIMITAÇÃO DE VALOR:</strong> Na eventualidade improvável de que, apesar das disposições destes Termos, sejamos considerados legalmente responsáveis por algum dano ou prejuízo, nossa responsabilidade total e agregada será limitada ao valor pago pelo usuário para acessar a plataforma nos últimos 12 meses, ou R$ 100,00 (cem reais), o que for menor.</p>
          
          <h3 className="text-white/90 font-medium">3. CONFORMIDADE LEGAL E REGULATÓRIA</h3>
          <p><strong>LEGISLAÇÃO APLICÁVEL:</strong> Nossa plataforma opera em conformidade com a legislação brasileira, incluindo, mas não se limitando a: Lei nº 6.385/76 (que regula o mercado de valores mobiliários), Instruções da CVM, Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD), e demais normas aplicáveis. No entanto, o usuário reconhece que é sua responsabilidade verificar se o uso da plataforma está em conformidade com as leis e regulamentos aplicáveis em sua jurisdição.</p>
          
          <p><strong>NÃO CARACTERIZAÇÃO DE CONSULTORIA:</strong> De acordo com a Instrução CVM nº 592/2017, a atividade de consultoria de valores mobiliários consiste na prestação de serviços de orientação, recomendação e aconselhamento personalizado. Reiteramos enfaticamente que NÃO realizamos tais atividades. Qualquer interpretação de que nosso conteúdo constitui consultoria de investimentos é incorreta e contrária às disposições expressas nestes Termos.</p>
          
          <p><strong>AUSÊNCIA DE RELAÇÃO FIDUCIÁRIA:</strong> Não existe relação fiduciária entre a plataforma e seus usuários. Não assumimos nenhum dever fiduciário ou obrigação de lealdade para com os usuários. Nossa relação é estritamente limitada ao fornecimento de informações e ferramentas, conforme descrito nestes Termos.</p>
          
          <h3 className="text-white/90 font-medium">4. PRIVACIDADE, DADOS E CONFIDENCIALIDADE</h3>
          <p><strong>COLETA E USO DE DADOS:</strong> Respeitamos sua privacidade de acordo com nossa Política de Privacidade. Seus dados são armazenados de forma segura e não são compartilhados com terceiros sem seu consentimento explícito, exceto quando exigido por lei, ordem judicial ou para proteger nossos direitos legais.</p>
          
          <p><strong>MONITORAMENTO E REGISTROS:</strong> Reservamo-nos o direito de monitorar, registrar e armazenar informações sobre o uso da plataforma, incluindo, mas não se limitando a: endereços IP, dispositivos utilizados, páginas visitadas, tempo de permanência, ações realizadas e quaisquer outras informações relacionadas ao uso da plataforma. Estes registros podem ser utilizados para fins de segurança, melhoria do serviço, cumprimento de obrigações legais ou defesa em processos judiciais.</p>
          
          <h3 className="text-white/90 font-medium">5. RESPONSABILIDADES E OBRIGAÇÕES DO USUÁRIO</h3>
          <p><strong>RESPONSABILIDADE EXCLUSIVA:</strong> O usuário é exclusivamente responsável por todas as decisões de investimento, transações financeiras, e quaisquer outras ações tomadas com base nas informações obtidas através da plataforma. O usuário reconhece que é o único responsável por avaliar a adequação das informações às suas necessidades, objetivos financeiros, perfil de risco e situação financeira.</p>
          
          <p><strong>OBRIGAÇÃO DE BUSCAR ACONSELHAMENTO PROFISSIONAL:</strong> O usuário concorda em buscar aconselhamento profissional adequado antes de tomar decisões de investimento. Recomendamos enfaticamente a consulta a consultores de investimentos registrados na CVM, contadores, advogados especializados e outros profissionais qualificados antes de realizar qualquer investimento.</p>
          
          <p><strong>VERACIDADE DAS INFORMAÇÕES:</strong> O usuário garante que todas as informações fornecidas durante o cadastro e uso da plataforma são verdadeiras, precisas, atuais e completas. O usuário compromete-se a atualizar prontamente quaisquer informações que se tornem incorretas ou desatualizadas.</p>
          
          <p><strong>PROIBIÇÃO DE USO INDEVIDO:</strong> O usuário concorda em não utilizar a plataforma para qualquer finalidade ilegal, não autorizada ou proibida por estes Termos ou pela legislação aplicável. É expressamente proibido: (i) violar direitos de propriedade intelectual; (ii) distribuir, modificar, copiar ou criar obras derivadas do conteúdo da plataforma; (iii) realizar engenharia reversa, descompilação ou tentativa de acesso ao código-fonte; (iv) utilizar robôs, spiders, scrapers ou outros meios automatizados para acessar a plataforma; (v) interferir ou tentar interferir no funcionamento adequado da plataforma; (vi) contornar medidas de segurança; ou (vii) utilizar a plataforma de qualquer maneira que possa danificá-la ou prejudicar sua funcionalidade.</p>
          
          <h3 className="text-white/90 font-medium">6. PROPRIEDADE INTELECTUAL</h3>
          <p><strong>DIREITOS RESERVADOS:</strong> Todo o conteúdo disponibilizado na plataforma, incluindo, mas não se limitando a: textos, gráficos, logotipos, ícones, imagens, clipes de áudio, downloads digitais, compilações de dados, software, código, design, layout, e quaisquer outros materiais, são de propriedade exclusiva do ProfEyes ou de seus licenciadores e estão protegidos pelas leis brasileiras e internacionais de direitos autorais, marcas registradas, patentes e outros direitos de propriedade intelectual.</p>
          
          <p><strong>LICENÇA LIMITADA:</strong> Concedemos ao usuário uma licença limitada, não exclusiva, não transferível, revogável e não sublicenciável para acessar e utilizar a plataforma apenas para uso pessoal e não comercial, sujeita a estes Termos. Esta licença não inclui o direito de: (i) revender ou usar comercialmente a plataforma ou seu conteúdo; (ii) distribuir, exibir publicamente ou executar publicamente qualquer conteúdo; (iii) modificar ou criar obras derivadas da plataforma ou de seu conteúdo; (iv) utilizar mineração de dados, robôs ou métodos similares de coleta e extração de dados; (v) fazer download de qualquer parte da plataforma, exceto para cache de página quando permitido pelos recursos da plataforma; ou (vi) utilizar a plataforma ou seu conteúdo para além do uso pretendido.</p>
          
          <h3 className="text-white/90 font-medium">7. MODIFICAÇÕES, SUSPENSÃO E RESCISÃO</h3>
          <p><strong>MODIFICAÇÕES DOS TERMOS:</strong> Reservamo-nos o direito de modificar, alterar, adicionar ou remover partes destes Termos a qualquer momento, a nosso exclusivo critério, sem aviso prévio. As alterações entrarão em vigor imediatamente após sua publicação na plataforma. O uso continuado da plataforma após tais modificações constitui aceitação dos novos Termos. É responsabilidade do usuário verificar regularmente se houve alterações.</p>
          
          <p><strong>MODIFICAÇÕES DA PLATAFORMA:</strong> Reservamo-nos o direito de modificar, suspender, descontinuar ou restringir, temporária ou permanentemente, todo ou parte da plataforma, incluindo quaisquer serviços, funcionalidades, conteúdos ou recursos, sem aviso prévio e sem qualquer responsabilidade perante o usuário ou terceiros.</p>
          
          <p><strong>SUSPENSÃO E RESCISÃO:</strong> Reservamo-nos o direito de suspender ou encerrar o acesso do usuário à plataforma, a qualquer momento, por qualquer motivo ou sem motivo, sem aviso prévio e sem qualquer responsabilidade perante o usuário ou terceiros. Motivos para suspensão ou rescisão podem incluir, mas não se limitam a: (i) violação destes Termos; (ii) uso fraudulento ou abusivo da plataforma; (iii) comportamento que prejudique outros usuários; (iv) solicitações de autoridades legais; ou (v) questões técnicas ou de segurança.</p>
          
          <h3 className="text-white/90 font-medium">8. DISPOSIÇÕES GERAIS</h3>
          <p><strong>ACORDO INTEGRAL:</strong> Estes Termos constituem o acordo integral entre o usuário e o ProfEyes em relação ao uso da plataforma, substituindo quaisquer acordos, entendimentos ou comunicações anteriores, sejam escritos ou verbais.</p>
          
          <p><strong>INDEPENDÊNCIA DAS DISPOSIÇÕES:</strong> Se qualquer disposição destes Termos for considerada ilegal, nula ou inexequível, no todo ou em parte, por qualquer tribunal de jurisdição competente, tal disposição será considerada uma disposição independente e não afetará a validade e exequibilidade de quaisquer disposições remanescentes.</p>
          
          <p><strong>INDENIZAÇÃO OBRIGATÓRIA:</strong> O usuário concorda em defender, indenizar e isentar de responsabilidade o ProfEyes, seus proprietários, diretores, funcionários, colaboradores, parceiros, afiliados e licenciadores contra quaisquer reclamações, responsabilidades, danos, perdas, custos e despesas, incluindo honorários advocatícios razoáveis, decorrentes ou relacionados a: (i) violação destes Termos pelo usuário; (ii) uso da plataforma pelo usuário; (iii) violação de direitos de terceiros pelo usuário; (iv) decisões de investimento tomadas pelo usuário com base nas informações disponibilizadas na plataforma; ou (v) qualquer conteúdo publicado ou compartilhado pelo usuário através da plataforma. Esta obrigação de indenização sobreviverá à rescisão ou expiração destes Termos e ao uso da plataforma pelo usuário.</p>
          
          <p><strong>NÃO RENÚNCIA:</strong> A falha do ProfEyes em exercer ou fazer cumprir qualquer direito ou disposição destes Termos não constituirá renúncia a tal direito ou disposição. Nenhuma renúncia a qualquer disposição destes Termos será considerada uma renúncia adicional ou contínua de tal disposição ou de qualquer outra disposição.</p>
          
          <p><strong>CESSÃO:</strong> O usuário não pode ceder, transferir ou sublicenciar quaisquer direitos ou obrigações decorrentes destes Termos sem o consentimento prévio por escrito do ProfEyes. O ProfEyes pode ceder ou transferir estes Termos, no todo ou em parte, sem restrições.</p>
          
          <p><strong>LEI APLICÁVEL E FORO:</strong> Estes Termos são regidos e interpretados de acordo com as leis da República Federativa do Brasil. Qualquer disputa, controvérsia ou reclamação decorrente ou relacionada a estes Termos será submetida à jurisdição exclusiva do foro da Comarca de São Paulo, Estado de São Paulo, com expressa renúncia a qualquer outro, por mais privilegiado que seja.</p>
          
          <h3 className="text-white/90 font-medium">9. ARBITRAGEM OBRIGATÓRIA E RENÚNCIA A AÇÕES COLETIVAS</h3>
          
          <p><strong>ARBITRAGEM VINCULANTE:</strong> Qualquer disputa, controvérsia ou reclamação decorrente ou relacionada a estes Termos, incluindo sua validade, interpretação, execução, violação ou rescisão, será resolvida exclusivamente por arbitragem vinculante, de acordo com o Regulamento de Arbitragem da Câmara de Comércio Brasil-Canadá. A sede da arbitragem será a cidade de São Paulo, Estado de São Paulo, Brasil. O idioma da arbitragem será o português. A decisão arbitral será final e vinculativa para as partes.</p>
          
          <p><strong>RENÚNCIA A JULGAMENTO POR JÚRI:</strong> O usuário e o ProfEyes renunciam expressamente a qualquer direito a um julgamento por júri em qualquer ação, processo ou reconvenção decorrente ou relacionada a estes Termos ou à plataforma.</p>
          
          <p><strong>RENÚNCIA A AÇÕES COLETIVAS:</strong> O usuário renuncia expressamente a qualquer direito de participar como representante ou membro de qualquer classe em qualquer ação coletiva, consolidada ou representativa contra o ProfEyes ou seus proprietários, diretores, funcionários, colaboradores, parceiros ou afiliados. Qualquer disputa será resolvida individualmente, e o usuário não poderá buscar reparação como membro de uma classe ou grupo.</p>
          
          <p><strong>PRAZO PARA RECLAMAÇÕES:</strong> Qualquer reclamação ou causa de ação decorrente ou relacionada a estes Termos ou à plataforma deve ser iniciada no prazo máximo de 6 (seis) meses após o surgimento da causa de ação, caso contrário, tal reclamação ou causa de ação será permanentemente impedida.</p>
          
          <h3 className="text-white/90 font-medium">10. DECLARAÇÃO DE CIÊNCIA E ACEITAÇÃO</h3>
          <p className="mt-6 text-white/90 font-medium">Ao clicar em "Aceitar e Continuar", você reconhece e declara expressamente que:</p>
          <ol className="list-decimal pl-5 space-y-2 text-white/70">
            <li className="text-gray-300">Leu, compreendeu e concorda integralmente com todos os termos e condições acima descritos;</li>
            <li className="text-gray-300">Compreende os riscos associados a investimentos no mercado financeiro;</li>
            <li className="text-gray-300">Reconhece que o ProfEyes não oferece consultoria de investimentos;</li>
            <li className="text-gray-300">Assume total responsabilidade por suas decisões de investimento;</li>
            <li className="text-gray-300">Renuncia a quaisquer reclamações contra o ProfEyes por perdas ou danos relacionados ao uso da plataforma;</li>
            <li className="text-gray-300">Tem capacidade legal para aceitar estes termos e utilizar a plataforma.</li>
          </ol>
          
          <p className="mt-4 text-gray-400">Se não concordar com qualquer parte destes termos, você deve clicar em "Recusar" e não poderá utilizar nossa plataforma.</p>
        </div>
        <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-800">
          <Button 
            variant="destructive" 
            onClick={() => setShowTerms(false)}
            className="bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-all duration-300 px-6 py-2 h-10 text-sm tracking-wide"
          >
            Recusar
          </Button>
          <Button 
            onClick={() => {
              setTermsAccepted(true);
              setShowTerms(false);
              setError(null);
              clearError();
            }}
            className="bg-white hover:bg-neutral-200 text-black transition-all duration-300 px-6 py-2 h-10 text-sm tracking-wide font-medium"
          >
            Aceitar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Componente para a tela de verificação de email
  const VerifyEmailContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <Mail className="w-12 h-12 text-white/40 mx-auto mb-2" />
        <h2 className="text-xl font-light text-white/90">Verifique seu Email</h2>
        <p className="text-sm text-white/50">
          Enviamos um link de verificação para seu email. Por favor, confira sua caixa de entrada.
        </p>
      </div>

      <div className="space-y-3">
        <Button 
          className="w-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300 group"
          onClick={openGmail}
        >
          <CheckCheck className="h-4 w-4 mr-2 opacity-70 group-hover:opacity-90 transition-opacity" />
          <span className="text-sm tracking-wide">Conferir Email</span>
        </Button>

        <Button 
          variant="ghost" 
          className="w-full text-white/40 hover:text-white/60 hover:bg-white/5"
          onClick={() => setVerifyEmailState(false)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="text-xs">Voltar</span>
        </Button>
      </div>
    </motion.div>
  );

  // Conteúdo de sucesso do cadastro
  const SignupSuccessContent = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.2 
        }}
        className="mb-6 relative"
      >
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-md"></div>
        <div className="relative">
          <CheckCircle2 className="h-20 w-20 text-emerald-400/80" strokeWidth={1.5} />
        </div>
      </motion.div>
      
      <motion.h2 
        className="text-xl font-light text-white/90 mb-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Cadastro Concluído!
      </motion.h2>
      
      <motion.p 
        className="text-white/50 text-sm mb-6 max-w-md"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Enviamos um email para <span className="text-white/80 font-medium">{registeredEmail}</span> com um link de verificação. Por favor, verifique seu email para ativar sua conta.
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col space-y-3 w-full"
      >
        <Button 
          className="bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300 group"
          onClick={openGmail}
        >
          <CheckCheck className="h-4 w-4 mr-2 opacity-70 group-hover:opacity-90 transition-opacity" />
          <span className="text-sm tracking-wide">Conferir Email</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className="text-white/40 hover:text-white/60 hover:bg-white/5"
          onClick={() => {
            setSignupSuccess(false);
            setEmail("");
            setPassword("");
            setConfirmPassword("");
          }}
        >
          <span className="text-xs">Voltar para Login</span>
        </Button>
      </motion.div>
    </motion.div>
  );

  // Conteúdo de sucesso do login
  const LoginSuccessContent = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.2 
        }}
        className="mb-6 relative"
      >
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-md"></div>
        <div className="relative">
          <CheckCircle2 className="h-20 w-20 text-emerald-400/80" strokeWidth={1.5} />
        </div>
      </motion.div>
      
      <motion.h2 
        className="text-xl font-light text-white/90 mb-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Login Bem-sucedido!
      </motion.h2>
      
      <motion.p 
        className="text-white/50 text-sm mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Bem-vindo de volta, <span className="text-white/80 font-medium">{loggedInEmail}</span>. Você será redirecionado em instantes...
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="w-full"
      >
        <div className="relative h-1 w-full bg-black/30 rounded-full overflow-hidden">
          <motion.div 
            className="absolute inset-0 bg-emerald-400/50"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(passwordsMatch?.isMatch ? 100 : 0)}%` 
            }}
            transition={{ duration: 2 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );

  // Componente de mensagem de erro
  const ErrorMessage = ({ message }: { message: string }) => (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center text-rose-400/80 text-xs mt-1.5"
    >
      <AlertCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
  
  // Componente de indicador de força de senha
  const PasswordStrengthIndicator = ({ strength }: { strength: { isStrong: boolean; message: string } }) => {
    // Identificar requisitos não atendidos
    const requirements = [
      { id: 'length', label: 'Pelo menos 8 caracteres', met: password.length >= 8 },
      { id: 'lowercase', label: 'Pelo menos uma letra minúscula', met: /[a-z]/.test(password) },
      { id: 'uppercase', label: 'Pelo menos uma letra maiúscula', met: /[A-Z]/.test(password) },
      { id: 'number', label: 'Pelo menos um número', met: /[0-9]/.test(password) },
      { id: 'special', label: 'Pelo menos um caractere especial', met: /[^A-Za-z0-9]/.test(password) },
    ];

    // Filtrar apenas os requisitos não atendidos
    const missingRequirements = requirements.filter(req => !req.met);
    // Requisitos atendidos
    const metRequirements = requirements.filter(req => req.met);

    return (
      <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-black/20 border-[0.5px] border-white/[0.03] p-3 rounded-lg mt-2 space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center text-white/50 text-xs">
            <AlertCircle className="h-3 w-3 mr-1.5 opacity-70" />
            Requisitos de senha
          </div>
          <div className="text-[10px] text-white/30">
            {metRequirements.length}/{requirements.length} atendidos
          </div>
        </div>
        
        <div className="space-y-1.5">
          {requirements.map((req) => (
            <div key={req.id} className="flex items-center text-[10px]">
              {req.met ? (
                <div className="h-3 w-3 rounded-full flex items-center justify-center mr-2 bg-emerald-500/10 text-emerald-400/70">
                  <CheckCircle2 className="h-2 w-2" />
                </div>
              ) : (
                <div className="h-3 w-3 rounded-full flex items-center justify-center mr-2 bg-white/5 text-white/30">
                  <div className="h-1 w-1 bg-white/30 rounded-full"></div>
                </div>
              )}
              <span className={req.met ? "text-white/50" : "text-white/30"}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
        
        {/* Barra de progresso */}
        <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden mt-1">
          <motion.div 
            className="h-full bg-gradient-to-r from-white/20 to-emerald-400/50"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(metRequirements.length / requirements.length) * 100}%` 
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>
    );
  };

  // Componente de indicador de correspondência de senhas
  const PasswordMatchIndicator = ({ match }: { match: { isMatch: boolean; message: string } }) => (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-black/20 border-[0.5px] border-white/[0.03] p-3 rounded-lg mt-2"
    >
      <div className="flex items-center text-xs">
        {match.isMatch ? (
          <>
            <div className="h-3.5 w-3.5 rounded-full flex items-center justify-center mr-2 bg-emerald-500/10">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400/70" />
            </div>
            <span className="text-white/50">
              {match.message}
            </span>
          </>
        ) : (
          <>
            <div className="h-3.5 w-3.5 rounded-full flex items-center justify-center mr-2 bg-rose-500/10">
              <AlertCircle className="h-2.5 w-2.5 text-rose-400/70" />
            </div>
            <span className="text-rose-400/70">
              {match.message}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );

  // Componente para a tela de recuperação de senha
  const ForgotPasswordContent = () => (
    <motion.div 
      className="space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      {resetEmailSent ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-xl text-white/90">Email Enviado!</h2>
          <p className="text-white/60 text-sm">
            Enviamos instruções de recuperação de senha para seu email. Por favor, verifique sua caixa de entrada.
          </p>
          <Button 
            onClick={() => {
              setForgotPasswordState(false);
              setResetEmailSent(false);
            }}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o login
          </Button>
        </motion.div>
      ) : (
        <>
          <div>
            <h2 className="text-xl text-white/90 mb-2">Recuperar Senha</h2>
            <p className="text-white/60 text-sm">
              Digite seu email e enviaremos instruções para redefinir sua senha.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
              <Mail className="h-3 w-3 mr-1.5 opacity-40" />
              Email
            </Label>
            <Input 
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              placeholder="seu@email.com"
              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'email' ? 'border-rose-500/50 animate-shake' : ''}`}
              disabled={loadingAction !== null}
              ref={emailRef}
            />
            <AnimatePresence>
              {error?.field === 'email' && <ErrorMessage message={error.message} />}
            </AnimatePresence>
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={() => setForgotPasswordState(false)}
              className="flex-1 bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button 
              onClick={handleResetPassword}
              className="flex-1 bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300"
              disabled={loadingAction !== null}
            >
              {loadingAction === 'reset' ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="h-4 w-4 relative">
                    <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-t-white/40 rounded-full animate-spin"></div>
                  </div>
                  <span className="text-sm tracking-wide text-white/50">Enviando...</span>
                </div>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );

  // Função para lidar com a recuperação de senha
  const handleResetPassword = async () => {
    clearError();
    
    if (!email) {
      setError({ field: 'email', message: 'Por favor, informe seu email' });
      emailRef.current?.focus();
      return;
    }

    try {
      setLoadingAction('reset');
      const { error: resetError } = await resetPassword(email);
      
      if (resetError) {
        setError({ field: 'email', message: resetError.message });
        return;
      }
      
      setResetEmailSent(true);
      toast.success('Email de recuperação enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar email de recuperação:', error);
      setError({ field: 'email', message: 'Erro ao enviar email de recuperação. Tente novamente.' });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/30 via-black to-black p-4 relative overflow-hidden">
      {/* Adiciona o estilo global para barras de rolagem */}
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
            <motion.h1 
              className="text-3xl font-light tracking-wide text-white/90 mb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              ProfEyes
            </motion.h1>
            <motion.p 
              className="text-white/40 text-sm tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Entre ou crie uma conta para continuar
            </motion.p>
          </motion.div>

          <AnimatePresence mode="wait">
            {verifyEmailState ? (
              <VerifyEmailContent />
            ) : forgotPasswordState ? (
              <ForgotPasswordContent />
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/20 p-1 rounded-xl border-[0.5px] border-white/[0.03]">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-lg data-[state=active]:bg-black/40 data-[state=active]:text-white/90 data-[state=active]:shadow-sm text-white/50 transition-all duration-300"
                  >
                    <User className="h-3.5 w-3.5 mr-2 opacity-70" />
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="rounded-lg data-[state=active]:bg-black/40 data-[state=active]:text-white/90 data-[state=active]:shadow-sm text-white/50 transition-all duration-300"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-2 opacity-70" />
                    Cadastro
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-6">
                  <AnimatePresence mode="wait">
                    {loginSuccess ? (
                      <LoginSuccessContent />
                    ) : (
                      <motion.div 
                        className="space-y-5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        key="login-form"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
                            <Mail className="h-3 w-3 mr-1.5 opacity-40" />
                            Email
                          </Label>
                          <div className="relative group">
                            <Input 
                              id="email" 
                              type="email" 
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                clearError();
                              }}
                              placeholder="seu-email@exemplo.com"
                              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'email' ? 'border-rose-500/50 animate-shake' : ''}`}
                              disabled={authLoading || loadingAction !== null}
                              ref={emailRef}
                              style={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                color: "rgba(255, 255, 255, 0.7)",
                                caretColor: "rgba(255, 255, 255, 0.7)"
                              }}
                            />
                          </div>
                          <AnimatePresence>
                            {error?.field === 'email' && <ErrorMessage message={error.message} />}
                          </AnimatePresence>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
                            <KeyRound className="h-3 w-3 mr-1.5 opacity-40" />
                            Senha
                          </Label>
                          <div className="relative group">
                            <Input 
                              id="password" 
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                clearError();
                              }}
                              placeholder="••••••••"
                              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'password' ? 'border-rose-500/50 animate-shake' : ''}`}
                              disabled={authLoading || loadingAction !== null}
                              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                              ref={passwordRef}
                              style={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                color: "rgba(255, 255, 255, 0.7)",
                                caretColor: "rgba(255, 255, 255, 0.7)"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <AnimatePresence>
                            {error?.field === 'password' && <ErrorMessage message={error.message} />}
                          </AnimatePresence>
                          
                          {/* Linha com "Permanecer conectado" e "Esqueceu a senha?" */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="remember-me" 
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(checked === true)}
                                className="bg-black/20 border-white/10 rounded-md data-[state=checked]:bg-emerald-500/20 data-[state=checked]:border-emerald-500/50 data-[state=checked]:text-emerald-400 transition-all duration-300"
                              />
                              <Label 
                                htmlFor="remember-me" 
                                className={`text-xs ${rememberMe ? 'text-emerald-400/80' : 'text-white/60'} cursor-pointer transition-colors duration-300`}
                              >
                                Permanecer conectado
                              </Label>
                            </div>
                            
                            <button
                              onClick={() => setForgotPasswordState(true)}
                              className="text-xs text-white/40 hover:text-white/60 transition-colors"
                            >
                              Esqueceu a senha?
                            </button>
                          </div>
                        </div>
                        
                        {/* Remover o div de "Permanecer conectado" que estava aqui */}
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className="pt-2"
                        >
                          <Button 
                            className="w-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300 group"
                            onClick={handleLogin}
                            disabled={authLoading || loadingAction !== null}
                          >
                            {loadingAction === 'login' ? (
                              <div className="flex items-center justify-center space-x-3">
                                <div className="h-4 w-4 relative">
                                  <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                                  <div className="absolute inset-0 border-2 border-t-white/40 rounded-full animate-spin"></div>
                                </div>
                                <span className="text-sm tracking-wide text-white/50">Entrando...</span>
                              </div>
                            ) : (
                              <>
                                <LogIn className="h-4 w-4 mr-2 opacity-70 group-hover:opacity-90 transition-opacity" />
                                <span className="text-sm tracking-wide">Entrar</span>
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-6">
                  <AnimatePresence mode="wait">
                    {signupSuccess ? (
                      <SignupSuccessContent />
                    ) : (
                      <motion.div 
                        className="space-y-5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        key="signup-form"
                      >
                        {/* Email */}
                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
                            <Mail className="h-3 w-3 mr-1.5 opacity-40" />
                            Email
                          </Label>
                          <div className="relative group">
                            <Input 
                              id="signup-email" 
                              type="email" 
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                clearError();
                              }}
                              placeholder="seu-email@exemplo.com"
                              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'email' ? 'border-rose-500/50 animate-shake' : ''}`}
                              disabled={authLoading || loadingAction !== null}
                              ref={emailRef}
                              style={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                color: "rgba(255, 255, 255, 0.7)",
                                caretColor: "rgba(255, 255, 255, 0.7)"
                              }}
                            />
                          </div>
                          <AnimatePresence>
                            {error?.field === 'email' && <ErrorMessage message={error.message} />}
                          </AnimatePresence>
                        </div>
                        
                        {/* Senha */}
                        <div className="space-y-2">
                          <Label htmlFor="signup-password" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
                            <KeyRound className="h-3 w-3 mr-1.5 opacity-40" />
                            Senha
                          </Label>
                          <div className="relative group">
                            <Input 
                              id="signup-password" 
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                validatePasswordStrength(e.target.value);
                                validatePasswordMatch();
                                clearError();
                              }}
                              placeholder="••••••••"
                              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'password' ? 'border-rose-500/50 animate-shake' : ''}`}
                              disabled={authLoading || loadingAction !== null}
                              ref={passwordRef}
                              style={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                color: "rgba(255, 255, 255, 0.7)",
                                caretColor: "rgba(255, 255, 255, 0.7)"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
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
                        
                        {/* Confirmar Senha */}
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
                            <KeyRound className="h-3 w-3 mr-1.5 opacity-40" />
                            Confirmar Senha
                          </Label>
                          <div className="relative group">
                            <Input 
                              id="confirm-password" 
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                validatePasswordMatch();
                                clearError();
                              }}
                              placeholder="••••••••"
                              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'confirmPassword' ? 'border-rose-500/50 animate-shake' : ''}`}
                              disabled={authLoading || loadingAction !== null}
                              onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                              ref={confirmPasswordRef}
                              style={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                color: "rgba(255, 255, 255, 0.7)",
                                caretColor: "rgba(255, 255, 255, 0.7)"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
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
                        
                        {/* Data de Nascimento */}
                        <div className="space-y-2">
                          <Label htmlFor="birthdate" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1.5 opacity-40">
                              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                              <line x1="16" x2="16" y1="2" y2="6" />
                              <line x1="8" x2="8" y1="2" y2="6" />
                              <line x1="3" x2="21" y1="10" y2="10" />
                            </svg>
                            Data de Nascimento
                          </Label>
                          <div className="relative">
                            <Input 
                              id="birthdate" 
                              type="text"
                              value={birthdate}
                              onChange={handleBirthdateChange}
                              placeholder="DD/MM/AAAA"
                              maxLength={10}
                              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'birthdate' ? 'border-rose-500/50 animate-shake' : ''}`}
                              disabled={authLoading || loadingAction !== null}
                              style={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                color: "rgba(255, 255, 255, 0.7)",
                                caretColor: "rgba(255, 255, 255, 0.7)"
                              }}
                            />
                            <div className="absolute top-0 right-0 bottom-0 flex items-center pr-3 pointer-events-none">
                              <p className="text-xs text-white/20">
                                {birthdate.length < 2 ? "Dia" : 
                                 birthdate.length < 5 ? "Mês" : 
                                 birthdate.length < 10 ? "Ano" : ""}
                              </p>
                            </div>
                          </div>
                          <AnimatePresence>
                            {(error?.field === 'birthdate' && <ErrorMessage message={error.message} />) || 
                             (birthdateError && <ErrorMessage message={birthdateError} />)}
                          </AnimatePresence>
                          <p className="text-xs text-white/40 mt-1">Apenas maiores de 18 anos podem se cadastrar.</p>
                        </div>
                        
                        {/* Termos e Condições */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-start space-x-2">
                            <Checkbox 
                              id="terms" 
                              checked={termsAccepted}
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setShowTerms(true);
                                } else {
                                  setTermsAccepted(false);
                                }
                                clearError();
                              }}
                              className={`mt-1 relative ${
                                termsAccepted 
                                  ? 'bg-emerald-500/20 border-emerald-500/50 data-[state=checked]:bg-emerald-500/20 data-[state=checked]:border-emerald-400/50 data-[state=checked]:text-emerald-400'
                                  : 'bg-black/20 border-white/10 data-[state=checked]:bg-white/20 data-[state=checked]:border-white/30 data-[state=checked]:text-white'
                              } transition-all duration-300`}
                            />
                            {termsAccepted && (
                              <div className="absolute mt-1 ml-0.5 pointer-events-none">
                                <div className="absolute inset-0 rounded-sm bg-emerald-400/20 blur-[2px] scale-110"></div>
                                <div className="absolute inset-0 rounded-sm bg-emerald-400/10 blur-[4px] scale-150"></div>
                              </div>
                            )}
                            <div className="space-y-1">
                              <Label 
                                htmlFor="terms" 
                                className={`text-xs ${termsAccepted ? 'text-emerald-400/90' : 'text-white/60'} leading-relaxed cursor-pointer transition-colors duration-300`}
                              >
                                Li e concordo com os <button 
                                  type="button" 
                                  onClick={() => setShowTerms(true)}
                                  className={`${termsAccepted ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/80 hover:text-white'} underline underline-offset-2 focus:outline-none transition-colors duration-300`}
                                >
                                  Termos e Condições
                                </button> de uso da plataforma.
                              </Label>
                              <AnimatePresence>
                                {(error?.field === 'terms' || showTermsError && !termsAccepted) && (
                                  <ErrorMessage message="Você precisa aceitar os termos e condições para continuar" />
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                        
                        {/* Botão de Cadastro */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className="pt-2"
                        >
                          <Button 
                            className="w-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300 group"
                            onClick={handleSignUp}
                            disabled={authLoading || loadingAction !== null}
                          >
                            {loadingAction === 'signup' ? (
                              <div className="flex items-center justify-center space-x-3">
                                <div className="h-4 w-4 relative">
                                  <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                                  <div className="absolute inset-0 border-2 border-t-white/40 rounded-full animate-spin"></div>
                                </div>
                                <span className="text-sm tracking-wide text-white/50">Cadastrando...</span>
                              </div>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2 opacity-70 group-hover:opacity-90 transition-opacity" />
                                <span className="text-sm tracking-wide">Cadastrar</span>
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TabsContent>
              </Tabs>
            )}
          </AnimatePresence>
        </div>
        
        {/* Reflexo sutil na parte inferior */}
        <div className="absolute -bottom-10 left-0 right-0 h-20 bg-gradient-to-b from-white/[0.01] to-transparent blur-xl rounded-full mx-auto w-4/5 opacity-30"></div>
        <TermsAndConditionsModal showTerms={showTerms} setShowTerms={setShowTerms} />
      </motion.div>
    </div>
  );
} 
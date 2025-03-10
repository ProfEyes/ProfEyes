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

// Adicione este estilo global no início do arquivo, logo após os imports
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

  const { signInWithEmail, signUp, verifyEmail, isStrongPassword, loading: authLoading } = useAuth();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const verifyEmailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Limpar erro quando o usuário digita em qualquer campo
  const clearError = () => {
    if (error) setError(null);
  };

  // Validar campos e focalizar o primeiro campo vazio
  const validateFields = (isLogin: boolean) => {
    // Mostrar validações ao tentar criar conta apenas se houver problemas
    if (!isLogin) {
      // Verificar força da senha
      const strengthCheck = isStrongPassword(password);
      // Só mostrar validação de senha se houver problemas
      setShowPasswordValidation(!strengthCheck.isStrong);
      
      // Só mostrar validação de coincidência se as senhas não coincidirem
      setShowPasswordMatch(password !== confirmPassword && password && confirmPassword);
      
      // Sempre mostrar erro de termos se não estiverem aceitos
      setShowTermsError(!termsAccepted);
    }

    if (!email) {
      setError({ field: 'email', message: 'Por favor, informe seu email' });
      emailRef.current?.focus();
      return false;
    }
    
    if (!password) {
      setError({ field: 'password', message: 'Por favor, informe sua senha' });
      passwordRef.current?.focus();
      return false;
    }
    
    if (!isLogin) {
      if (!confirmPassword) {
        setError({ field: 'confirmPassword', message: 'Por favor, confirme sua senha' });
        confirmPasswordRef.current?.focus();
        return false;
      }
      
      if (password !== confirmPassword) {
        setError({ field: 'confirmPassword', message: 'As senhas não correspondem' });
        confirmPasswordRef.current?.focus();
        return false;
      }
      
      // Validar força da senha
      const strengthCheck = isStrongPassword(password);
      if (!strengthCheck.isStrong) {
        setError({ field: 'password', message: strengthCheck.message });
        passwordRef.current?.focus();
        return false;
      }
      
      // Verificar se os termos foram aceitos
      if (!termsAccepted) {
        setError({ field: 'terms', message: 'Você precisa aceitar os termos e condições para continuar' });
        return false;
      }
    }
    
    return true;
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
      const { error: authError } = await signInWithEmail(email, password);
      
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
      const { error: authError } = await signUp(email, password);
      
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
  const TermsAndConditionsModal = () => (
    <Dialog open={showTerms} onOpenChange={setShowTerms}>
      <DialogContent className="bg-black/80 backdrop-blur-xl border border-white/5 text-white/90 p-6 rounded-2xl max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light tracking-wide text-white/90 mb-4">Termos e Condições</DialogTitle>
          <DialogDescription className="text-white/70">
            <div className="space-y-4 text-sm">
              <h2 className="text-lg font-medium text-white/90">TERMOS E CONDIÇÕES DE USO - PROFEYES</h2>
              
              <p>Última atualização: {new Date().toLocaleDateString()}</p>
              
              <h3 className="text-md font-medium text-white/90 mt-4">1. INTRODUÇÃO</h3>
              <p>Bem-vindo ao ProfEyes ("nós", "nosso", "plataforma"). Ao acessar ou utilizar nossa plataforma, você concorda com estes Termos e Condições de Uso ("Termos"). Por favor, leia-os atentamente.</p>
              
              <h3 className="text-md font-medium text-white/90 mt-4">2. ISENÇÃO DE RESPONSABILIDADE SOBRE INVESTIMENTOS</h3>
              <p>2.1. <strong>Não somos consultores de investimentos:</strong> O ProfEyes NÃO é uma plataforma de consultoria de investimentos registrada na Comissão de Valores Mobiliários (CVM) ou qualquer outro órgão regulador. Não oferecemos recomendações personalizadas de investimentos.</p>
              
              <p>2.2. <strong>Conteúdo informativo:</strong> Todo o conteúdo disponibilizado em nossa plataforma, incluindo análises, gráficos, sinais e indicadores, tem caráter EXCLUSIVAMENTE INFORMATIVO e EDUCACIONAL.</p>
              
              <p>2.3. <strong>Ausência de garantia de resultados:</strong> Não garantimos rentabilidade, retorno ou resultado específico de qualquer natureza. Resultados passados NÃO são garantia de resultados futuros.</p>
              
              <p>2.4. <strong>Riscos inerentes:</strong> Investimentos em mercados financeiros envolvem riscos significativos, incluindo a possibilidade de perda parcial ou total do capital investido. O usuário reconhece e aceita estes riscos ao utilizar nossa plataforma.</p>
              
              <p>2.5. <strong>Decisão independente:</strong> Qualquer decisão de investimento tomada pelo usuário é de sua exclusiva responsabilidade. Recomendamos que o usuário consulte um profissional de investimentos devidamente certificado antes de tomar qualquer decisão de investimento.</p>
              
              <h3 className="text-md font-medium text-white/90 mt-4">3. LIMITAÇÃO DE RESPONSABILIDADE</h3>
              <p>3.1. <strong>Falhas técnicas:</strong> Não nos responsabilizamos por falhas, interrupções ou atrasos no funcionamento da plataforma, incluindo, mas não se limitando a: problemas de conexão, indisponibilidade do serviço, atrasos na transmissão de dados ou imprecisões nas informações fornecidas.</p>
              
              <p>3.2. <strong>Precisão das informações:</strong> Embora nos esforcemos para fornecer informações precisas e atualizadas, não garantimos a exatidão, integridade ou atualidade das informações disponibilizadas.</p>
              
              <p>3.3. <strong>Perdas financeiras:</strong> Em nenhuma circunstância seremos responsáveis por quaisquer perdas ou danos diretos, indiretos, incidentais, consequenciais, especiais ou punitivos resultantes do uso ou incapacidade de uso de nossa plataforma, incluindo perdas financeiras decorrentes de decisões de investimento.</p>
              
              <h3 className="text-md font-medium text-white/90 mt-4">4. CONFORMIDADE LEGAL</h3>
              <p>4.1. <strong>Legislação aplicável:</strong> Nossa plataforma opera em conformidade com a legislação brasileira, incluindo a Lei nº 6.385/76 (que regula o mercado de valores mobiliários) e as Instruções da CVM.</p>
              
              <p>4.2. <strong>Não caracterização de consultoria:</strong> De acordo com a Instrução CVM nº 592/2017, a atividade de consultoria de valores mobiliários consiste na prestação de serviços de orientação, recomendação e aconselhamento personalizado. Reiteramos que NÃO realizamos tais atividades.</p>
              
              <h3 className="text-md font-medium text-white/90 mt-4">5. PROPRIEDADE INTELECTUAL</h3>
              <p>5.1. Todo o conteúdo disponibilizado na plataforma, incluindo, mas não se limitando a textos, gráficos, logotipos, ícones, imagens, clipes de áudio, downloads digitais e compilações de dados, é de propriedade exclusiva do ProfEyes ou de seus fornecedores de conteúdo e está protegido pelas leis brasileiras e internacionais de direitos autorais.</p>
              
              <h3 className="text-md font-medium text-white/90 mt-4">6. MODIFICAÇÕES DOS TERMOS</h3>
              <p>6.1. Reservamo-nos o direito de modificar estes Termos a qualquer momento, a nosso exclusivo critério. As alterações entrarão em vigor imediatamente após sua publicação na plataforma. O uso continuado da plataforma após tais modificações constitui aceitação dos novos Termos.</p>
              
              <h3 className="text-md font-medium text-white/90 mt-4">7. DISPOSIÇÕES GERAIS</h3>
              <p>7.1. <strong>Lei aplicável:</strong> Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
              
              <p>7.2. <strong>Resolução de conflitos:</strong> Qualquer controvérsia originada ou relacionada a estes Termos será resolvida de forma amigável entre as partes. Não sendo possível, fica eleito o foro da comarca de São Paulo, com exclusão de qualquer outro, por mais privilegiado que seja.</p>
              
              <p>7.3. <strong>Independência das disposições:</strong> Se qualquer disposição destes Termos for considerada ilegal, nula ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.</p>
              
              <h3 className="text-md font-medium text-white/90 mt-4">8. CONTATO</h3>
              <p>8.1. Para questões relacionadas a estes Termos, entre em contato conosco através dos canais disponibilizados na plataforma.</p>
              
              <p className="mt-6 text-white/90">Ao utilizar nossa plataforma, você reconhece que leu, compreendeu e concorda com estes Termos e Condições de Uso.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button 
            onClick={() => {
              setTermsAccepted(true);
              setShowTerms(false);
            }}
            className="bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-10 rounded-xl transition-all duration-300"
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
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mx-auto bg-gradient-to-br from-black/40 to-black/20 p-4 rounded-full w-20 h-20 flex items-center justify-center border border-white/5 shadow-lg"
        >
          <Mail className="h-10 w-10 text-white/70" />
        </motion.div>
        <h2 className="text-xl font-light tracking-wide text-white/90">Verificar Email</h2>
        <p className="text-sm text-white/60 max-w-xs mx-auto">
          Enviaremos um link de verificação para o seu email. Verifique sua caixa de entrada e spam.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verify-email" className="text-xs uppercase text-white/40 tracking-wider font-light flex items-center">
            <Mail className="h-3 w-3 mr-1.5 opacity-40" />
            Email
          </Label>
          <div className="relative group">
            <Input 
              id="verify-email" 
              type="email" 
              value={verifyEmailAddress}
              onChange={(e) => {
                setVerifyEmailAddress(e.target.value);
                clearError();
              }}
              placeholder="seu-email@exemplo.com"
              className={`bg-black/20 border-[0.5px] border-white/[0.03] h-11 px-4 text-white/70 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-black/30 transition-all duration-300 rounded-xl placeholder:text-white/20 ${error?.field === 'verifyEmail' ? 'border-rose-500/50 animate-shake' : ''}`}
              disabled={loadingAction !== null}
              ref={verifyEmailRef}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyEmail()}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                color: "rgba(255, 255, 255, 0.7)",
                caretColor: "rgba(255, 255, 255, 0.7)"
              }}
            />
          </div>
          <AnimatePresence>
            {error?.field === 'verifyEmail' && <ErrorMessage message={error.message} />}
          </AnimatePresence>
        </div>
        
        <div className="pt-2 space-y-3">
          <Button 
            className="w-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] h-11 rounded-xl transition-all duration-300 group"
            onClick={handleVerifyEmail}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'verify' ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="h-4 w-4 relative">
                  <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-t-white/40 rounded-full animate-spin"></div>
                </div>
                <span className="text-sm tracking-wide text-white/50">Enviando...</span>
              </div>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2 opacity-70 group-hover:opacity-90 transition-opacity" />
                <span className="text-sm tracking-wide">Enviar Link</span>
              </>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full text-white/50 hover:text-white/70 hover:bg-white/5 h-11 rounded-xl transition-all duration-300 border border-white/5"
            onClick={openGmail}
          >
            <ExternalLink className="h-4 w-4 mr-2 opacity-70" />
            <span className="text-sm tracking-wide">Abrir Gmail</span>
          </Button>
          
          <Button 
            variant="link" 
            className="w-full text-white/40 hover:text-white/60 transition-colors"
            onClick={() => {
              setVerifyEmailState(false);
              setVerifyEmailAddress("");
              clearError();
            }}
          >
            <ArrowLeft className="h-3 w-3 mr-1.5" />
            <span className="text-xs tracking-wide">Voltar para login</span>
          </Button>
        </div>
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
          onClick={() => {
            setVerifyEmailState(true);
            setVerifyEmailAddress(registeredEmail);
          }}
        >
          <CheckCheck className="h-4 w-4 mr-2 opacity-70 group-hover:opacity-90 transition-opacity" />
          <span className="text-sm tracking-wide">Verificar Email</span>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/30 via-black to-black p-4 relative overflow-hidden">
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
                        </div>
                        
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
                              className="mt-1 bg-black/20 border-white/10 data-[state=checked]:bg-white/20 data-[state=checked]:border-white/30 data-[state=checked]:text-white"
                            />
                            <div className="space-y-1">
                              <Label 
                                htmlFor="terms" 
                                className="text-xs text-white/60 leading-relaxed cursor-pointer"
                              >
                                Li e concordo com os <button 
                                  type="button" 
                                  onClick={() => setShowTerms(true)}
                                  className="text-white/80 hover:text-white underline underline-offset-2 focus:outline-none"
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
        <TermsAndConditionsModal />
      </motion.div>
    </div>
  );
} 
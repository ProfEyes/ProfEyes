import { Language } from '@/contexts/LanguageContext';

export interface AuthTranslations {
  // Títulos principais
  loginSignupTitle: string;
  loginTab: string;
  signupTab: string;
  
  // Campos de formulário
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  birthdate: string;
  investorType: string;
  
  // Placeholders
  emailPlaceholder: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  displayNamePlaceholder: string;
  birthdatePlaceholder: string;
  
  // Botões
  loginButton: string;
  signupButton: string;
  forgotPassword: string;
  rememberMe: string;
  acceptTerms: string;
  viewTerms: string;
  backToLogin: string;
  sendResetEmail: string;
  updatePassword: string;
  backButton: string;
  sendEmailButton: string;
  
  // Tela de sucesso reset password
  emailSentTitle: string;
  emailSentMessage: string;
  backToLoginButton: string;
  
  // Redefinir senha específicos
  newPassword: string;
  newPasswordPlaceholder: string;
  confirmNewPassword: string;
  newPasswordDesc: string;
  newPasswordRequired: string;
  cancelButton: string;
  
  // Mensagens de erro
  emailRequired: string;
  emailInvalid: string;
  emailInvalidFormat: string;
  passwordRequired: string;
  passwordTooShort: string;
  passwordsNotMatch: string;
  displayNameRequired: string;
  displayNameTooShort: string;
  displayNameTooLong: string;
  birthdateRequired: string;
  birthdateInvalid: string;
  birthdateIncomplete: string;
  ageRestriction: string;
  yearValidation: string;
  termsRequired: string;
  investorTypeRequired: string;
  emailAlreadyRegistered: string;
  passwordUpdateError: string;
  resetEmailError: string;
  
  // Mensagens de sucesso
  loginSuccess: string;
  signupSuccess: string;
  emailSent: string;
  passwordUpdated: string;
  
  // Estados
  loading: string;
  verifyingEmail: string;
  sendingEmail: string;
  updatingPassword: string;
  
  // Esqueci a senha
  forgotPasswordTitle: string;
  forgotPasswordDesc: string;
  resetPasswordTitle: string;
  resetPasswordDesc: string;
  
  // Verificação de email
  verifyEmailTitle: string;
  verifyEmailDesc: string;
  resendVerification: string;
  
  // Força da senha
  passwordWeak: string;
  passwordMedium: string;
  passwordStrong: string;
  
  // Requisitos de senha
  passwordRequirements: string;
  passwordRequirementsMet: string;
  passwordMinLength: string;
  passwordLowercase: string;
  passwordUppercase: string;
  passwordNumber: string;
  passwordSpecial: string;
  passwordsMatch: string;
  passwordsNoMatch: string;
  
  // Tipos de investidor
  conservativeInvestor: string;
  moderateInvestor: string;
  aggressiveInvestor: string;
  professionalInvestor: string;
  
  // Descrições dos tipos de investidor
  conservativeDescription: string;
  moderateDescription: string;
  aggressiveDescription: string;
  professionalDescription: string;
  
  // Outros textos
  dayPlaceholder: string;
  characterCount: string;
  investorTypeDescription: string;
}

const authTranslations: Record<Language, AuthTranslations> = {
  pt: {
    // Títulos principais
    loginSignupTitle: 'Login / Cadastro',
    loginTab: 'Login',
    signupTab: 'Cadastro',
    
    // Campos de formulário
    email: 'Email',
    password: 'Senha',
    confirmPassword: 'Confirmar Senha',
    displayName: 'Nome de Exibição',
    birthdate: 'Data de Nascimento',
    investorType: 'Selecione seu Perfil',
    
    // Placeholders
    emailPlaceholder: 'seu-email@exemplo.com',
    passwordPlaceholder: '••••••••',
    confirmPasswordPlaceholder: '••••••••',
    displayNamePlaceholder: 'Digite seu nome (mín. 2, máx. 30 caracteres)',
    birthdatePlaceholder: 'DD/MM/AAAA',
    
    // Botões
    loginButton: 'Entrar',
    signupButton: 'Criar Conta',
    forgotPassword: 'Esqueceu a senha?',
    rememberMe: 'Lembrar de mim',
    acceptTerms: 'Li e aceito os termos e condições',
    viewTerms: 'Ver termos',
    backToLogin: 'Voltar ao Login',
    sendResetEmail: 'Enviar Email de Recuperação',
    updatePassword: 'Atualizar Senha',
    backButton: 'Voltar',
    sendEmailButton: 'Enviar Email',
    
    // Tela de sucesso reset password
    emailSentTitle: 'Email Enviado!',
    emailSentMessage: 'Enviamos instruções de recuperação de senha para seu email. Por favor, verifique sua caixa de entrada.',
    backToLoginButton: 'Voltar para o login',
    
    // Redefinir senha específicos
    newPassword: 'Nova Senha',
    newPasswordPlaceholder: '••••••••',
    confirmNewPassword: 'Confirmar Nova Senha',
    newPasswordDesc: 'Digite sua nova senha abaixo para acessar sua conta.',
    newPasswordRequired: 'Por favor, informe sua nova senha',
    cancelButton: 'Cancelar',
    
    // Mensagens de erro
    emailRequired: 'Por favor, informe seu email',
    emailInvalid: 'Por favor, informe um email válido',
    emailInvalidFormat: 'O formato do email informado é inválido',
    passwordRequired: 'Por favor, informe sua senha',
    passwordTooShort: 'Senha deve ter pelo menos 8 caracteres',
    passwordsNotMatch: 'As senhas não coincidem',
    displayNameRequired: 'Por favor, informe seu nome de exibição',
    displayNameTooShort: 'Nome deve ter pelo menos 2 caracteres',
    displayNameTooLong: 'Nome deve ter no máximo 30 caracteres',
    birthdateRequired: 'Por favor, informe sua data de nascimento',
    birthdateInvalid: 'Data de nascimento inválida',
    birthdateIncomplete: 'Por favor, informe uma data de nascimento completa (DD/MM/AAAA)',
    ageRestriction: 'Você deve ter pelo menos 18 anos',
    yearValidation: 'Por favor, verifique o ano de nascimento informado',
    termsRequired: 'Você precisa aceitar os termos e condições para continuar',
    investorTypeRequired: 'Por favor, selecione seu perfil de investidor',
    emailAlreadyRegistered: 'Este email já está cadastrado. Por favor, faça login com sua conta existente.',
    passwordUpdateError: 'Erro ao atualizar senha. Tente novamente.',
    resetEmailError: 'Erro ao enviar email de recuperação. Tente novamente.',
    
    // Mensagens de sucesso
    loginSuccess: 'Login realizado com sucesso!',
    signupSuccess: 'Conta criada com sucesso!',
    emailSent: 'Email enviado com sucesso!',
    passwordUpdated: 'Senha atualizada com sucesso!',
    
    // Estados
    loading: 'Carregando...',
    verifyingEmail: 'Verificando email...',
    sendingEmail: 'Enviando email...',
    updatingPassword: 'Atualizando senha...',
    
    // Esqueci a senha
    forgotPasswordTitle: 'Recuperar Senha',
    forgotPasswordDesc: 'Digite seu email para receber instruções de recuperação',
    resetPasswordTitle: 'Redefinir Senha',
    resetPasswordDesc: 'Digite sua nova senha',
    
    // Verificação de email
    verifyEmailTitle: 'Verificar Email',
    verifyEmailDesc: 'Enviamos um link de verificação para seu email',
    resendVerification: 'Reenviar verificação',
    
    // Força da senha
    passwordWeak: 'Senha fraca',
    passwordMedium: 'Senha média',
    passwordStrong: 'Senha forte',
    
    // Requisitos de senha
    passwordRequirements: 'Requisitos de senha',
    passwordRequirementsMet: 'atendidos',
    passwordMinLength: 'Pelo menos 8 caracteres',
    passwordLowercase: 'Pelo menos uma letra minúscula',
    passwordUppercase: 'Pelo menos uma letra maiúscula',
    passwordNumber: 'Pelo menos um número',
    passwordSpecial: 'Pelo menos um caractere especial',
    passwordsMatch: 'Senhas coincidem',
    passwordsNoMatch: 'Senhas não coincidem',
    
    // Tipos de investidor
    conservativeInvestor: 'Conservador',
    moderateInvestor: 'Moderado',
    aggressiveInvestor: 'Agressivo',
    professionalInvestor: 'Profissional',
    
    // Descrições dos tipos de investidor
    conservativeDescription: 'Prefere investimentos de baixo risco e com retornos estáveis. Foca em preservação de capital com títulos públicos, CDBs e fundos de renda fixa.',
    moderateDescription: 'Busca equilíbrio entre segurança e crescimento. Combina renda fixa com ações de empresas sólidas e fundos diversificados.',
    aggressiveDescription: 'Aceita riscos elevados em busca de maiores retornos. Investe em ações voláteis, criptomoedas e ativos de alto crescimento.',
    professionalDescription: 'Investidor qualificado com ampla experiência no mercado financeiro e conhecimento avançado em estratégias complexas.',
    
    // Outros textos
    dayPlaceholder: 'Dia',
    characterCount: '/30',
    investorTypeDescription: 'Escolha o perfil que melhor representa sua estratégia de investimento'
  },
  
  en: {
    // Títulos principais
    loginSignupTitle: 'Login / Sign Up',
    loginTab: 'Login',
    signupTab: 'Sign Up',
    
    // Campos de formulário
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    displayName: 'Display Name',
    birthdate: 'Date of Birth',
    investorType: 'Select your Profile',
    
    // Placeholders
    emailPlaceholder: 'your-email@example.com',
    passwordPlaceholder: '••••••••',
    confirmPasswordPlaceholder: '••••••••',
    displayNamePlaceholder: 'Enter your name (min. 2, max. 30 characters)',
    birthdatePlaceholder: 'MM/DD/YYYY',
    
    // Botões
    loginButton: 'Sign In',
    signupButton: 'Create Account',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Remember me',
    acceptTerms: 'I have read and accept the terms and conditions',
    viewTerms: 'View terms',
    backToLogin: 'Back to Login',
    sendResetEmail: 'Send Recovery Email',
    updatePassword: 'Update Password',
    backButton: 'Back',
    sendEmailButton: 'Send Email',
    
    // Tela de sucesso reset password
    emailSentTitle: 'Email Sent!',
    emailSentMessage: 'We sent password recovery instructions to your email. Please check your inbox.',
    backToLoginButton: 'Back to login',
    
    // Redefinir senha específicos
    newPassword: 'New Password',
    newPasswordPlaceholder: '••••••••',
    confirmNewPassword: 'Confirm New Password',
    newPasswordDesc: 'Enter your new password below to access your account.',
    newPasswordRequired: 'Please enter your new password',
    cancelButton: 'Cancel',
    
    // Mensagens de erro
    emailRequired: 'Please enter your email',
    emailInvalid: 'Please enter a valid email',
    emailInvalidFormat: 'The email format provided is invalid',
    passwordRequired: 'Please enter your password',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordsNotMatch: 'Passwords do not match',
    displayNameRequired: 'Please enter your display name',
    displayNameTooShort: 'Name must be at least 2 characters',
    displayNameTooLong: 'Name must be at most 30 characters',
    birthdateRequired: 'Please enter your date of birth',
    birthdateInvalid: 'Invalid date of birth',
    birthdateIncomplete: 'Please enter a complete date of birth (MM/DD/YYYY)',
    ageRestriction: 'You must be at least 18 years old',
    yearValidation: 'Please check the birth year entered',
    termsRequired: 'You must accept the terms and conditions to continue',
    investorTypeRequired: 'Please select your investor profile',
    emailAlreadyRegistered: 'This email is already registered. Please login with your existing account.',
    passwordUpdateError: 'Error updating password. Please try again.',
    resetEmailError: 'Error sending recovery email. Please try again.',
    
    // Mensagens de sucesso
    loginSuccess: 'Login successful!',
    signupSuccess: 'Account created successfully!',
    emailSent: 'Email sent successfully!',
    passwordUpdated: 'Password updated successfully!',
    
    // Estados
    loading: 'Loading...',
    verifyingEmail: 'Verifying email...',
    sendingEmail: 'Sending email...',
    updatingPassword: 'Updating password...',
    
    // Esqueci a senha
    forgotPasswordTitle: 'Recover Password',
    forgotPasswordDesc: 'Enter your email to receive recovery instructions',
    resetPasswordTitle: 'Reset Password',
    resetPasswordDesc: 'Enter your new password',
    
    // Verificação de email
    verifyEmailTitle: 'Verify Email',
    verifyEmailDesc: 'We sent a verification link to your email',
    resendVerification: 'Resend verification',
    
    // Força da senha
    passwordWeak: 'Weak password',
    passwordMedium: 'Medium password',
    passwordStrong: 'Strong password',
    
    // Requisitos de senha
    passwordRequirements: 'Password requirements',
    passwordRequirementsMet: 'met',
    passwordMinLength: 'At least 8 characters',
    passwordLowercase: 'At least one lowercase letter',
    passwordUppercase: 'At least one uppercase letter',
    passwordNumber: 'At least one number',
    passwordSpecial: 'At least one special character',
    passwordsMatch: 'Passwords match',
    passwordsNoMatch: 'Passwords do not match',
    
    // Tipos de investidor
    conservativeInvestor: 'Conservative',
    moderateInvestor: 'Moderate',
    aggressiveInvestor: 'Aggressive',
    professionalInvestor: 'Professional',
    
    // Descrições dos tipos de investidor
    conservativeDescription: 'Prefers low-risk investments with stable returns. Focuses on capital preservation through government bonds, CDs, and fixed income funds.',
    moderateDescription: 'Seeks balance between security and growth. Combines fixed income with solid company stocks and diversified funds.',
    aggressiveDescription: 'Accepts high risks in pursuit of greater returns. Invests in volatile stocks, cryptocurrencies, and high-growth assets.',
    professionalDescription: 'Qualified investor with extensive experience in financial markets and advanced knowledge of complex strategies.',
    
    // Outros textos
    dayPlaceholder: 'Day',
    characterCount: '/30',
    investorTypeDescription: 'Choose the profile that best represents your investment strategy'
  },
  
  es: {
    // Títulos principais
    loginSignupTitle: 'Iniciar Sesión / Registro',
    loginTab: 'Iniciar Sesión',
    signupTab: 'Registro',
    
    // Campos de formulário
    email: 'Email',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    displayName: 'Nombre de Usuario',
    birthdate: 'Fecha de Nacimiento',
    investorType: 'Selecciona tu Perfil',
    
    // Placeholders
    emailPlaceholder: 'tu-email@ejemplo.com',
    passwordPlaceholder: '••••••••',
    confirmPasswordPlaceholder: '••••••••',
    displayNamePlaceholder: 'Ingresa tu nombre (mín. 2, máx. 30 caracteres)',
    birthdatePlaceholder: 'DD/MM/AAAA',
    
    // Botões
    loginButton: 'Ingresar',
    signupButton: 'Crear Cuenta',
    forgotPassword: '¿Olvidaste la contraseña?',
    rememberMe: 'Recordarme',
    acceptTerms: 'He leído y acepto los términos y condiciones',
    viewTerms: 'Ver términos',
    backToLogin: 'Volver al Login',
    sendResetEmail: 'Enviar Email de Recuperación',
    updatePassword: 'Actualizar Contraseña',
    backButton: 'Volver',
    sendEmailButton: 'Enviar Email',
    
    // Tela de sucesso reset password
    emailSentTitle: '¡Email Enviado!',
    emailSentMessage: 'Enviamos instrucciones de recuperación de contraseña a tu email. Por favor, revisa tu bandeja de entrada.',
    backToLoginButton: 'Volver al login',
    
    // Redefinir senha específicos
    newPassword: 'Nueva Contraseña',
    newPasswordPlaceholder: '••••••••',
    confirmNewPassword: 'Confirmar Nueva Contraseña',
    newPasswordDesc: 'Ingresa tu nueva contraseña a continuación para acceder a tu cuenta.',
    newPasswordRequired: 'Por favor, ingresa tu nueva contraseña',
    cancelButton: 'Cancelar',
    
    // Mensagens de erro
    emailRequired: 'Por favor, ingresa tu email',
    emailInvalid: 'Por favor, ingresa un email válido',
    emailInvalidFormat: 'El formato del email proporcionado no es válido',
    passwordRequired: 'Por favor, ingresa tu contraseña',
    passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
    passwordsNotMatch: 'Las contraseñas no coinciden',
    displayNameRequired: 'Por favor, ingresa tu nombre de usuario',
    displayNameTooShort: 'El nombre debe tener al menos 2 caracteres',
    displayNameTooLong: 'El nombre debe tener máximo 30 caracteres',
    birthdateRequired: 'Por favor, ingresa tu fecha de nacimiento',
    birthdateInvalid: 'Fecha de nacimiento inválida',
    birthdateIncomplete: 'Por favor, ingresa una fecha de nacimiento completa (DD/MM/AAAA)',
    ageRestriction: 'Debes tener al menos 18 años',
    yearValidation: 'Por favor, verifica el año de nacimiento ingresado',
    termsRequired: 'Debes aceptar los términos y condiciones para continuar',
    investorTypeRequired: 'Por favor, selecciona tu perfil de inversor',
    emailAlreadyRegistered: 'Este email ya está registrado. Por favor, inicia sesión con tu cuenta existente.',
    passwordUpdateError: 'Error al actualizar contraseña. Inténtalo de nuevo.',
    resetEmailError: 'Error al enviar email de recuperación. Inténtalo de nuevo.',
    
    // Mensagens de sucesso
    loginSuccess: '¡Inicio de sesión exitoso!',
    signupSuccess: '¡Cuenta creada exitosamente!',
    emailSent: '¡Email enviado exitosamente!',
    passwordUpdated: '¡Contraseña actualizada exitosamente!',
    
    // Estados
    loading: 'Cargando...',
    verifyingEmail: 'Verificando email...',
    sendingEmail: 'Enviando email...',
    updatingPassword: 'Actualizando contraseña...',
    
    // Esqueci a senha
    forgotPasswordTitle: 'Recuperar Contraseña',
    forgotPasswordDesc: 'Ingresa tu email para recibir instrucciones de recuperación',
    resetPasswordTitle: 'Restablecer Contraseña',
    resetPasswordDesc: 'Ingresa tu nueva contraseña',
    
    // Verificação de email
    verifyEmailTitle: 'Verificar Email',
    verifyEmailDesc: 'Enviamos un enlace de verificación a tu email',
    resendVerification: 'Reenviar verificación',
    
    // Força da senha
    passwordWeak: 'Contraseña débil',
    passwordMedium: 'Contraseña media',
    passwordStrong: 'Contraseña fuerte',
    
    // Requisitos de senha
    passwordRequirements: 'Requisitos de contraseña',
    passwordRequirementsMet: 'cumplidos',
    passwordMinLength: 'Al menos 8 caracteres',
    passwordLowercase: 'Al menos una letra minúscula',
    passwordUppercase: 'Al menos una letra mayúscula',
    passwordNumber: 'Al menos un número',
    passwordSpecial: 'Al menos un carácter especial',
    passwordsMatch: 'Las contraseñas coinciden',
    passwordsNoMatch: 'Las contraseñas no coinciden',
    
    // Tipos de investidor
    conservativeInvestor: 'Conservador',
    moderateInvestor: 'Moderado',
    aggressiveInvestor: 'Agresivo',
    professionalInvestor: 'Profesional',
    
    // Descrições dos tipos de investidor
    conservativeDescription: 'Prefiere inversiones de bajo riesgo con retornos estables. Se enfoca en preservación del capital a través de bonos gubernamentales, CDs y fondos de renta fija.',
    moderateDescription: 'Busca equilibrio entre seguridad y crecimiento. Combina renta fija con acciones de empresas sólidas y fondos diversificados.',
    aggressiveDescription: 'Acepta riesgos elevados en busca de mayores retornos. Invierte en acciones volátiles, criptomonedas y activos de alto crecimiento.',
    professionalDescription: 'Inversor calificado con amplia experiencia en mercados financieros y conocimiento avanzado de estrategias complejas.',
    
    // Outros textos
    dayPlaceholder: 'Día',
    characterCount: '/30',
    investorTypeDescription: 'Elige el perfil que mejor represente tu estrategia de inversión'
  },

  'settings.account.verifyPassword': {
    en: 'Verify Password',
    pt: 'Verificar Senha',
    es: 'Verificar Contraseña'
  },
  'settings.account.enterCurrentPassword': {
    en: 'Enter your current password',
    pt: 'Digite sua senha atual',
    es: 'Ingrese su contraseña actual'
  },
  'settings.account.incorrectPassword': {
    en: 'Incorrect password. Please check and try again.',
    pt: 'Senha incorreta. Verifique e tente novamente.',
    es: 'Contraseña incorrecta. Verifique e intente nuevamente.'
  }
};

export const getAuthTranslations = (language: Language): AuthTranslations => {
  return authTranslations[language] || authTranslations.pt;
};

export default authTranslations; 
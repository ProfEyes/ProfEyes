import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

interface LanguageProviderProps {
  children: ReactNode;
}

// Traduções para os três idiomas
const translations = {
  pt: {
    // Navbar
    'nav.home': 'Início',
    'nav.dashboard': 'Painel',
    'nav.settings': 'Configurações',
    'nav.instructions': 'Instruções',
    
    // Settings
    'settings.title': 'Configurações',
    'settings.subtitle': 'Personalize a plataforma de acordo com suas preferências',
    'settings.language': 'Idioma',
    'settings.language.description': 'Escolha o idioma da interface',
    'settings.language.select': 'Selecione um idioma',
    'settings.language.pt': 'Português',
    'settings.language.en': 'Inglês',
    'settings.language.es': 'Espanhol',
    'settings.save': 'Salvar',
    'settings.saving': 'Salvando...',
    'settings.saved': 'Salvo',
    'settings.general': 'Configurações Gerais',
    'settings.profile': 'Perfil e Segurança',
    'settings.appearance': 'Aparência',
    'settings.notifications': 'Notificações',
    'settings.help': 'Ajuda e Suporte',
    'settings.saveSuccessMessage': 'Configurações salvas com sucesso',
    'settings.saveSuccessDescription': 'Todas as suas preferências foram atualizadas.',
    'settings.saveErrorMessage': 'Erro ao salvar configurações',
    
    // Instructions
    'instructions.title': 'Instruções',
    'instructions.subtitle': 'Dicas e orientações para utilizar a plataforma',
    'instructions.back': 'Voltar',
    'instructions.intro.title': 'Introdução',
    'instructions.intro.text1': 'Bem-vindo à plataforma de análise de sinais de trading. Esta aplicação foi desenvolvida para auxiliar traders a tomar decisões mais informadas com base em dados em tempo real.',
    'instructions.intro.text2': 'Utilize o painel principal (Dashboard) para visualizar um resumo das informações mais importantes como sinais ativos, notícias relevantes e estatísticas do mercado.',
    'instructions.intro.text3': 'Na seção de Sinais, você encontrará análises detalhadas e recomendações de operações com base nos indicadores técnicos e fundamentais.',
    'instructions.features.title': 'Funcionalidades',
    'instructions.features.dashboard': 'Dashboard: Visualize sinais de trading, notícias e estatísticas em um só lugar',
    'instructions.features.signals': 'Sinais: Acesse detalhes completos de cada recomendação de trading',
    'instructions.features.news': 'Notícias: Acompanhe as últimas notícias do mercado financeiro',
    'instructions.features.notifications': 'Notificações: Receba alertas sobre eventos importantes e novos sinais',
    'instructions.howto.title': 'Como Utilizar',
    'instructions.howto.intro': 'Para obter o melhor resultado da plataforma, recomendamos:',
    'instructions.howto.step1': 'Atualize regularmente o dashboard para obter os dados mais recentes',
    'instructions.howto.step2': 'Verifique as notícias para entender o contexto atual do mercado',
    'instructions.howto.step3': 'Analise os sinais de trading considerando seu próprio perfil de risco',
    'instructions.howto.step4': 'Configure as notificações para ser alertado sobre oportunidades',
    'instructions.howto.step5': 'Acompanhe o histórico de sinais para avaliar a performance ao longo do tempo',
    'instructions.terms.title': 'Termos Importantes',
    'instructions.terms.signal.title': 'Sinal de Trading',
    'instructions.terms.signal.desc': 'Indicação para comprar ou vender um ativo com base em análise técnica ou fundamentalista.',
    'instructions.terms.entry.title': 'Entrada',
    'instructions.terms.entry.desc': 'Momento ideal para iniciar uma operação no mercado.',
    'instructions.terms.target.title': 'Alvo (Target)',
    'instructions.terms.target.desc': 'Preço em que se recomenda realizar o lucro e encerrar a operação.',
    'instructions.terms.stop.title': 'Stop Loss',
    'instructions.terms.stop.desc': 'Preço em que se recomenda encerrar a operação para limitar perdas.',
    'instructions.terms.reentry.title': 'Reentrada',
    'instructions.terms.reentry.desc': 'Momentos alternativos para entrar na operação caso tenha perdido a entrada inicial.',
    
    // Video paths
    'video.instructions': '/videos/instructions-pt.mp4/TUTORIAL PORTUGUES - TRENDING -FIX.mp4',
    'video.poster.instructions': '/images/instructions-poster-pt.jpg',
    'video.main': '/videos/dashboard-pt.mp4/TUTORIAL PORTUGUES - TRENDING -FIX.mp4',
  },
  en: {
    // Navbar
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.instructions': 'Instructions',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize the platform according to your preferences',
    'settings.language': 'Language',
    'settings.language.description': 'Choose the interface language',
    'settings.language.select': 'Select a language',
    'settings.language.pt': 'Portuguese',
    'settings.language.en': 'English',
    'settings.language.es': 'Spanish',
    'settings.save': 'Save',
    'settings.saving': 'Saving...',
    'settings.saved': 'Saved',
    'settings.general': 'General Settings',
    'settings.profile': 'Profile & Security',
    'settings.appearance': 'Appearance',
    'settings.notifications': 'Notifications',
    'settings.help': 'Support',
    'settings.saveSuccessMessage': 'Settings saved successfully',
    'settings.saveSuccessDescription': 'All your preferences have been updated.',
    'settings.saveErrorMessage': 'Error saving settings',
    
    // Instructions
    'instructions.title': 'Instructions',
    'instructions.subtitle': 'Tips and guidelines for using the platform',
    'instructions.back': 'Back',
    'instructions.intro.title': 'Introduction',
    'instructions.intro.text1': 'Welcome to the trading signal analysis platform. This application was developed to help traders make more informed decisions based on real-time data.',
    'instructions.intro.text2': 'Use the main dashboard to view a summary of the most important information such as active signals, relevant news, and market statistics.',
    'instructions.intro.text3': 'In the Signals section, you will find detailed analyses and trading recommendations based on technical and fundamental indicators.',
    'instructions.features.title': 'Features',
    'instructions.features.dashboard': 'Dashboard: View trading signals, news, and statistics in one place',
    'instructions.features.signals': 'Signals: Access complete details of each trading recommendation',
    'instructions.features.news': 'News: Keep up with the latest financial market news',
    'instructions.features.notifications': 'Notifications: Receive alerts about important events and new signals',
    'instructions.howto.title': 'How to Use',
    'instructions.howto.intro': 'To get the best results from the platform, we recommend:',
    'instructions.howto.step1': 'Regularly update the dashboard to get the most recent data',
    'instructions.howto.step2': 'Check the news to understand the current market context',
    'instructions.howto.step3': 'Analyze trading signals considering your own risk profile',
    'instructions.howto.step4': 'Configure notifications to be alerted about opportunities',
    'instructions.howto.step5': 'Track the signal history to evaluate performance over time',
    'instructions.terms.title': 'Important Terms',
    'instructions.terms.signal.title': 'Trading Signal',
    'instructions.terms.signal.desc': 'Indication to buy or sell an asset based on technical or fundamental analysis.',
    'instructions.terms.entry.title': 'Entry',
    'instructions.terms.entry.desc': 'Ideal moment to start a market operation.',
    'instructions.terms.target.title': 'Target',
    'instructions.terms.target.desc': 'Price at which it is recommended to realize profit and close the operation.',
    'instructions.terms.stop.title': 'Stop Loss',
    'instructions.terms.stop.desc': 'Price at which it is recommended to close the operation to limit losses.',
    'instructions.terms.reentry.title': 'Re-entry',
    'instructions.terms.reentry.desc': 'Alternative moments to enter the operation if you missed the initial entry.',
    
    // Video paths
    'video.instructions': '/videos/instructions-en.mp4/TUTORIAL ENGLISH - TRENDING.mp4',
    'video.poster.instructions': '/images/instructions-poster-en.jpg',
    'video.main': '/videos/dashboard-en.mp4/TUTORIAL ENGLISH - TRENDING.mp4',
  },
  es: {
    // Navbar
    'nav.home': 'Inicio',
    'nav.dashboard': 'Panel',
    'nav.settings': 'Configuración',
    'nav.instructions': 'Instrucciones',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.subtitle': 'Personaliza la plataforma según tus preferencias',
    'settings.language': 'Idioma',
    'settings.language.description': 'Elige el idioma de la interfaz',
    'settings.language.select': 'Selecciona un idioma',
    'settings.language.pt': 'Portugués',
    'settings.language.en': 'Inglés',
    'settings.language.es': 'Español',
    'settings.save': 'Guardar',
    'settings.saving': 'Guardando...',
    'settings.saved': 'Guardado',
    'settings.general': 'Configuración General',
    'settings.profile': 'Perfil y Seguridad',
    'settings.appearance': 'Apariencia',
    'settings.notifications': 'Notificaciones',
    'settings.help': 'Soporte',
    'settings.saveSuccessMessage': 'Configuración guardada con éxito',
    'settings.saveSuccessDescription': 'Todas tus preferencias han sido actualizadas.',
    'settings.saveErrorMessage': 'Error al guardar la configuración',
    
    // Instructions
    'instructions.title': 'Instrucciones',
    'instructions.subtitle': 'Consejos y orientaciones para utilizar la plataforma',
    'instructions.back': 'Volver',
    'instructions.intro.title': 'Introducción',
    'instructions.intro.text1': 'Bienvenido a la plataforma de análisis de señales de trading. Esta aplicación fue desarrollada para ayudar a los traders a tomar decisiones más informadas basadas en datos en tiempo real.',
    'instructions.intro.text2': 'Utilice el panel principal (Dashboard) para visualizar un resumen de la información más importante como señales activas, noticias relevantes y estadísticas del mercado.',
    'instructions.intro.text3': 'En la sección de Señales, encontrará análisis detallados y recomendaciones de operaciones basadas en indicadores técnicos y fundamentales.',
    'instructions.features.title': 'Funcionalidades',
    'instructions.features.dashboard': 'Dashboard: Visualice señales de trading, noticias y estadísticas en un solo lugar',
    'instructions.features.signals': 'Señales: Acceda a detalles completos de cada recomendación de trading',
    'instructions.features.news': 'Noticias: Siga las últimas noticias del mercado financiero',
    'instructions.features.notifications': 'Notificaciones: Reciba alertas sobre eventos importantes y nuevas señales',
    'instructions.howto.title': 'Cómo Utilizar',
    'instructions.howto.intro': 'Para obtener el mejor resultado de la plataforma, recomendamos:',
    'instructions.howto.step1': 'Actualice regularmente el dashboard para obtener los datos más recientes',
    'instructions.howto.step2': 'Verifique las noticias para entender el contexto actual del mercado',
    'instructions.howto.step3': 'Analice las señales de trading considerando su propio perfil de riesgo',
    'instructions.howto.step4': 'Configure las notificaciones para ser alertado sobre oportunidades',
    'instructions.howto.step5': 'Acompañe el histórico de señales para evaluar el rendimiento a lo largo del tiempo',
    'instructions.terms.title': 'Términos Importantes',
    'instructions.terms.signal.title': 'Señal de Trading',
    'instructions.terms.signal.desc': 'Indicación para comprar o vender un activo basado en análisis técnico o fundamentalista.',
    'instructions.terms.entry.title': 'Entrada',
    'instructions.terms.entry.desc': 'Momento ideal para iniciar una operación en el mercado.',
    'instructions.terms.target.title': 'Objetivo (Target)',
    'instructions.terms.target.desc': 'Precio en el que se recomienda realizar el beneficio y cerrar la operación.',
    'instructions.terms.stop.title': 'Stop Loss',
    'instructions.terms.stop.desc': 'Precio en el que se recomienda cerrar la operación para limitar pérdidas.',
    'instructions.terms.reentry.title': 'Reentrada',
    'instructions.terms.reentry.desc': 'Momentos alternativos para entrar en la operación en caso de que haya perdido la entrada inicial.',
    
    // Video paths
    'video.instructions': '/videos/instructions-es.mp4/TUTORIAL ESPAÑOL - TRENDING.mp4',
    'video.poster.instructions': '/images/instructions-poster-es.jpg',
    'video.main': '/videos/dashboard-es.mp4/TUTORIAL ESPAÑOL - TRENDING.mp4',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  // Detectar idioma do navegador ou usar idioma salvo
  const getInitialLanguage = (): Language => {
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage && ['pt', 'en', 'es'].includes(savedLanguage)) {
      return savedLanguage as Language;
    }
    
    // Detectar do navegador
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'pt' || browserLang === 'en' || browserLang === 'es') {
      return browserLang as Language;
    }
    
    // Padrão para português
    return 'pt';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  // Função de tradução
  const t = (key: string): string => {
    const currentTranslations = translations[language];
    return currentTranslations[key as keyof typeof currentTranslations] || key;
  };

  const value = {
    language,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage deve ser usado dentro de um LanguageProvider');
  }
  return context;
}; 
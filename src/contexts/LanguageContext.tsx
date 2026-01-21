import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { userService } from '@/services/userService';
import { geoLocationService } from '@/services/geoLocationService';

export type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tObj: <T>(key: string) => T | null;
  changeLanguage: (lang: Language) => void;
  updateUserLanguage: (userId: string, lang: Language) => Promise<void>;
  loadUserLanguageFromDB: (userId: string) => Promise<void>;
  forceLanguageDetection: () => Promise<Language>;
  getLanguageDetectionInfo: () => { source: string | null; country: string | null; language: string | null; cached: boolean; };
  availableLanguages: { code: Language; name: string }[];
}

interface LanguageProviderProps {
  children: ReactNode;
}

// Definição de tipo para as traduções
interface TranslationRecord {
  [key: string]: string | TranslationRecord | {
    [key: string]: string | TranslationRecord;
  };
  
  // Defina as propriedades aninhadas para evitar erros de TypeScript
  live?: {
    title: string;
    subtitle: string;
    active_streams: string;
    active_count: string;
    no_active: string;
    no_streams_message: string;
    live: string;
    comments: string;
    no_comments: string;
    type_comment: string;
    streaming_placeholder: string;
    about: string;
    end_stream: string;
    start_streaming: string;
    start_streaming_desc: string;
    stream_title: string;
    stream_description: string;
    title_placeholder: string;
    description_placeholder: string;
    go_live: string;
    no_permission_title: string;
    no_permission_desc: string;
    error: {
      title_required: string;
      media_access: string;
    };
  };
  
  meetings?: {
    title: string;
    subtitle: string;
    active_meetings: string;
    create_meeting: string;
    meeting_title: string;
    meeting_description: string;
    title_placeholder: string;
    description_placeholder: string;
    start_meeting: string;
    creating_meeting: string;
    no_active_meetings: string;
    participants: string;
    join: string;
    end_meeting: string;
    copy_link: string;
    link_copied: string;
    about: {
      title: string;
      intro: string;
      how_works: string;
      benefits: string;
      features: {
        permission: string;
        google_meet: string;
        join: string;
        share: string;
        screen_sharing: string;
        chat: string;
        quality: string;
        stability: string;
      };
    };
    error: {
      title_required: string;
      permission_denied: string;
      create_failed: string;
      end_failed: string;
    };
    demo: {
      title: string;
      description: string;
      create_hint: string;
      features_title: string;
      feature_1: string;
      feature_2: string;
      feature_3: string;
      feature_4: string;
      feature_5: string;
      coming_soon: string;
      soon_1: string;
      soon_2: string;
      soon_3: string;
      soon_4: string;
    };
  };
  
  support?: {
    title: string;
    subtitle: string;
    welcome: string;
    input_placeholder: string;
    send: string;
    online: string;
    typing: string;
    human_support: string;
    ai_disclaimer: string;
    chat: {
      title: string;
      subtitle: string;
      placeholder: string;
    };
    topics: {
      select_topic: string;
      help_topics: string;
      back_to_topics: string;
      support_trending: string;
    };
    topic_investment: {
      title: string;
      description: string;
      q1: {
        question: string;
        answer: string;
      };
      q2: {
        question: string;
        answer: string;
      };
      q3: {
        question: string;
        answer: string;
      };
    };
    topic_platform: {
      title: string;
      description: string;
      q1: {
        question: string;
        answer: string;
      };
      q2: {
        question: string;
        answer: string;
      };
      q3: {
        question: string;
        answer: string;
      };
      q4: {
        question: string;
        answer: string;
      };
      q5: {
        question: string;
        answer: string;
      };
      q6: {
        question: string;
        answer: string;
      };
    };
    topic_account: {
      title: string;
      description: string;
      q1: {
        question: string;
        answer: string;
      };
      q2: {
        question: string;
        answer: string;
      };
      q3: {
        question: string;
        answer: string;
      };
    };
    topic_feedback: {
      title: string;
      description: string;
      q1: {
        question: string;
        answer: string;
      };
      q2: {
        question: string;
        answer: string;
      };
      q3: {
        question: string;
        answer: string;
      };
      q4: {
        question: string;
        answer: string;
      };
    };
  };
}

// Tipo para valores de tradução
type TranslationValue = string | {
  text: string;
  link?: string;
} | TranslationObject;

// Tipo para objeto de traduções (permite aninhamento)
interface TranslationObject {
  [key: string]: TranslationValue;
}

// Tipo para as traduções por idioma
interface TranslationsType {
  [language: string]: TranslationObject;
}

// Traduções para os três idiomas
const translations: TranslationsType = {
  pt: {
    // Navbar
    'nav.home': 'Início',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Configurações',
    'nav.instructions': 'Instruções',
    'nav.signals': 'Trades',
    'nav.signals.title': 'Trades do Mercado',
    'nav.news': 'Notícias',
    'nav.news.title': 'Notícias do Mercado',
    'nav.news.none': 'Nenhuma notícia disponível',
    'nav.notifications': 'Notificações',
    'nav.notifications.read': 'Notificações Lidas',
    'nav.settings.notifications': 'Área do Usuário',
    'nav.system.status': 'Status do sistema',
    'nav.system.online': 'Online',
    'nav.support': 'Suporte',
    'nav.live': 'Ao Vivo',
    'nav.meetings': 'Reuniões',
    'nav.toggle.sidebar': 'Alternar Barra Lateral',
    'nav.admin': 'Administração',
    
    // News
    'news.subtitle': 'Acompanhe as últimas notícias do mercado de criptomoedas e finanças',
    'news.refresh': 'Atualizar',
    'news.updated': 'Atualizado!',
    'news.loading': 'Buscando as últimas notícias do mercado...',
    'news.error.loading': 'Erro ao carregar notícias',
    'news.error.tryAgain': 'Tente novamente mais tarde.',
    'news.tryAgain': 'Tentar novamente',
    'news.none': 'Nenhuma notícia disponível no momento.',
    'news.filter.label': 'Filtrar por:',
    'news.filter.all': 'Todas',
    'news.filter.markets': 'Mercados & Trading',
    'news.filter.economy': 'Economia & Política',
    'news.filter.tech': 'Tecnologia & Inovação',
    'news.filter.commodities': 'Commodities & ESG',
    'news.filter.global': 'Global & Geopolítica',
    'news.filter.noResults': 'Nenhuma notícia encontrada para',
    'news.filter.totalAvailable': 'Total disponível:',
    'news.filter.news': 'notícias',
    'news.filter.viewAll': 'Ver todas',
    
    // Common
    'common.cancel': 'Cancelar',
    'common.saving': 'Salvando...',
    'common.saved': 'Salvo',
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.summary': 'Resumo',
    
    // Profile
    'profile.name.addHint': 'Adicione um nome para personalizar seu perfil',
    'profile.error.emptyName': 'Por favor, insira um nome de exibição',
    
    // Dashboard
    'dashboard.title': 'Acompanhe o mercado em tempo real',
    'dashboard.market.opportunities': 'Oportunidades de mercado baseadas em análise de dados em tempo real',
    'dashboard.refresh.all': 'Atualizar Todos',
    'dashboard.signals.title': 'Trades em Alta',
    'dashboard.signals.entry': 'Entrada',
    'dashboard.signals.expiration': 'Expiração',
    'dashboard.signals.reentry1': 'Reentrada 1',
    'dashboard.signals.reentry2': 'Reentrada 2',
    'dashboard.signals.updated': 'Atualizado',
    'dashboard.signals.trade': 'Realizar trade',
    'dashboard.signals.loading': 'Carregando sinais...',
    'dashboard.signals.loading_error': 'Falha ao carregar sinais',
    'dashboard.signals.loading_error_desc': 'Não foi possível obter os sinais de trading no momento.',
    'dashboard.signals.view_all': 'Ver todos',
    'dashboard.signals.realtime': 'Sinais em Tempo Real',
    'dashboard.signals.waiting': 'Aguardando novos sinais...',
    'dashboard.stats.totalSignals': 'Total de Sinais',
    'dashboard.stats.successRate': 'Taxa de Acerto',
    'dashboard.stats.monthlyGain': 'Ganho Mensal',
    'dashboard.stats.monthlyLoss': 'Perda Mensal',
    'dashboard.stats.totalProfit': 'Lucro Total',
    'dashboard.stats.todayOperations': 'Operações Hoje',
    'dashboard.stats.onlineTime': 'Tempo Online',
    'dashboard.stats.activeDays': 'Dias Ativos',
    
    // Signals page
    'signals.title': 'Trades do Mercado',
    'signals.subtitle': 'Trades de alta de precisão analisados em tempo real',
    'signals.refresh': 'Atualizar',
    'signals.refresh.all': 'Atualizar Todos',
    'signals.advanced.monitoring': 'Monitoramento avançado de trades e tendências de mercado',
    'signals.filters': 'Filtros',
    'signals.type': 'Tipo de sinal',
    'signals.type.all': 'Todos',
    'signals.type.technical': 'Técnicos',
    'signals.type.fundamental': 'Fundamentalistas',
    'signals.type.news': 'Notícias',
    'signals.options': 'Opções',
    'signals.options.show.expired': 'Mostrar Expirados',
    'signals.options.hide.expired': 'Ocultar Expirados',
    'signals.options.auto.refresh': 'Auto-atualizar',
    'signals.analyzing.market': 'Analisando mercado',
    'signals.processing': 'Processando sinais e identificando as melhores oportunidades de trading',
    'signals.strength.very_strong': 'Altíssima expectativa',
    'signals.strength.strong': 'Alta expectativa',
    'signals.strength.moderate': 'Expectativa média',
    'signals.strength.weak': 'Baixa expectativa',
    'signals.expires': 'Expira',
    'signals.invalid.date': 'Data inválida',
    'signals.new': 'NOVO',
    'signals.buy': 'COMPRA',
    'signals.sell': 'VENDA',
    'signals.result.win': 'GANHO',
    'signals.result.loss': 'PERDA',
    
    // Settings
    'settings.title': 'Configurações',
    'settings.subtitle': 'Personalize a plataforma de acordo com suas preferências',
    'settings.profile': 'Perfil',
    'settings.notifications': 'Notificações',
    'settings.appearance': 'Aparência',
    'settings.sounds': 'Sons',
    'settings.language': 'Idioma',
    'settings.security': 'Privacidade & Segurança',
    'settings.account.status': 'Status da Conta',
    'settings.account.connected': 'Conectado como',
    'settings.account.active': 'Ativo',
    'settings.account.displayName': 'Nome de exibição',
    'settings.account.displayNamePlaceholder': 'Seu nome de exibição',
    'settings.account.email': 'Email',
    'settings.account.emailFixed': 'Esta informação não pode ser alterada',
    'settings.account.password': 'Senha',
    'settings.account.changePassword': 'Alterar senha',
    'settings.account.userName': 'Usuário',
    'settings.account.changeAvatar': 'Alterar foto de perfil',
    'settings.account.uploading': 'Enviando imagem...',
    'settings.account.currentPassword': 'Senha Atual',
    'settings.account.currentPasswordPlaceholder': 'Digite sua senha atual',
    'settings.account.newPassword': 'Nova Senha',
    'settings.account.newPasswordPlaceholder': 'Digite sua nova senha',
    'settings.account.confirmPassword': 'Confirmar Senha',
    'settings.account.confirmPasswordPlaceholder': 'Confirme sua nova senha',
    'settings.account.passwordMismatch': 'As senhas não coincidem',
    'settings.account.passwordTooShort': 'A senha deve ter pelo menos 8 caracteres',
    'settings.account.savePassword': 'Salvar Nova Senha',
    'settings.account.forgotPassword': 'Esqueci minha senha',
    'settings.account.passwordProtected': 'Sua senha está protegida e criptografada',
    'settings.account.passwordShown': 'Sua senha está sendo exibida no campo acima',
    'settings.account.passwordRequirements': 'Requisitos de senha',
    'settings.account.passwordMin8': 'Mínimo de 8 caracteres',
    'settings.account.passwordUppercase': 'Pelo menos uma letra maiúscula',
    'settings.account.passwordNumber': 'Pelo menos um número',
    'settings.account.passwordSpecial': 'Pelo menos um caractere especial',
    'settings.account.passwordMatch': 'Senhas coincidem',
    'settings.account.savingPassword': 'Salvando nova senha...',
    'settings.account.passwordVerified': 'Senha verificada com sucesso!',
    'settings.account.afterVerificationMessage': 'Após verificar sua identidade, você poderá visualizar sua senha.',
    'settings.account.verifying': 'Verificando...',
    'settings.account.processing': 'Processando...',
    'settings.account.verified': 'Verificado',
    'settings.account.terms': 'Ao se conectar, você concorda com nossos Termos de Serviço e Política de Privacidade.',
    'settings.account.save': 'Salvar alterações',
    'settings.account.logout': 'Desconectar',
    'settings.account.avatar.change': 'Clique no ícone para alterar sua foto',
    'settings.account.avatar.noFile': 'Nenhum arquivo escolhido',
    'settings.account.verifyPassword': 'Verificar Senha',
    'settings.account.verifyPasswordDesc': 'Para visualizar sua senha, precisamos verificar sua identidade.',
    'settings.account.enterPassword': 'Digite sua senha atual',
    'settings.account.resetPassword': 'Redefinir sua senha',
    'settings.account.resetPasswordDesc': 'Enviaremos um link para redefinir sua senha para o email abaixo.',
    'settings.account.resetPasswordNote': 'Um link de redefinição será enviado para este email. Verifique também sua pasta de spam.',
    'settings.account.resetPasswordExpire': 'O link expirará após 24 horas por motivos de segurança',
    'settings.account.changePasswordManually': 'Alterar manualmente',
    'settings.account.sendResetLink': 'Enviar link',
    'settings.account.confirmEmail': 'Confirmar Email',
    'settings.account.confirmEmailDesc': 'Digite seu email para receber o link de redefinição de senha.',
    'settings.account.accountEmail': 'Email da conta',
    'settings.account.enterYourEmail': 'Digite seu email',
    'settings.account.resetLinkWillBeSent': 'Um email com o link para redefinir sua senha será enviado para o endereço confirmado.',
    'settings.account.sendEmail': 'Enviar Email',
    'settings.account.sending': 'Enviando...',
    'settings.account.hidePassword': 'Ocultar senha',
    'settings.account.showPassword': 'Mostrar senha',
    'settings.language.description': 'Escolha o idioma da interface',
    'settings.language.select': 'Selecione um idioma',
    'settings.language.pt': 'Português',
    'settings.language.en': 'Inglês',
    'settings.language.es': 'Espanhol',
    'settings.save': 'Salvar',
    'settings.verify': 'Verificar',
    'settings.general': 'Configuraciones Generales',
    'settings.help': 'Ayuda y Soporte',
    'settings.saveSuccessMessage': 'Configuraciones guardadas con éxito',
    'settings.saveSuccessDescription': 'Todas tus preferencias han sido actualizadas.',
    'settings.saveErrorMessage': 'Error al guardar configuraciones',
    
    // Traduções para Apoie seu trader favorito
    'trader.support.title': 'Apoie seu trader favorito',
    'trader.support.subtitle': 'Configure o link para apoiar seu trader favorito',
    'trader.support.description': 'Configure o link para apoiar seu trader favorito em cada operação realizada através da plataforma.',
    'trader.support.info': 'Ao configurar um link de apoio, você ajuda seu trader favorito a continuar fornecendo análises e conteúdos de qualidade.',
    'trader.support.info.usage': 'O link será utilizado quando você acessar plataformas de negociação através do nosso aplicativo.',
    'trader.support.broker': 'Corretora',
    'trader.support.broker.placeholder': 'Selecione uma corretora',
    'trader.support.broker.hint': 'Escolha sua plataforma favorita',
    'trader.support.broker.search': 'Buscar corretora...',
    'trader.support.link': 'Link de apoiador',
    'trader.support.link.placeholder': 'https://exemplo.com/trader123',
    'trader.support.link.hint': 'URL completo do trader',
    'trader.support.use.default': 'Usar link padrão do sistema',
    'trader.support.default.info': 'O link padrão do sistema será usado para todas as operações.',
    'trader.support.instructions': 'Insira o link completo incluindo https:// para apoiar seu trader favorito.',
    'trader.support.restore': 'Restaurar padrão',
    'trader.support.save': 'Salvar preferências',
    'trader.support.saved': 'Preferências salvas com sucesso!',
    'trader.support.optional': 'Apoie seu trader favorito (opcional)',
    'trader.support.add': 'Adicione o link de apoio do seu trader favorito para contribuir com seu trabalho em cada operação.',
    'trader.support.default.empty': 'Caso não preencha, será utilizado o link padrão do sistema.',
    
    'settings.terms.title': 'Términos de Uso',
    'settings.terms.lastUpdate': 'Última actualización: 10/10/2023',
    'settings.terms.intro1': 'Estos términos y condiciones ("Términos") rigen el uso del servicio ProfEyes ("Servicio") operado por nuestra empresa.',
    'settings.terms.intro2': 'Al acceder o utilizar el Servicio, usted acepta estar sujeto a estos Términos. Si no está de acuerdo con alguna parte de los términos, no podrá acceder al Servicio.',
    'settings.terms.section1.title': '1. Cuentas',
    'settings.terms.section1.content': 'Cuando crea una cuenta con nosotros, garantiza que la información proporcionada es precisa, completa y actualizada. La información imprecisa, incompleta o desactualizada puede resultar en la terminación inmediata de su cuenta en el Servicio.',
    'settings.terms.section2.title': '2. Privacidad y Protección de Datos',
    'settings.terms.section2.content': 'Nuestra Política de Privacidad explica cómo recopilamos, utilizamos y protegemos la información que proporciona al utilizar nuestro Servicio. Al utilizar nuestro Servicio, acepta la recopilación y el uso de información en acuerdo con esta política.',
    'settings.terms.section2_5.title': '2.5. Exención de Responsabilidad',
    'settings.terms.section2_5.content': 'Trending proporciona sus servicios exclusivamente en los territorios donde está autorizada. Trending no está autorizada por la Comisión de Valores Mobiliarios de Brasil (CVM) para ofrecer directamente servicios de distribución de valores a inversores residentes, domiciliados o constituidos en la República Federativa de Brasil. Nada en este sitio web debe interpretarse como una oferta directa de servicios dirigida a estos inversores.',
    'settings.terms.section3.title': '3. Seguridad',
    'settings.terms.section3.content': 'La seguridad de su cuenta es importante para nosotros, pero recuerde que ningún método de transmisión sobre la Internet o método de almacenamiento electrónico es 100% seguro. Mientras nos esforzamos por utilizar medios comercialmente aceptables para proteger su información personal, no podemos garantizar su seguridad absoluta.',
    'settings.terms.section4.title': '4. Limitación de Responsabilidad',
    'settings.terms.section4.content': 'En ningún caso nuestra empresa, nuestros directores, oficiales, empleados, afiliados, agentes, contratistas, pasantes, proveedores, prestadores de servicios o licenciantes serán responsables por cualquier daño directo, indirecto, incidental, especial, consecuente o punitivo, incluyendo, pero no limitado a, pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles, resultantes del uso o la incapacidad de usar el servicio.',
    'settings.terms.section5.title': '5. Cambios',
    'settings.terms.section5.content': 'Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es material, intentaremos proporcionar un aviso con al menos 30 días de anticipación antes de que los nuevos términos entren en vigor.',
    'settings.terms.section6.title': '6. Contacto',
    'settings.terms.section6.content': 'Si tiene alguna pregunta sobre estos Términos, contáctenos a través del correo electrónico soporte@profeyes.com.',
    'settings.close': 'Fechar',
    
    // Instructions
    'instructions.title': 'Instruções',
    'instructions.subtitle': 'Dicas e orientações para utilizar a plataforma',
    'instructions.back': 'Voltar',
    'instructions.intro.title': 'Introdução',
    'instructions.intro.text1': 'Bem-vindo ao app de operações do mercado financeiro! Se você está aqui, certamente deseja fazer de R$100 a R$500 todos os dias. Vou mostrar que alcançar esse resultado não é tão difícil como imagina.',
    'instructions.intro.text2': 'Aqui não prometemos que você ficará rico ou milionário do dia para a noite. Nosso objetivo é provar que você pode ter resultados consistentes e lucrativos no mercado financeiro.',
    'instructions.intro.text3': 'Não se trata de cassino ou brincadeira - estamos falando do mercado financeiro real, com operações de day trade, câmbio e criptomoedas.',
    'instructions.intro.subtitle': 'Conheça nossa plataforma',
    'instructions.operation.title': 'Como Operar',
    'instructions.operation.subtitle': 'Guia passo a passo',
    'instructions.gale.title': 'Estratégia de Gale (Reentradas)',
    'instructions.gale.subtitle': 'Maximize seus resultados',
    'instructions.select.section': 'Selecione uma seção para começar',
    'instructions.select.description': 'Escolha uma das opções acima para explorar os detalhes sobre como utilizar nossa plataforma e maximizar seus resultados.',
    'instructions.start.now': 'Comece a operar agora mesmo',
    'instructions.platform.description': 'O Trending facilita o acesso ao mercado financeiro com nossa tecnologia exclusiva.',
    'instructions.open.broker': 'Abrir Corretora',
    
    // Novos textos para página de instruções
    'instructions.welcome.title': 'Bem-vindo ao Trending',
    'instructions.welcome.subtitle': 'Transforme conhecimento em resultados reais e consistentes',
    'instructions.operations.3hours': 'Operações em 3 horários',
    'instructions.operations.3hours.desc': 'Manhã, tarde e noite. Escolha o melhor momento para operar conforme sua disponibilidade.',
    'instructions.realtime.analysis': 'Análises em tempo real',
    'instructions.realtime.analysis.desc': 'Sinais ao vivo baseados em análise profissional de mercado, sem uso de robôs ou automações.',
    'instructions.dominate.operations': 'Domine as operações',
    'instructions.dominate.operations.desc': 'Siga o passo a passo para começar a operar com segurança',
    'instructions.first.steps': 'Primeiros passos',
    'instructions.register.broker': {
      text: 'Faça seu cadastro na corretora através do link',
      link: 'https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree'
    },
    'instructions.demo.account': 'Após cadastro, você receberá uma conta demo com R$10.000 para testes',
    'instructions.real.money': 'Para operar com dinheiro real, faça um depósito (recomendamos pelo menos R$100)',
    'instructions.chart.config': 'Configure o gráfico para formato de velas e tempo de 5 minutos',
    'instructions.executing.operations': 'Executando operações',
    'instructions.market.up': 'Para mercado em alta',
    'instructions.click.buy': 'Clique no botão verde (comprar)',
    'instructions.market.down': 'Para mercado em queda',
    'instructions.click.sell': 'Clique no botão vermelho (vender)',
    'instructions.expiration.time': 'Tempo de expiração',
    'instructions.config.candle': 'Configure igual ao tempo de vela (5 minutos)',
    'instructions.important.tip': 'Dica importante',
    'instructions.follow.signals': 'Siga os trades exibidos no app, operando no momento exato indicado. A disciplina e paciência são essenciais para obter resultados consistentes no mercado financeiro.',
    'instructions.operate.indicated': 'Opere apenas nos momentos indicados',
    'instructions.keep.records': 'Mantenha registro de suas operações',
    'instructions.gale.strategy.title': 'Estratégia de Gale',
    'instructions.gale.strategy.subtitle': 'Maximize seus ganhos com nossa estratégia exclusiva de reentradas',
    'instructions.gale.strategy.desc': 'Se não conseguir lucrar na primeira tentativa, nossa estratégia de Gale (reentradas) ajuda a recuperar operações perdidas. Esta técnica consiste em dobrar o valor investido em momentos estratégicos, aumentando suas chances de recuperação.',
    'instructions.gale1': 'Gale 1',
    'instructions.gale1.desc': 'Quando a operação está perdendo, aguarde até faltarem 2 segundos para finalizar e faça uma reentrada dobrando o valor inicial da operação.',
    'instructions.double.initial': 'Dobra o valor da entrada inicial',
    'instructions.gale2': 'Gale 2',
    'instructions.gale2.desc': 'Se o Gale 1 não recuperar a operação, faça uma segunda reentrada dobrando o valor do Gale 1 quando faltarem 2 segundos para finalizar.',
    'instructions.double.gale1': 'Dobra o valor do Gale 1',
    'instructions.risk.warning': 'Cuidado com os riscos',
    'instructions.risk.warning.desc': 'Embora a estratégia de Gale possa aumentar suas chances de recuperação, ela também aumenta o risco. Nunca invista mais do que pode perder e mantenha uma gestão rigorosa do seu capital.',
    'instructions.trending.indicates': 'O Trending indica quando usar a estratégia de Gale, para ajudar você a operar com mais segurança.',
    
    // Video paths
    'video.instructions': '/tutorial-pt.mp4',
    'video.poster.instructions': '/images/instructions-poster-pt.jpg.png',
    'video.main': '/tutorial-pt.mp4',
    'ordersCanceled': 'Ordens Canceladas',
    'successRate': 'Taxa de Sucesso',
    'dailyReturns': 'Retornos Diários',
    
    // Profile
    'profile.title': 'Meu Perfil',
    'profile.description': 'Gerencie sua foto de perfil e informações pessoais',
    
    // Support
    'support.title': 'Suporte Trending',
    'support.help_topics': 'Tópicos de Ajuda Trending',
    'support.back_to_topics': 'Voltar aos tópicos',
    'support.welcome': 'Olá! Como posso ajudá-lo hoje?',
    'support.typing': 'Digitando...',
    'support.online': 'Online',
    
    support: {
      title: 'Suporte',
      subtitle: 'Como podemos ajudar você?',
      welcome: 'Olá! Como posso ajudar você hoje?',
      input_placeholder: 'Digite sua mensagem...',
      send: 'Enviar',
      online: 'Online',
      typing: 'digitando...',
      human_support: 'Também temos suporte humano disponível em horário comercial.',
      ai_disclaimer: 'Essa é uma resposta automatizada para ajudar você. Para questões complexas, recomendamos entrar em contato via email.',
      chat: {
        title: 'Suporte',
        subtitle: 'Como podemos ajudar?',
        placeholder: 'Digite sua mensagem...'
      },
      topics: {
        select_topic: 'Por favor, selecione um dos tópicos abaixo para obter ajuda.',
        help_topics: 'Tópicos de Ajuda Trending',
        back_to_topics: 'Voltar aos tópicos',
        support_trending: 'Suporte Trending'
      },
      topic_investment: {
        title: 'Investimentos',
        description: 'Informações sobre diferentes tipos de investimentos',
        q1: {
          question: 'Quanto capital devo usar para operar?',
          answer: 'Para operar com o Trending, recomendamos começar com um capital mínimo de R$100. Embora seja possível iniciar com valores menores (a partir de R$60), um capital inicial de pelo menos R$100 permite realizar entradas com valores mais significativos e, consequentemente, obter resultados mais expressivos. Se possível, iniciar com R$200 ou R$1.000 é ainda melhor, pois quanto maior seu capital, maior será seu potencial de lucro. Nossos usuários com esses valores de capital conseguem resultados consistentes entre R$100 e R$500 diariamente. É importante lembrar que você deve investir apenas o que pode se permitir perder e seguir uma estratégia de gestão de risco adequada, especialmente ao implementar as estratégias de reentrada, que exigem dobrar o valor das entradas anteriores.'
        },
        q2: {
          question: 'Quais criptomoedas são utilizadas nos trades?',
          answer: 'O aplicativo trabalha com uma variedade de criptomoedas e tokens, incluindo as principais como Bitcoin e Ethereum, mas também expandimos para tokens com alta volatilidade e potencial de lucro como TokenTrump, Celestia e outros tokens emergentes. Nossa equipe de analistas monitora constantemente o mercado para identificar os ativos com melhores oportunidades de entrada, levando em consideração liquidez, volatilidade e direção de tendência. Selecionamos sempre os ativos que apresentam padrões técnicos claros e oferecem as melhores chances de sucesso para nossas operações. As criptomoedas e tokens específicos podem variar diariamente, dependendo das condições de mercado, por isso é importante estar atento aos trades exibidos para saber exatamente qual ativo operar em cada momento.'
        },
        q3: {
          question: 'Como fazer o depósito para operar?',
          answer: 'Para fazer um depósito e começar a operar com o Trending, siga estas etapas: 1) Crie sua conta na corretora <a href="https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree" target="_blank" rel="noopener noreferrer">Avalon</a>, nossa parceira oficial 2) Após concluir o cadastro, você receberá acesso a uma conta demo com R$10.000 para testar a plataforma 3) Quando estiver pronto para operar com dinheiro real, clique na opção "Depositar" no menu principal da <a href="https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree" target="_blank" rel="noopener noreferrer">Avalon</a> 4) Selecione seu método de pagamento preferido: PIX, boleto bancário, transferência ou criptomoedas 5) Para depósitos via PIX, informe o valor desejado (recomendamos iniciar com pelo menos R$100) e siga as instruções para completar o pagamento 6) O valor será creditado em sua conta em questão de minutos após a confirmação Com o saldo disponível, você já pode começar a executar as operações baseadas nos trades que são exibidos no aplicativo.'
        }
      },
      topic_platform: {
        title: 'Plataforma',
        description: 'Ajuda com funcionalidades da plataforma',
        q1: {
          question: 'Como funciona a aba Dashboard?',
          answer: 'A aba Dashboard fornece uma visão geral dos seus trades em tempo real. Aqui você pode visualizar os trades mais recentes e outras informações relevantes para o seu trading.'
        },
        q2: {
          question: 'Qual é o propósito da aba Trades?',
          answer: 'A aba Trades é onde você recebe alertas e operações de trading. Ela mostra operações de compra e venda para diferentes ativos, baseados em análises técnicas e tendências de mercado.'
        },
        q3: {
          question: 'O que você encontra na aba Notícias?',
          answer: 'A aba Notícias apresenta as últimas atualizações e informações relevantes do mercado financeiro. Aqui você pode ficar por dentro de notícias que podem impactar seus investimentos.'
        },
        q4: {
          question: 'Como a aba Instruções pode ajudar?',
          answer: 'A aba Instruções oferece guias e tutoriais sobre como usar o aplicativo Trending. Aqui você encontra dicas e instruções detalhadas para aproveitar ao máximo as funcionalidades da plataforma.'
        },
        q5: {
          question: 'Como gerenciar notificações na aba Notificações?',
          answer: 'A aba Notificações gerencia os alertas e mensagens que você recebe no aplicativo. Aqui você pode configurar quais tipos de notificações deseja receber e como deseja ser notificado.'
        },
        q6: {
          question: 'O que você pode ajustar na aba Configurações?',
          answer: 'A aba Configurações permite que você personalize as opções do aplicativo. Aqui você pode ajustar preferências de interface, segurança e outras configurações do seu perfil.'
        }
      },
      topic_account: {
        title: 'Conta e Segurança',
        description: 'Questões sobre sua conta e segurança',
        q1: {
          question: 'Como redefinir minha senha?',
          answer: 'Para redefinir sua senha no aplicativo Trending, siga estes passos: 1) Na tela de login, clique em "Esqueci minha senha"; 2) Digite o email associado à sua conta; 3) Você receberá um email com um link para redefinição de senha; 4) Clique no link e defina uma nova senha seguindo os requisitos de segurança. Se não receber o email em alguns minutos, verifique sua pasta de spam.'
        },
        q2: {
          question: 'Como atualizar meus dados cadastrais?',
          answer: 'Para atualizar seus dados cadastrais no aplicativo Trending, acesse seu perfil clicando no ícone de usuário no canto superior direito da tela inicial. Na tela de perfil, você poderá atualizar informações como nome de exibição, foto de perfil e senha.'
        },
        q3: {
          question: 'Como cancelar minha assinatura?',
          answer: 'Para cancelar sua assinatura no Trending, acesse o menu "Configurações" e selecione "Gerenciar Assinatura". Na tela de gerenciamento, clique na opção "Cancelar Assinatura" e siga as instruções. Você precisará confirmar sua decisão e possivelmente informar o motivo do cancelamento. Após a confirmação, sua assinatura continuará ativa até o final do período já pago, sem renovação automática. Todo seu histórico e dados ficarão preservados por 90 dias, caso decida retornar. Se preferir, você também pode entrar em contato com nosso suporte para assistência no processo de cancelamento. Lembre-se que oferecemos opções de pausar sua assinatura temporariamente, caso esteja considerando um cancelamento por motivos temporários.'
        }
      },
      topic_feedback: {
        title: 'Feedback',
        description: 'Perguntas e respostas sobre feedbacks e resultados',
        q1: {
          question: 'Quantos traders profissionais construíram o Trending?',
          answer: 'O Trending foi construído por mais de 700 traders profissionais, garantindo uma base sólida de conhecimento e experiência.'
        },
        q2: {
          question: 'Quantos ativos são monitorados?',
          answer: 'Atualmente, mais de 500 ativos são monitorados pelo Trending, proporcionando uma ampla gama de oportunidades de trading.'
        },
        q3: {
          question: 'Quantos beta testers participaram?',
          answer: 'Mais de 3200 beta testers participaram da fase beta do aplicativo Trending, ajudando a refinar e melhorar a plataforma.'
        },
        q4: {
          question: 'Qual é a taxa de satisfação dos beta testers?',
          answer: 'A taxa de satisfação dos beta testers que participaram do teste do aplicativo na fase beta é de 95%, refletindo a qualidade e eficácia da plataforma.'
        }
      }
    },
    
    // Traduções para a seção de transmissões ao vivo
    live: {
      title: 'Transmissões Ao Vivo',
      subtitle: 'Assista e interaja com transmissões ao vivo da comunidade',
      description: 'Compartilhe seu conhecimento, interaja em tempo real e aprenda com especialistas do mercado financeiro.',
      active_streams: 'Transmissões Ativas',
      active_count: '{{count}} ao vivo',
      no_active: 'Nenhuma transmissão ativa no momento',
      no_streams_message: 'Nenhuma transmissão ativa no momento. Volte mais tarde.',
      status: 'AO VIVO',
      tab_live: 'Ao Vivo',
      tab_scheduled: 'Agendadas',
      all_categories: 'Todas categorias',
      search_placeholder: 'Pesquisar transmissões',
      loading_title: 'Carregando transmissões',
      loading_message: 'Aguarde enquanto buscamos as transmissões disponíveis...',
      no_live_title: 'Nenhuma transmissão ao vivo',
      no_live_message: 'No momento não há transmissões acontecendo.',
      no_scheduled_message: 'Não há transmissões agendadas para acontecer em breve.',
      comments: 'Comentários ao vivo',
      no_comments: 'Seja o primeiro a comentar',
      type_comment: 'Digite seu comentário...',
      streaming_placeholder: 'Transmissão ao vivo',
      about: 'Sobre esta transmissão',
      end_stream: 'Encerrar',
      
      // Para streamers
      start_streaming: 'Iniciar Transmissão',
      start_streaming_desc: 'Configure sua transmissão e compartilhe com a comunidade',
      stream_title: 'Título da transmissão',
      stream_description: 'Descrição (opcional)',
      title_placeholder: 'Ex: Análises de mercado ao vivo',
      description_placeholder: 'Descreva o conteúdo da sua transmissão',
      go_live: 'Iniciar transmissão',
      
      // Para espectadores
      no_permission_title: 'Selecione uma transmissão',
      no_permission_desc: 'Selecione uma das transmissões ativas ou aguarde até que um especialista inicie uma nova transmissão.',
      
      // Mensagens de erro
      error: {
        title_required: 'Título da transmissão é obrigatório',
        media_access: 'Não foi possível acessar sua câmera ou microfone. Verifique as permissões.'
      },
      modal: {
        title: 'Nova Transmissão',
        description: 'Configure sua transmissão e compartilhe seus conhecimentos ao vivo',
        title_label: 'Título da Transmissão',
        description_label: 'Descrição',
        category_label: 'Categoria',
        category_placeholder: 'Selecione uma categoria',
        privacy_label: 'Privacidade',
        start_now: 'Iniciar agora',
        schedule: 'Agendar',
        create_stream: 'Criar Transmissão'
      }
    },
    
    // Traduções para a seção de reuniões
    meetings: {
      title: 'Reuniões',
      subtitle: 'Crie e participe de reuniões com outros usuários',
      active_meetings: 'Reuniões Ativas',
      create_meeting: 'Criar Nova Reunião',
      meeting_title: 'Título da Reunião',
      meeting_description: 'Descrição (opcional)',
      title_placeholder: 'Ex: Revisão de Sinais Semanais',
      description_placeholder: 'Ex: Discussão sobre os sinais da semana',
      start_meeting: 'Iniciar Reunião',
      creating_meeting: 'Criando Reunião...',
      no_active_meetings: 'Não há reuniões ativas no momento',
      participants: 'participantes',
      join: 'Entrar',
      end_meeting: 'Reunião encerrada com sucesso',
      copy_link: 'Link copiado',
      link_copied: 'Link da reunião copiado para a área de transferência',
      about: {
        title: 'Sobre as Reuniões',
        intro: 'A funcionalidade de reuniões permite que você crie e participe de videoconferências diretamente na plataforma.',
        how_works: 'Como funciona',
        benefits: 'Benefícios',
        features: {
          permission: 'Apenas usuários com permissão podem criar reuniões',
          google_meet: 'As reuniões são realizadas através do Google Meet',
          join: 'Qualquer usuário pode participar de reuniões ativas',
          share: 'Compartilhe o link da reunião facilmente',
          screen_sharing: 'Compartilhamento de tela para análises em tempo real',
          chat: 'Chat integrado para discussões',
          quality: 'Alta qualidade de áudio e vídeo',
          stability: 'Conexão estável e segura'
        }
      },
      error: {
        title_required: 'O título da reunião é obrigatório',
        permission_denied: 'Você não tem permissão para criar reuniões',
        create_failed: 'Falha ao criar reunião',
        end_failed: 'Falha ao encerrar a reunião'
      },
      demo: {
        title: 'Demonstração da Funcionalidade',
        description: 'Esta página é uma demonstração da funcionalidade de reuniões.',
        create_hint: 'Try creating a meeting by clicking the button above.',
        features_title: 'Available Features',
        feature_1: 'Create meetings with title and description',
        feature_2: 'View active meetings',
        feature_3: 'Join existing meetings',
        feature_4: 'End your own meetings',
        feature_5: 'Share meeting link',
        coming_soon: 'Coming Soon',
        soon_1: 'Meeting scheduling',
        soon_2: 'Automatic recording',
        soon_3: 'Meeting transcription',
        soon_4: 'Calendar integration'
      }
    },

    // Timezone
    'timezone.label': 'Fuso Horário',
    'timezone.select': 'Selecione seu fuso horário',
    'timezone.selector': 'Fusos Horários',
    'timezone.current': 'Fuso horário atual',
    'timezone.dst': 'Horário de Verão Ativo',
    'timezone.system': 'Fuso do sistema',
    'timezone.changed': 'Fuso horário alterado para',
    'timezone.updated': 'Horários atualizados com sucesso',

    // Profile errors and success messages
    'profile.error.needLogin': 'Você precisa estar logado para realizar esta ação',
    'profile.success.updated': 'Perfil atualizado com sucesso!',
    'profile.error.updateFailed': 'Falha ao atualizar o perfil. Tente novamente.',
    'profile.error.invalidImage': 'Por favor, selecione uma imagem válida.',
    'profile.error.imageSize': 'A imagem deve ter menos de 5MB.',
    'profile.error.invalidEmailFormat': 'Formato de email inválido',
    'profile.error.resetPasswordFailed': 'Falha ao enviar email de redefinição',
    'profile.submit.saving': 'Salvando...',
    'profile.submit.save': 'Salvar alterações',

    // 404 Page
    'notfound.title': 'Página não encontrada',
    'notfound.subtitle': 'Oops! Página não encontrada',
    'notfound.message': 'A página que você está procurando não existe ou foi removida.',
    'notfound.button': 'Voltar à página inicial',
    
    // Settings Account
    'settings.account.verified_status': 'Verificado',
    'settings.account.emailSentSuccess': 'Email enviado com sucesso',
    'settings.account.resetPasswordEmailSent': 'Um link para redefinir sua senha foi enviado para',
    'settings.account.checkYourInbox': 'Verifique sua caixa de entrada',
    'settings.account.openMyEmail': 'Abrir meu email',
    // Notifications
    'notifications.center': 'Centro de Notificações',
    'notifications.manage': 'Gerencie suas notificações e configure suas preferências',
    'notifications.overview': 'Visão geral das suas notificações',
    'notifications.total': 'Total de notificações',
    'notifications.unread': 'Não lidas',
    'notifications.read': 'Lidas',
    'notifications.byType': 'Por tipo',
    'notifications.yours': 'Suas Notificações',
    'notifications.markAll': 'Marcar todas',
    'notifications.markAllAsRead': 'Marcar todas como lidas',
    'notifications.clearAll': 'Limpar todas',
    'notifications.removeAll': 'Remover todas as notificações',
    'notifications.filter': 'Filtrar notificações',
    'notifications.filterByType': 'Filtrar por tipo',
    'notifications.all': 'Todas',
    'notifications.display': 'Exibição',
    'notifications.onlyUnread': 'Apenas não lidas',
    'notifications.settings': 'Configurações de notificações',
    'notifications.filteringByType': 'Filtrando por tipo',
    'notifications.notFound': 'Nenhuma notificação encontrada',
    'notifications.allRead': 'Você já leu todas as suas notificações',
    'notifications.noneOfType': 'Nenhuma notificação deste tipo foi encontrada',
    'notifications.willAppearHere': 'Quando houver novidades, elas aparecerão aqui',
    'notifications.noUnread': 'Nenhuma notificação não lida',
    'notifications.recent': 'Notificações recentes',
    'notifications.viewAll': 'Ver todas',
    'notifications.none': 'Nenhuma notificação',
    'notifications.markAsRead': 'Marcar como lidas',
    
    // Tipos de notificação
    'notifications.types.signals': 'Trades',
    'notifications.types.live': 'Transmissões ao Vivo',
    'notifications.types.signalsDesc': 'Notificações sobre trades de compra e venda',
    'notifications.types.liveDesc': 'Notificações quando uma transmissão ao vivo é iniciada',
    
    // Configurações de notificações
    'notifications.settings.title': 'Configurações de Notificações',
    'notifications.settings.description': 'Escolha quais tipos de notificações deseja receber',
    'notifications.settings.enable': 'Notificações',
    'notifications.settings.enableDesc': 'Ativar ou desativar todas as notificações',
    'notifications.settings.typesTitle': 'Tipos de Notificação',
    'notifications.settings.typesDesc': 'Selecione quais tipos de notificação deseja receber',
    'notifications.settings.cancel': 'Cancelar',
    'notifications.settings.testSignal': 'Enviar Sinal de Teste',
    'notifications.settings.save': 'Salvar',
    'notifications.settings.saved': 'Salvo!',
    
    // Sinais - notificação prévia
    'signals.upcoming': 'Sinal de',
    'signals.prepare': 'Prepare-se para operar',
    'signals.notification': 'Notificação prévia de sinal',
    'signals.minutes_before': '5 minutos antes do sinal',
  },
  en: {
    // Navbar
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.instructions': 'Instructions',
    'nav.signals': 'Signals',
    'nav.news': 'News',
    'nav.news.title': 'Market News',
    'nav.news.none': 'No news available',
    'nav.notifications': 'Notifications',
    'nav.notifications.read': 'Read Notifications',
    'nav.settings.notifications': 'User Area',
    'nav.system.status': 'System status',
    'nav.system.online': 'Online',
    'nav.support': 'Support',
    'nav.live': 'Live',
    'nav.meetings': 'Meetings',
    'nav.toggle.sidebar': 'Toggle Sidebar',
    'nav.admin': 'Administration',
    
    // News
    'news.subtitle': 'Stay updated with the latest cryptocurrency and finance market news',
    'news.refresh': 'Refresh',
    'news.updated': 'Updated!',
    'news.loading': 'Fetching the latest market news...',
    'news.error.loading': 'Error loading news',
    'news.error.tryAgain': 'Please try again later.',
    'news.tryAgain': 'Try again',
    'news.none': 'No news available at the moment.',
    'news.filter.label': 'Filter by:',
    'news.filter.all': 'All',
    'news.filter.markets': 'Markets & Trading',
    'news.filter.economy': 'Economy & Politics',
    'news.filter.tech': 'Technology & Innovation',
    'news.filter.commodities': 'Commodities & ESG',
    'news.filter.global': 'Global & Geopolitics',
    'news.filter.noResults': 'No news found for',
    'news.filter.totalAvailable': 'Total available:',
    'news.filter.news': 'news',
    'news.filter.viewAll': 'View all',
    
    // Common
    'common.cancel': 'Cancel',
    'common.saving': 'Saving...',
    'common.saved': 'Saved',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.summary': 'Summary',
    
    // Profile
    'profile.name.addHint': 'Add a name to personalize your profile',
    'profile.error.emptyName': 'Please enter a display name',
    
    // Dashboard
    'dashboard.title': 'Track the market in real time',
    'dashboard.market.opportunities': 'Market opportunities based on real-time data analysis',
    'dashboard.refresh.all': 'Refresh All',
    'dashboard.signals.title': 'High Priority Signals',
    'dashboard.signals.entry': 'Entry',
    'dashboard.signals.expiration': 'Expiration',
    'dashboard.signals.reentry1': 'Re-entry 1',
    'dashboard.signals.reentry2': 'Re-entry 2',
    'dashboard.signals.updated': 'Updated',
    'dashboard.signals.trade': 'Trade now',
    'dashboard.signals.loading': 'Loading signals...',
    'dashboard.signals.loading_error': 'Failed to load signals',
    'dashboard.signals.loading_error_desc': 'Unable to retrieve trading signals at this time.',
    'dashboard.signals.view_all': 'View all',
    'dashboard.signals.realtime': 'Real-time Signals',
    'dashboard.signals.waiting': 'Waiting for new signals...',
    'dashboard.stats.totalSignals': 'Total Signals',
    'dashboard.stats.successRate': 'Success Rate',
    'dashboard.stats.monthlyGain': 'Monthly Gain',
    'dashboard.stats.monthlyLoss': 'Monthly Loss',
    'dashboard.stats.totalProfit': 'Total Profit',
    'dashboard.stats.todayOperations': 'Today Operations',
    'dashboard.stats.onlineTime': 'Online Time',
    'dashboard.stats.activeDays': 'Active Days',
    
    // Signals page
    'signals.title': 'Trading Signals',
    'signals.subtitle': 'High precision signals for your operations',
    'signals.refresh': 'Refresh',
    'signals.refresh.all': 'Refresh All',
    'signals.advanced.monitoring': 'Advanced monitoring of signals and market trends',
    'signals.filters': 'Filters',
    'signals.type': 'Signal type',
    'signals.type.all': 'All',
    'signals.type.technical': 'Technical',
    'signals.type.fundamental': 'Fundamental',
    'signals.type.news': 'News',
    'signals.options': 'Options',
    'signals.options.show.expired': 'Show Expired',
    'signals.options.hide.expired': 'Hide Expired',
    'signals.options.auto.refresh': 'Auto-refresh',
    'signals.analyzing.market': 'Analyzing market',
    'signals.processing': 'Processing signals and identifying the best trading opportunities',
    'signals.strength.very_strong': 'Very high expectation',
    'signals.strength.strong': 'High expectation',
    'signals.strength.moderate': 'Medium expectation',
    'signals.strength.weak': 'Low expectation',
    'signals.expires': 'Expires',
    'signals.invalid.date': 'Invalid date',
    'signals.new': 'NEW',
    'signals.buy': 'BUY',
    'signals.sell': 'SELL',
    'signals.result.win': 'WIN',
    'signals.result.loss': 'LOSS',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize the platform according to your preferences',
    'settings.profile': 'Profile',
    'settings.notifications': 'Notifications',
    'settings.appearance': 'Appearance',
    'settings.sounds': 'Sounds',
    'settings.language': 'Language',
    'settings.security': 'Privacy & Security',
    'settings.account.status': 'Account Status',
    'settings.account.connected': 'Connected as',
    'settings.account.active': 'Active',
    'settings.account.displayName': 'Display name',
    'settings.account.displayNamePlaceholder': 'Your display name',
    'settings.account.email': 'Email',
    'settings.account.emailFixed': 'This information cannot be changed',
    'settings.account.password': 'Password',
    'settings.account.changePassword': 'Change password',
    'settings.account.userName': 'User',
    'settings.account.changeAvatar': 'Change profile picture',
    'settings.account.uploading': 'Uploading image...',
    'settings.account.currentPassword': 'Current Password',
    'settings.account.currentPasswordPlaceholder': 'Enter your current password',
    'settings.account.newPassword': 'New Password',
    'settings.account.newPasswordPlaceholder': 'Enter your new password',
    'settings.account.confirmPassword': 'Confirm Password',
    'settings.account.confirmPasswordPlaceholder': 'Confirm your new password',
    'settings.account.passwordMismatch': 'Passwords do not match',
    'settings.account.passwordTooShort': 'Password must be at least 8 characters',
    'settings.account.savePassword': 'Save New Password',
    'settings.account.forgotPassword': 'Forgot my password',
    'settings.account.passwordProtected': 'Your password is protected and encrypted',
    'settings.account.passwordShown': 'Your password is being displayed in the field above',
    'settings.account.passwordRequirements': 'Password requirements',
    'settings.account.passwordMin8': 'Minimum of 8 characters',
    'settings.account.passwordUppercase': 'At least one uppercase letter',
    'settings.account.passwordNumber': 'At least one number',
    'settings.account.passwordSpecial': 'At least one special character',
    'settings.account.passwordMatch': 'Passwords match',
    'settings.account.savingPassword': 'Saving new password...',
    'settings.account.passwordVerified': 'Password successfully verified!',
    'settings.account.afterVerificationMessage': 'After verifying your identity, you will be able to view your password.',
    'settings.account.verifying': 'Verifying...',
    'settings.account.processing': 'Processing...',
    'settings.account.verified': 'Verified',
    'settings.account.terms': 'By connecting, you agree to our Terms of Service and Privacy Policy.',
    'settings.account.save': 'Save changes',
    'settings.account.logout': 'Disconnect',
    'settings.account.avatar.change': 'Click on the icon to change your photo',
    'settings.account.avatar.noFile': 'No file chosen',
    'settings.account.verifyPassword': 'Verify Password',
    'settings.account.verifyPasswordDesc': 'To view your password, we need to verify your identity.',
    'settings.account.enterPassword': 'Enter your current password',
    'settings.account.resetPassword': 'Reset your password',
    'settings.account.resetPasswordDesc': 'We will send a password reset link to the email below.',
    'settings.account.resetPasswordNote': 'A reset link will be sent to this email. Also check your spam folder.',
    'settings.account.resetPasswordExpire': 'The link will expire after 24 hours for security reasons',
    'settings.account.changePasswordManually': 'Change manually',
    'settings.account.sendResetLink': 'Send link',
    'settings.account.confirmEmail': 'Confirm Email',
    'settings.account.confirmEmailDesc': 'Enter your email to receive the password reset link.',
    'settings.account.accountEmail': 'Account email',
    'settings.account.enterYourEmail': 'Enter your email',
    'settings.account.resetLinkWillBeSent': 'An email with the link to reset your password will be sent to the confirmed address.',
    'settings.account.sendEmail': 'Send Email',
    'settings.account.sending': 'Sending...',
    'settings.account.hidePassword': 'Hide password',
    'settings.account.showPassword': 'Show password',
    'settings.language.description': 'Choose the interface language',
    'settings.language.select': 'Select a language',
    'settings.language.pt': 'Portuguese',
    'settings.language.en': 'English',
    'settings.language.es': 'Spanish',
    'settings.save': 'Save',
    'settings.verify': 'Verify',
    'settings.general': 'General Settings',
    'settings.help': 'Help and Support',
    'settings.saveSuccessMessage': 'Settings saved successfully',
    'settings.saveSuccessDescription': 'All your preferences have been updated.',
    'settings.saveErrorMessage': 'Error saving settings',
    'settings.terms.title': 'Terms of Use',
    'settings.terms.lastUpdate': 'Last update: 10/10/2023',
    'settings.terms.intro1': 'These terms and conditions ("Terms") govern the use of the ProfEyes service ("Service") operated by our company.',
    'settings.terms.intro2': 'By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.',
    'settings.terms.section1.title': '1. Accounts',
    'settings.terms.section1.content': 'When you create an account with us, you guarantee that the information provided is accurate, complete, and up-to-date. Inaccurate, incomplete, or outdated information may result in the immediate termination of your account on the Service.',
    'settings.terms.section2.title': '2. Privacy and Data Protection',
    'settings.terms.section2.content': 'Our Privacy Policy explains how we collect, use, and protect the information you provide when using our Service. By using our Service, you agree to the collection and use of information in accordance with this policy.',
    'settings.terms.section2_5.title': '2.5. Disclaimer',
    'settings.terms.section2_5.content': 'Trending provides its services exclusively in territories where it is licensed. Trending is not authorized by the Brazilian Securities and Exchange Commission (CVM) to directly offer securities distribution services to investors who are residents, domiciled, or incorporated in the Federative Republic of Brazil. Nothing on this website should be construed as a direct offer of services addressed to these investors.',
    'settings.terms.section3.title': '3. Security',
    'settings.terms.section3.content': 'The security of your account is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.',
    'settings.terms.section4.title': '4. Limitation of Liability',
    'settings.terms.section4.content': 'In no event shall our company, our directors, officers, employees, affiliates, agents, contractors, interns, suppliers, service providers, or licensors be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including, but not limited to, loss of profits, data, use, goodwill, or other intangible losses, resulting from the use of or inability to use the service.',
    'settings.terms.section5.title': '5. Changes',
    'settings.terms.section5.content': 'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.',
    'settings.terms.section6.title': '6. Contact',
    'settings.terms.section6.content': 'If you have any questions about these Terms, please contact us via email at support@profeyes.com.',
    'settings.close': 'Close',
    
    // Instructions
    'instructions.title': 'Instructions',
    'instructions.subtitle': 'Tips and guidelines for using the platform',
    'instructions.back': 'Back',
    'instructions.intro.title': 'Introduction',
    'instructions.intro.text1': 'Welcome to the trading signal analysis platform. This application was developed to help traders make more informed decisions based on real-time data.',
    'instructions.intro.text2': 'Use the main dashboard to view a summary of the most important information such as active signals, relevant news, and market statistics.',
    'instructions.intro.text3': 'In the Signals section, you will find detailed analyses and trading recommendations based on technical and fundamental indicators.',
    'instructions.intro.subtitle': 'Learn about our platform',
    'instructions.operation.title': 'How to Trade',
    'instructions.operation.subtitle': 'Step-by-step guide',
    'instructions.gale.title': 'Martingale Strategy',
    'instructions.gale.subtitle': 'Maximize your results',
    'instructions.select.section': 'Select a section to begin',
    'instructions.select.description': 'Choose one of the options above to explore details about how to use our platform and maximize your results.',
    'instructions.start.now': 'Start trading now',
    'instructions.platform.description': 'Trending makes it easy to access the financial market with our exclusive technology.',
    'instructions.open.broker': 'Open Broker',
    
    // Novos textos para página de instruções - Inglês
    'instructions.welcome.title': 'Welcome to Trending',
    'instructions.welcome.subtitle': 'Transform knowledge into real and consistent results',
    'instructions.operations.3hours': 'Operations in 3 time slots',
    'instructions.operations.3hours.desc': 'Morning, afternoon, and evening. Choose the best time to trade according to your availability.',
    'instructions.realtime.analysis': 'Real-time analysis',
    'instructions.realtime.analysis.desc': 'Live signals based on professional market analysis, without using robots or automation.',
    'instructions.dominate.operations': 'Master trading operations',
    'instructions.dominate.operations.desc': 'Follow the step-by-step guide to start trading with confidence',
    'instructions.first.steps': 'First steps',
    'instructions.register.broker': {
      text: 'Register with the broker through the link available in the App',
      link: 'https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree'
    },
    'instructions.demo.account': 'After registration, you will receive a demo account with $10,000 for testing',
    'instructions.real.money': 'To trade with real money, make a deposit (we recommend at least $100)',
    'instructions.chart.config': 'Configure the chart to candle format and 5-minute timeframe',
    'instructions.executing.operations': 'Executing trades',
    'instructions.market.up': 'For rising market',
    'instructions.click.buy': 'Click the green button (buy)',
    'instructions.market.down': 'For falling market',
    'instructions.click.sell': 'Click the red button (sell)',
    'instructions.expiration.time': 'Expiration time',
    'instructions.config.candle': 'Configure to match the candle time (5 minutes)',
    'instructions.important.tip': 'Important tip',
    'instructions.follow.signals': 'Follow the signals sent in the App, trading at the exact indicated moment. Discipline and patience are essential for consistent results in the financial market.',
    'instructions.operate.indicated': 'Trade only at the indicated times',
    'instructions.keep.records': 'Keep records of your trades',
    'instructions.gale.strategy.title': 'Martingale Strategy',
    'instructions.gale.strategy.subtitle': 'Maximize your gains with our exclusive re-entry strategy',
    'instructions.gale.strategy.desc': 'If you don\'t profit on the first attempt, our Martingale strategy (re-entries) helps recover lost trades. This technique involves doubling the invested amount at strategic moments, increasing your chances of recovery.',
    'instructions.gale1': 'Martingale 1',
    'instructions.gale1.desc': 'When the operation is losing, wait until 2 seconds before it ends and make a re-entry doubling the initial value of the operation.',
    'instructions.double.initial': 'Doubles the initial entry value',
    'instructions.gale2': 'Martingale 2',
    'instructions.gale2.desc': 'If Martingale 1 doesn\'t recover the operation, make a second re-entry doubling the value of Martingale 1 when there are 2 seconds left to finish.',
    'instructions.double.gale1': 'Doubles the Martingale 1 value',
    'instructions.risk.warning': 'Beware of risks',
    'instructions.risk.warning.desc': 'Although the Martingale strategy can increase your chances of recovery, it also increases risk. Never invest more than you can afford to lose and maintain rigorous capital management.',
    'instructions.trending.indicates': 'Trending indicates when to use the Martingale strategy to help you trade more safely.',
    
    // Video paths
    'video.instructions': '/tutorial-en.mp4',
    'video.poster.instructions': '/images/instructions-poster-en.jpg.png',
    'video.main': '/tutorial-en.mp4',
    'ordersCanceled': 'Canceled Orders',
    'successRate': 'Success Rate',
    'dailyReturns': 'Daily Returns',
    
    // Profile
    'profile.title': 'My Profile',
    'profile.description': 'Manage your profile picture and personal information',
    
    // Support
    'support.title': 'Trending Support',
    'support.help_topics': 'Trending Help Topics',
    'support.back_to_topics': 'Back to topics',
    'support.welcome': 'Hello! How can I help you today?',
    'support.typing': 'Typing...',
    'support.online': 'Online',
    
    support: {
      title: 'Support',
      subtitle: 'How can we help you?',
      welcome: 'Hello! How can I help you today?',
      input_placeholder: 'Type your message...',
      send: 'Send',
      online: 'Online',
      typing: 'typing...',
      human_support: 'We also have human support available during business hours.',
      ai_disclaimer: 'This is an automated response to help you. For complex issues, we recommend contacting us via email.',
      chat: {
        title: 'Support',
        subtitle: 'How can we help?',
        placeholder: 'Type your message...'
      },
      topics: {
        select_topic: 'Please select one of the topics below or a frequent question to get help.',
        help_topics: 'Trending Help Topics',
        back_to_topics: 'Back to topics',
        support_trending: 'Trending Support'
      },
      topic_investment: {
        title: 'Investments',
        description: 'Information about different types of investments',
        q1: {
          question: 'How much capital should I use to trade with the signals?',
          answer: 'To trade with Trending signals, we recommend starting with a minimum capital of $100. Although it is possible to start with smaller amounts (from $60), an initial capital of at least $100 allows you to make entries with more significant values and, consequently, obtain more expressive results. If possible, starting with $200 or $1,000 is even better, because the higher your capital, the greater your profit potential. Our users with these capital values achieve consistent results between $100 and $500 daily. It is important to remember that you should only invest what you can afford to lose and follow an appropriate risk management strategy, especially when implementing re-entry strategies, which require doubling the value of previous entries.'
        },
        q2: {
          question: 'Which cryptocurrencies are used in the signals?',
          answer: 'Our signals channel works with a variety of cryptocurrencies and tokens, including major ones like Bitcoin and Ethereum, but we also expand to tokens with high volatility and profit potential like TokenTrump, Celestia and other emerging tokens. Our team of analysts constantly monitors the market to identify assets with the best entry opportunities, taking into account liquidity, volatility and trend direction. We always select assets that present clear technical patterns and offer the best chances of success for our operations. The specific cryptocurrencies and tokens may vary daily, depending on market conditions, so it is important to pay attention to the signals sent to know exactly which asset to trade at each moment.'
        },
        q3: {
          question: 'How to make a deposit to trade with signals?',
          answer: 'To make a deposit and start trading with Trending signals, follow these steps: 1) Create your account at the broker <a href="https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree" target="_blank" rel="noopener noreferrer">Avalon</a>, our official partner 2) After completing registration, you will receive access to a demo account with $10,000 to test the platform 3) When ready to trade with real money, click "Deposit" on the main menu of <a href="https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree" target="_blank" rel="noopener noreferrer">Avalon</a> 4) Select your preferred payment method: PIX, bank transfer, wire transfer or cryptocurrencies 5) For PIX deposits, enter the desired amount (we recommend starting with at least $100) and follow the instructions to complete payment 6) The amount will be credited to your account within minutes after confirmation With the balance available, you can start executing operations based on the signals you receive in the Trending app. Our support team is available 24/7 to help with any difficulty during the deposit process.'
        }
      },
      topic_platform: {
        title: 'Platform',
        description: 'Help with platform functionalities',
        q1: {
          question: 'How does the Dashboard tab work?',
          answer: 'The Dashboard tab provides an overview of your activities and statistics in the Trending app. Here you can view performance charts, summaries of recent operations and other relevant information for your trading.'
        },
        q2: {
          question: 'What is the purpose of the Signals tab?',
          answer: 'The Signals tab is where you receive trading alerts and recommendations. It shows entry and exit signals for different assets, based on technical analysis and market trends.'
        },
        q3: {
          question: 'What do you find in the News tab?',
          answer: 'The News tab presents the latest updates and relevant information from the financial market. Here you can stay on top of news that can impact your investments.'
        },
        q4: {
          question: 'How can the Instructions tab help?',
          answer: 'The Instructions tab offers guides and tutorials on how to use the Trending app. Here you find tips and detailed instructions to make the most of the platform features.'
        },
        q5: {
          question: 'How to manage notifications in the Notifications tab?',
          answer: 'The Notifications tab manages the alerts and messages you receive in the app. Here you can configure which types of notifications you want to receive and how you want to be notified.'
        },
        q6: {
          question: 'What can you adjust in the Settings tab?',
          answer: 'The Settings tab allows you to customize the app options. Here you can adjust interface preferences, security and other settings for your profile.'
        }
      },
      topic_account: {
        title: 'Account and Security',
        description: 'Questions about your account and security',
        q1: {
          question: 'How to reset my password?',
          answer: 'To reset your password in the Trending app, follow these steps: 1) On the login screen, click "Forgot my password"; 2) Enter the email associated with your account; 3) You will receive an email with a password reset link; 4) Click the link and set a new password following the security requirements; 5) After confirming the new password, you will be directed to the login screen to access your account with the new password. If you do not receive the email within a few minutes, check your spam folder. Additionally, you can reset your password both on the authentication screen and in the app settings.'
        },
        q2: {
          question: 'How to update my registration data?',
          answer: 'To update your registration data in the Trending app, access your profile by clicking the user icon in the upper right corner of the home screen. On the profile screen, you will be able to update information such as display name, profile photo and password.'
        },
        q3: {
          question: 'How to cancel my subscription?',
          answer: 'To cancel your subscription on Trending, access the "Settings" menu and select "Manage Subscription". On the management screen, click the "Cancel Subscription" option and follow the instructions. You will need to confirm your decision and possibly inform the reason for cancellation. After confirmation, your subscription will continue active until the end of the already paid period, without automatic renewal. All your history and data will be preserved for 90 days, in case you decide to return. If you prefer, you can also contact our support for assistance in the cancellation process. Remember that we offer options to pause your subscription temporarily, if you are considering cancellation for temporary reasons.'
        }
      },
      topic_feedback: {
        title: 'Feedback',
        description: 'Questions and answers about feedback and results',
        q1: {
          question: 'How many professional traders built Trending?',
          answer: 'Trending was built by more than 700 professional traders, ensuring a solid foundation of knowledge and experience.'
        },
        q2: {
          question: 'How many assets are monitored?',
          answer: 'Currently, more than 500 assets are monitored by Trending, providing a wide range of trading opportunities.'
        },
        q3: {
          question: 'How many beta testers participated?',
          answer: 'Más de 3200 beta testers participaron en la fase beta de la aplicación Trending, ayudando a refinar y mejorar la plataforma.'
        },
        q4: {
          question: 'What is the satisfaction rate of beta testers?',
          answer: 'The satisfaction rate of beta testers who participated in testing the app in the beta phase is 95%, reflecting the quality and effectiveness of the platform.'
        }
      }
    },
    
    // Traduções para a seção de transmissões ao vivo
    live: {
      title: 'Transmisiones en Vivo',
      subtitle: 'Mira e interactúa con transmisiones en vivo de la comunidad',
      description: 'Comparte tu conocimiento, interactúa en tiempo real y aprende de expertos del mercado financiero.',
      active_streams: 'Transmisiones Activas',
      active_count: '{{count}} en vivo',
      no_active: 'No hay transmisiones activas en este momento',
      no_streams_message: 'No hay transmisiones activas en este momento. Vuelve más tarde.',
      status: 'EN VIVO',
      tab_live: 'En Vivo',
      tab_scheduled: 'Programadas',
      all_categories: 'Todas las categorías',
      search_placeholder: 'Buscar transmisiones',
      loading_title: 'Cargando transmisiones',
      loading_message: 'Espera mientras buscamos las transmisiones disponibles...',
      no_live_title: 'No hay transmisiones en vivo',
      no_live_message: 'En este momento no hay transmisiones en curso.',
      no_scheduled_message: 'No hay transmisiones programadas para suceder pronto.',
      comments: 'Comentarios en vivo',
      no_comments: 'Sé el primero en comentar',
      type_comment: 'Escribe tu comentario...',
      streaming_placeholder: 'Transmisión en vivo',
      about: 'Acerca de esta transmisión',
      end_stream: 'Terminar',
      
      // Para streamers
      start_streaming: 'Iniciar Transmisión',
      start_streaming_desc: 'Configura tu transmisión y comparte con la comunidad',
      stream_title: 'Título de la transmisión',
      stream_description: 'Descripción (opcional)',
      title_placeholder: 'Ej: Análisis de mercado en vivo',
      description_placeholder: 'Describe el contenido de tu transmisión',
      go_live: 'Comenzar transmisión',
      
      // Para espectadores
      no_permission_title: 'Selecciona una transmisión',
      no_permission_desc: 'Selecciona una de las transmisiones activas o espera hasta que un experto inicie una nueva transmisión.',
      
      // Mensagens de erro
      error: {
        title_required: 'El título de la transmisión es obligatorio',
        media_access: 'No se pudo acceder a tu cámara o micrófono. Verifica los permisos.'
      },
      modal: {
        title: 'Nueva Transmisión',
        description: 'Configure su transmisión y comparta sus conocimientos en vivo',
        title_label: 'Título de la Transmisión',
        description_label: 'Descripción',
        category_label: 'Categoría',
        category_placeholder: 'Seleccione una categoría',
        privacy_label: 'Privacidad',
        start_now: 'Iniciar ahora',
        schedule: 'Programar',
        create_stream: 'Crear Transmisión'
      }
    },
    
    // Traduções para a seção de reuniões
    meetings: {
      title: 'Meetings',
      subtitle: 'Create and join meetings with other users',
      active_meetings: 'Active Meetings',
      create_meeting: 'Create New Meeting',
      meeting_title: 'Meeting Title',
      meeting_description: 'Description (optional)',
      title_placeholder: 'Ex: Weekly Signal Review',
      description_placeholder: 'Ex: Discussion about weekly signals',
      start_meeting: 'Start Meeting',
      creating_meeting: 'Creating Meeting...',
      no_active_meetings: 'No active meetings at the moment',
      participants: 'participants',
      join: 'Join',
      end_meeting: 'Meeting ended successfully',
      copy_link: 'Link copied',
      link_copied: 'Link da reunião copiado para a área de transferência',
      about: {
        title: 'About Meetings',
        intro: 'The meetings feature allows you to create and join video conferences directly on the platform.',
        how_works: 'How it works',
        benefits: 'Benefits',
        features: {
          permission: 'Only users with permission can create meetings',
          google_meet: 'Meetings are conducted through Google Meet',
          join: 'Any user can join active meetings',
          share: 'Easily share meeting link',
          screen_sharing: 'Screen sharing for real-time analysis',
          chat: 'Integrated chat for discussions',
          quality: 'High quality audio and video',
          stability: 'Stable and secure connection'
        }
      },
      error: {
        title_required: 'Meeting title is required',
        permission_denied: 'You don\'t have permission to create meetings',
        create_failed: 'Failed to create meeting',
        end_failed: 'Failed to end meeting'
      },
      demo: {
        title: 'Feature Demonstration',
        description: 'This page is a demonstration of the meetings feature.',
        create_hint: 'Try creating a meeting by clicking the button above.',
        features_title: 'Available Features',
        feature_1: 'Create meetings with title and description',
        feature_2: 'View active meetings',
        feature_3: 'Join existing meetings',
        feature_4: 'End your own meetings',
        feature_5: 'Share meeting link',
        coming_soon: 'Coming Soon',
        soon_1: 'Meeting scheduling',
        soon_2: 'Automatic recording',
        soon_3: 'Meeting transcription',
        soon_4: 'Calendar integration'
      }
    },

    // Timezone
    'timezone.label': 'Timezone',
    'timezone.select': 'Select your timezone',
    'timezone.selector': 'Time Zones',
    'timezone.current': 'Current timezone',
    'timezone.dst': 'Daylight Saving Time Active',
    'timezone.system': 'System timezone',
    'timezone.changed': 'Timezone changed to',
    'timezone.updated': 'Times updated successfully',

    // Profile errors and success messages
    'profile.error.needLogin': 'You need to be logged in to perform this action',
    'profile.success.updated': 'Profile updated successfully!',
    'profile.error.updateFailed': 'Failed to update profile. Please try again.',
    'profile.error.invalidImage': 'Please select a valid image.',
    'profile.error.imageSize': 'The image must be less than 5MB.',
    'profile.error.invalidEmailFormat': 'Invalid email format',
    'profile.error.resetPasswordFailed': 'Failed to send reset email',
    'profile.submit.saving': 'Saving...',
    'profile.submit.save': 'Save changes',

    // 404 Page
    'notfound.title': 'Page not found',
    'notfound.subtitle': 'Oops! Page not found',
    'notfound.message': 'The page you are looking for doesn\'t exist or has been removed.',
    'notfound.button': 'Return to Home',
    'settings.account.verified_status': 'Verified',
    'settings.account.emailSentSuccess': 'Email sent successfully',
    'settings.account.resetPasswordEmailSent': 'A link to reset your password has been sent to',
    'settings.account.checkYourInbox': 'Check your inbox',
    'settings.account.openMyEmail': 'Open my email',
    // Notifications
    'notifications.center': 'Notification Center',
    'notifications.manage': 'Manage your notifications and configure your preferences',
    'notifications.overview': 'Overview of your notifications',
    'notifications.total': 'Total notifications',
    'notifications.unread': 'Unread',
    'notifications.read': 'Read',
    'notifications.byType': 'By type',
    'notifications.yours': 'Your Notifications',
    'notifications.markAll': 'Mark all',
    'notifications.markAllAsRead': 'Mark all as read',
    'notifications.clearAll': 'Clear all',
    'notifications.removeAll': 'Remove all notifications',
    'notifications.filter': 'Filter notifications',
    'notifications.filterByType': 'Filter by type',
    'notifications.all': 'All',
    'notifications.display': 'Display',
    'notifications.onlyUnread': 'Only unread',
    'notifications.settings': 'Notification settings',
    'notifications.filteringByType': 'Filtering by type',
    'notifications.notFound': 'No notifications found',
    'notifications.allRead': 'You have read all your notifications',
    'notifications.noneOfType': 'No notifications of this type were found',
    'notifications.willAppearHere': 'When there are updates, they will appear here',
    'notifications.noUnread': 'No unread notifications',
    'notifications.recent': 'Recent notifications',
    'notifications.viewAll': 'View all',
    'notifications.none': 'No notifications',
    'notifications.markAsRead': 'Mark as read',
    
    // Tipos de notificação
    'notifications.types.signals': 'Trading Signals',
    'notifications.types.live': 'Live Streams',
    'notifications.types.signalsDesc': 'Notifications about buy and sell signals',
    'notifications.types.liveDesc': 'Notifications when a live stream is started',
    
    // Configurações de notificações
    'notifications.settings.title': 'Notification Settings',
    'notifications.settings.description': 'Choose which types of notifications you want to receive',
    'notifications.settings.enable': 'Notifications',
    'notifications.settings.enableDesc': 'Enable or disable all notifications',
    'notifications.settings.typesTitle': 'Notification Types',
    'notifications.settings.typesDesc': 'Select which types of notifications you want to receive',
    'notifications.settings.cancel': 'Cancel',
    'notifications.settings.testSignal': 'Send Test Signal',
    'notifications.settings.save': 'Save',
    'notifications.settings.saved': 'Saved!',
    
    // Sinais - notificação prévia
    'signals.upcoming': 'Próxima',
    'signals.prepare': 'Prepárate para operar',
    'signals.notification': 'Pre-notificación de señal',
    'signals.minutes_before': '5 minutos antes de la señal',
  },
  es: {
    // Navbar
    'nav.home': 'Inicio',
    'nav.dashboard': 'Panel',
    'nav.settings': 'Configuración',
    'nav.instructions': 'Instrucciones',
    'nav.signals': 'Señales',
    'nav.news': 'Noticias',
    'nav.news.title': 'Noticias del Mercado',
    'nav.news.none': 'No hay noticias disponibles',
    'nav.notifications': 'Notificaciones',
    'nav.notifications.read': 'Notificaciones Leídas',
    'nav.settings.notifications': 'Área del Usuario',
    'nav.system.status': 'Estado del sistema',
    'nav.system.online': 'En línea',
    'nav.support': 'Soporte',
    'nav.live': 'En Vivo',
    'nav.meetings': 'Reuniones',
    'nav.toggle.sidebar': 'Alternar Barra Lateral',
    'nav.admin': 'Administración',
    
    // News
    'news.subtitle': 'Sigue las últimas noticias del mercado de criptomonedas y finanzas',
    'news.refresh': 'Actualizar',
    'news.updated': '¡Actualizado!',
    'news.loading': 'Buscando las últimas noticias del mercado...',
    'news.error.loading': 'Error al cargar noticias',
    'news.error.tryAgain': 'Inténtelo de nuevo más tarde.',
    'news.tryAgain': 'Intentar de nuevo',
    'news.none': 'No hay noticias disponibles en este momento.',
    'news.filter.label': 'Filtrar por:',
    'news.filter.all': 'Todas',
    'news.filter.markets': 'Mercados & Trading',
    'news.filter.economy': 'Economía & Política',
    'news.filter.tech': 'Tecnología & Innovación',
    'news.filter.commodities': 'Commodities & ESG',
    'news.filter.global': 'Global & Geopolítica',
    'news.filter.noResults': 'No se encontraron noticias para',
    'news.filter.totalAvailable': 'Total disponible:',
    'news.filter.news': 'noticias',
    'news.filter.viewAll': 'Ver todas',
    
    // Common
    'common.cancel': 'Cancelar',
    'common.saving': 'Guardando...',
    'common.saved': 'Guardado',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.summary': 'Resumen',
    
    // Profile
    'profile.name.addHint': 'Añade un nombre para personalizar tu perfil',
    'profile.error.emptyName': 'Por favor, introduce un nombre de visualización',
    
    // Dashboard
    'dashboard.title': 'Monitoreo del mercado en tiempo real',
    'dashboard.market.opportunities': 'Oportunidades de mercado basadas en análisis de datos en tiempo real',
    'dashboard.refresh.all': 'Actualizar Todo',
    'dashboard.signals.title': 'Señales Destacadas',
    'dashboard.signals.entry': 'Entrada',
    'dashboard.signals.expiration': 'Expiración',
    'dashboard.signals.reentry1': 'Reentrada 1',
    'dashboard.signals.reentry2': 'Reentrada 2',
    'dashboard.signals.updated': 'Actualizado',
    'dashboard.signals.trade': 'Operar ahora',
    'dashboard.signals.loading': 'Cargando señales...',
    'dashboard.signals.loading_error': 'Error al cargar señales',
    'dashboard.signals.loading_error_desc': 'No se pudieron obtener las señales de trading en este momento.',
    'dashboard.signals.view_all': 'Ver todo',
    'dashboard.signals.realtime': 'Señales en Tiempo Real',
    'dashboard.signals.waiting': 'Esperando nuevas señales...',
    'dashboard.stats.totalSignals': 'Total de Señales',
    'dashboard.stats.successRate': 'Tasa de Éxito',
    'dashboard.stats.monthlyGain': 'Ganancia Mensual',
    'dashboard.stats.monthlyLoss': 'Pérdida Mensual',
    'dashboard.stats.totalProfit': 'Beneficio Total',
    'dashboard.stats.todayOperations': 'Operaciones Hoy',
    'dashboard.stats.onlineTime': 'Tiempo en Línea',
    'dashboard.stats.activeDays': 'Días Activos',
    
    // Signals page
    'signals.title': 'Señales de Trading',
    'signals.subtitle': 'Señales de alta precisión para sus operaciones',
    'signals.refresh': 'Actualizar',
    'signals.refresh.all': 'Actualizar Todo',
    'signals.advanced.monitoring': 'Monitoreo avanzado de señales y tendencias de mercado',
    'signals.filters': 'Filtros',
    'signals.type': 'Tipo de señal',
    'signals.type.all': 'Todos',
    'signals.type.technical': 'Técnicos',
    'signals.type.fundamental': 'Fundamentales',
    'signals.type.news': 'Noticias',
    'signals.options': 'Opciones',
    'signals.options.show.expired': 'Mostrar Expirados',
    'signals.options.hide.expired': 'Ocultar Expirados',
    'signals.options.auto.refresh': 'Auto-actualizar',
    'signals.analyzing.market': 'Analizando mercado',
    'signals.processing': 'Procesando señales e identificando las mejores oportunidades de trading',
    'signals.strength.very_strong': 'Altísima expectativa',
    'signals.strength.strong': 'Alta expectativa',
    'signals.strength.moderate': 'Expectativa media',
    'signals.strength.weak': 'Baja expectativa',
    'signals.expires': 'Expira',
    'signals.invalid.date': 'Fecha inválida',
    'signals.new': 'NUEVO',
    'signals.buy': 'COMPRA',
    'signals.sell': 'VENTA',
    'signals.result.win': 'GANANCIA',
    'signals.result.loss': 'PÉRDIDA',
    
    // Settings
    'settings.title': 'Configuraciones',
    'settings.subtitle': 'Personaliza la plataforma según tus preferencias',
    'settings.profile': 'Perfil',
    'settings.notifications': 'Notificaciones',
    'settings.appearance': 'Apariencia',
    'settings.sounds': 'Sonidos',
    'settings.language': 'Idioma',
    'settings.security': 'Privacidad y Seguridad',
    'settings.account.status': 'Estado de la Cuenta',
    'settings.account.connected': 'Conectado como',
    'settings.account.active': 'Activo',
    'settings.account.displayName': 'Nombre de visualización',
    'settings.account.displayNamePlaceholder': 'Tu nombre de visualización',
    'settings.account.email': 'Correo electrónico',
    'settings.account.emailFixed': 'Esta información no puede ser cambiada',
    'settings.account.password': 'Contraseña',
    'settings.account.changePassword': 'Cambiar contraseña',
    'settings.account.userName': 'Usuario',
    'settings.account.changeAvatar': 'Cambiar foto de perfil',
    'settings.account.uploading': 'Subiendo imagen...',
    'settings.account.currentPassword': 'Contraseña Actual',
    'settings.account.currentPasswordPlaceholder': 'Introduce tu contraseña actual',
    'settings.account.newPassword': 'Nueva Contraseña',
    'settings.account.newPasswordPlaceholder': 'Introduce tu nueva contraseña',
    'settings.account.confirmPassword': 'Confirmar Contraseña',
    'settings.account.confirmPasswordPlaceholder': 'Confirma tu nueva contraseña',
    'settings.account.passwordMismatch': 'Las contraseñas no coinciden',
    'settings.account.passwordTooShort': 'La contraseña debe tener al menos 8 caracteres',
    'settings.account.savePassword': 'Guardar Nueva Contraseña',
    'settings.account.forgotPassword': 'Olvidé mi contraseña',
    'settings.account.passwordProtected': 'Tu contraseña está protegida y cifrada',
    'settings.account.passwordShown': 'Tu contraseña se está mostrando en el campo de arriba',
    'settings.account.passwordRequirements': 'Requisitos de contraseña',
    'settings.account.passwordMin8': 'Mínimo de 8 caracteres',
    'settings.account.passwordUppercase': 'Al menos una letra mayúscula',
    'settings.account.passwordNumber': 'Al menos un número',
    'settings.account.passwordSpecial': 'Al menos un carácter especial',
    'settings.account.passwordMatch': 'Las contraseñas coinciden',
    'settings.account.savingPassword': 'Guardando nueva contraseña...',
    'settings.account.passwordVerified': '¡Contraseña verificada con éxito!',
    'settings.account.afterVerificationMessage': 'Después de verificar tu identidad, podrás ver tu contraseña.',
    'settings.account.verifying': 'Verificando...',
    'settings.account.processing': 'Procesando...',
    'settings.account.verified': 'Verificado',
    'settings.account.terms': 'Al conectarse, acepta nuestros Términos de Servicio y Política de Privacidad.',
    'settings.account.save': 'Guardar cambios',
    'settings.account.logout': 'Desconectar',
    'settings.account.avatar.change': 'Haz clic en el icono para cambiar tu foto',
    'settings.account.avatar.noFile': 'Ningún archivo seleccionado',
    'settings.account.verifyPassword': 'Verificar Contraseña',
    'settings.account.verifyPasswordDesc': 'Para ver tu contraseña, necesitamos verificar tu identidad.',
    'settings.account.enterPassword': 'Introduce tu contraseña actual',
    'settings.account.resetPassword': 'Restablecer tu contraseña',
    'settings.account.resetPasswordDesc': 'Enviaremos un enlace para restablecer tu contraseña al siguiente correo electrónico.',
    'settings.account.resetPasswordNote': 'Se enviará un enlace de restablecimiento a este correo electrónico. Comprueba también tu carpeta de spam.',
    'settings.account.resetPasswordExpire': 'El enlace caducará después de 24 horas por razones de seguridad',
    'settings.account.changePasswordManually': 'Cambiar manualmente',
    'settings.account.sendResetLink': 'Enviar enlace',
    'settings.account.confirmEmail': 'Confirmar Email',
    'settings.account.confirmEmailDesc': 'Ingresa tu email para recibir el enlace de restablecimiento de contraseña.',
    'settings.account.accountEmail': 'Email de la cuenta',
    'settings.account.enterYourEmail': 'Ingresa tu email',
    'settings.account.resetLinkWillBeSent': 'Se enviará un email con el enlace para restablecer tu contraseña a la dirección confirmada.',
    'settings.account.sendEmail': 'Enviar Email',
    'settings.account.sending': 'Enviando...',
    'settings.account.hidePassword': 'Ocultar contraseña',
    'settings.account.showPassword': 'Mostrar contraseña',
    'settings.language.description': 'Elige el idioma de la interfaz',
    'settings.language.select': 'Selecciona un idioma',
    'settings.language.pt': 'Portugués',
    'settings.language.en': 'Inglés',
    'settings.language.es': 'Español',
    'settings.save': 'Guardar',
    'settings.verify': 'Verificar',
    'settings.general': 'Configuraciones Generales',
    'settings.help': 'Ayuda y Soporte',
    'settings.saveSuccessMessage': 'Configuraciones guardadas con éxito',
    'settings.saveSuccessDescription': 'Todas tus preferencias han sido actualizadas.',
    'settings.saveErrorMessage': 'Error al guardar configuraciones',
    'settings.terms.title': 'Términos de Uso',
    'settings.terms.lastUpdate': 'Última actualización: 10/10/2023',
    'settings.terms.intro1': 'Estos términos y condiciones ("Términos") rigen el uso del servicio ProfEyes ("Servicio") operado por nuestra empresa.',
    'settings.terms.intro2': 'Al acceder o utilizar el Servicio, usted acepta estar sujeto a estos Términos. Si no está de acuerdo con alguna parte de los términos, no podrá acceder al Servicio.',
    'settings.terms.section1.title': '1. Cuentas',
    'settings.terms.section1.content': 'Cuando crea una cuenta con nosotros, garantiza que la información proporcionada es precisa, completa y actualizada. La información imprecisa, incompleta o desactualizada puede resultar en la terminación inmediata de su cuenta en el Servicio.',
    'settings.terms.section2.title': '2. Privacidad y Protección de Datos',
    'settings.terms.section2.content': 'Nuestra Política de Privacidad explica cómo recopilamos, utilizamos y protegemos la información que proporciona al utilizar nuestro Servicio. Al utilizar nuestro Servicio, acepta la recopilación y el uso de información de acuerdo con esta política.',
    'settings.terms.section2_5.title': '2.5. Exención de Responsabilidad',
    'settings.terms.section2_5.content': 'Trending proporciona sus servicios exclusivamente en los territorios donde está autorizada. Trending no está autorizada por la Comisión de Valores Mobiliarios de Brasil (CVM) para ofrecer directamente servicios de distribución de valores a inversores residentes, domiciliados o constituidos en la República Federativa de Brasil. Nada en este sitio web debe interpretarse como una oferta directa de servicios dirigida a estos inversores.',
    'settings.terms.section3.title': '3. Seguridad',
    'settings.terms.section3.content': 'La seguridad de su cuenta es importante para nosotros, pero recuerde que ningún método de transmisión por Internet o método de almacenamiento electrónico es 100% seguro. Mientras nos esforzamos por utilizar medios comercialmente aceptables para proteger su información personal, no podemos garantizar su seguridad absoluta.',
    'settings.terms.section4.title': '4. Limitación de Responsabilidad',
    'settings.terms.section4.content': 'En ningún caso nuestra empresa, nuestros directores, oficiales, empleados, afiliados, agentes, contratistas, pasantes, proveedores, prestadores de servicios o licenciantes serán responsables por cualquier daño directo, indirecto, incidental, especial, consecuente o punitivo, incluyendo, pero no limitado a, pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles, resultantes del uso o la incapacidad de usar el servicio.',
    'settings.terms.section5.title': '5. Cambios',
    'settings.terms.section5.content': 'Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es material, intentaremos proporcionar un aviso con al menos 30 días de anticipación antes de que los nuevos términos entren en vigor.',
    'settings.terms.section6.title': '6. Contacto',
    'settings.terms.section6.content': 'Si tiene alguna pregunta sobre estos Términos, contáctenos a través del correo electrónico soporte@profeyes.com.',
    'settings.close': 'Fechar',
    
    // Instructions
    'instructions.title': 'Instrucciones',
    'instructions.subtitle': 'Consejos y orientaciones para utilizar la plataforma',
    'instructions.back': 'Volver',
    'instructions.intro.title': 'Introducción',
    'instructions.intro.text1': 'Bienvenido a la plataforma de análisis de señales de trading. Esta aplicación fue desarrollada para ayudar a los traders a tomar decisiones más informadas basadas en datos en tiempo real.',
    'instructions.intro.text2': 'Utilice el panel principal (Dashboard) para visualizar un resumen de la información más importante como señales activas, noticias relevantes y estadísticas del mercado.',
    'instructions.intro.text3': 'En la sección de Señales, encontrará análisis detallados y recomendaciones de operaciones basadas en indicadores técnicos y fundamentales.',
    'instructions.intro.subtitle': 'Conozca nuestra plataforma',
    'instructions.operation.title': 'Cómo Operar',
    'instructions.operation.subtitle': 'Guía paso a paso',
    'instructions.gale.title': 'Estrategia de Martingala',
    'instructions.gale.subtitle': 'Maximice sus resultados',
    'instructions.select.section': 'Seleccione una sección para comenzar',
    'instructions.select.description': 'Elija una de las opciones anteriores para explorar detalles sobre cómo usar nuestra plataforma y maximizar sus resultados.',
    'instructions.start.now': 'Comience a operar ahora mismo',
    'instructions.platform.description': 'Trending facilita el acceso al mercado financiero con nuestra tecnología exclusiva.',
    'instructions.open.broker': 'Abrir Broker',
    
    // Novos textos para página de instruções - Espanhol
    'instructions.welcome.title': 'Bienvenido a Trending',
    'instructions.welcome.subtitle': 'Transforme conocimiento en resultados reales y consistentes',
    'instructions.operations.3hours': 'Operaciones en 3 horarios',
    'instructions.operations.3hours.desc': 'Mañana, tarde y noche. Elija el mejor momento para operar según su disponibilidad.',
    'instructions.realtime.analysis': 'Análisis en tiempo real',
    'instructions.realtime.analysis.desc': 'Señales en vivo basadas en análisis profesional del mercado, sin uso de robots o automatizaciones.',
    'instructions.dominate.operations': 'Domine las operaciones',
    'instructions.dominate.operations.desc': 'Siga el paso a paso para comenzar a operar con confianza',
    'instructions.first.steps': 'Primeros pasos',
    'instructions.register.broker': {
      text: 'Regístrese en el bróker a través del enlace disponible en la App',
      link: 'https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree'
    },
    'instructions.demo.account': 'Después del registro, recibirá una cuenta demo con $10.000 para pruebas',
    'instructions.real.money': 'Para operar con dinero real, realice un depósito (recomendamos al menos $100)',
    'instructions.chart.config': 'Configure el gráfico en formato de velas y tiempo de 5 minutos',
    'instructions.executing.operations': 'Ejecutando operaciones',
    'instructions.market.up': 'Para mercado en alza',
    'instructions.click.buy': 'Haga clic en el botón verde (comprar)',
    'instructions.market.down': 'Para mercado en baja',
    'instructions.click.sell': 'Haga clic en el botón rojo (vender)',
    'instructions.expiration.time': 'Tiempo de expiración',
    'instructions.config.candle': 'Configure igual al tiempo de vela (5 minutos)',
    'instructions.important.tip': 'Consejo importante',
    'instructions.follow.signals': 'Siga las señales enviadas en la App, operando en el momento exacto indicado. La disciplina y paciencia son esenciales para obtener resultados consistentes en el mercado financiero.',
    'instructions.operate.indicated': 'Opere solo en los momentos indicados',
    'instructions.keep.records': 'Mantenga un registro de sus operaciones',
    'instructions.gale.strategy.title': 'Estrategia de Martingala',
    'instructions.gale.strategy.subtitle': 'Maximice sus ganancias con nuestra estrategia exclusiva de reentradas',
    'instructions.gale.strategy.desc': 'Si no logra obtener beneficios en el primer intento, nuestra estrategia de Martingala (reentradas) ayuda a recuperar operaciones perdidas. Esta técnica consiste en duplicar el valor invertido en momentos estratégicos, aumentando sus posibilidades de recuperación.',
    'instructions.gale1': 'Martingala 1',
    'instructions.gale1.desc': 'Cuando la operación está perdiendo, espere hasta que falten 2 segundos para finalizar y haga una reentrada duplicando el valor inicial de la operación.',
    'instructions.double.initial': 'Duplica el valor de la entrada inicial',
    'instructions.gale2': 'Martingala 2',
    'instructions.gale2.desc': 'Si la Martingala 1 no recupera la operación, haga una segunda reentrada duplicando el valor de la Martingala 1 cuando falten 2 segundos para finalizar.',
    'instructions.double.gale1': 'Duplica el valor de la Martingala 1',
    'instructions.risk.warning': 'Cuidado con los riesgos',
    'instructions.risk.warning.desc': 'Aunque la estrategia de Martingala puede aumentar sus posibilidades de recuperación, también aumenta el riesgo. Nunca invierta más de lo que puede perder y mantenga una gestión rigurosa de su capital.',
    'instructions.trending.indicates': 'Trending indica cuándo usar la estrategia de Martingala, para ayudarle a operar con más seguridad.',
    
    // Video paths
    'video.instructions': '/tutorial-es.mp4',
    'video.poster.instructions': '/images/instructions-poster-es.jpg.png',
    'video.main': '/tutorial-es.mp4',
    'ordersCanceled': 'Órdenes Canceladas',
    'successRate': 'Tasa de Éxito',
    'dailyReturns': 'Retornos Diarios',
    
    // Profile
    'profile.title': 'Mi Perfil',
    'profile.description': 'Administra tu foto de perfil e información personal',
    
    // Support
    'support.title': 'Soporte Trending',
    'support.help_topics': 'Temas de Ayuda Trending',
    'support.back_to_topics': 'Volver a los temas',
    'support.welcome': '¡Hola! ¿Cómo puedo ayudarte hoy?',
    'support.typing': 'Escribiendo...',
    'support.online': 'En línea',
    
    support: {
      title: 'Asistencia Personalizada',
      subtitle: 'Estamos listos para ofrecerte el soporte que necesitas.',
      welcome: 'Bienvenido/a a nuestro centro de asistencia. ¿Cómo puedo ayudarte hoy?',
      input_placeholder: 'Escribe tu mensaje...',
      send: 'Enviar',
      online: 'Disponible',
      typing: 'escribiendo...',
      human_support: 'Para asuntos más complejos, nuestro equipo especializado está disponible durante el horario comercial.',
      ai_disclaimer: 'Soy un asistente virtual aquí para ayudar con tus preguntas. Los clientes premium tienen acceso prioritario a nuestro equipo de expertos 24/7.',
      chat: {
        title: 'Asistencia',
        subtitle: '¿Cómo podemos ayudarte?',
        placeholder: 'Escribe tu mensaje...'
      },
      topics: {
        select_topic: 'Por favor, selecciona uno de los temas a continuación para obter ayuda.',
        help_topics: 'Temas de Ayuda Trending',
        back_to_topics: 'Volver a los temas',
        support_trending: 'Soporte Trending'
      },
      topic_investment: {
        title: 'Inversiones',
        description: 'Información sobre diferentes tipos de inversiones',
        q1: {
          question: '¿Cuánto capital debo usar para operar con las señales?',
          answer: 'Para operar con las señales de Trending, recomendamos comenzar con un capital mínimo de $100. Aunque es posible iniciar con valores menores (desde $60), un capital inicial de al menos $100 permite realizar entradas con valores más significativos y, consecuentemente, obtener resultados más expresivos. Si es posible, iniciar con $200 o $1,000 es aún mejor, porque cuanto mayor sea tu capital, mayor será tu potencial de beneficio. Nuestros usuarios con estos valores de capital logran resultados consistentes entre $100 y $500 diarios. Es importante recordar que debes invertir solo lo que puedes permitirte perder y seguir una estrategia de gestión de riesgo adecuada, especialmente al implementar las estrategias de reentrada, que requieren duplicar el valor de las entradas anteriores.'
        },
        q2: {
          question: '¿Qué criptomonedas se utilizan en las señales?',
          answer: 'Nuestro canal de señales trabaja con una variedad de criptomonedas y tokens, incluyendo las principales como Bitcoin y Ethereum, pero también expandimos a tokens con alta volatilidad y potencial de beneficio como TokenTrump, Celestia y otros tokens emergentes. Nuestro equipo de analistas monitorea constantemente el mercado para identificar los activos con las mejores oportunidades de entrada, teniendo en cuenta liquidez, volatilidad y dirección de tendencia. Seleccionamos siempre los activos que presentan patrones técnicos claros y ofrecen las mejores posibilidades de éxito para nuestras operaciones. Las criptomonedas y tokens específicos pueden variar diariamente, dependiendo de las condiciones del mercado, por eso es importante estar atento a las señales enviadas para saber exactamente qué activo operar en cada momento.'
        },
        q3: {
          question: '¿Cómo hacer un depósito para operar con las señales?',
          answer: 'Para hacer un depósito y comenzar a operar con las señales de Trending, sigue estos pasos: 1) Crea tu cuenta en el bróker <a href="https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree" target="_blank" rel="noopener noreferrer">Avalon</a>, nuestro socio oficial 2) Después de completar el registro, recibirás acceso a una cuenta demo con $10,000 para probar la plataforma 3) Cuando estés listo para operar con dinero real, haz clic en la opción "Depositar" en el menú principal de <a href="https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree" target="_blank" rel="noopener noreferrer">Avalon</a> 4) Selecciona tu método de pago preferido: PIX, transferencia bancaria, transferencia electrónica o criptomonedas 5) Para depósitos vía PIX, informa el valor deseado (recomendamos iniciar con al menos $100) y sigue las instrucciones para completar el pago 6) El valor será acreditado en tu cuenta en cuestión de minutos después de la confirmación Con el saldo disponible, ya puedes comenzar a ejecutar las operaciones basadas en las señales que recibes en la aplicación Trending. Nuestro equipo de soporte está disponible 24/7 para ayudar con cualquier dificultad durante el proceso de depósito.'
        }
      },
      topic_platform: {
        title: 'Plataforma',
        description: 'Ayuda con funcionalidades de la plataforma',
        q1: {
          question: '¿Cómo funciona la pestaña Dashboard?',
          answer: 'La pestaña Dashboard proporciona una visión general de tus actividades y estadísticas en la aplicación Trending. Aquí puedes visualizar gráficos de rendimiento, resúmenes de operaciones recientes y otra información relevante para tu trading.'
        },
        q2: {
          question: '¿Cuál es el propósito de la pestaña Señales?',
          answer: 'La pestaña Señales es donde recibes alertas y recomendaciones de trading. Muestra señales de entrada y salida para diferentes activos, basadas en análisis técnicos y tendencias del mercado.'
        },
        q3: {
          question: '¿Qué encuentras en la pestaña Noticias?',
          answer: 'La pestaña Noticias presenta las últimas actualizaciones e información relevante del mercado financiero. Aquí puedes mantenerte al día con noticias que pueden impactar tus inversiones.'
        },
        q4: {
          question: '¿Cómo puede ayudar la pestaña Instrucciones?',
          answer: 'La pestaña Instrucciones ofrece guías y tutoriales sobre cómo usar la aplicación Trending. Aquí encuentras consejos e instrucciones detalladas para aprovechar al máximo las funcionalidades de la plataforma.'
        },
        q5: {
          question: '¿Cómo gestionar notificaciones en la pestaña Notificaciones?',
          answer: 'La pestaña Notificaciones gestiona las alertas y mensajes que recibes en la aplicación. Aquí puedes configurar qué tipos de notificaciones deseas recibir y cómo deseas ser notificado.'
        },
        q6: {
          question: '¿Qué puedes ajustar en la pestaña Configuraciones?',
          answer: 'La pestaña Configuraciones te permite personalizar las opciones de la aplicación. Aquí puedes ajustar preferencias de interfaz, seguridad y otras configuraciones de tu perfil.'
        }
      },
      topic_account: {
        title: 'Cuenta y Seguridad',
        description: 'Cuestiones sobre tu cuenta y seguridad',
        q1: {
          question: '¿Cómo redefinir mi contraseña?',
          answer: 'Para redefinir tu contraseña en la aplicación Trending, sigue estos pasos: 1) En la pantalla de login, haz clic en "Olvidé mi contraseña"; 2) Ingresa el email asociado a tu cuenta; 3) Recibirás un email con un enlace para redefinición de contraseña; 4) Haz clic en el enlace y define una nueva contraseña siguiendo los requisitos de seguridad; 5) Después de confirmar la nueva contraseña, serás dirigido a la pantalla de login para acceder a tu cuenta con la nueva contraseña. Si no recibes el email en algunos minutos, verifica tu carpeta de spam. Además, puedes redefinir tu contraseña tanto en la pantalla de autenticación como en las configuraciones de la aplicación.'
        },
        q2: {
          question: '¿Cómo actualizar mis datos de registro?',
          answer: 'Para actualizar tus datos de registro en la aplicación Trending, accede a tu perfil haciendo clic en el ícono de usuario en la esquina superior derecha de la pantalla inicial. En la pantalla de perfil, podrás actualizar información como nombre de visualización, foto de perfil y contraseña.'
        },
        q3: {
          question: '¿Cómo cancelar mi suscripción?',
          answer: 'Para cancelar tu suscripción en Trending, accede al menú "Configuraciones" y selecciona "Gestionar Suscripción". En la pantalla de gestión, haz clic en la opción "Cancelar Suscripción" y sigue las instrucciones. Necesitarás confirmar tu decisión y posiblemente informar el motivo de la cancelación. Después de la confirmación, tu suscripción continuará activa hasta el final del período ya pagado, sin renovación automática. Todo tu historial y datos quedarán preservados por 90 días, en caso de que decidas regresar. Si lo prefieres, también puedes contactar nuestro soporte para asistencia en el proceso de cancelación. Recuerda que ofrecemos opciones para pausar tu suscripción temporalmente, en caso de que estés considerando una cancelación por motivos temporales.'
        }
      },
      topic_feedback: {
        title: 'Feedback',
        description: 'Preguntas y respuestas sobre feedback y resultados',
        q1: {
          question: '¿Cuántos traders profesionales construyeron Trending?',
          answer: 'Trending fue construido por más de 700 traders profesionales, garantizando una base sólida de conocimiento y experiencia.'
        },
        q2: {
          question: '¿Cuántos activos son monitoreados?',
          answer: 'Actualmente, más de 500 activos son monitoreados por Trending, proporcionando una amplia gama de oportunidades de trading.'
        },
        q3: {
          question: '¿Cuántos beta testers participaron?',
          answer: 'Más de 3200 beta testers participaron en la fase beta de la aplicación Trending, ayudando a refinar y mejorar la plataforma.'
        },
        q4: {
          question: '¿Cuál es la tasa de satisfação de los beta testers?',
          answer: 'La tasa de satisfação de los beta testers que participaram do teste do aplicativo na fase beta é de 95%, refletindo a qualidade e eficácia da plataforma.'
        }
      }
    },
    
    // Traduções para a seção de reuniões
    meetings: {
      title: 'Reuniões Online',
      subtitle: 'Crie ou participe de reuniões online com outros usuários',
      active_meetings: 'Reuniões Ativas',
      create_meeting: 'Criar Nova Reunião',
      meeting_title: 'Título da Reunião',
      meeting_description: 'Descrição (opcional)',
      title_placeholder: 'Digite o título da reunião',
      description_placeholder: 'Digite uma breve descrição',
      start_meeting: 'Iniciar Nova Reunião',
      creating_meeting: 'Criando Reunião...',
      no_active_meetings: 'Nenhuma reunião ativa no momento.',
      participants: 'participante(s)',
      join: 'Entrar',
      end_meeting: 'Finalizar Reunião',
      copy_link: 'Copiar Link',
      link_copied: 'Link copiado para a área de transferência',
      
      about: {
        title: 'Sobre as Reuniões Online',
        intro: 'As reuniões online substituem as transmissões ao vivo anteriores, oferecendo uma experiência mais interativa e estável para todos os participantes.',
        how_works: 'Como funciona:',
        benefits: 'Benefícios:',
        features: {
          permission: 'Usuários com permissão podem criar novas reuniões',
          google_meet: 'As reuniões são realizadas através do Google Meet',
          join: 'Todos os usuários podem participar das reuniões ativas',
          share: 'Compartilhe conhecimento e tire dúvidas em tempo real',
          screen_sharing: 'Compartilhamento de tela integrado',
          chat: 'Chat em tempo real durante as reuniões',
          quality: 'Melhor qualidade de áudio e vídeo',
          stability: 'Maior estabilidade em conexões com baixa largura de banda'
        }
      },
      
      // Mensagens de erro
      error: {
        title_required: 'O título da reunião é obrigatório',
        permission_denied: 'Você não tem permissão para iniciar reuniões',
        create_failed: 'Erro ao criar reunião',
        end_failed: 'Erro ao finalizar reunião'
      }
    },

    // Timezone
    'timezone.label': 'Zona Horaria',
    'timezone.select': 'Seleccione su zona horaria',
    'timezone.selector': 'Zonas Horarias',
    'timezone.current': 'Zona horaria actual',
    'timezone.dst': 'Horario de Verano Activo',
    'timezone.system': 'Zona horaria del sistema',
    'timezone.changed': 'Zona horaria cambiada a',
    'timezone.updated': 'Horarios actualizados con éxito',

    // Profile errors and success messages
    'profile.error.needLogin': 'Necesitas iniciar sesión para realizar esta acción',
    'profile.success.updated': '¡Perfil actualizado con éxito!',
    'profile.error.updateFailed': 'Error al actualizar el perfil. Inténtelo de nuevo.',
    'profile.error.invalidImage': 'Por favor, seleccione una imagen válida.',
    'profile.error.imageSize': 'La imagen debe tener menos de 5MB.',
    'profile.error.invalidEmailFormat': 'Formato de correo electrónico inválido',
    'profile.error.resetPasswordFailed': 'Error al enviar el correo de restablecimiento',
    'profile.submit.saving': 'Guardando...',
    'profile.submit.save': 'Guardar cambios',

    // 404 Page
    'notfound.title': 'Página no encontrada',
    'notfound.subtitle': 'Oops! Página no encontrada',
    'notfound.message': 'La página que estás buscando no existe o ha sido eliminada.',
    'notfound.button': 'Volver a la página inicial',
    'settings.account.verified_status': 'Verificado',
    'settings.account.emailSentSuccess': 'Correo enviado con éxito',
    'settings.account.resetPasswordEmailSent': 'Se ha enviado un enlace para restablecer tu contraseña a',
    'settings.account.checkYourInbox': 'Revisa tu bandeja de entrada',
    'settings.account.openMyEmail': 'Abrir mi correo',
    // Notifications
    'notifications.center': 'Centro de Notificaciones',
    'notifications.manage': 'Gestiona tus notificaciones y configura tus preferencias',
    'notifications.overview': 'Resumen de tus notificaciones',
    'notifications.total': 'Total de notificaciones',
    'notifications.unread': 'No leídas',
    'notifications.read': 'Leídas',
    'notifications.byType': 'Por tipo',
    'notifications.yours': 'Tus Notificaciones',
    'notifications.markAll': 'Marcar todas',
    'notifications.markAllAsRead': 'Marcar todas como leídas',
    'notifications.clearAll': 'Limpiar todas',
    'notifications.removeAll': 'Eliminar todas las notificaciones',
    'notifications.filter': 'Filtrar notificaciones',
    'notifications.filterByType': 'Filtrar por tipo',
    'notifications.all': 'Todas',
    'notifications.display': 'Visualización',
    'notifications.onlyUnread': 'Solo no leídas',
    'notifications.settings': 'Configuración de notificaciones',
    'notifications.filteringByType': 'Filtrando por tipo',
    'notifications.notFound': 'No se encontraron notificaciones',
    'notifications.allRead': 'Has leído todas tus notificaciones',
    'notifications.noneOfType': 'No se encontraron notificaciones de este tipo',
    'notifications.willAppearHere': 'Cuando haya novedades, aparecerán aquí',
    'notifications.noUnread': 'No hay notificaciones sin leer',
    'notifications.recent': 'Notificaciones recientes',
    'notifications.viewAll': 'Ver todas',
    'notifications.none': 'Sin notificaciones',
    'notifications.markAsRead': 'Marcar como leídas',
    
    // Tipos de notificação
    'notifications.types.signals': 'Señales de Trading',
    'notifications.types.live': 'Transmisiones en Vivo',
    'notifications.types.signalsDesc': 'Notificaciones sobre señales de compra y venta',
    'notifications.types.liveDesc': 'Notificaciones cuando se inicia una transmisión en vivo',
    
    // Configurações de notificações
    'notifications.settings.title': 'Configuración de Notificaciones',
    'notifications.settings.description': 'Elige qué tipos de notificaciones quieres recibir',
    'notifications.settings.enable': 'Notificaciones',
    'notifications.settings.enableDesc': 'Activar o desactivar todas las notificaciones',
    'notifications.settings.typesTitle': 'Tipos de Notificación',
    'notifications.settings.typesDesc': 'Selecciona qué tipos de notificación quieres recibir',
    'notifications.settings.cancel': 'Cancelar',
    'notifications.settings.testSignal': 'Enviar Señal de Prueba',
    'notifications.settings.save': 'Guardar',
    'notifications.settings.saved': '¡Guardado!',
    
    // Sinais - notificação prévia
    'signals.upcoming': 'Próxima',
    'signals.prepare': 'Prepárate para operar',
    'signals.notification': 'Pre-notificación de señal',
    'signals.minutes_before': '5 minutos antes de la señal',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  // Detectar idioma do navegador ou usar idioma salvo
  const getInitialLanguage = (): Language => {
    // Busca o idioma salvo no dispositivo
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage && ['pt', 'en', 'es'].includes(savedLanguage)) {
      return savedLanguage as Language;
    }
    
    // Detectar do navegador como fallback temporário
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'pt' || browserLang === 'en' || browserLang === 'es') {
      return browserLang as Language;
    }
    
    // Padrão para inglês (será sobrescrito pela detecção de IP)
    return 'en';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [isLanguageDetected, setIsLanguageDetected] = useState(false);

  // Lista de idiomas disponíveis
  const availableLanguages = [
    { code: 'pt' as Language, name: 'Português' },
    { code: 'en' as Language, name: 'English' },
    { code: 'es' as Language, name: 'Español' }
  ];

  // Efeito para detectar idioma baseado no IP na primeira visita
  useEffect(() => {
    const detectLanguageFromIP = async () => {
      try {
        // Verificar se já detectamos o idioma anteriormente
        const detectionSource = localStorage.getItem('language-detection-source');
        if (detectionSource && !isLanguageDetected) {
          console.log('🌍 [LanguageContext] Idioma já foi detectado anteriormente');
          setIsLanguageDetected(true);
          return;
        }

        // Verificar se o usuário já selecionou um idioma manualmente
        const userSelectedLanguage = localStorage.getItem('user-selected-language');
        if (userSelectedLanguage) {
          console.log('🌍 [LanguageContext] Usuário já selecionou idioma manualmente');
          setIsLanguageDetected(true);
          return;
        }

        // Só detectar se não há idioma salvo ou se é a primeira visita
        const savedLanguage = localStorage.getItem('app-language');
        if (!savedLanguage || !isLanguageDetected) {
          console.log('🌍 [LanguageContext] Iniciando detecção automática de idioma...');
          
          const detectedLanguage = await geoLocationService.detectLanguageFromIP();
          
          if (detectedLanguage && detectedLanguage !== language) {
            console.log(`🌍 [LanguageContext] Idioma detectado: ${detectedLanguage}`);
            setLanguageState(detectedLanguage);
            
            // Disparar evento para outros componentes
            window.dispatchEvent(new CustomEvent('language-auto-detected', {
              detail: { language: detectedLanguage, source: 'geolocation' }
            }));
          }
          
          setIsLanguageDetected(true);
        }
      } catch (error) {
        console.error('🌍 [LanguageContext] Erro na detecção automática de idioma:', error);
        setIsLanguageDetected(true);
      }
    };

    // Executar detecção apenas uma vez
    if (!isLanguageDetected) {
      detectLanguageFromIP();
    }
  }, [language, isLanguageDetected]);

  // Efeito para verificar se existe um idioma associado a um usuário quando ele existir
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user-data');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          const userLanguage = localStorage.getItem(`user-language-${user.id}`);
          if (userLanguage && ['pt', 'en', 'es'].includes(userLanguage)) {
            setLanguageState(userLanguage as Language);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao recuperar idioma do usuário:', error);
    }

    // Listener para idioma carregado do banco de dados
    const handleLanguageFromDB = (event: CustomEvent) => {
      const { language } = event.detail;
      if (language && ['pt', 'en', 'es'].includes(language)) {
        setLanguageState(language as Language);
      }
    };

    window.addEventListener('language-loaded-from-db', handleLanguageFromDB as EventListener);

    return () => {
      window.removeEventListener('language-loaded-from-db', handleLanguageFromDB as EventListener);
    };
  }, []);

  // Função para atualizar o idioma do usuário
  const updateUserLanguage = async (userId: string, lang: Language) => {
    try {
      // Salvar no banco de dados primeiro
      await userService.updateUserLanguage(userId, lang);
      
      // Salvar o idioma específico do usuário
      localStorage.setItem(`user-language-${userId}`, lang);
      
      // Atualizar o idioma global
      setLanguageState(lang);
      localStorage.setItem('app-language', lang);
      
      // Também atualizar nos dados do usuário para referências futuras
      const userData = localStorage.getItem('user-data');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          user.language = lang;
          localStorage.setItem('user-data', JSON.stringify(user));
        }
      }
    } catch (error) {
      console.error('Erro ao salvar idioma para o usuário:', error);
    }
  };

  // Função para definir o idioma
  const setLanguage = (lang: Language) => {
    // Atualizar o estado
    setLanguageState(lang);
    
    // Salvar para o dispositivo (para usuários não logados)
    localStorage.setItem('app-language', lang);
    
    // Marcar que o usuário selecionou manualmente (para não sobrescrever com detecção automática)
    localStorage.setItem('user-selected-language', lang);
    localStorage.setItem('language-detection-source', 'manual');
    
    // Tentativa de salvar para o usuário atual se ele existir
    try {
      const userData = localStorage.getItem('user-data');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          localStorage.setItem(`user-language-${user.id}`, lang);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar idioma para o usuário:', error);
    }
  };
  
  // Função para mudar idioma (para o seletor na UI)
  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  // Função de tradução
  const t = (key: string): string => {
    try {
      const value = translations[language][key];
      if (value !== undefined) {
        // Se for string, retorna diretamente
        if (typeof value === 'string') {
          return value;
        }
        // Se for objeto com propriedade 'text', retorna o texto
        if (typeof value === 'object' && value !== null && 'text' in value) {
          return (value as { text: string }).text;
        }
        // Se for outro tipo de objeto, converte para string
        return String(value);
      } else {
        console.warn(`Chave de tradução não encontrada: ${key}`);
        // Tentar buscar em pt como fallback
        const fallbackValue = translations['pt'][key];
        if (typeof fallbackValue === 'string') {
          return fallbackValue;
        }
        if (typeof fallbackValue === 'object' && fallbackValue !== null && 'text' in fallbackValue) {
          return (fallbackValue as { text: string }).text;
        }
        return key;
      }
    } catch (error) {
      console.error(`Erro ao buscar tradução para: ${key}`, error);
      return key;
    }
  };

  // Função para obter objetos traduzidos
  const tObj = <T,>(key: string): T | null => {
    try {
      const value = translations[language][key];
      if (value !== undefined) {
        return value as T;
      } else {
        console.warn(`Chave de tradução não encontrada: ${key}`);
        // Tentar buscar em pt como fallback
        const fallbackValue = translations['pt'][key];
        return fallbackValue as T || null;
      }
    } catch (error) {
      console.error(`Erro ao buscar tradução para: ${key}`, error);
      return null;
    }
  };

  // Função para carregar o idioma do usuário do banco de dados
  const loadUserLanguageFromDB = async (userId: string) => {
    try {
      const { language } = await userService.getUserLanguage(userId);
      if (language && ['pt', 'en', 'es'].includes(language)) {
        setLanguageState(language as Language);
        localStorage.setItem('app-language', language);
        localStorage.setItem(`user-language-${userId}`, language);
      }
    } catch (error) {
      console.error('Erro ao carregar idioma do usuário:', error);
    }
  };

  // Função para forçar nova detecção de idioma baseada no IP
  const forceLanguageDetection = async (): Promise<Language> => {
    try {
      console.log('🌍 [LanguageContext] Forçando nova detecção de idioma...');
      
      // Limpar cache de detecção
      geoLocationService.clearCache();
      localStorage.removeItem('language-detection-source');
      localStorage.removeItem('user-selected-language');
      
      // Detectar novamente
      const detectedLanguage = await geoLocationService.detectLanguageFromIP();
      
      if (detectedLanguage) {
        setLanguageState(detectedLanguage);
        console.log(`🌍 [LanguageContext] Novo idioma detectado: ${detectedLanguage}`);
        
        // Disparar evento
        window.dispatchEvent(new CustomEvent('language-auto-detected', {
          detail: { language: detectedLanguage, source: 'forced-geolocation' }
        }));
      }
      
      return detectedLanguage;
    } catch (error) {
      console.error('🌍 [LanguageContext] Erro ao forçar detecção:', error);
      return language; // Retornar idioma atual em caso de erro
    }
  };

  // Função para obter informações de detecção para debug
  const getLanguageDetectionInfo = () => {
    return geoLocationService.getDetectionInfo();
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      tObj, 
      changeLanguage, 
      updateUserLanguage,
      loadUserLanguageFromDB,
      forceLanguageDetection,
      getLanguageDetectionInfo,
      availableLanguages
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTranslation = () => {
  const { language } = useContext(LanguageContext);
  
  const t = useCallback((key: string) => {
    const translation = translations[language]?.[key];
    if (typeof translation === 'string') {
      return translation;
    }
    if (translation && typeof translation === 'object') {
      return translation;
    }
    return key;
  }, [language]);

  return { t, language };
};
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tObj: <T>(key: string) => T | null;
  changeLanguage: (lang: Language) => void;
  updateUserLanguage: (userId: string, lang: Language) => void;
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
  };
}

// Tipo para as traduções por idioma
type TranslationsType = Record<Language, Record<string, any>>;

// Traduções para os três idiomas
const translations: TranslationsType = {
  pt: {
    // Navbar
    'nav.home': 'Início',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Configurações',
    'nav.instructions': 'Instruções',
    'nav.signals': 'Sinais',
    'nav.news': 'Notícias',
    'nav.news.title': 'Notícias do Mercado',
    'nav.news.none': 'Nenhuma notícia disponível',
    'nav.notifications': 'Notificações',
    'nav.notifications.read': 'Notificações Lidas',
    'nav.settings.notifications': 'Notificações & Configurações',
    'nav.system.status': 'Status do sistema',
    'nav.system.online': 'Online',
    'nav.support': 'Suporte',
    'nav.live': 'Ao Vivo',
    'nav.meetings': 'Reuniões',
    'nav.toggle.sidebar': 'Alternar Barra Lateral',
    'nav.admin': 'Administração',
    
    // Dashboard
    'dashboard.title': 'Acompanhe o mercado em tempo real',
    'dashboard.market.opportunities': 'Oportunidades de mercado baseadas em análise de dados em tempo real',
    'dashboard.refresh.all': 'Atualizar Todos',
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
    'signals.title': 'Sinais de Trading',
    'signals.subtitle': 'Oportunidades de mercado baseadas em análise de dados em tempo real',
    'signals.refresh': 'Atualizar',
    'signals.refresh.all': 'Atualizar Todos',
    'signals.advanced.monitoring': 'Monitoramento avançado de sinais e tendências de mercado',
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
    'signals.strength.strong': 'Alta confiança',
    'signals.strength.moderate': 'Confiança média',
    'signals.strength.weak': 'Baixa confiança',
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
    'settings.language.description': 'Escolha o idioma da interface',
    'settings.language.select': 'Selecione um idioma',
    'settings.language.pt': 'Português',
    'settings.language.en': 'Inglês',
    'settings.language.es': 'Espanhol',
    'settings.save': 'Salvar',
    'settings.saving': 'Salvando...',
    'settings.saved': 'Salvo',
    'settings.cancel': 'Cancelar',
    'settings.verify': 'Verificar',
    'settings.general': 'Configurações Gerais',
    'settings.help': 'Ajuda e Suporte',
    'settings.saveSuccessMessage': 'Configurações salvas com sucesso',
    'settings.saveSuccessDescription': 'Todas as suas preferências foram atualizadas.',
    'settings.saveErrorMessage': 'Erro ao salvar configurações',
    'settings.terms.title': 'Termos de Uso',
    'settings.terms.lastUpdate': 'Última atualização: 10/10/2023',
    'settings.terms.intro1': 'Estes termos e condições ("Termos") regem o uso do serviço ProfEyes ("Serviço") operado pela nossa empresa.',
    'settings.terms.intro2': 'Ao acessar ou usar o Serviço, você concorda em estar vinculado a estes Termos. Se você discordar de qualquer parte dos termos, você não poderá acessar o Serviço.',
    'settings.terms.section1.title': '1. Contas',
    'settings.terms.section1.content': 'Quando você cria uma conta conosco, você garante que as informações fornecidas são precisas, completas e atualizadas. Informações imprecisas, incompletas ou desatualizadas podem resultar no encerramento imediato da sua conta no Serviço.',
    'settings.terms.section2.title': '2. Privacidade e Proteção de Dados',
    'settings.terms.section2.content': 'Nossa Política de Privacidade explica como coletamos, usamos e protegemos as informações que você fornece ao usar nosso Serviço. Ao usar nosso Serviço, você concorda com a coleta e uso de informações de acordo com esta política.',
    'settings.terms.section3.title': '3. Segurança',
    'settings.terms.section3.content': 'A segurança de sua conta é importante para nós, mas lembre-se de que nenhum método de transmissão pela Internet ou método de armazenamento eletrônico é 100% seguro. Enquanto nos esforçamos para usar meios comercialmente aceitáveis para proteger suas informações pessoais, não podemos garantir sua segurança absoluta.',
    'settings.terms.section4.title': '4. Limitação de Responsabilidade',
    'settings.terms.section4.content': 'Em nenhum caso nossa empresa, nossos diretores, executivos, funcionários, afiliados, agentes, contratados, estagiários, fornecedores, prestadores de serviços ou licenciadores serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, mas não se limitando a, perda de lucros, dados, uso, boa vontade, ou outras perdas intangíveis, resultantes do uso ou da incapacidade de usar o serviço.',
    'settings.terms.section5.title': '5. Alterações',
    'settings.terms.section5.content': 'Reservamo-nos o direito, a nosso exclusivo critério, de modificar ou substituir estes Termos a qualquer momento. Se uma revisão for material, tentaremos fornecer um aviso com pelo menos 30 dias de antecedência antes que quaisquer novos termos entrem em vigor.',
    'settings.terms.section6.title': '6. Contato',
    'settings.terms.section6.content': 'Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco através do e-mail suporte@profeyes.com.',
    'settings.close': 'Fechar',
    
    // Instructions
    'instructions.title': 'Instruções',
    'instructions.subtitle': 'Dicas e orientações para utilizar a plataforma',
    'instructions.back': 'Voltar',
    'instructions.intro.title': 'Introdução',
    'instructions.intro.text1': 'Bem-vindo ao app de operações do mercado financeiro! Se você está aqui, certamente deseja fazer de R$100 a R$500 todos os dias. Vou mostrar que alcançar esse resultado não é tão difícil como imagina.',
    'instructions.intro.text2': 'Aqui não prometemos que você ficará rico ou milionário do dia para a noite. Nosso objetivo é provar que você pode ter resultados consistentes e lucrativos no mercado financeiro.',
    'instructions.intro.text3': 'Não se trata de cassino ou brincadeira - estamos falando do mercado financeiro real, com operações de day trade, câmbio e criptomoedas.',
    'instructions.features.title': 'Funcionalidades',
    'instructions.features.dashboard': 'Operações em três horários diferentes: manhã, tarde e noite',
    'instructions.features.signals': 'Análise de mercado e sinais ao vivo sem uso de robôs',
    'instructions.features.news': 'Informações importantes na mensagem fixada no App',
    'instructions.features.notifications': 'Ative as notificações para não perder oportunidades',
    'instructions.howto.title': 'Como Começar',
    'instructions.howto.intro': 'Para obter o melhor resultado da plataforma, siga estes passos:',
    'instructions.howto.step1': 'Faça seu cadastro na corretora através do link disponível no App',
    'instructions.howto.step2': 'Após cadastro, você receberá uma conta demo com R$10.000 para testes',
    'instructions.howto.step3': 'Para operar com dinheiro real, faça um depósito (recomendamos pelo menos R$100)',
    'instructions.howto.step4': 'Configure o gráfico para formato de velas e tempo de 5 minutos',
    'instructions.howto.step5': 'Siga os sinais enviados no App, operando no momento exato indicado',
    'instructions.terms.title': 'Termos Importantes',
    'instructions.terms.signal.title': 'Operação',
    'instructions.terms.signal.desc': 'Quando acreditamos que o mercado vai subir, usamos o botão verde (comprar). Quando acreditamos que vai descer, o botão vermelho (vender).',
    'instructions.terms.entry.title': 'Entrada',
    'instructions.terms.entry.desc': 'Momento ideal para iniciar uma operação seguindo o sinal do App.',
    'instructions.terms.target.title': 'Tempo de Expiração',
    'instructions.terms.target.desc': 'O tempo que nossa operação vai durar, normalmente utilizamos 5 minutos.',
    'instructions.terms.stop.title': 'Investimento',
    'instructions.terms.stop.desc': 'Valor que você vai colocar na operação, ajustável conforme seu capital.',
    'instructions.terms.reentry.title': 'Gale (Reentrada)',
    'instructions.terms.reentry.desc': 'Estratégia para recuperar operações perdidas: Gale 1 e Gale 2 são reentradas, dobrando o valor anterior quando faltam 2 segundos para finalizar.',
    'instructions.operation.title': 'Como Operar',
    'instructions.operation.asset': 'Escolha o ativo desejado (ações, criptomoedas, pares de moeda)',
    'instructions.operation.time': 'Configure o tempo de expiração igual ao tempo de vela (5 minutos)',
    'instructions.operation.investment': 'Defina o valor do investimento conforme seu capital disponível',
    'instructions.operation.up': 'Para mercado em alta: clique no botão verde (comprar)',
    'instructions.operation.down': 'Para mercado em queda: clique no botão vermelho (vender)',
    'instructions.operation.follow': 'Siga os sinais enviados no App, operando no momento exato indicado',
    'instructions.gale.title': 'Estratégia de Gale (Reentradas)',
    'instructions.gale.intro': 'Se não conseguir lucrar na primeira tentativa, nossa estratégia de Gale (reentradas) ajuda a recuperar operações:',
    'instructions.gale.1.title': 'Gale 1',
    'instructions.gale.1.desc': 'Quando a operação está perdendo, aguarde até faltarem 2 segundos para finalizar e faça uma reentrada dobrando o valor inicial.',
    'instructions.gale.2.title': 'Gale 2',
    'instructions.gale.2.desc': 'Se o Gale 1 não recuperar a operação, faça uma segunda reentrada dobrando o valor do Gale 1 quando faltarem 2 segundos para finalizar.',
    
    // Video paths
    'video.instructions': '/tutorial-pt.mp4',
    'video.poster.instructions': '/images/instructions-poster-pt.jpg.png',
    'video.main': '/tutorial-pt.mp4',
    'ordersCanceled': 'Ordens Canceladas',
    'successRate': 'Taxa de Sucesso',
    'dailyReturns': 'Retornos Diários',
    
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
      }
    },
    
    // Traduções para a seção de transmissões ao vivo
    live: {
      title: 'Transmissões Ao Vivo',
      subtitle: 'Assista e interaja com transmissões ao vivo da comunidade',
      active_streams: 'Transmissões Ativas',
      active_count: '{{count}} ao vivo',
      no_active: 'Nenhuma transmissão ativa no momento',
      no_streams_message: 'Nenhuma transmissão ativa no momento. Volte mais tarde.',
      live: 'AO VIVO',
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
        create_hint: 'Experimente criar uma reunião clicando no botão acima.',
        features_title: 'Recursos Disponíveis',
        feature_1: 'Criar reuniões com título e descrição',
        feature_2: 'Visualizar reuniões ativas',
        feature_3: 'Entrar em reuniões existentes',
        feature_4: 'Finalizar suas próprias reuniões',
        feature_5: 'Compartilhar link da reunião',
        coming_soon: 'Em breve',
        soon_1: 'Agendamento de reuniões',
        soon_2: 'Gravação automática',
        soon_3: 'Transcrição de reuniões',
        soon_4: 'Integração com calendário'
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
    'nav.settings.notifications': 'Notifications & Settings',
    'nav.system.status': 'System status',
    'nav.system.online': 'Online',
    'nav.support': 'Support',
    'nav.live': 'Live',
    'nav.meetings': 'Meetings',
    'nav.toggle.sidebar': 'Toggle Sidebar',
    'nav.admin': 'Administration',
    
    // Dashboard
    'dashboard.title': 'Track the market in real time',
    'dashboard.market.opportunities': 'Market opportunities based on real-time data analysis',
    'dashboard.refresh.all': 'Refresh All',
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
    'signals.subtitle': 'Market opportunities based on real-time data analysis',
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
    'signals.strength.strong': 'High confidence',
    'signals.strength.moderate': 'Medium confidence',
    'signals.strength.weak': 'Low confidence',
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
    'settings.language.description': 'Choose the interface language',
    'settings.language.select': 'Select a language',
    'settings.language.pt': 'Portuguese',
    'settings.language.en': 'English',
    'settings.language.es': 'Spanish',
    'settings.save': 'Save',
    'settings.saving': 'Saving...',
    'settings.saved': 'Saved',
    'settings.cancel': 'Cancel',
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
    'video.instructions': '/tutorial-en.mp4',
    'video.poster.instructions': '/images/instructions-poster-en.jpg.png',
    'video.main': '/tutorial-en.mp4',
    'ordersCanceled': 'Canceled Orders',
    'successRate': 'Success Rate',
    'dailyReturns': 'Daily Returns',
    
    support: {
      title: 'Assistência Personalizada',
      subtitle: 'Estamos prontos para oferecer o suporte que você precisa.',
      welcome: 'Bem-vindo(a) à nossa central de assistência. Como posso ajudar você hoje?',
      input_placeholder: 'Digite sua mensagem...',
      send: 'Enviar',
      online: 'Disponível',
      typing: 'digitando...',
      human_support: 'Para questões mais complexas, nossa equipe especializada está disponível durante o horário comercial.',
      ai_disclaimer: 'Sou um assistente virtual aqui para ajudar com suas dúvidas. Clientes premium têm acesso prioritário à nossa equipe de especialistas 24/7.'
    },
    
    // Traduções para a seção de transmissões ao vivo em inglês
    live: {
      title: 'Live Broadcasts',
      subtitle: 'Watch and interact with community live broadcasts',
      active_streams: 'Active Broadcasts',
      active_count: '{{count}} live',
      no_active: 'No active broadcasts at the moment',
      no_streams_message: 'No active broadcasts at the moment. Check back later.',
      live: 'LIVE',
      comments: 'Live comments',
      no_comments: 'Be the first to comment',
      type_comment: 'Type your comment...',
      streaming_placeholder: 'Live broadcast',
      about: 'About this broadcast',
      end_stream: 'End',
      
      // Para streamers
      start_streaming: 'Start Broadcasting',
      start_streaming_desc: 'Configure your broadcast and share with the community',
      stream_title: 'Broadcast title',
      stream_description: 'Description (optional)',
      title_placeholder: 'E.g.: Live market analysis',
      description_placeholder: 'Describe the content of your broadcast',
      go_live: 'Go live',
      
      // Para espectadores
      no_permission_title: 'Select a broadcast',
      no_permission_desc: 'Select one of the active broadcasts or wait until an expert starts a new broadcast.',
      
      // Mensagens de erro
      error: {
        title_required: 'Broadcast title is required',
        media_access: 'Could not access your camera or microphone. Check permissions.'
      }
    },
    
    // Translations for meetings section
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
      link_copied: 'Meeting link copied to clipboard',
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

    // Profile errors and success messages
    'profile.error.needLogin': 'You need to be logged in to perform this action',
    'profile.success.updated': 'Profile updated successfully!',
    'profile.error.updateFailed': 'Failed to update profile. Please try again.',
    'profile.error.invalidImage': 'Please select a valid image.',
    'profile.error.imageSize': 'Image must be less than 5MB.',
    'profile.error.invalidEmailFormat': 'Invalid email format',
    'profile.error.resetPasswordFailed': 'Failed to send reset email',
    'profile.submit.saving': 'Saving...',
    'profile.submit.save': 'Save changes',
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
    'nav.settings.notifications': 'Notificaciones y Configuraciones',
    'nav.system.status': 'Estado del sistema',
    'nav.system.online': 'En línea',
    'nav.support': 'Soporte',
    'nav.live': 'En Vivo',
    'nav.meetings': 'Reuniones',
    'nav.toggle.sidebar': 'Alternar Barra Lateral',
    'nav.admin': 'Administración',
    
    // Dashboard
    'dashboard.title': 'Monitoreo del mercado en tiempo real',
    'dashboard.market.opportunities': 'Oportunidades de mercado basadas en análisis de datos en tiempo real',
    'dashboard.refresh.all': 'Actualizar Todo',
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
    'signals.subtitle': 'Oportunidades de mercado basadas en análisis de datos en tiempo real',
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
    'signals.strength.strong': 'Alta confianza',
    'signals.strength.moderate': 'Confianza media',
    'signals.strength.weak': 'Baja confianza',
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
    'settings.account.email': 'Correo electrónico',
    'settings.account.password': 'Contraseña',
    'settings.account.changePassword': 'Cambiar contraseña',
    'settings.account.forgotPassword': 'Olvidé mi contraseña',
    'settings.account.save': 'Guardar cambios',
    'settings.save': 'Guardar',
    'settings.saving': 'Guardando...',
    'settings.saved': 'Guardado',
    'settings.cancel': 'Cancelar',
    
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
    'video.instructions': '/tutorial-es.mp4',
    'video.poster.instructions': '/images/instructions-poster-es.jpg.png',
    'video.main': '/tutorial-es.mp4',
    'ordersCanceled': 'Canceled Orders',
    'successRate': 'Success Rate',
    'dailyReturns': 'Daily Returns',
    
    support: {
      title: 'Asistencia Personalizada',
      subtitle: 'Estamos listos para ofrecerte el soporte que necesitas.',
      welcome: 'Bienvenido/a a nuestro centro de asistencia. ¿Cómo puedo ayudarte hoy?',
      input_placeholder: 'Digite sua mensagem...',
      send: 'Enviar',
      online: 'Disponible',
      typing: 'escribiendo...',
      human_support: 'Para asuntos más complejos, nuestro equipo especializado está disponible durante el horario comercial.',
      ai_disclaimer: 'Soy un asistente virtual aquí para ayudar con tus preguntas. Los clientes premium tienen acceso prioritario a nuestro equipo de expertos 24/7.'
    },
    
    // Traduções para a seção de transmissões ao vivo
    live: {
      title: 'Transmissões Ao Vivo',
      subtitle: 'Assista e interaja com transmissões ao vivo da comunidade',
      active_streams: 'Transmissões Ativas',
      active_count: '{{count}} ao vivo',
      no_active: 'Nenhuma transmissão ativa no momento',
      no_streams_message: 'Nenhuma transmissão ativa no momento. Volte mais tarde.',
      live: 'AO VIVO',
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
    
    // Detectar do navegador
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'pt' || browserLang === 'en' || browserLang === 'es') {
      return browserLang as Language;
    }
    
    // Padrão para português
    return 'pt';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Lista de idiomas disponíveis
  const availableLanguages = [
    { code: 'pt' as Language, name: 'Português' },
    { code: 'en' as Language, name: 'English' },
    { code: 'es' as Language, name: 'Español' }
  ];

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
  }, []);

  // Função para atualizar o idioma do usuário
  const updateUserLanguage = (userId: string, lang: Language) => {
    try {
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
        return value;
      } else {
        console.warn(`Chave de tradução não encontrada: ${key}`);
        // Tentar buscar em pt como fallback
        const fallbackValue = translations['pt'][key];
        return fallbackValue || key;
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

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      tObj, 
      changeLanguage, 
      updateUserLanguage,
      availableLanguages
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 
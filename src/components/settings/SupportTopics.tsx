import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  ChevronRight, 
  ArrowLeft,
  TrendingUp,
  Coins,
  Search,
  Monitor,
  Lock,
  LineChart,
  BarChart3,
  CandlestickChart,
  Bell,
  Calculator,
  FileText,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Settings,
  PieChart,
  RefreshCw,
  Download,
  Wifi
} from "lucide-react";
import DOMPurify from 'dompurify';
import { nanoid } from 'nanoid';
import { supporterInfoService } from '@/services/supporterInfoService';

// Interface para mensagem
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'support';
  timestamp: Date;
}

// Interface para perguntas pré-definidas
interface Question {
  id: string;
  text: string;
  answer: string;
}

// Interface para tópicos
interface Topic {
  id: string;
  title: string;
  icon: string;
  description: string;
  questions: Question[];
}

const SupportTopics: React.FC = () => {
  const auth = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [brokerLink, setBrokerLink] = useState('https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree');
  const [brokerName, setBrokerName] = useState('Avalon');
  
  // Carregar informações do apoiador ao montar
  useEffect(() => {
    const loadSupporterInfo = async () => {
      const info = await supporterInfoService.getActiveSupporterInfo();
      setBrokerLink(info.link);
      setBrokerName(info.displayName);
    };
    loadSupporterInfo();
  }, []);
  
  // Função para obter tópicos traduzidos baseado no idioma atual
  const getTranslatedTopics = (): Topic[] => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const support = language === 'pt' ? t('support') as any : 
                   language === 'en' ? t('support') as any :
                   t('support') as any; // espanhol
    /* eslint-enable @typescript-eslint/no-explicit-any */
    
    return [
      {
        id: "investment",
        title: support.topic_investment?.title || "Investimentos",
        icon: "coins",
        description: support.topic_investment?.description || "Informações sobre diferentes tipos de investimentos",
        questions: [
          {
            id: "investment-1",
            text: support.topic_investment?.q1?.question || (language === 'en' ? "What capital should I use to trade?" : language === 'es' ? "¿Qué capital debo usar para operar?" : "Quanto capital devo usar para operar?"),
            answer: support.topic_investment?.q1?.answer || (language === 'en' ? 
              "To trade with Trending, we recommend starting with a minimum capital of $100. While it's possible to start with lower amounts (from $60), an initial capital of at least $100 allows for more significant entries and consequently better results. If possible, starting with $200 or $1,000 is even better, as the larger your capital, the greater your profit potential. Our users with these capital amounts achieve consistent results between $100 and $500 daily. It's important to remember that you should only invest what you can afford to lose and follow an appropriate risk management strategy, especially when implementing re-entry strategies, which require doubling the values of previous entries." :
              language === 'es' ?
              "Para operar con Trending, recomendamos comenzar con un capital mínimo de $100. Aunque es posible iniciar con valores menores (desde $60), un capital inicial de al menos $100 permite realizar entradas más significativas y, por lo tanto, obtener mejores resultados. Si es posible, comenzar con $200 o $1,000 es aún mejor, ya que cuanto mayor sea su capital, mayor será su potencial de ganancia. Nuestros usuarios con estos valores de capital logran resultados consistentes entre $100 y $500 diarios. Es importante recordar que solo debe invertir lo que puede permitirse perder y seguir una estrategia de gestión de riesgo adecuada, especialmente al implementar estrategias de reentrada, que requieren duplicar los valores de las entradas anteriores." :
              "Para operar com o Trending, recomendamos começar com um capital mínimo de R$100. Embora seja possível iniciar com valores menores (a partir de R$60), um capital inicial de pelo menos R$100 permite realizar entradas com valores mais significativos e, consequentemente, obter resultados mais expressivos. Se possível, iniciar com R$200 ou R$1.000 é ainda melhor, pois quanto maior seu capital, maior será seu potencial de lucro. Nossos usuários com esses valores de capital conseguem resultados consistentes entre R$100 e R$500 diariamente. É importante lembrar que você deve investir apenas o que pode se permitir perder e seguir uma estratégia de gestão de risco adequada, especialmente ao implementar as estratégias de reentrada, que exigem dobrar o valor das entradas anteriores.")
          },
          {
            id: "investment-2",
            text: support.topic_investment?.q2?.question || (language === 'en' ? "Which cryptocurrencies are used in trades?" : language === 'es' ? "¿Qué criptomonedas se utilizan en los Trades?" : "Quais criptomoedas são utilizadas nos Trades?"),
            answer: support.topic_investment?.q2?.answer || (language === 'en' ?
              "The app works with a variety of cryptocurrencies and tokens, including major ones like Bitcoin and Ethereum, but we also expand to tokens with high volatility and profit potential such as TokenTrump, Celestia and other emerging tokens. Our team of analysts constantly monitors the market to identify assets with the best entry opportunities, taking into account liquidity, volatility and trend direction. We always select assets that show clear technical patterns and offer the best chances of success for our operations. The specific cryptocurrencies and tokens may vary daily depending on market conditions, so it's important to pay attention to the Trades displayed to know exactly which asset to trade at each moment." :
              language === 'es' ?
              "La aplicación trabaja con una variedad de criptomonedas y tokens, incluyendo los principales como Bitcoin y Ethereum, pero también expandimos a tokens con alta volatilidad y potencial de ganancia como TokenTrump, Celestia y otros tokens emergentes. Nuestro equipo de analistas monitorea constantemente el mercado para identificar los activos con mejores oportunidades de entrada, teniendo en cuenta liquidez, volatilidad y dirección de tendencia. Seleccionamos siempre los activos que presentan patrones técnicos claros y ofrecen las mejores posibilidades de éxito para nuestras operaciones. Las criptomonedas y tokens específicos pueden variar diariamente dependiendo de las condiciones del mercado, por eso es importante estar atento a los Trades mostrados para saber exactamente qué activo operar en cada momento." :
              "O aplicativo trabalha com uma variedade de criptomoedas e tokens, incluindo as principais como Bitcoin e Ethereum, mas também expandimos para tokens com alta volatilidade e potencial de lucro como TokenTrump, Celestia e outros tokens emergentes. Nossa equipe de analistas monitora constantemente o mercado para identificar os ativos com melhores oportunidades de entrada, levando em consideração liquidez, volatilidade e direção de tendência. Selecionamos sempre os ativos que apresentam padrões técnicos claros e oferecem as melhores chances de sucesso para nossas operações. As criptomoedas e tokens específicos podem variar diariamente, dependendo das condições de mercado, por isso é importante estar atento aos Trades exibidos para saber exatamente qual ativo operar em cada momento.")
          },
          {
            id: "investment-3",
            text: support.topic_investment?.q3?.question || (language === 'en' ? "How to deposit to start trading?" : language === 'es' ? "¿Cómo hacer el depósito para operar?" : "Como fazer o depósito para operar?"),
            answer: support.topic_investment?.q3?.answer || (language === 'en' ?
              `To make a deposit and start trading with Trending, follow these steps: 1) Create your account at the <a href='${brokerLink}' target='_blank' rel='noopener noreferrer'>${brokerName}</a> broker, our official partner 2) After completing registration, you will receive access to a demo account with $10,000 to test the platform 3) When ready to trade with real money, click on the "Deposit" option in the main menu of <a href='${brokerLink}' target='_blank' rel='noopener noreferrer'>${brokerName}</a> 4) Select your preferred payment method: PIX, bank slip, transfer or cryptocurrencies 5) For PIX deposits, enter the desired amount (we recommend starting with at least $100) and follow the instructions to complete the payment 6) The amount will be credited to your account within minutes after confirmation. With the available balance, you can start executing operations based on the Trades displayed in the app.` :
              language === 'es' ?
              `Para hacer un depósito y comenzar a operar con Trending, sigue estos pasos: 1) Crea tu cuenta en el bróker <a href='${brokerLink}' target='_blank' rel='noopener noreferrer'>${brokerName}</a>, nuestro socio oficial 2) Después de completar el registro, recibirás acceso a una cuenta demo con $10,000 para probar la plataforma 3) Cuando estés listo para operar con dinero real, haz clic en la opción "Depositar" en el menú principal de <a href='${brokerLink}' target='_blank' rel='noopener noreferrer'>${brokerName}</a> 4) Selecciona tu método de pago preferido: PIX, boleto bancario, transferencia o criptomonedas 5) Para depósitos vía PIX, informa el valor deseado (recomendamos iniciar con al menos $100) y sigue las instrucciones para completar el pago 6) El valor será acreditado en tu cuenta en cuestión de minutos después de la confirmación. Con el saldo disponible, ya puedes comenzar a ejecutar las operaciones basadas en los Trades que se muestran en la aplicación.` :
              `Para fazer um depósito e começar a operar com o Trending, siga estas etapas: 1) Crie sua conta na corretora <a href='${brokerLink}' target='_blank' rel='noopener noreferrer'>${brokerName}</a>, nossa parceira oficial 2) Após concluir o cadastro, você receberá acesso a uma conta demo com R$10.000 para testar a plataforma 3) Quando estiver pronto para operar com dinheiro real, clique na opção "Depositar" no menu principal da <a href='${brokerLink}' target='_blank' rel='noopener noreferrer'>${brokerName}</a> 4) Selecione seu método de pagamento preferido: PIX, boleto bancário, transferência ou criptomoedas 5) Para depósitos via PIX, informe o valor desejado (recomendamos iniciar com pelo menos R$100) e siga as instruções para completar o pagamento 6) O valor será creditado em sua conta em questão de minutos após a confirmação. Com o saldo disponível, você já pode começar a executar as operações baseadas nos Trades que são exibidos no aplicativo.`)
          }
        ]
      },
      {
        id: "platform",
        title: support.topic_platform?.title || "Plataforma",
        icon: "monitor",
        description: support.topic_platform?.description || "Ajuda com funcionalidades da plataforma",
        questions: [
          {
            id: "platform-1",
            text: support.topic_platform?.q1?.question || (language === 'en' ? "How does the Dashboard tab work?" : language === 'es' ? "¿Cómo funciona la pestaña Dashboard?" : "Como funciona a aba Dashboard?"),
            answer: support.topic_platform?.q1?.answer || (language === 'en' ?
              "The Dashboard tab provides an overview of your trading activities in real-time. Here you can view the most recent Trades, monitor market trends, and access key information to make informed trading decisions. It's your central hub for tracking market opportunities and staying updated with the latest trading signals." :
              language === 'es' ?
              "La pestaña Dashboard proporciona una visión general de tus actividades de trading en tiempo real. Aquí puedes ver los Trades más recientes, monitorear las tendencias del mercado y acceder a información clave para tomar decisiones de trading informadas. Es tu centro central para rastrear oportunidades del mercado y mantenerte actualizado con las últimas señales de trading." :
              "A aba Dashboard fornece uma visão geral das suas atividades de trading em tempo real. Aqui você pode visualizar os Trades mais recentes, acompanhar tendências de mercado e acessar informações-chave para tomar decisões de trading informadas. É o seu hub central para acompanhar oportunidades de mercado e manter-se atualizado com os últimos alertas de trading.")
          },
          {
            id: "platform-2",
            text: support.topic_platform?.q2?.question || (language === 'en' ? "What is the purpose of the Trades tab?" : language === 'es' ? "¿Cuál es el propósito de la pestaña Trades?" : "Qual é o propósito da aba Trades?"),
            answer: support.topic_platform?.q2?.answer || (language === 'en' ?
              "The Trades tab is where you receive alerts and trading operations in real-time. It displays buy and sell opportunities for different assets, based on technical analysis and market trends. Each Trade includes detailed information such as entry points, expiration times, and re-entry strategies. This is your main tool for executing profitable operations in the cryptocurrency market." :
              language === 'es' ?
              "La pestaña Trades es donde recibes alertas y operaciones de trading en tiempo real. Muestra oportunidades de compra y venta para diferentes activos, basadas en análisis técnico y tendencias del mercado. Cada Trade incluye información detallada como puntos de entrada, tiempos de expiración y estrategias de reentrada. Esta es tu herramienta principal para ejecutar operaciones rentables en el mercado de criptomonedas." :
              "A aba Trades é onde você recebe alertas e operações de trading em tempo real. Ela mostra oportunidades de compra e venda para diferentes ativos, baseados em análises técnicas e tendências de mercado. Cada Trade inclui informações detalhadas como pontos de entrada, tempos de expiração e estratégias de reentrada. Esta é a sua ferramenta principal para executar operações lucrativas no mercado de criptomoedas.")
          },
          {
            id: "platform-3",
            text: support.topic_platform?.q3?.question || (language === 'en' ? "What do you find in the News tab?" : language === 'es' ? "¿Qué encuentras en la pestaña Noticias?" : "O que você encontra na aba Notícias?"),
            answer: support.topic_platform?.q3?.answer || (language === 'en' ?
              "The News tab presents the latest updates and relevant information from the financial market. Here you can stay informed about news that may impact your investments and trading decisions. We aggregate real-time news from reliable sources to help you understand market movements and make more informed trading choices." :
              language === 'es' ?
              "La pestaña Noticias presenta las últimas actualizaciones e información relevante del mercado financiero. Aquí puedes mantenerte informado sobre noticias que pueden impactar tus inversiones y decisiones de trading. Agregamos noticias en tiempo real de fuentes confiables para ayudarte a entender los movimientos del mercado y tomar decisiones de trading más informadas." :
              "A aba Notícias apresenta as últimas atualizações e informações relevantes do mercado financeiro. Aqui você pode ficar por dentro de notícias que podem impactar seus investimentos e decisões de trading. Agregamos notícias em tempo real de fontes confiáveis para ajudá-lo a entender os movimentos do mercado e tomar decisões de trading mais informadas.")
          },
          {
            id: "platform-4",
            text: support.topic_platform?.q4?.question || (language === 'en' ? "How can the Instructions tab help?" : language === 'es' ? "¿Cómo puede ayudar la pestaña Instrucciones?" : "Como a aba Instruções pode ajudar?"),
            answer: support.topic_platform?.q4?.answer || (language === 'en' ?
              "The Instructions tab offers guides and tutorials on how to use the Trending app effectively. Here you'll find detailed tips and instructions to maximize the platform's features, from understanding how to interpret Trades to implementing risk management strategies and using advanced tools available in the app." :
              language === 'es' ?
              "La pestaña Instrucciones ofrece guías y tutoriales sobre cómo usar la aplicación Trending de manera efectiva. Aquí encontrarás consejos detallados e instrucciones para maximizar las funciones de la plataforma, desde comprender cómo interpretar los Trades hasta implementar estrategias de gestión de riesgo y usar las herramientas avanzadas disponibles en la aplicación." :
              "A aba Instruções oferece guias e tutoriais sobre como usar o aplicativo Trending de forma eficaz. Aqui você encontra dicas e instruções detalhadas para aproveitar ao máximo as funcionalidades da plataforma, desde entender como interpretar os Trades até implementar estratégias de gestão de risco e usar as ferramentas avançadas disponíveis no app.")
          },
          {
            id: "platform-6",
            text: support.topic_platform?.q5?.question || (language === 'en' ? "How to manage notifications in the Notifications tab?" : language === 'es' ? "¿Cómo gestionar notificaciones en la pestaña Notificaciones?" : "Como gerenciar notificações na aba Notificações?"),
            answer: support.topic_platform?.q5?.answer || (language === 'en' ?
              "The Notifications tab manages the alerts and messages you receive in the app. Here you can configure which types of notifications you want to receive, such as new Trade alerts, market updates, and important announcements. You can also choose how you want to be notified (push notifications, in-app alerts) and customize the notification settings to match your trading style and preferences." :
              language === 'es' ?
              "La pestaña Notificaciones gestiona las alertas y mensajes que recibes en la aplicación. Aquí puedes configurar qué tipos de notificaciones deseas recibir, como alertas de nuevos Trades, actualizaciones del mercado y anuncios importantes. También puedes elegir cómo deseas ser notificado (notificaciones push, alertas en la aplicación) y personalizar la configuración de notificaciones para que coincida con tu estilo de trading y preferencias." :
              "A aba Notificações gerencia os alertas e mensagens que você recebe no aplicativo. Aqui você pode configurar quais tipos de notificações deseja receber, como alertas de novos Trades, atualizações de mercado e anúncios importantes. Você também pode escolher como deseja ser notificado (notificações push, alertas no app) e personalizar as configurações de notificação para combinar com seu estilo de trading e preferências.")
          },
          {
            id: "platform-7",
            text: support.topic_platform?.q6?.question || (language === 'en' ? "What can you adjust in the Settings tab?" : language === 'es' ? "¿Qué puedes ajustar en la pestaña Configuraciones?" : "O que você pode ajustar na aba Configurações?"),
            answer: support.topic_platform?.q6?.answer || (language === 'en' ?
              "The Settings tab allows you to customize the app's options to your preferences. Here you can adjust interface preferences such as language and theme, configure security settings including password and two-factor authentication, manage your profile information, set your preferred broker and trading links, and customize notification preferences. It's your control center for personalizing the Trending experience to match your needs." :
              language === 'es' ?
              "La pestaña Configuraciones te permite personalizar las opciones de la aplicación según tus preferencias. Aquí puedes ajustar preferencias de interfaz como idioma y tema, configurar ajustes de seguridad incluyendo contraseña y autenticación de dos factores, gestionar tu información de perfil, establecer tu bróker preferido y enlaces de trading, y personalizar preferencias de notificación. Es tu centro de control para personalizar la experiencia Trending según tus necesidades." :
              "A aba Configurações permite que você personalize as opções do aplicativo conforme suas preferências. Aqui você pode ajustar preferências de interface como idioma e tema, configurar definições de segurança incluindo senha e autenticação de dois fatores, gerenciar suas informações de perfil, definir sua corretora preferida e links de trading, e personalizar preferências de notificação. É o seu centro de controle para personalizar a experiência Trending de acordo com suas necessidades.")
          }
        ]
      },
      {
        id: "account",
        title: support.topic_account?.title || "Conta e Segurança",
        icon: "shield-check",
        description: support.topic_account?.description || "Questões sobre sua conta e segurança",
        questions: [
          {
            id: "account-1",
            text: support.topic_account?.q1?.question || "Como redefinir minha senha?",
            answer: support.topic_account?.q1?.answer || "Para redefinir sua senha no aplicativo Trending, siga estes passos: 1) Na tela de login, clique em \"Esqueci minha senha\"; 2) Digite o email associado à sua conta; 3) Você receberá um email com um link para redefinição de senha; 4) Clique no link e defina uma nova senha seguindo os requisitos de segurança. Se não receber o email em alguns minutos, verifique sua pasta de spam."
          },
          {
            id: "account-3",
            text: support.topic_account?.q2?.question || "Como atualizar meus dados cadastrais?",
            answer: support.topic_account?.q2?.answer || "Para atualizar seus dados cadastrais no aplicativo Trending, acesse seu perfil clicando no ícone de usuário no canto superior direito da tela inicial. Na tela de perfil, você poderá atualizar informações como nome de exibição, foto de perfil e senha."
          },
          {
            id: "account-4",
            text: support.topic_account?.q3?.question || "Como cancelar minha assinatura?",
            answer: support.topic_account?.q3?.answer || "Para cancelar sua assinatura no Trending, acesse o menu \"Configurações\" e selecione \"Gerenciar Assinatura\". Na tela de gerenciamento, clique na opção \"Cancelar Assinatura\" e siga as instruções. Você precisará confirmar sua decisão e possivelmente informar o motivo do cancelamento. Após a confirmação, sua assinatura continuará ativa até o final do período já pago, sem renovação automática. Todo seu histórico e dados ficarão preservados por 90 dias, caso decida retornar. Se preferir, você também pode entrar em contato com nosso suporte para assistência no processo de cancelamento. Lembre-se que oferecemos opções de pausar sua assinatura temporariamente, caso esteja considerando um cancelamento por motivos temporários."
          }
        ]
      },
      {
        id: "feedback",
        title: support.topic_feedback?.title || "Feedback",
        icon: "message-square",
        description: support.topic_feedback?.description || "Perguntas e respostas sobre feedbacks e resultados",
        questions: [
          {
            id: "feedback-1",
            text: support.topic_feedback?.q1?.question || "Quantos traders profissionais construíram o Trending?",
            answer: support.topic_feedback?.q1?.answer || "O Trending foi construído por mais de 700 traders profissionais, garantindo uma base sólida de conhecimento e experiência."
          },
          {
            id: "feedback-2",
            text: support.topic_feedback?.q2?.question || "Quantos ativos são monitorados?",
            answer: support.topic_feedback?.q2?.answer || "Atualmente, mais de 500 ativos são monitorados pelo Trending, proporcionando uma ampla gama de oportunidades de trading."
          },
          {
            id: "feedback-3",
            text: support.topic_feedback?.q3?.question || "Quantos beta testers participaram?",
            answer: support.topic_feedback?.q3?.answer || "Mais de 3200 beta testers participaram da fase beta do aplicativo Trending, ajudando a refinar e melhorar a plataforma."
          },
          {
            id: "feedback-4",
            text: support.topic_feedback?.q4?.question || "Qual é a taxa de satisfação dos beta testers?",
            answer: support.topic_feedback?.q4?.answer || "A taxa de satisfação dos beta testers que participaram do teste do aplicativo na fase beta é de 95%, refletindo a qualidade e eficácia da plataforma."
          }
        ]
      }
    ];
  };

  // Usar tópicos traduzidos
  const topics = getTranslatedTopics();
  
  // Formatar mensagem de boas-vindas
  const formatWelcomeMessage = (): string => {
    // Verificar primeiro no localStorage que é a fonte mais confiável
    const localStorageName = localStorage.getItem("user-name");
    
    // Usar o nome do localStorage se estiver disponível, caso contrário, usar o nome dos metadados
    const userName = localStorageName || 
                     auth.user?.user_metadata?.display_name || 
                     auth.user?.user_metadata?.name || 
                     auth.user?.email?.split('@')[0] || 
                     (language === 'en' ? "Investor" : language === 'es' ? "Inversor" : "Investidor");
    
    // Log para depuração - verificar o valor exato que está sendo usado
    // Nome exibido (silenciado)
    
    // Textos diretos por idioma para evitar problemas de tradução
    const selectTopic = language === 'en' ? "Please select one of the topics below to get help." :
                       language === 'es' ? "Por favor, selecciona uno de los temas abajo para obtener ayuda." :
                       "Por favor, selecione um dos tópicos abaixo para obter ajuda.";
    
    const greeting = language === 'en' ? `Hello ${userName}! 👋\n\nWelcome to Trending Support. ${selectTopic}` :
                    language === 'es' ? `¡Hola ${userName}! 👋\n\nBienvenido/a al Soporte Trending. ${selectTopic}` :
                    `Olá ${userName}! 👋\n\nBem-vindo(a) ao Suporte Trending. ${selectTopic}`;
    
    return `<div class="space-y-3">
      <p class="text-lg font-medium">${greeting.split('\n\n')[0]} <span class="text-amber-500/90"></span></p>
      <p>${greeting.split('\n\n')[1]}</p>
    </div>`;
  };
  
  // Inicializar mensagem de boas-vindas quando o componente monta ou idioma muda
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: nanoid(),
        content: formatWelcomeMessage(),
        sender: 'support',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } else {
      // Atualizar mensagem de boas-vindas quando idioma mudar
      const updatedMessages = messages.map((msg, index) => {
        if (index === 0 && msg.sender === 'support') {
          return {
            ...msg,
            content: formatWelcomeMessage(),
            timestamp: new Date()
          };
        }
        return msg;
      });
      setMessages(updatedMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]); // Dependência no idioma para recarregar quando mudar. messages não pode ser incluída para evitar loop infinito.
  
  // Efeito para rolar para o final quando novas mensagens são adicionadas
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  
  // Adicionar mensagem do usuário
  const addUserMessage = (question: string) => {
    const newMessage: Message = {
      id: nanoid(),
      content: question,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Garantir rolagem para o final após adicionar mensagem
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  // Adicionar mensagem do suporte
  const addSupportMessage = (content: string) => {
    setIsTyping(true);
    
    // Simular tempo de resposta da IA para experiência mais natural
    setTimeout(() => {
      const newMessage: Message = {
        id: nanoid(),
        content,
        sender: 'support',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false);
      
      // Garantir rolagem para o final após adicionar mensagem
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 500 + Math.random() * 1000); // Tempo de resposta variável entre 500ms e 1500ms
  };
  
  // Manipular clique em pergunta
  const handleQuestionClick = (question: Question) => {
    // Adicionar a pergunta como mensagem do usuário
    addUserMessage(question.text);
    
    // Adicionar a resposta como mensagem do suporte
    addSupportMessage(question.answer);
    
    // Garantir que o contêiner de mensagens tenha foco
    messagesContainerRef.current?.focus();
  };
  
  // Função para rolar para o final da conversa
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Voltar para seleção de tópicos
  const handleBackToTopics = () => {
    setSelectedTopic(null);
  };
  
  // Configuração das animações e efeitos
  const fadeInUp = {
    hidden: { opacity: 0, y: 8 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      } 
    }
  };
  
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.2,
        ease: [0.42, 0, 1, 1] as [number, number, number, number]
      } 
    }
  };
  
  // Cores customizadas
  const goldAccent = "rgb(212, 175, 55)"; // Cor dourada
  const goldGlow = "rgba(212, 175, 55, 0.15)"; // Brilho dourado sutil
  
  // Função para renderizar mensagens com design aprimorado e mais limpo
  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user';
    
    // Processar o nome do broker para destaque visual
    const processBrokerName = (text: string) => {
      const escapedName = brokerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
      return text.replace(regex, `<span style="color: #0088ff; font-weight: 600;">${brokerName}</span>`);
    };
    
    // Processamento de URLs em formato texto
    const processURLs = (text: string) => {
      // Lista de palavras que não devem ser convertidas em links, mesmo que pareçam URLs
      const excludedWords = ['ajuda', 'Ajuda', 'help', 'Help'];
      
      // Exclui URLs já envolvidas em tags de link HTML ou já formatadas
      const urlPattern = /(?<!<a[^>]*>)(?<!href=["'])(?:(?:https?|ftp):\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s)\]}"']{2,}(?:\/[^\s]*)?(?![^<]*<\/a>)/g;
      
      return text.replace(urlPattern, (match) => {
        // Verificar se a URL contém alguma das palavras excluídas
        if (excludedWords.some(word => match.includes(word))) {
          return match; // Manter como texto normal
        }
        
        // Se a URL não começar com http ou https, adicione https://
        const fullUrl = match.startsWith('http') ? match : `https://${match}`;
        return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 underline transition-colors">${match}</a>`;
      });
    };
    
    return (
      <motion.div
        key={message.id}
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <motion.div 
          className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[85%]`}
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.15 }}
        >
          {!isUser && (
            <div className="flex-shrink-0 mr-3">
              <div className="relative">
                <Avatar className="ring-1 ring-zinc-800/40 w-9 h-9 overflow-hidden">
                  <AvatarImage src="/support-avatar.png" alt="Support" className="object-cover" />
                  <AvatarFallback className="bg-black text-zinc-300 text-xs">AI</AvatarFallback>
                </Avatar>
                <motion.div 
                  className="absolute -inset-1 rounded-full border border-zinc-800/30"
                  initial={{ opacity: 0.3, scale: 1 }}
                  animate={{ 
                    opacity: [0.3, 0, 0.3],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>
          )}
          
          <div 
            className={`rounded-lg px-4 py-3 relative ${
              isUser 
                ? 'bg-zinc-800/90 border border-zinc-700/30 text-white' 
                : 'bg-zinc-950/90 border border-zinc-900/30'
            }`}
          >
            <div className={`absolute inset-0 ${isUser ? 'bg-gradient-to-br from-zinc-700/5 to-transparent' : 'bg-gradient-to-br from-zinc-800/5 to-transparent'} rounded-lg`}></div>
            {isUser ? (
              <div className="relative z-10 flex items-center">
                <p className="text-sm">{message.content}</p>
              </div>
            ) : (
              <div 
                className="prose prose-sm prose-invert max-w-none relative z-10 text-sm"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(processBrokerName(processURLs(message.content)))
                }}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };
  
  useEffect(() => {
    // Adicionar estilos CSS de keyframes para animação de partículas e outros efeitos
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes float {
        0% { transform: translateY(0); opacity: 0; }
        50% { transform: translateY(-15px); opacity: 0.15; }
        100% { transform: translateY(-30px); opacity: 0; }
      }
      
      @keyframes pulse {
        0% { opacity: 0.2; }
        50% { opacity: 0.5; }
        100% { opacity: 0.2; }
      }
      
      @keyframes shimmer {
        0% { background-position: -100% 0; }
        100% { background-position: 200% 0; }
      }
      
      @keyframes goldenGlow {
        0% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); }
        50% { box-shadow: 0 0 10px rgba(212, 175, 55, 0.3); }
        100% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); }
      }

      @keyframes iconPulse {
        0% { filter: drop-shadow(0 0 2px rgba(212, 175, 55, 0.2)); }
        50% { filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.4)); }
        100% { filter: drop-shadow(0 0 2px rgba(212, 175, 55, 0.2)); }
      }
      
      /* Impedir rolagem na página principal */
      html, body {
        overflow: hidden !important;
      }
      
      /* Container principal fixo com altura mais compacta */
      .main-container {
        position: relative;
        overflow: hidden;
        height: calc(100vh - 5.25rem) !important;
        max-height: calc(100vh - 5.25rem) !important;
        margin-top: 0.5rem;
      }
      
      /* Estilos para rolagem personalizada em mensagens */
      .messages-container::-webkit-scrollbar {
        width: 5px;
      }
      
      .messages-container::-webkit-scrollbar-track {
        background: transparent;
        margin-top: 2px;
        margin-bottom: 2px;
      }
      
      .messages-container::-webkit-scrollbar-thumb {
        background-color: rgba(161, 161, 170, 0.3);
        border-radius: 20px;
        transition: background-color 0.3s ease;
      }
      
      .messages-container::-webkit-scrollbar-thumb:hover {
        background-color: rgba(161, 161, 170, 0.5);
      }
      
      /* Estilos de rolagem personalizada para a seção de tópicos */
      [data-radix-scroll-area-viewport] {
        scroll-behavior: smooth !important;
        overflow-y: auto !important;
        scrollbar-width: none !important;
      }
      
      [data-radix-scroll-area-viewport]::-webkit-scrollbar {
        width: 0px !important;
        display: none !important;
      }
      
      /* Melhoria de experiência de rolagem */
      .messages-container {
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: rgba(161, 161, 170, 0.3) transparent;
      }
      
      /* Ajustes para a seção de tópicos fixa e compacta */
      .topics-section {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .topics-container {
        height: 100%;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      /* Layout para as perguntas */
      .question-button {
        padding-top: 0.7rem !important;
        padding-bottom: 0.7rem !important;
        margin-bottom: 0.6rem !important;
      }
      
      /* Cabeçalhos */
      .header-compact {
        padding: 0.9rem !important;
      }
      
      /* Eliminar rolagem vertical em todo o documento */
      body::-webkit-scrollbar {
        display: none;
      }
      
      body {
        scrollbar-width: none;
        -ms-overflow-style: none;
        overflow: hidden;
      }
    `;
    document.head.appendChild(styleElement);

    // Limpar quando o componente for desmontado
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Função para renderizar o ícone do tópico
  const renderTopicIcon = (iconName: string) => {
    switch (iconName) {
      case 'trending-up':
        return <TrendingUp size={18} className="w-5 h-5" />;
      case 'coins':
        return <Coins size={18} className="w-5 h-5" />;
      case 'candlestick-chart':
        return <CandlestickChart size={18} className="w-5 h-5" />;
      case 'monitor':
        return <Monitor size={18} className="w-5 h-5" />;
      case 'shield-check':
        return <ShieldCheck size={18} className="w-5 h-5" />;
      case 'smartphone':
        return <Smartphone size={18} className="w-5 h-5" />;
      case 'bell':
        return <Bell size={18} className="w-5 h-5" />;
      default:
        return <MessageSquare size={18} className="w-5 h-5" />;
    }
  };
  
  // Função para renderizar o ícone de pergunta baseado no tópico
  const renderQuestionIcon = (topicId: string) => {
    switch (topicId) {
      case 'trading':
        return <LineChart size={16} className="w-4 h-4" />;
      case 'investment':
        return <BarChart3 size={16} className="w-4 h-4" />;
      case 'platform':
        return <Bell size={16} className="w-4 h-4" />;
      case 'account':
        return <KeyRound size={16} className="w-4 h-4" />;
      case 'mobile-app':
        return <Smartphone size={16} className="w-4 h-4" />;
      case 'sinais':
        return <Bell size={16} className="w-4 h-4" />;
      default:
        return <MessageSquare size={16} className="w-4 h-4" />;
    }
  };
  
  // Função para renderizar os botões de tópicos com efeitos dourados
  const renderTopicButton = (topic: Topic, index: number) => {
    return (
      <motion.div
        key={topic.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.2,
          delay: index * 0.05
        }}
      >
        <Button
          variant="ghost"
          className="w-full justify-between items-center p-3 h-auto border border-zinc-900/40 bg-black/60 hover:bg-zinc-950 rounded-lg transition-all duration-200 group relative mb-2.5"
          onClick={() => setSelectedTopic(topic)}
        >
          <div className="flex items-center">
            <div className="mr-3 w-10 h-10 flex items-center justify-center bg-black rounded-lg p-1.5 text-zinc-600 group-hover:text-amber-500 relative overflow-hidden border border-zinc-900/30 group-hover:border-amber-500/20 transition-colors duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center justify-center w-full h-full group-hover:animate-[iconPulse_2s_ease-in-out_infinite]">
                {renderTopicIcon(topic.icon)}
              </div>
            </div>
            <div className="text-left">
              <div className="font-medium text-sm text-zinc-300">{topic.title}</div>
              <div className="text-xs text-zinc-600">{topic.description}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-amber-500/50 group-hover:translate-x-0.5 transition-all duration-200" />
          <div className="absolute -right-0.5 -top-0.5 w-1 h-1 rounded-full bg-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute -inset-[0.5px] rounded-lg border border-amber-500/0 group-hover:border-amber-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
        </Button>
      </motion.div>
    );
  };
  
  // Função para renderizar os botões de perguntas com efeitos dourados
  const renderQuestionButton = (question: Question, topicId: string) => {
    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.2,
          delay: selectedTopic?.questions.findIndex(q => q.id === question.id) * 0.05
        }}
      >
        <Button
          variant="ghost"
          className="w-full justify-start p-2.5 h-auto border border-zinc-900/40 bg-black/60 hover:bg-zinc-950 rounded-lg transition-all duration-200 hover:border-zinc-800/60 group relative mb-2.5 question-button"
          onClick={() => handleQuestionClick(question)}
        >
          <div className="w-6 h-6 mr-3 flex items-center justify-center text-zinc-600 group-hover:text-amber-500 transition-colors duration-300">
            <div className="w-full h-full flex items-center justify-center group-hover:animate-[iconPulse_2s_ease-in-out_infinite]">
              {renderQuestionIcon(topicId)}
            </div>
          </div>
          <div className="text-left">
            <div className="font-medium text-sm group-hover:text-zinc-200 transition-colors text-zinc-400">{question.text}</div>
          </div>
          <div className="absolute -right-0.5 -top-0.5 w-1 h-1 rounded-full bg-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute -inset-[0.5px] rounded-lg border border-amber-500/0 group-hover:border-amber-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
        </Button>
      </motion.div>
    );
  };
  
  useEffect(() => {
    // Adicionar suporte para toque e arraste para rolagem
    const messagesViewport = document.querySelector('[data-messages-viewport]');
    if (messagesViewport) {
      let startY = 0;
      let startScrollTop = 0;
      let touchActive = false;

      const handleTouchStart = (e) => {
        startY = e.touches[0].clientY;
        startScrollTop = messagesViewport.scrollTop;
        touchActive = true;
      };

      const handleTouchMove = (e) => {
        if (!touchActive) return;
        const deltaY = startY - e.touches[0].clientY;
        messagesViewport.scrollTop = startScrollTop + deltaY;
        e.preventDefault();
      };

      const handleTouchEnd = () => {
        touchActive = false;
      };

      messagesViewport.addEventListener('touchstart', handleTouchStart);
      messagesViewport.addEventListener('touchmove', handleTouchMove, { passive: false });
      messagesViewport.addEventListener('touchend', handleTouchEnd);

      return () => {
        messagesViewport.removeEventListener('touchstart', handleTouchStart);
        messagesViewport.removeEventListener('touchmove', handleTouchMove);
        messagesViewport.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, []);
  
  // Detectar quando o usuário está distante do final para mostrar o botão de rolagem
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };
    
    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className="main-container flex flex-col h-[calc(100vh-5.5rem)] p-4 relative bg-black">
      
      <div className="flex-1 flex relative z-10 gap-4 overflow-hidden">
        {/* Seção de tópicos e perguntas - Parte fixa */}
        <div className="w-1/3 h-full topics-section">
          <motion.div 
            className="bg-black rounded-xl border border-zinc-900/50 h-full topics-container relative"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="p-3 border-b border-zinc-900/30 relative header-compact bg-black">
              <h2 className="text-md font-medium flex items-center text-zinc-200 relative z-10">
                <HelpCircle className="mr-2 h-4.5 w-4.5 text-amber-500 animate-[iconPulse_2s_ease-in-out_infinite]" />
{t('support.help_topics')}
                <div className="ml-1.5 w-1 h-1 rounded-full bg-amber-500/40"></div>
              </h2>
            </div>
            
            <ScrollArea className="h-[calc(100%-3.1rem)]">
              <div className="p-3 space-y-2">
                {selectedTopic ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="selected-topic"
                      initial="hidden"
                      animate="visible"
                      variants={fadeIn}
                    >
                      <Button 
                        variant="ghost" 
                        className="flex items-center justify-start w-full mb-3 text-zinc-500 hover:bg-zinc-950/80 transition-all duration-200 hover:text-zinc-300 text-sm group relative"
                        onClick={handleBackToTopics}
                      >
                        <ArrowLeft className="mr-2 h-3.5 w-3.5" />
{t('support.back_to_topics')}
                        <div className="absolute -inset-[0.5px] rounded-lg border border-amber-500/0 group-hover:border-amber-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                      </Button>
                      
                      <div className="mb-3 p-3 bg-zinc-950/90 rounded-lg border border-zinc-900/50 relative">
                        <div className="absolute -inset-[0.5px] rounded-lg bg-gradient-to-br from-amber-500/5 via-transparent to-transparent"></div>
                        <div className="relative flex items-center">
                          <div className="mr-3 w-8 h-8 flex items-center justify-center bg-black rounded-lg p-1.5 text-zinc-400 relative overflow-hidden border border-zinc-800/50">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-transparent opacity-70"></div>
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0.8 }}
                              animate={{ 
                                scale: [0.8, 1, 0.8],
                                opacity: [0.8, 1, 0.8]
                              }}
                              transition={{ 
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="relative z-10 text-amber-500 animate-[iconPulse_3s_ease-in-out_infinite] flex items-center justify-center"
                            >
                              {renderTopicIcon(selectedTopic.icon)}
                            </motion.div>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-0.5 flex items-center text-zinc-200">
                              {selectedTopic.title}
                            </h3>
                            <p className="text-xs text-zinc-500">{selectedTopic.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-0.5">
                        {selectedTopic.questions.map((question) => renderQuestionButton(question, selectedTopic.id))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <AnimatePresence>
                    <motion.div 
                      key="topics-list"
                      initial="hidden"
                      animate="visible"
                      variants={fadeIn}
                      className="space-y-2"
                    >
                      {topics.map((topic, index) => renderTopicButton(topic, index))}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </div>
        
        {/* Seção de mensagens - Parte com rolagem bidirecional */}
        <motion.div 
          className="flex-1 flex flex-col bg-black rounded-xl border border-zinc-900/50 overflow-hidden relative"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="p-3 border-b border-zinc-900/30 relative header-compact bg-black">
            <h2 className="text-md font-medium text-white flex items-center relative z-10">
              <MessageSquare className="mr-2 h-4.5 w-4.5 text-white" />
{t('support.title')}
            </h2>
          </div>
          
          {/* Container de mensagens com rolagem bidirecional, mais fácil de usar */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto messages-container [-webkit-overflow-scrolling:touch] [height:calc(100%-3.5rem)] [max-height:calc(100%-3.5rem)] [scrollbar-width:thin] [scrollbar-color:rgba(161,161,170,0.3)_transparent]"
          >
            <div className="p-4 space-y-3 min-h-full">
              {messages.map(renderMessage)}
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start mb-3"
                >
                  <div className="flex flex-row max-w-[85%]">
                    <div className="flex-shrink-0 mr-3">
                      <div className="relative">
                        <Avatar className="ring-1 ring-zinc-800/40 w-9 h-9 overflow-hidden">
                          <AvatarImage src="/support-avatar.png" alt="Support" className="object-cover" />
                          <AvatarFallback className="bg-black text-zinc-300 text-xs">AI</AvatarFallback>
                        </Avatar>
                        <motion.div 
                          className="absolute -inset-1 rounded-full border border-zinc-800/30"
                          animate={{ 
                            opacity: [0.3, 0, 0.3],
                            scale: [1, 1.3, 1],
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg px-4 py-3 bg-zinc-950/90 border border-zinc-900/40 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/5 to-transparent rounded-lg"></div>
                      <div className="flex space-x-1.5 relative z-10">
                        <motion.div 
                          className="w-1.5 h-1.5 bg-zinc-700 rounded-full"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            delay: 0
                          }}
                        />
                        <motion.div 
                          className="w-1.5 h-1.5 bg-zinc-700 rounded-full"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            delay: 0.2
                          }}
                        />
                        <motion.div 
                          className="w-1.5 h-1.5 bg-zinc-700 rounded-full"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            delay: 0.4
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {/* Elemento invisível para rolar até o final */}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
          
          {/* Botão de rolar para baixo (aparece quando o usuário está longe do final) */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-5 right-5 z-20"
              >
                <Button
                  onClick={scrollToBottom}
                  className="rounded-full p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500"
                  size="icon"
                  variant="ghost"
                >
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <ChevronRight className="h-5 w-5 rotate-90" />
                  </motion.div>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default SupportTopics; 
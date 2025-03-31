import Layout from "@/components/Layout";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  Target, 
  TrendingUp, 
  BarChart3, 
  ListFilter,
  RefreshCw, 
  ChevronDown,
  ChevronRight,
  CheckCheck,
  Timer,
  Clock4,
  ExternalLink,
  Filter,
  Zap,
  Sparkles
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TradingSignal, fetchTradingSignals, getLatestPrices } from "@/services";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useRef, useMemo } from "react";
import { SignalStrength, SignalType } from "@/services/types";
import { tradingSignalService } from "@/services/TradingSignalService";
import { motion, AnimatePresence } from "framer-motion";

// Estilos para as animações
const styles = `
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(0.98); }
    50% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(255, 255, 255, 0.05); }
    50% { box-shadow: 0 0 18px rgba(255, 255, 255, 0.12); }
  }
  
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes rotateGlow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes slowFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes subtleBreathing {
    0%, 100% { opacity: 0.85; }
    50% { opacity: 1; }
  }
  
  .gradient-text {
    background: linear-gradient(90deg, #f0f0f0, #d5d5d5, #f0f0f0);
    background-size: 200% auto;
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    animation: gradientShift 3s ease infinite;
  }

  .signal-badge {
    position: relative;
    overflow: hidden;
  }
  
  .signal-badge::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 100%);
    transform: translateX(-100%);
    animation: shine 3s infinite;
  }
  
  @keyframes shine {
    100% {
      transform: translateX(100%);
    }
  }
  
  .glow-hover {
    transition: all 0.5s ease;
    backdrop-filter: blur(8px);
  }
  
  .glow-hover:hover {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.08);
    transform: translateY(-3px) scale(1.02);
    backdrop-filter: blur(12px);
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 2rem;
    background: rgba(15, 15, 25, 0.4);
    border-radius: 1rem;
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    animation: glowPulse 3s ease-in-out infinite;
  }
  
  .light-accent {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 70%);
    animation: subtleBreathing 4s infinite ease-in-out;
    z-index: 0;
  }
  
  .color-accent {
    position: absolute;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.08;
    z-index: 0;
    animation: subtleBreathing 5s infinite ease-in-out alternate;
  }
  
  .floating-element {
    animation: slowFloat 5s ease-in-out infinite;
  }
  
  .card-glass {
    background: rgba(22, 22, 30, 0.35);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }
  
  .card-glass:hover {
    background: rgba(25, 25, 35, 0.45);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .shimmer-effect {
    overflow: hidden;
    position: relative;
  }
  
  .shimmer-effect::before {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 150%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
    animation: shimmer 3s infinite;
    transform: skewX(-20deg);
    z-index: 1;
  }
  
  @keyframes shimmer {
    0% { left: -150%; }
    100% { left: 150%; }
  }
`;

const Signals = () => {
  const [filterType, setFilterType] = useState<SignalType | 'ALL'>('ALL');
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  const [previousPrices, setPreviousPrices] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExpiredSignals, setShowExpiredSignals] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [signalsPerPage] = useState(7);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  
  // Efeito para subscrever às atualizações de sinais
  useEffect(() => {
    const unsubscribe = tradingSignalService.subscribe(() => {
      queryClient.invalidateQueries(['trading-signals']);
    });
    
    return () => {
      unsubscribe();
    };
  }, [queryClient]);
  
  // Consulta para obter sinais de trading
  const { data: signals, isLoading, refetch } = useQuery({
    queryKey: ['tradingSignals'],
    queryFn: () => {
      console.log('Página Sinais - Obtendo sinais do sistema (sem forçar atualização)');
      return fetchTradingSignals(false);
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 10 * 60 * 1000,
    cacheTime: 20 * 60 * 1000,
  });

  // Dados para sinais simulados quando não há sinais suficientes
  const placeholderSignals = [
    {
      id: 'placeholder-1',
      symbol: 'Google (OTC)',
      exchange: 'Blitz',
      signal: 'BUY',
      status: 'active',
      strength: SignalStrength.HIGH,
      entry_time: '00:27',
      timeframe: '30s',
      expiry_time_str: '00:28',
      gale1_time: '00:29',
      gale2_time: '00:30',
      created_at: new Date().toISOString(),
      expiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'placeholder-2',
      symbol: 'Apple (OTC)',
      exchange: 'Prime',
      signal: 'SELL',
      status: 'active',
      strength: SignalStrength.MEDIUM,
      entry_time: '00:32',
      timeframe: '60s',
      expiry_time_str: '00:33',
      gale1_time: '00:34',
      gale2_time: '00:35',
      created_at: new Date().toISOString(),
      expiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'placeholder-3',
      symbol: 'EURUSD',
      exchange: 'Forex',
      signal: 'BUY',
      status: 'active',
      strength: SignalStrength.HIGH,
      entry_time: '00:40',
      timeframe: '5m',
      expiry_time_str: '00:45',
      gale1_time: '00:46',
      gale2_time: '00:47',
      created_at: new Date().toISOString(),
      expiry: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    },
    {
      id: 'placeholder-4',
      symbol: 'BTCUSD',
      exchange: 'Crypto',
      signal: 'SELL',
      status: 'active',
      strength: SignalStrength.MEDIUM,
      entry_time: '00:50',
      timeframe: '15m',
      expiry_time_str: '01:05',
      gale1_time: '01:10',
      gale2_time: '01:15',
      created_at: new Date().toISOString(),
      expiry: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'placeholder-5',
      symbol: 'Facebook (OTC)',
      exchange: 'Binary',
      signal: 'BUY',
      status: 'active',
      strength: SignalStrength.HIGH,
      entry_time: '01:05',
      timeframe: '2m',
      expiry_time_str: '01:07',
      gale1_time: '01:09',
      gale2_time: '01:11',
      created_at: new Date().toISOString(),
      expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'placeholder-6',
      symbol: 'GBPJPY',
      exchange: 'Forex',
      signal: 'SELL',
      status: 'active',
      strength: SignalStrength.LOW,
      entry_time: '01:15',
      timeframe: '5m',
      expiry_time_str: '01:20',
      gale1_time: '01:25',
      gale2_time: '01:30',
      created_at: new Date().toISOString(),
      expiry: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    },
    {
      id: 'placeholder-7',
      symbol: 'Amazon (OTC)',
      exchange: 'Prime',
      signal: 'BUY',
      status: 'active',
      strength: SignalStrength.MEDIUM,
      entry_time: '01:30',
      timeframe: '60s',
      expiry_time_str: '01:31',
      gale1_time: '01:32',
      gale2_time: '01:33',
      created_at: new Date().toISOString(),
      expiry: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
    }
  ];

  // Ajustando para garantir 7 sinais
  const ensureSevenSignals = (signals: TradingSignal[]): TradingSignal[] => {
    if (!signals || signals.length === 0) {
      return placeholderSignals;
    }
    
    if (signals.length < 7) {
      // Adicionar sinais placeholder para completar 7
      return [...signals, ...placeholderSignals.slice(0, 7 - signals.length)];
    }
    
    return signals;
  };

  // Filtragem de sinais por tipo com garantia de 7 sinais
  const filteredSignals = useMemo(() => {
    if (!signals) return ensureSevenSignals([]);
    
    let filtered = signals.filter(signal => 
      filterType === 'ALL' || signal.type === filterType
    );
    
    // Filtrar por status (expirado/ativo)
    if (!showExpiredSignals) {
      filtered = filtered.filter(signal => signal.status === 'active');
    }
    
    // Ordenar sinais: primeiro os ativos, depois por data de criação mais recente
    filtered = filtered.sort((a, b) => {
      // Primeiro ordenar por status (ativos primeiro)
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      
      // Depois ordenar por data (mais recentes primeiro)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    // Garantir que temos 7 sinais
    return ensureSevenSignals(filtered);
  }, [signals, filterType, showExpiredSignals]);

  // Paginação
  const indexOfLastSignal = activePage * signalsPerPage;
  const indexOfFirstSignal = indexOfLastSignal - signalsPerPage;
  const paginatedSignals = filteredSignals.slice(indexOfFirstSignal, indexOfLastSignal);
  const totalPages = Math.ceil(filteredSignals.length / signalsPerPage);

  // Função para lidar com a atualização de dados
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    await refetch();
    await updatePrices();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Função para atualizar preços
  const updatePrices = async () => {
    try {
      // Armazenar preços anteriores
      setPreviousPrices(currentPrices);
      
      // Obter símbolos únicos de todos os sinais
      const symbols = signals
        ? [...new Set(signals.map(signal => signal.symbol || signal.pair || ''))]
        : [];
      
      if (symbols.length === 0) return;
      
      // Obter preços atualizados
      const prices = await getLatestPrices(symbols);
      setCurrentPrices(prices);
    } catch (error) {
      console.error('Erro ao atualizar preços:', error);
    }
  };

  // Funções auxiliares para exibir informações do sinal
  const getPriceChange = (symbol: string): 'up' | 'down' | 'equal' => {
    if (!previousPrices[symbol] || !currentPrices[symbol]) return 'equal';
    
    const prev = parseFloat(previousPrices[symbol]);
    const curr = parseFloat(currentPrices[symbol]);
    
    if (curr > prev) return 'up';
    if (curr < prev) return 'down';
    return 'equal';
  };

  const isNewSignal = (signal: TradingSignal): boolean => {
    const createdAt = new Date(signal.created_at);
    const now = new Date();
    return now.getTime() - createdAt.getTime() < 30 * 60 * 1000; // 30 minutos
  };

  const isExpiringSignal = (signal: TradingSignal): boolean => {
    const expiry = new Date(signal.expiry);
    const now = new Date();
    const timeLeft = expiry.getTime() - now.getTime();
    return timeLeft > 0 && timeLeft < 10 * 60 * 1000; // Menos de 10 minutos
  };

  const formatExpiry = (expiry: string): string => {
    try {
      const expiryDate = new Date(expiry);
      const now = new Date();
      
      // Se já expirou
      if (expiryDate < now) {
        return `Expirou ${formatDistanceToNow(expiryDate, { addSuffix: true, locale: ptBR })}`;
      }
      
      // Se expira em menos de 24 horas
      if (expiryDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        return `Expira ${formatDistanceToNow(expiryDate, { addSuffix: true, locale: ptBR })}`;
      }
      
      // Se expira em mais de 24 horas
      return `Expira em ${format(expiryDate, "dd 'de' MMM", { locale: ptBR })}`;
    } catch (error) {
      return "Data inválida";
    }
  };

  const getStrengthColor = (strength: SignalStrength) => {
    switch (strength) {
      case SignalStrength.HIGH:
        return "text-gray-200";
      case SignalStrength.MEDIUM:
        return "text-gray-300";
      case SignalStrength.LOW:
        return "text-gray-400";
      default:
        return "text-gray-300";
    }
  };

  const getStrengthText = (strength: SignalStrength) => {
    switch (strength) {
      case SignalStrength.HIGH:
        return "Alta confiança";
      case SignalStrength.MEDIUM:
        return "Confiança média";
      case SignalStrength.LOW:
        return "Baixa confiança";
      default:
        return "Confiança média";
    }
  };

  return (
    <Layout>
      <div className="space-y-6 relative">
        {/* Efeitos de luz de fundo */}
        <div className="light-accent top-20 left-20"></div>
        <div className="light-accent bottom-40 right-20"></div>
        <div className="light-accent top-1/2 left-1/2"></div>
        
        {/* Acentos coloridos sutis */}
        <div className="color-accent top-0 left-10" style={{ background: '#8b5cf6' }}></div>
        <div className="color-accent bottom-20 right-10" style={{ background: '#3b82f6' }}></div>
        <div className="color-accent top-40 right-40" style={{ background: '#ec4899' }}></div>
        
        {/* Cabeçalho da página */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 z-10 relative">
          <div className="floating-element">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-100/90 via-white/90 to-pink-100/90 bg-clip-text text-transparent flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-indigo-200/70" />
              Sinais de Trading
            </h1>
            <p className="text-white/70 mt-1">
              Oportunidades de mercado baseadas em análise de dados em tempo real
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all
                ${isRefreshing 
                  ? 'bg-white/5 text-white/40 cursor-not-allowed' 
                  : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white card-glass'
                }`}
              title="Atualizar sinais"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all
                ${showFilters 
                  ? 'bg-white/10 text-white' 
                  : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white card-glass'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden md:inline">Filtros</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Área de filtros */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden z-10 relative"
            >
              <div className="p-5 rounded-xl card-glass">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Filtro por tipo de sinal */}
                  <div className="space-y-2">
                    <p className="text-sm text-white/70 font-medium">Tipo de sinal</p>
                    <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('ALL')}
                        className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                filterType === 'ALL' 
                            ? 'bg-white/20 text-white shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType(SignalType.TECHNICAL)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                filterType === SignalType.TECHNICAL 
                            ? 'bg-blue-500/20 text-blue-200 border border-blue-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        <BarChart3 className="w-4 h-4 inline mr-1.5 opacity-70" />
              Técnicos
            </button>
            <button
              onClick={() => setFilterType(SignalType.FUNDAMENTAL)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                filterType === SignalType.FUNDAMENTAL 
                            ? 'bg-purple-500/20 text-purple-200 border border-purple-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        <TrendingUp className="w-4 h-4 inline mr-1.5 opacity-70" />
              Fundamentalistas
            </button>
            <button
              onClick={() => setFilterType(SignalType.NEWS)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                filterType === SignalType.NEWS 
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        <Clock4 className="w-4 h-4 inline mr-1.5 opacity-70" />
              Notícias
            </button>
                    </div>
          </div>

                  {/* Opções adicionais */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-white/70 font-medium">Opções</p>
                    <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowExpiredSignals(!showExpiredSignals)}
                        className={`flex items-center px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                showExpiredSignals
                            ? 'bg-gray-500/20 text-gray-300 border border-gray-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        <Clock className="w-4 h-4 mr-1.5 opacity-70" />
              {showExpiredSignals ? 'Ocultar Expirados' : 'Mostrar Expirados'}
            </button>
                      
                      <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                          autoRefresh 
                            ? 'bg-teal-500/20 text-teal-200 border border-teal-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                        }`}
                      >
                        <RefreshCw className="w-4 h-4 mr-1.5 opacity-70" />
                        Auto-atualizar
                      </button>
          </div>
        </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Injetar estilos CSS */}
        <style>{styles}</style>

        {/* Conteúdo principal com os sinais */}
        <div className="grid gap-6 relative z-10">
          {isLoading ? (
            <div className="loading-container">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-white/10 border-t-gray-300/30 rounded-full animate-spin"></div>
                  <div className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white/10 border-b-gray-300/30 rounded-full animate-spin"></div>
              </div>
              </div>
              <h3 className="gradient-text font-medium text-lg mb-2">Analisando mercado</h3>
              <p className="text-sm text-white/50 text-center max-w-xs">
                Processando sinais e identificando as melhores oportunidades de trading
              </p>
            </div>
          ) : filteredSignals && filteredSignals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {paginatedSignals.map((signal: any, index) => {
                const isNew = isNewSignal(signal);
                const isExpiring = isExpiringSignal(signal);
                
                return (
                  <motion.div 
                    key={signal.id || `signal-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex flex-col rounded-xl overflow-hidden transition-all duration-300 glow-hover
                      ${signal.status === 'active' 
                        ? 'card-glass' 
                        : 'bg-black/30 border border-white/5 opacity-75'
                      }
                      ${isNew ? 'ring-1 ring-indigo-500/30' : ''}
                    `}
                  >
                    <div className="p-4 bg-black/25 border-b border-white/10 flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 opacity-25 -mt-12 -mr-12 rounded-full" 
                           style={{ 
                             background: signal.signal === 'BUY' 
                               ? 'radial-gradient(circle, rgba(52,211,153,0.3) 0%, rgba(52,211,153,0) 70%)' 
                               : 'radial-gradient(circle, rgba(248,113,113,0.3) 0%, rgba(248,113,113,0) 70%)' 
                           }}>
                      </div>
                      <div className="flex items-center z-10">
                        <div className={`p-2 rounded-lg ${
                          signal.signal === 'BUY' 
                            ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10' 
                            : 'bg-gradient-to-br from-rose-500/20 to-rose-600/10'
                          }`}>
                          {signal.signal === 'BUY' ? (
                            <ArrowUpRight className="w-5 h-5 text-emerald-300" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-rose-300" />
                          )}
                        </div>
                        <div className="ml-3">
                          <h3 className="text-base font-bold flex items-center">
                            {signal.symbol || signal.pair || "Google (OTC)"}
                          </h3>
                          <p className="text-sm text-white/70">{signal.exchange || "Blitz"}</p>
                        </div>
                      </div>
                      
                        <div>
                        <span className={`signal-badge inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          signal.signal === 'BUY' 
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/20' 
                            : 'bg-rose-500/20 text-rose-200 border border-rose-500/20'
                        }`}>
                          {signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-grow relative backdrop-blur-md bg-black/10">
                      {/* Indicadores de status */}
                      <div className="flex gap-2 mb-4">
                              {isNew && (
                          <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/20 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5 animate-pulse"></span>
                                  NOVO
                                </span>
                              )}
                              {isExpiring && (
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/20 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            EXPIRANDO
                                </span>
                              )}
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center text-teal-200 bg-teal-500/15 border border-teal-500/15`}>
                          <CheckCheck className="w-3 h-3 mr-1" />
                          {getStrengthText(signal.strength)}
                            </span>
                      </div>
                      
                      {/* Dados do sinal */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-black/20 backdrop-blur-md rounded-lg p-3 border border-white/10">
                          <p className="text-xs text-white/60 mb-1">Entrada</p>
                          <p className="text-lg font-semibold">{signal.entry_time || "00:27"}</p>
                    </div>
                    
                        <div className="bg-black/20 backdrop-blur-md rounded-lg p-3 border border-white/10">
                          <p className="text-xs text-white/60 mb-1">Expiração</p>
                          <p className="text-lg font-semibold">
                            {signal.timeframe || "30s"}
                            <span className="text-sm ml-2 text-white/60">
                              ({signal.expiry_time_str || "00:28"})
                            </span>
                          </p>
                        </div>
                        </div>
                        
                      <div className="grid grid-cols-1 gap-3 mt-4">
                        <div className="flex items-center justify-between bg-black/20 backdrop-blur-md rounded-lg p-3 border border-white/10">
                          <div>
                            <p className="text-sm font-medium">Reentrada 1</p>
                        </div>
                          <p className="text-base font-semibold text-white/90">{signal.gale1_time || "00:29"}</p>
                      </div>
                      
                        <div className="flex items-center justify-between bg-black/20 backdrop-blur-md rounded-lg p-3 border border-white/10">
                          <div>
                            <p className="text-sm font-medium">Reentrada 2</p>
                        </div>
                          <p className="text-base font-semibold text-white/90">{signal.gale2_time || "00:30"}</p>
                        </div>
                        </div>
                      </div>
                      
                    {/* Botão de ação */}
                    <div className="p-4 border-t border-white/10 bg-black/25">
                      <button
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium transition-all duration-300 flex items-center justify-center relative overflow-hidden shadow-md group"
                        onClick={() => window.open('https://trade.xxbroker.com/register?aff=751924&aff_model=revenue&afftrack=', '_blank')}
                      >
                        <span className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                        <span className="relative z-10 flex items-center">
                          <Zap className="w-4 h-4 mr-2" />
                          Realizar Trade
                          </span>
                        <ExternalLink className="w-4 h-4 ml-2 relative z-10" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 card-glass rounded-xl">
              <div className="bg-white/5 p-4 rounded-full mb-4">
                <ListFilter className="w-10 h-10 text-white/30" />
              </div>
              <h3 className="text-xl font-medium mb-2">Nenhum sinal encontrado</h3>
              <p className="text-white/60 text-center max-w-md mb-6">
                {filterType !== 'ALL' 
                  ? `Não encontramos sinais do tipo ${filterType} com os filtros atuais.` 
                  : 'Não encontramos sinais de trading ativos no momento.'}
              </p>
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setShowExpiredSignals(true);
                }}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
              >
                Mostrar todos os sinais
              </button>
            </div>
          )}
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-2">
              <button 
                onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                className="p-2 rounded-lg card-glass hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-all"
                aria-label="Página anterior"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, index) => {
                  // Mostrar apenas 5 botões de página no total
                  if (totalPages <= 5 || 
                      index === 0 || 
                      index === totalPages - 1 || 
                      (index >= activePage - 2 && index <= activePage)) {
                    return (
                <button 
                  key={`page-${index + 1}`}
                  onClick={() => setActivePage(index + 1)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    activePage === index + 1 
                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white font-medium border border-white/10 shimmer-effect' 
                            : 'card-glass hover:bg-white/10 text-white/70'
                  }`}
                >
                  {index + 1}
                </button>
                    );
                  } else if (index === 1 && activePage > 3) {
                    return <span key="ellipsis-start" className="px-1 self-end text-white/50">...</span>;
                  } else if (index === totalPages - 2 && activePage < totalPages - 2) {
                    return <span key="ellipsis-end" className="px-1 self-end text-white/50">...</span>;
                  }
                  return null;
                })}
              </div>
              
              <button 
                onClick={() => setActivePage(prev => Math.min(totalPages, prev + 1))}
                disabled={activePage === totalPages}
                className="p-2 rounded-lg card-glass hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-all"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Signals;


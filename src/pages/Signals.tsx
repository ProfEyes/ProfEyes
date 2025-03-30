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
  Sparkles,
  Circle
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
  @keyframes subtlePulse {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.01); }
  }
  
  @keyframes softGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.03); }
    50% { box-shadow: 0 0 12px rgba(255, 255, 255, 0.08); }
  }
  
  @keyframes gentleGradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes delicateFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  
  @keyframes subtleBreathing {
    0%, 100% { opacity: 0.9; }
    50% { opacity: 1; }
  }
  
  .gradient-text {
    background: linear-gradient(90deg, #f8f8f8, #ececec, #f8f8f8);
    background-size: 200% auto;
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    animation: gentleGradient 4s ease infinite;
  }

  .elegant-badge {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .elegant-badge::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0) 100%);
    transform: translateX(-100%);
    animation: elegantShine 4s infinite ease-in-out;
  }
  
  @keyframes elegantShine {
    100% {
      transform: translateX(100%);
    }
  }
  
  .minimal-hover {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(6px);
  }
  
  .minimal-hover:hover {
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
    backdrop-filter: blur(8px);
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    background: rgba(18, 18, 22, 0.3);
    border-radius: 1rem;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    animation: softGlow 3s ease-in-out infinite;
  }
  
  .light-accent {
    position: absolute;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%);
    animation: subtleBreathing 5s infinite ease-in-out;
    z-index: 0;
  }
  
  .color-accent {
    position: absolute;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.06;
    z-index: 0;
    animation: subtleBreathing 6s infinite ease-in-out alternate;
  }
  
  .floating-element {
    animation: delicateFloat 5s ease-in-out infinite;
  }
  
  .card-minimal {
    background: rgba(20, 20, 25, 0.25);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.03);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .card-minimal:hover {
    background: rgba(22, 22, 28, 0.3);
    border-color: rgba(255, 255, 255, 0.06);
  }
  
  .elegant-shimmer {
    overflow: hidden;
    position: relative;
  }
  
  .elegant-shimmer::before {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 150%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.02), transparent);
    animation: elegantShimmer 4s infinite ease-out;
    transform: skewX(-15deg);
    z-index: 1;
  }
  
  @keyframes elegantShimmer {
    0% { left: -150%; }
    100% { left: 150%; }
  }
  
  .text-shadow-sm {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  
  .bg-glass {
    background: rgba(20, 20, 25, 0.2);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.03);
  }
`;

const Signals = () => {
  const [filterType, setFilterType] = useState<SignalType | 'ALL'>('ALL');
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  const [previousPrices, setPreviousPrices] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExpiredSignals, setShowExpiredSignals] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [signalsPerPage] = useState(8);
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
        {/* Efeitos sutis de fundo */}
        <div className="light-accent top-40 left-20 opacity-40"></div>
        <div className="light-accent bottom-60 right-30 opacity-30"></div>
        <div className="light-accent top-1/2 left-1/3 opacity-25"></div>
        
        {/* Acentos coloridos suaves */}
        <div className="color-accent top-10 left-20" style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}></div>
        <div className="color-accent bottom-40 right-20" style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)' }}></div>
        <div className="color-accent top-60 right-60" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}></div>
        
        {/* Cabeçalho minimalista da página */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 z-10 relative mb-8">
          <div className="floating-element">
            <h1 className="text-2xl md:text-3xl font-light tracking-wide bg-gradient-to-r from-white/95 via-white to-white/95 bg-clip-text text-transparent flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-indigo-200/70" />
              Sinais de Trading
            </h1>
            <p className="text-white/60 mt-1 font-light tracking-wide">
              Oportunidades de mercado baseadas em análise avançada de dados
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-light transition-all
                ${isRefreshing 
                  ? 'bg-white/5 text-white/40 cursor-not-allowed' 
                  : 'bg-glass hover:bg-white/10 text-white/80 hover:text-white minimal-hover'
                }`}
              title="Atualizar sinais"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-light transition-all
                ${showFilters 
                  ? 'bg-white/10 text-white border border-white/5' 
                  : 'bg-glass hover:bg-white/10 text-white/80 hover:text-white minimal-hover'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden md:inline">Filtros</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Área de filtros com animação suave */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden z-10 relative mb-6"
            >
              <div className="p-5 rounded-xl bg-glass">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  {/* Filtro por tipo de sinal */}
                  <div className="space-y-2">
                    <p className="text-sm text-white/70 font-light">Tipo de sinal</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilterType('ALL')}
                        className={`px-4 py-2 rounded-lg text-[14px] font-light tracking-wide transition-all ${
                          filterType === 'ALL' 
                            ? 'bg-white/10 text-white elegant-shimmer border border-white/5' 
                            : 'bg-white/5 text-white/70 hover:bg-white/8'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setFilterType(SignalType.TECHNICAL)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-light tracking-wide transition-all ${
                          filterType === SignalType.TECHNICAL 
                            ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/10 elegant-shimmer' 
                            : 'bg-white/5 text-white/70 hover:bg-white/8'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4 inline mr-1.5 opacity-70" />
                        Técnicos
                      </button>
                      <button
                        onClick={() => setFilterType(SignalType.FUNDAMENTAL)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-light tracking-wide transition-all ${
                          filterType === SignalType.FUNDAMENTAL 
                            ? 'bg-violet-500/10 text-violet-200 border border-violet-500/10 elegant-shimmer' 
                            : 'bg-white/5 text-white/70 hover:bg-white/8'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 inline mr-1.5 opacity-70" />
                        Fundamentalistas
                      </button>
                      <button
                        onClick={() => setFilterType(SignalType.NEWS)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-light tracking-wide transition-all ${
                          filterType === SignalType.NEWS 
                            ? 'bg-amber-500/10 text-amber-200 border border-amber-500/10 elegant-shimmer' 
                            : 'bg-white/5 text-white/70 hover:bg-white/8'
                        }`}
                      >
                        <Clock4 className="w-4 h-4 inline mr-1.5 opacity-70" />
                        Notícias
                      </button>
                    </div>
                  </div>

                  {/* Opções adicionais */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-white/70 font-light">Opções</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowExpiredSignals(!showExpiredSignals)}
                        className={`flex items-center px-4 py-2 rounded-lg text-[14px] font-light tracking-wide transition-all ${
                          showExpiredSignals
                            ? 'bg-gray-500/10 text-gray-300 border border-gray-500/10 elegant-shimmer' 
                            : 'bg-white/5 text-white/70 hover:bg-white/8'
                        }`}
                      >
                        <Clock className="w-4 h-4 mr-1.5 opacity-70" />
                        {showExpiredSignals ? 'Ocultar Expirados' : 'Mostrar Expirados'}
                      </button>
                      
                      <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center px-4 py-2 rounded-lg text-[14px] font-light tracking-wide transition-all ${
                          autoRefresh 
                            ? 'bg-teal-500/10 text-teal-200 border border-teal-500/10 elegant-shimmer' 
                            : 'bg-white/5 text-white/70 hover:bg-white/8'
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
                  <div className="w-16 h-16 border border-white/5 border-t-white/20 rounded-full animate-spin"></div>
                  <div className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/5 border-b-white/20 rounded-full animate-spin"></div>
                </div>
              </div>
              <h3 className="gradient-text font-light text-lg mb-2">Analisando mercado</h3>
              <p className="text-sm text-white/50 text-center max-w-xs font-light">
                Processando sinais e identificando oportunidades de trading
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
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex flex-col rounded-xl overflow-hidden transition-all duration-300 minimal-hover
                      ${signal.status === 'active' 
                        ? 'card-minimal' 
                        : 'bg-black/20 border border-white/3 opacity-70'
                      }
                      ${isNew ? 'ring-1 ring-indigo-500/20' : ''}
                    `}
                  >
                    <div className="p-4 bg-black/15 border-b border-white/5 flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-36 h-36 opacity-15 -mt-20 -mr-20 rounded-full" 
                           style={{ 
                             background: signal.signal === 'BUY' 
                               ? 'radial-gradient(circle, rgba(52,211,153,0.2) 0%, rgba(52,211,153,0) 70%)' 
                               : 'radial-gradient(circle, rgba(248,113,113,0.2) 0%, rgba(248,113,113,0) 70%)' 
                           }}>
                      </div>
                      <div className="flex items-center z-10">
                        <div className={`p-2.5 rounded-lg ${
                          signal.signal === 'BUY' 
                            ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5' 
                            : 'bg-gradient-to-br from-rose-500/10 to-rose-600/5'
                          } border ${
                          signal.signal === 'BUY' 
                            ? 'border-emerald-500/10' 
                            : 'border-rose-500/10'
                          }`}>
                          {signal.signal === 'BUY' ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-300" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-rose-300" />
                          )}
                        </div>
                        <div className="ml-3">
                          <h3 className="text-base font-light tracking-wide flex items-center text-white/95">
                            {signal.symbol || signal.pair || "Google (OTC)"}
                          </h3>
                          <p className="text-sm text-white/60 font-light">{signal.exchange || "Blitz"}</p>
                        </div>
                      </div>
                      
                      <div>
                        <span className={`elegant-badge inline-block px-3 py-1 rounded-full text-xs font-light tracking-wide ${
                          signal.signal === 'BUY' 
                            ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/10' 
                            : 'bg-rose-500/10 text-rose-200 border border-rose-500/10'
                        }`}>
                          {signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-grow relative backdrop-blur-md bg-black/5">
                      {/* Indicadores de status */}
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {isNew && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-200 border border-indigo-500/10 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5 animate-pulse"></span>
                            NOVO
                          </span>
                        )}
                        {isExpiring && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-200 border border-amber-500/10 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            EXPIRANDO
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center text-teal-200 bg-teal-500/10 border border-teal-500/10`}>
                          <CheckCheck className="w-3 h-3 mr-1" />
                          {getStrengthText(signal.strength)}
                        </span>
                      </div>
                      
                      {/* Dados do sinal com design minimalista */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-black/15 backdrop-blur-md rounded-lg p-3 border border-white/5">
                          <p className="text-[11px] text-white/50 mb-1 font-light uppercase tracking-wider">Entrada</p>
                          <p className="text-lg font-light tracking-wide text-white/95">{signal.entry_time || "00:27"}</p>
                        </div>
                    
                        <div className="bg-black/15 backdrop-blur-md rounded-lg p-3 border border-white/5">
                          <p className="text-[11px] text-white/50 mb-1 font-light uppercase tracking-wider">Expiração</p>
                          <p className="text-lg font-light tracking-wide text-white/95">
                            {signal.timeframe || "30s"}
                            <span className="text-sm ml-2 text-white/50">
                              ({signal.expiry_time_str || "00:28"})
                            </span>
                          </p>
                        </div>
                      </div>
                        
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-black/15 backdrop-blur-md rounded-lg p-3 border border-white/5">
                          <p className="text-[11px] text-white/50 mb-1 font-light uppercase tracking-wider">Reentrada 1</p>
                          <p className="text-base font-light tracking-wide text-white/90">{signal.gale1_time || "00:29"}</p>
                        </div>
                      
                        <div className="bg-black/15 backdrop-blur-md rounded-lg p-3 border border-white/5">
                          <p className="text-[11px] text-white/50 mb-1 font-light uppercase tracking-wider">Reentrada 2</p>
                          <p className="text-base font-light tracking-wide text-white/90">{signal.gale2_time || "00:30"}</p>
                        </div>
                      </div>
                    </div>
                      
                    {/* Botão de ação minimalista e elegante */}
                    <div className="p-4 border-t border-white/5 bg-black/15">
                      <button
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-500/80 to-violet-500/80 hover:from-indigo-500/90 hover:to-violet-500/90 text-white/95 font-light tracking-wide transition-all duration-300 flex items-center justify-center relative overflow-hidden shadow-sm group"
                        onClick={() => window.open('https://trade.xxbroker.com/register?aff=751924&aff_model=revenue&afftrack=', '_blank')}
                      >
                        <span className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300"></span>
                        <span className="relative z-10 flex items-center text-shadow-sm">
                          <Zap className="w-4 h-4 mr-2" />
                          Realizar Trade
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 ml-2 relative z-10 opacity-70" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 card-minimal rounded-xl">
              <div className="bg-white/5 p-4 rounded-full mb-4">
                <ListFilter className="w-8 h-8 text-white/30" />
              </div>
              <h3 className="text-xl font-light tracking-wide mb-2 text-white/90">Nenhum sinal encontrado</h3>
              <p className="text-white/60 text-center max-w-md mb-6 font-light">
                {filterType !== 'ALL' 
                  ? `Não encontramos sinais do tipo ${filterType} com os filtros atuais.` 
                  : 'Não encontramos sinais de trading ativos no momento.'}
              </p>
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setShowExpiredSignals(true);
                }}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all border border-white/5"
              >
                Mostrar todos os sinais
              </button>
            </div>
          )}
          
          {/* Paginação com design minimalista */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-2">
              <button 
                onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                className="p-2 rounded-lg bg-glass hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-all border border-white/5"
                aria-label="Página anterior"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
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
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          activePage === index + 1 
                            ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-white/95 font-light border border-white/10 elegant-shimmer' 
                            : 'bg-glass hover:bg-white/10 text-white/70 border border-white/5'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  } else if (index === 1 && activePage > 3) {
                    return <span key="ellipsis-start" className="px-1 self-end text-white/40 font-light">...</span>;
                  } else if (index === totalPages - 2 && activePage < totalPages - 2) {
                    return <span key="ellipsis-end" className="px-1 self-end text-white/40 font-light">...</span>;
                  }
                  return null;
                })}
              </div>
              
              <button 
                onClick={() => setActivePage(prev => Math.min(totalPages, prev + 1))}
                disabled={activePage === totalPages}
                className="p-2 rounded-lg bg-glass hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-all border border-white/5"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Signals;


import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Bar, BarChart, ComposedChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, TrendingDownIcon, BarChart2Icon, LineChartIcon } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { useMarketData } from "@/hooks/useMarketData";

// Adiciona os estilos para animações
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes slideDown {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .chart-container {
    animation: fadeIn 0.5s ease-out forwards;
  }

  .select-content-animation {
    animation: slideDown 0.2s ease-out forwards;
  }

  .search-input-animation {
    transition: all 0.2s ease-out;
    border-radius: 6px;
    background: transparent;
  }

  .search-input-animation:focus {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    background: rgba(255, 255, 255, 0.03);
    outline: 2px solid rgba(59, 130, 246, 0.1);
    outline-offset: -1px;
  }

  .search-input-container {
    position: relative;
    overflow: hidden;
  }

  .search-input-container::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(59, 130, 246, 0.5), transparent);
    transform: scaleX(0);
    transition: transform 0.3s ease-out;
  }

  .search-input-container:focus-within::after {
    transform: scaleX(1);
  }

  /* Estilização da barra de rolagem */
  .custom-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }

  .custom-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  .custom-scrollbar {
    -webkit-overflow-scrolling: touch; /* Rolagem suave no iOS */
  }
`;

type BadgeVariant = "outline" | "destructive" | "default" | "secondary";

interface CandlestickPattern {
  name: string;
  type: 'bullish' | 'bearish';
  description: string;
  position: number;
  timestamp: number;
  accuracy: number;
}

const getBadgeVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'loading':
      return 'outline';
    case 'error':
      return 'destructive';
    default:
      return 'default';
  }
};

const getPatternBadgeVariant = (type: string): BadgeVariant => {
  return type === 'bullish' ? 'default' : 'destructive';
};

// Função para formatar a precisão como porcentagem
function formatAccuracy(accuracy: number): string {
  return `${(accuracy * 100).toFixed(1)}%`;
}

// Função para formatar o timestamp
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Componente para exibir um padrão individual
const PatternCard = ({ pattern }: { pattern: CandlestickPattern }) => {
  const isBullish = pattern.type === 'bullish';
  const accuracyColor = pattern.accuracy >= 0.7 ? 'text-green-500' : 
                       pattern.accuracy >= 0.5 ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className="bg-zinc-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-lg font-semibold ${isBullish ? 'text-green-500' : 'text-red-500'}`}>
          {pattern.name}
        </h4>
        <span className={`text-sm font-medium ${accuracyColor}`}>
          Precisão: {formatAccuracy(pattern.accuracy)}
        </span>
      </div>
      <p className="text-zinc-400 text-sm mb-2">{pattern.description}</p>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Confiabilidade: {pattern.reliability}/5</span>
        <span>{formatTimestamp(pattern.timestamp)}</span>
      </div>
    </div>
  );
};

// Componente para exibir o resumo dos padrões
const PatternsSummary = ({ patterns }: { patterns: CandlestickPattern[] }) => {
  const bullishPatterns = patterns.filter(p => p.type === 'bullish');
  const bearishPatterns = patterns.filter(p => p.type === 'bearish');
  
  const avgBullishAccuracy = bullishPatterns.length > 0
    ? bullishPatterns.reduce((acc, p) => acc + p.accuracy, 0) / bullishPatterns.length
    : 0;
    
  const avgBearishAccuracy = bearishPatterns.length > 0
    ? bearishPatterns.reduce((acc, p) => acc + p.accuracy, 0) / bearishPatterns.length
    : 0;
  
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-zinc-800 rounded-lg p-4">
        <h4 className="text-zinc-400 text-sm mb-1">Total de Padrões</h4>
        <p className="text-2xl font-semibold">{patterns.length}</p>
      </div>
      <div className="bg-zinc-800 rounded-lg p-4">
        <h4 className="text-green-500 text-sm mb-1">Sinais de Alta</h4>
        <p className="text-2xl font-semibold">
          {bullishPatterns.length}
          <span className="text-sm text-zinc-400 ml-2">
            ({formatAccuracy(avgBullishAccuracy)})
          </span>
        </p>
      </div>
      <div className="bg-zinc-800 rounded-lg p-4">
        <h4 className="text-red-500 text-sm mb-1">Sinais de Baixa</h4>
        <p className="text-2xl font-semibold">
          {bearishPatterns.length}
          <span className="text-sm text-zinc-400 ml-2">
            ({formatAccuracy(avgBearishAccuracy)})
          </span>
        </p>
      </div>
    </div>
  );
};

const Analysis = () => {
  const [selectedAsset, setSelectedAsset] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1d");

  // Usar o hook para dados do mercado
  const { 
    indicators, 
    priceData, 
    patterns, 
    orderbook,
    correlations,
    onChainData,
    loading, 
    error 
  } = useMarketData({
    symbol: selectedAsset,
    timeframe,
    updateInterval: 5000 // Atualizar a cada 5 segundos
  });

  // Lista de ativos disponíveis para análise
  const availableAssets = [
    // Principais Criptomoedas
    { symbol: "BTCUSDT", name: "Bitcoin" },
    { symbol: "ETHUSDT", name: "Ethereum" },
    { symbol: "BNBUSDT", name: "Binance Coin" },
    { symbol: "SOLUSDT", name: "Solana" },
    { symbol: "ADAUSDT", name: "Cardano" },
    { symbol: "XRPUSDT", name: "Ripple" },
    { symbol: "DOGEUSDT", name: "Dogecoin" },
    { symbol: "DOTUSDT", name: "Polkadot" },
    { symbol: "MATICUSDT", name: "Polygon" },
    { symbol: "AVAXUSDT", name: "Avalanche" },
    { symbol: "LINKUSDT", name: "Chainlink" },
    { symbol: "UNIUSDT", name: "Uniswap" },
    { symbol: "AAVEUSDT", name: "Aave" },
    { symbol: "ATOMUSDT", name: "Cosmos" },
    { symbol: "LTCUSDT", name: "Litecoin" },
    // DeFi
    { symbol: "MKRUSDT", name: "Maker" },
    { symbol: "SNXUSDT", name: "Synthetix" },
    { symbol: "COMPUSDT", name: "Compound" },
    { symbol: "CRVUSDT", name: "Curve" },
    { symbol: "SUSHIUSDT", name: "SushiSwap" },
    // Gaming & Metaverse
    { symbol: "AXSUSDT", name: "Axie Infinity" },
    { symbol: "SANDUSDT", name: "The Sandbox" },
    { symbol: "MANAUSDT", name: "Decentraland" },
    { symbol: "ENJUSDT", name: "Enjin" },
    // Layer 1s
    { symbol: "NEARUSDT", name: "NEAR Protocol" },
    { symbol: "FTMUSDT", name: "Fantom" },
    { symbol: "ALGOUSDT", name: "Algorand" },
    { symbol: "THETAUSDT", name: "Theta" },
    { symbol: "ICPUSDT", name: "Internet Computer" },
    // Layer 2s
    { symbol: "OPUSDT", name: "Optimism" },
    { symbol: "ARBUSDT", name: "Arbitrum" },
    // Stablecoins
    { symbol: "BUSDUSDT", name: "BUSD" },
    { symbol: "USDCUSDT", name: "USD Coin" },
    // Exchange Tokens
    { symbol: "FTTUSDT", name: "FTX Token" },
    { symbol: "OKBUSDT", name: "OKB" },
    { symbol: "HTUSDT", name: "Huobi Token" },
    // Outros Populares
    { symbol: "VETUSDT", name: "VeChain" },
    { symbol: "FILUSDT", name: "Filecoin" },
    { symbol: "XTZUSDT", name: "Tezos" },
    { symbol: "EOSUSDT", name: "EOS" }
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Formatar timestamp para exibição
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeframe === "1d" || timeframe === "1w") {
      return date.toLocaleDateString('pt-BR');
    }
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Análise Técnica
            </h1>
          <p className="text-muted-foreground">
              Análise detalhada e indicadores técnicos dos principais ativos
            </p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="w-[220px] bg-white/5">
                <SelectValue placeholder="Selecione um ativo" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px] p-0 overflow-hidden border-white/10 select-content-animation">
                <div className="sticky top-0 p-2 bg-transparent border-b border-white/10 backdrop-blur-sm z-10">
                  <div className="search-input-container">
                    <input
                      className="w-full px-3 py-2 text-sm bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-zinc-500 search-input-animation"
                      placeholder="Buscar ativo..."
                      onChange={(e) => {
                        const searchBox = e.target as HTMLInputElement;
                        const searchTerm = searchBox.value.toLowerCase().trim();
                        requestAnimationFrame(() => {
                          const items = document.querySelectorAll('[role="option"]');
                          items.forEach(item => {
                            const text = item.textContent?.toLowerCase() || '';
                            const match = text.includes(searchTerm);
                            if (match) {
                              (item as HTMLElement).style.display = 'block';
                              (item as HTMLElement).style.opacity = '1';
                              (item as HTMLElement).style.transform = 'translateY(0)';
                            } else {
                              (item as HTMLElement).style.display = 'none';
                              (item as HTMLElement).style.opacity = '0';
                            }
                          });
                        });
                      }}
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                </div>
                <div className="p-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(availableAssets.reduce((acc, asset) => {
                      const category = asset.symbol.includes('USDT') ? 'USDT' :
                                     asset.symbol.includes('BUSD') ? 'BUSD' :
                                     'Outros';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(asset);
                      return acc;
                    }, {} as Record<string, typeof availableAssets>)).map(([category, assets]) => (
                      <div key={category} className="space-y-1">
                        <div className="px-2 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800/50">
                          Pares em {category}
                        </div>
                        {assets.map((asset) => (
                          <SelectItem 
                            key={asset.symbol} 
                            value={asset.symbol}
                            className="cursor-pointer hover:bg-white/5 transition-all duration-200 py-2 px-2 mx-1 rounded-sm hover:translate-x-1"
                          >
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="font-medium">{asset.name}</span>
                              <span className="text-xs text-zinc-400 shrink-0">{asset.symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[120px] bg-white/5">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hora</SelectItem>
                <SelectItem value="4h">4 Horas</SelectItem>
                <SelectItem value="1d">Diário</SelectItem>
                <SelectItem value="1w">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <Card className="bg-white/5">
            <CardContent className="pt-6">
              <div className="text-red-500">{error}</div>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card className="bg-white/5">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center gap-4">
                <Loading size="lg" />
                <p className="text-muted-foreground">Carregando dados do mercado...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RSI</CardTitle>
                  <Badge variant={indicators?.rsi > 70 ? "destructive" : indicators?.rsi < 30 ? "default" : "secondary"}>
                    {indicators?.rsi.toFixed(2)}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {indicators?.rsi > 70 ? "Sobrecomprado" : indicators?.rsi < 30 ? "Sobrevendido" : "Neutro"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MACD</CardTitle>
                  <Badge variant={indicators?.macd.histogram > 0 ? "default" : "destructive"}>
                    {indicators?.macd.histogram.toFixed(2)}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Histograma: {indicators?.macd.histogram > 0 ? "Positivo" : "Negativo"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tendência</CardTitle>
                  <div className="flex items-center gap-2">
                    {indicators?.sma.sma20 > indicators?.sma.sma50 ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-500" />
                    )}
            </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    SMA 20: {indicators?.sma.sma20.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bandas de Bollinger</CardTitle>
                  <BarChart2Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Largura: {indicators && (((indicators.bb.upper - indicators.bb.lower) / indicators.bb.middle) * 100).toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="price" className="space-y-6">
              <TabsList className="bg-white/5">
                <TabsTrigger value="price">Preço</TabsTrigger>
                <TabsTrigger value="indicators">Indicadores</TabsTrigger>
                <TabsTrigger value="patterns">Padrões</TabsTrigger>
                <TabsTrigger value="volume">Volume</TabsTrigger>
                <TabsTrigger value="orderbook">Orderbook</TabsTrigger>
              </TabsList>

              <TabsContent value="price">
                <Card className="bg-white/[0.02] backdrop-blur-sm border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] via-transparent to-purple-500/[0.02]" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-100">
                      <LineChartIcon className="h-5 w-5 text-zinc-400" />
                      Gráfico de Preços
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      {selectedAsset} - {timeframe === "1d" ? "Diário" : timeframe === "1w" ? "Semanal" : timeframe === "4h" ? "4 Horas" : "1 Hora"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[500px] chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={priceData}>
                          <defs>
                            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#64748b" stopOpacity={0.08} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                          <XAxis 
                            dataKey="time" 
                            stroke="#52525b"
                            tickFormatter={formatTime}
                            tick={{ fontSize: 11, fill: '#a1a1aa' }}
                            axisLine={{ stroke: '#3f3f46' }}
                          />
                          <YAxis 
                            yAxisId="volume"
                            stroke="#52525b"
                            tickFormatter={(value) => value.toLocaleString('pt-BR')}
                            tick={{ fontSize: 11, fill: '#a1a1aa' }}
                            axisLine={{ stroke: '#3f3f46' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(24, 24, 27, 0.95)',
                              border: '1px solid rgba(63, 63, 70, 0.4)',
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                              padding: '8px 12px'
                            }}
                            itemStyle={{
                              color: '#e4e4e7',
                              fontSize: '12px'
                            }}
                            labelStyle={{
                              color: '#a1a1aa',
                              fontSize: '11px',
                              marginBottom: '4px'
                            }}
                            formatter={(value: any) => [value.toLocaleString('pt-BR'), 'Volume']}
                            labelFormatter={formatTime}
                            animationDuration={150}
                          />
                          <Bar
                            dataKey="volume"
                            yAxisId="volume"
                            fill="url(#volumeGradient)"
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                            opacity={0.8}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="indicators">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-white/[0.02] backdrop-blur-sm border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-purple-500/[0.02]" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-zinc-100">
                        <TrendingUpIcon className="h-5 w-5 text-zinc-400" />
                        RSI
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Relative Strength Index (14 períodos)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={priceData}>
                            <defs>
                              <linearGradient id="rsiGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#64748b" stopOpacity={0.08} />
                              </linearGradient>
                              <filter id="rsiGlow">
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                            <XAxis 
                              dataKey="time" 
                              stroke="#52525b"
                              tickFormatter={formatTime}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <YAxis 
                              stroke="#52525b"
                              domain={[0, 100]}
                              ticks={[0, 30, 50, 70, 100]}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                border: '1px solid rgba(63, 63, 70, 0.4)',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                padding: '8px 12px'
                              }}
                              itemStyle={{
                                color: '#e4e4e7',
                                fontSize: '12px'
                              }}
                              labelStyle={{
                                color: '#a1a1aa',
                                fontSize: '11px',
                                marginBottom: '4px'
                              }}
                              labelFormatter={formatTime}
                              formatter={(value: any) => [value.toFixed(2), 'RSI']}
                              animationDuration={150}
                            />
                            <Line 
                              dataKey="rsi"
                              stroke="#64748b"
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={800}
                              animationEasing="ease-out"
                              connectNulls
                              filter="url(#rsiGlow)"
                            />
                            <Line
                              dataKey={() => 70}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                              strokeWidth={1}
                              dot={false}
                              opacity={0.4}
                            />
                            <Line
                              dataKey={() => 30}
                              stroke="#10b981"
                              strokeDasharray="3 3"
                              strokeWidth={1}
                              dot={false}
                              opacity={0.4}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/[0.02] backdrop-blur-sm border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] via-transparent to-blue-500/[0.02]" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-zinc-100">
                        <BarChart2Icon className="h-5 w-5 text-zinc-400" />
                        MACD
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Moving Average Convergence Divergence
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={priceData}>
                            <defs>
                              <linearGradient id="macdGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#64748b" stopOpacity={0.08} />
                              </linearGradient>
                              <filter id="macdGlow">
                                <feGaussianBlur stdDeviation="1.8" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                            <XAxis 
                              dataKey="time" 
                              stroke="#52525b"
                              tickFormatter={formatTime}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <YAxis 
                              stroke="#52525b"
                              domain={['auto', 'auto']}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                border: '1px solid rgba(63, 63, 70, 0.4)',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                padding: '8px 12px'
                              }}
                              itemStyle={{
                                color: '#e4e4e7',
                                fontSize: '12px'
                              }}
                              labelStyle={{
                                color: '#a1a1aa',
                                fontSize: '11px',
                                marginBottom: '4px'
                              }}
                              labelFormatter={formatTime}
                              formatter={(value: any, name: string) => [
                                value.toFixed(2),
                                name === 'macdHistogram' ? 'Histograma' : name === 'macdLine' ? 'MACD' : 'Sinal'
                              ]}
                              animationDuration={150}
                            />
                            <Bar 
                              dataKey="macdHistogram" 
                              fill="#64748b"
                              opacity={0.2}
                              isAnimationActive={true}
                              animationDuration={800}
                              animationEasing="ease-out"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="macdLine"
                              stroke="#64748b"
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={800}
                              animationEasing="ease-out"
                              filter="url(#macdGlow)"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="macdSignal"
                              stroke="#94a3b8"
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={800}
                              animationEasing="ease-out"
                              opacity={0.6}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/[0.02] backdrop-blur-sm border-white/5 relative overflow-hidden transition-all duration-300 hover:bg-white/[0.03]">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-500/[0.02] via-transparent to-slate-400/[0.02]" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-zinc-100">
                        <TrendingUpIcon className="h-5 w-5 text-zinc-400" />
                        Stochastic RSI
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Indicador de momentum combinado
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={priceData}>
                            <defs>
                              <linearGradient id="stochRsiGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
                              </linearGradient>
                              <filter id="stochRsiGlow">
                                <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                              <linearGradient id="stochKGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1} />
                              </linearGradient>
                              <linearGradient id="stochDGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#64748b" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                            <XAxis 
                              dataKey="time" 
                              stroke="#52525b"
                              tickFormatter={formatTime}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <YAxis 
                              stroke="#52525b"
                              domain={[0, 100]}
                              ticks={[0, 20, 50, 80, 100]}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                border: '1px solid rgba(63, 63, 70, 0.4)',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                padding: '8px 12px',
                                animation: 'fadeIn 0.2s ease-out'
                              }}
                              itemStyle={{
                                color: '#e4e4e7',
                                fontSize: '12px'
                              }}
                              labelStyle={{
                                color: '#a1a1aa',
                                fontSize: '11px',
                                marginBottom: '4px'
                              }}
                              labelFormatter={formatTime}
                              formatter={(value: any, name: string) => [
                                value.toFixed(2),
                                name === 'stochK' ? 'Linha K' : 'Linha D'
                              ]}
                              animationDuration={150}
                            />
                            <Line 
                              type="monotone"
                              dataKey="stochK"
                              stroke="#94a3b8"
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={1000}
                              animationEasing="ease-in-out"
                              filter="url(#stochRsiGlow)"
                            />
                            <Line 
                              type="monotone"
                              dataKey="stochD"
                              stroke="#64748b"
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={1000}
                              animationEasing="ease-in-out"
                              opacity={0.8}
                            />
                            <Line
                              dataKey={() => 80}
                              stroke="#3f3f46"
                              strokeDasharray="3 3"
                              strokeWidth={1}
                              dot={false}
                              opacity={0.4}
                            />
                            <Line
                              dataKey={() => 20}
                              stroke="#3f3f46"
                              strokeDasharray="3 3"
                              strokeWidth={1}
                              dot={false}
                              opacity={0.4}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/[0.02] backdrop-blur-sm border-white/5 relative overflow-hidden transition-all duration-300 hover:bg-white/[0.03]">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-500/[0.02] via-transparent to-slate-400/[0.02]" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-zinc-100">
                        <LineChartIcon className="h-5 w-5 text-zinc-400" />
                        Médias Móveis
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        SMA 20, 50 e 200 períodos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={priceData}>
                            <defs>
                              <linearGradient id="sma20Gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1} />
                              </linearGradient>
                              <linearGradient id="sma50Gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#64748b" stopOpacity={0.1} />
                              </linearGradient>
                              <linearGradient id="sma200Gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#475569" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#475569" stopOpacity={0.1} />
                              </linearGradient>
                              <filter id="maGlow">
                                <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                            <XAxis 
                              dataKey="time" 
                              stroke="#52525b"
                              tickFormatter={formatTime}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <YAxis 
                              stroke="#52525b"
                              domain={['auto', 'auto']}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                border: '1px solid rgba(63, 63, 70, 0.4)',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                padding: '8px 12px',
                                animation: 'fadeIn 0.2s ease-out'
                              }}
                              itemStyle={{
                                color: '#e4e4e7',
                                fontSize: '12px'
                              }}
                              labelStyle={{
                                color: '#a1a1aa',
                                fontSize: '11px',
                                marginBottom: '4px'
                              }}
                              labelFormatter={formatTime}
                              formatter={(value: any, name: string) => [
                                value.toFixed(2),
                                name === 'sma20' ? 'SMA 20' : name === 'sma50' ? 'SMA 50' : 'SMA 200'
                              ]}
                              animationDuration={150}
                            />
                            <Line 
                              type="monotone"
                              dataKey="sma20"
                              stroke="#94a3b8"
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={1000}
                              animationEasing="ease-in-out"
                              filter="url(#maGlow)"
                            />
                            <Line 
                              type="monotone"
                              dataKey="sma50"
                              stroke="#64748b"
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={1200}
                              animationEasing="ease-in-out"
                              opacity={0.8}
                            />
                            <Line 
                              type="monotone"
                              dataKey="sma200"
                              stroke="#475569"
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={1400}
                              animationEasing="ease-in-out"
                              opacity={0.6}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="patterns">
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle>Padrões</CardTitle>
                    <CardDescription>
                      Identificação automática de padrões e formações técnicas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {patterns.length > 0 ? (
                      <>
                        <PatternsSummary patterns={patterns} />
                        <div className="space-y-4">
                          {patterns.map((pattern, index) => (
                            <PatternCard key={`${pattern.name}-${index}`} pattern={pattern} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-zinc-500 py-8">
                        Nenhum padrão identificado no momento
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="volume">
                <Card className="bg-white/[0.02] backdrop-blur-sm border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] via-transparent to-cyan-500/[0.02]" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-100">
                      <BarChart2Icon className="h-5 w-5 text-zinc-400" />
                      Análise de Volume
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Distribuição de volume ao longo do tempo para {selectedAsset}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-white/[0.01] border-white/5">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-xs text-zinc-400 mb-1">Volume 24h</div>
                              <div className="text-xl font-medium text-zinc-100">
                                {priceData[priceData.length - 1]?.volume.toLocaleString('pt-BR')}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-white/[0.01] border-white/5">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-xs text-zinc-400 mb-1">Média de Volume</div>
                              <div className="text-xl font-medium text-zinc-100">
                                {(priceData.reduce((acc, curr) => acc + curr.volume, 0) / priceData.length).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-white/[0.01] border-white/5">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-xs text-zinc-400 mb-1">Volume Máximo</div>
                              <div className="text-xl font-medium text-zinc-100">
                                {Math.max(...priceData.map(d => d.volume)).toLocaleString('pt-BR')}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="h-[400px] chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={priceData}>
                            <defs>
                              <linearGradient id="volumeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#64748b" stopOpacity={0.08} />
                              </linearGradient>
                              <linearGradient id="volumeBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#64748b" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#64748b" stopOpacity={0.15} />
                              </linearGradient>
                              <filter id="volumeGlow">
                                <feGaussianBlur stdDeviation="2.2" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.15} />
                            <XAxis 
                              dataKey="time" 
                              stroke="#52525b"
                              tickFormatter={formatTime}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <YAxis 
                              stroke="#52525b"
                              tickFormatter={(value) => value.toLocaleString('pt-BR')}
                              tick={{ fontSize: 11, fill: '#a1a1aa' }}
                              axisLine={{ stroke: '#3f3f46' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                border: '1px solid rgba(63, 63, 70, 0.4)',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                padding: '8px 12px'
                              }}
                              itemStyle={{
                                color: '#e4e4e7',
                                fontSize: '12px'
                              }}
                              labelStyle={{
                                color: '#a1a1aa',
                                fontSize: '11px',
                                marginBottom: '4px'
                              }}
                              formatter={(value: any) => [value.toLocaleString('pt-BR'), 'Volume']}
                              labelFormatter={formatTime}
                              animationDuration={150}
                            />
                            <Area
                              type="monotone"
                              dataKey="volume"
                              stroke="#64748b"
                              strokeWidth={1.5}
                              fill="url(#volumeAreaGradient)"
                              isAnimationActive={true}
                              animationDuration={800}
                              animationEasing="ease-out"
                              opacity={0.6}
                              filter="url(#volumeGlow)"
                            />
                            <Bar
                              dataKey="volume"
                              fill="url(#volumeBarGradient)"
                              isAnimationActive={true}
                              animationDuration={800}
                              animationEasing="ease-out"
                              opacity={0.8}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orderbook">
                <Card className="bg-white/[0.02] backdrop-blur-sm border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-blue-500/[0.02]" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-100">
                      <BarChart2Icon className="h-5 w-5 text-zinc-400" />
                      Livro de Ofertas
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Análise detalhada da profundidade do mercado e liquidez
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-white/[0.01] border-white/5 transition-all duration-300 hover:bg-white/[0.02]">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-xs text-zinc-400 mb-1">Spread</div>
                              <div className="text-xl font-medium text-zinc-100">
                                {orderbook && (parseFloat(orderbook.asks[0][0]) - parseFloat(orderbook.bids[0][0])).toFixed(2)}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                {orderbook && ((parseFloat(orderbook.asks[0][0]) - parseFloat(orderbook.bids[0][0])) / parseFloat(orderbook.bids[0][0]) * 100).toFixed(2)}%
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-white/[0.01] border-white/5 transition-all duration-300 hover:bg-white/[0.02]">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-xs text-zinc-400 mb-1">Volume Total (Compra)</div>
                              <div className="text-xl font-medium text-green-500">
                                {orderbook?.bids.reduce((acc, [_, amount]) => acc + parseFloat(amount), 0).toFixed(4)}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                {orderbook?.bids.length} ordens
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-white/[0.01] border-white/5 transition-all duration-300 hover:bg-white/[0.02]">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-xs text-zinc-400 mb-1">Volume Total (Venda)</div>
                              <div className="text-xl font-medium text-red-500">
                                {orderbook?.asks.reduce((acc, [_, amount]) => acc + parseFloat(amount), 0).toFixed(4)}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                {orderbook?.asks.length} ordens
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <Card className="bg-white/[0.01] border-white/5 transition-all duration-300 hover:bg-white/[0.02]">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              <div className="flex items-center justify-between">
                                <span className="text-green-500">Ofertas de Compra</span>
                                <Badge variant="outline" className="text-xs bg-green-500/5 border-green-500/20">
                                  Melhor: {orderbook?.bids[0] ? parseFloat(orderbook.bids[0][0]).toFixed(2) : '-'}
                                </Badge>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {orderbook?.bids.slice(0, 10).map((bid, index) => (
                                <div 
                                  key={index} 
                                  className="flex justify-between text-sm items-center"
                                  style={{
                                    animation: `fadeIn 0.${index + 2}s ease-out forwards`,
                                    transform: `translateX(${index * 2}px)`,
                                  }}
                                >
                                  <div className="relative w-full h-6 flex items-center group">
                                    <div 
                                      className="absolute h-full bg-gradient-to-r from-green-500/5 to-green-500/20"
                                      style={{ 
                                        width: `${(parseFloat(bid[1]) / Math.max(...orderbook.bids.map(b => parseFloat(b[1])))) * 100}%`,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 0 10px rgba(34, 197, 94, 0.2), inset 0 0 5px rgba(34, 197, 94, 0.1)',
                                        borderRadius: '0 4px 4px 0'
                                      }}
                                    />
                                    <div 
                                      className="absolute h-full w-[2px] bg-green-500/40"
                                      style={{
                                        left: `${(parseFloat(bid[1]) / Math.max(...orderbook.bids.map(b => parseFloat(b[1])))) * 100}%`,
                                        boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                    />
                                    <div className="flex justify-between w-full px-2 z-10">
                                      <span className="text-zinc-300 group-hover:text-green-400 transition-colors">
                                        {parseFloat(bid[0]).toFixed(2)}
                                      </span>
                                      <span className="text-zinc-400 group-hover:text-green-400 transition-colors">
                                        {parseFloat(bid[1]).toFixed(4)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white/[0.01] border-white/5 transition-all duration-300 hover:bg-white/[0.02]">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              <div className="flex items-center justify-between">
                                <span className="text-red-500">Ofertas de Venda</span>
                                <Badge variant="outline" className="text-xs bg-red-500/5 border-red-500/20">
                                  Melhor: {orderbook?.asks[0] ? parseFloat(orderbook.asks[0][0]).toFixed(2) : '-'}
                                </Badge>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {orderbook?.asks.slice(0, 10).map((ask, index) => (
                                <div 
                                  key={index} 
                                  className="flex justify-between text-sm items-center"
                                  style={{
                                    animation: `fadeIn 0.${index + 2}s ease-out forwards`,
                                    transform: `translateX(${index * 2}px)`,
                                  }}
                                >
                                  <div className="relative w-full h-6 flex items-center group">
                                    <div 
                                      className="absolute h-full bg-gradient-to-r from-red-500/5 to-red-500/20"
                                      style={{ 
                                        width: `${(parseFloat(ask[1]) / Math.max(...orderbook.asks.map(a => parseFloat(a[1])))) * 100}%`,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.2), inset 0 0 5px rgba(239, 68, 68, 0.1)',
                                        borderRadius: '0 4px 4px 0'
                                      }}
                                    />
                                    <div 
                                      className="absolute h-full w-[2px] bg-red-500/40"
                                      style={{
                                        left: `${(parseFloat(ask[1]) / Math.max(...orderbook.asks.map(a => parseFloat(a[1])))) * 100}%`,
                                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                    />
                                    <div className="flex justify-between w-full px-2 z-10">
                                      <span className="text-zinc-300 group-hover:text-red-400 transition-colors">
                                        {parseFloat(ask[0]).toFixed(2)}
                                      </span>
                                      <span className="text-zinc-400 group-hover:text-red-400 transition-colors">
                                        {parseFloat(ask[1]).toFixed(4)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="bg-white/[0.01] border-white/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Profundidade do Mercado</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px] chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={orderbook?.chartData}>
                                <defs>
                                  <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                                  </linearGradient>
                                  <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                                  </linearGradient>
                                  <filter id="glowBid">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                      <feMergeNode in="coloredBlur"/>
                                      <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                  </filter>
                                  <filter id="glowAsk">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                      <feMergeNode in="coloredBlur"/>
                                      <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                  </filter>
                                </defs>
                                <CartesianGrid 
                                  strokeDasharray="3 3" 
                                  stroke="#27272a" 
                                  opacity={0.15}
                                  vertical={false}
                                />
                                <XAxis 
                                  dataKey="price"
                                  stroke="#52525b"
                                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                  axisLine={{ stroke: '#3f3f46' }}
                                />
                                <YAxis 
                                  stroke="#52525b"
                                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                  axisLine={{ stroke: '#3f3f46' }}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                    border: '1px solid rgba(63, 63, 70, 0.4)',
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                    padding: '8px 12px',
                                    animation: 'fadeIn 0.2s ease-out'
                                  }}
                                  itemStyle={{
                                    color: '#e4e4e7',
                                    fontSize: '12px'
                                  }}
                                  labelStyle={{
                                    color: '#a1a1aa',
                                    fontSize: '11px',
                                    marginBottom: '4px'
                                  }}
                                  formatter={(value: any, name: string) => [
                                    value.toFixed(4),
                                    name === 'bidsTotal' ? 'Volume de Compra' : 'Volume de Venda'
                                  ]}
                                />
                                <Area
                                  dataKey="bidsTotal"
                                  stroke="#22c55e"
                                  strokeWidth={2}
                                  fill="url(#bidGradient)"
                                  isAnimationActive={true}
                                  animationDuration={1000}
                                  animationEasing="ease-out"
                                  filter="url(#glowBid)"
                                />
                                <Area
                                  dataKey="asksTotal"
                                  stroke="#ef4444"
                                  strokeWidth={2}
                                  fill="url(#askGradient)"
                                  isAnimationActive={true}
                                  animationDuration={1000}
                                  animationEasing="ease-out"
                                  filter="url(#glowAsk)"
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>
      <style>{styles}</style>
    </Layout>
  );
};

export default Analysis;

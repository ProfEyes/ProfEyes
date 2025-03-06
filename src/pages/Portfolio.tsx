import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  DollarSignIcon,
  PercentIcon, 
  BarChartIcon, 
  PieChartIcon, 
  SettingsIcon,
  Target,
  Clock,
  Shield,
  Wallet,
  ChartBar,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bitcoin,
  Globe,
  Trash2,
  Edit,
  Calendar,
  Folder,
  FolderPlus,
  FolderX,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { generateOptimalPortfolio } from '@/services/portfolioOptimizer';
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPortal } from 'react-dom';

interface Asset {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  type: string;
}

interface PortfolioData {
  totalValue: number;
  assets: Asset[];
  performance: {
    date: string;
    value: number;
  }[];
  allocation: {
    name: string;
    value: number;
  }[];
}

interface SavedPortfolio extends PortfolioData {
  id: string;
  name: string;
  dateCreated: string;
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO';
  rebalanceFrequency: string;
  initialAmount: number;
}

// Dados de exemplo
const mockPortfolioData: PortfolioData = {
  totalValue: 15750.25,
  assets: [
    { symbol: 'BTC', quantity: 0.25, averagePrice: 45000, currentPrice: 47000, type: 'CRIPTO' },
    { symbol: 'ETH', quantity: 2.5, averagePrice: 2800, currentPrice: 3000, type: 'CRIPTO' },
    { symbol: 'BNB', quantity: 10, averagePrice: 300, currentPrice: 320, type: 'CRIPTO' },
  ],
  performance: [
    { date: '2024-01', value: 14000 },
    { date: '2024-02', value: 14500 },
    { date: '2024-03', value: 15750.25 },
  ],
  allocation: [
    { name: 'BTC', value: 11750 },
    { name: 'ETH', value: 7500 },
    { name: 'BNB', value: 3200 },
  ],
};

const COLORS = [
  '#22c55e', // Verde
  '#3b82f6', // Azul
  '#f59e0b', // Amarelo
  '#ec4899', // Rosa
  '#8b5cf6', // Roxo
  '#06b6d4', // Ciano
];

interface FormData {
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO';
  initialAmount: number;
  cryptoAllocation: number;
  stocksAllocation: number;
  rebalanceFrequency: 'DIÁRIO' | 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL';
  preferredAssets: string[];
  investmentGoal: string;
  investmentTerm: number;
  maxDrawdown: number;
  reinvestDividends: boolean;
}

// Interface para dados em tempo real
interface RealTimeData {
  btcPrice: number;
  btc24hChange: number;
  ethPrice: number;
  eth24hChange: number;
  globalMarketCap: number;
}

// Interface para ativos do ticker
interface TickerAsset {
  symbol: string;
  price: number;
  change: number;
  isCrypto?: boolean;
  isIndex?: boolean;
  isCurrency?: boolean;
}

// Função para verificar se um símbolo é de uma ação brasileira
const isBrazilianStock = (symbol: string): boolean => {
  // Padrão típico de ações brasileiras: 4 letras seguidas de um número
  const brazilianPattern = /^[A-Z]{4}\d$/;
  
  // Lista de ações brasileiras conhecidas (pode ser expandida conforme necessário)
  const knownBrazilianStocks = [
    'PETR4', 'PETR3', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'RENT3', 
    'EQTL3', 'RADL3', 'EGIE3', 'BBAS3', 'MGLU3', 'PRIO3', 'VBBR3', 'RAIL3',
    'HYPE3', 'ENEV3', 'GOAU4', 'TOTS3', 'LREN3', 'CSAN3', 'NTCO3', 'CIEL3', 
    'SBSP3', 'CCRO3', 'B3SA3', 'ELET3', 'SUZB3', 'KLBN11', 'EMBR3', 'BRML3',
    'MULT3', 'IGTI11', 'HGRE11'
  ];
  
  return brazilianPattern.test(symbol) || knownBrazilianStocks.includes(symbol);
};

// Constantes para os ativos a serem exibidos no ticker
const CRYPTO_ASSETS = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'];
const BR_STOCKS = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'WEGE3'];
const INDICES = ['^BVSP', '^GSPC', '^IXIC', '^DJI'];
const CURRENCIES = ['USD-BRL', 'EUR-BRL'];

// Componente do rodapé com ticker usando Portal
const TickerFooter = ({ tickerAssets }: { tickerAssets: any[] }) => {
  return createPortal(
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9999] overflow-hidden border-t bg-background/90 backdrop-blur-md"
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        width: '100%',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' 
      }}
    >
      <div className="py-3 overflow-hidden">
        <div className="relative flex items-center h-6">
          <motion.div
            className="flex space-x-8 whitespace-nowrap"
            animate={{
              x: [0, -4000],
            }}
            transition={{
              x: {
                duration: 60,
                ease: "linear",
                repeat: Infinity,
              },
            }}
          >
            {[...tickerAssets, ...tickerAssets].map((asset, index) => (
              <div key={`${asset.symbol}-${index}`} className="flex items-center space-x-1">
                <span className="font-medium">{asset.symbol}</span>
                <span className="font-mono">
                  {asset.isIndex 
                    ? asset.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : asset.price.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: asset.isCurrency || isBrazilianStock(asset.symbol)
                          ? 'BRL' 
                          : 'USD'
                      })}
                </span>
                <span 
                  className={`text-xs ${asset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  {asset.change >= 0 ? '+' : ''}{typeof asset.change === 'number' ? asset.change.toFixed(2) : asset.change}%
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-background/90 via-transparent to-background/90 pointer-events-none absolute top-0 left-0 right-0 bottom-0 z-10" />
    </div>,
    document.body
  );
};

export default function Portfolio() {
  const [activePortfolio, setActivePortfolio] = useState<PortfolioData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    riskLevel: 'MÉDIO',
    initialAmount: 10000,
    cryptoAllocation: 30,
    stocksAllocation: 40,
    rebalanceFrequency: 'MENSAL',
    preferredAssets: [],
    investmentGoal: '',
    investmentTerm: 5,
    maxDrawdown: 15,
    reinvestDividends: true
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [realTimeData, setRealTimeData] = useState<RealTimeData>({
    btcPrice: 0,
    btc24hChange: 0,
    ethPrice: 0,
    eth24hChange: 0,
    globalMarketCap: 0
  });
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<SavedPortfolio | null>(null);
  const [currentView, setCurrentView] = useState<'generate' | 'manage' | 'detail'>('generate');
  const [portfolioNameInput, setPortfolioNameInput] = useState('');
  const [portfolioToDelete, setPortfolioToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tickerAssets, setTickerAssets] = useState<TickerAsset[]>([
    { symbol: 'BTC', price: 65423.50, change: 2.4, isCrypto: true },
    { symbol: 'ETH', price: 3492.75, change: 1.8, isCrypto: true },
    { symbol: 'BNB', price: 564.21, change: -0.7, isCrypto: true },
    { symbol: 'SOL', price: 143.68, change: 3.2, isCrypto: true },
    { symbol: 'ADA', price: 0.45, change: -1.3, isCrypto: true },
    { symbol: 'PETR4', price: 35.78, change: 0.8 },
    { symbol: 'VALE3', price: 69.42, change: 1.1 },
    { symbol: 'ITUB4', price: 32.57, change: -0.5 },
    { symbol: 'BBDC4', price: 18.92, change: 0.3 },
    { symbol: 'WEGE3', price: 42.15, change: 2.2 },
    { symbol: 'IBOV', price: 127895.42, change: 0.9, isIndex: true },
    { symbol: 'S&P500', price: 5234.87, change: 0.6, isIndex: true },
    { symbol: 'NASDAQ', price: 16423.58, change: 1.2, isIndex: true },
    { symbol: 'DJIA', price: 38756.32, change: 0.4, isIndex: true },
    { symbol: 'EURO', price: 5.62, change: -0.2, isCurrency: true },
    { symbol: 'USD', price: 5.18, change: -0.3, isCurrency: true },
  ]);

  const handleGeneratePortfolio = async () => {
    setLoading(true);
    try {
      // Validar dados do formulário
      if (formData.initialAmount < 1000) {
        throw new Error('O valor inicial deve ser de pelo menos R$ 1.000');
      }

      if (formData.stocksAllocation + formData.cryptoAllocation > 100) {
        throw new Error('A soma das alocações não pode ultrapassar 100%');
      }

      // Gerar carteira otimizada
      const portfolio = await generateOptimalPortfolio(
        formData.riskLevel,
        formData.initialAmount,
        formData.stocksAllocation,
        formData.cryptoAllocation,
        formData.investmentTerm,
        formData.preferredAssets
      );

      // Converter o resultado para o formato esperado pelo componente
      const convertedPortfolio: PortfolioData = {
        totalValue: formData.initialAmount,
        assets: portfolio.assets.map(asset => ({
          symbol: asset.symbol,
          quantity: Math.floor((formData.initialAmount * asset.weight) / asset.price),
          averagePrice: asset.price,
          currentPrice: asset.price,
          type: asset.type
        })),
        performance: [
          { date: '2024-01', value: formData.initialAmount },
          { date: '2024-02', value: formData.initialAmount * (1 + portfolio.expectedReturn / 12) },
          { date: '2024-03', value: formData.initialAmount * (1 + portfolio.expectedReturn / 6) }
        ],
        allocation: portfolio.assets.map(asset => ({
          name: asset.symbol,
          value: formData.initialAmount * asset.weight
        }))
      };

      setActivePortfolio(convertedPortfolio);

      // Criar uma nova carteira salva
      const newPortfolio: SavedPortfolio = {
        ...convertedPortfolio,
        id: `portfolio-${Date.now()}`,
        name: `Carteira ${formData.riskLevel.charAt(0)}${formData.riskLevel.charAt(1).toLowerCase()} ${new Date().toLocaleDateString('pt-BR')}`,
        dateCreated: new Date().toISOString(),
        riskLevel: formData.riskLevel,
        rebalanceFrequency: formData.rebalanceFrequency,
        initialAmount: formData.initialAmount
      };

      // Adicionar à lista de carteiras salvas
      setSavedPortfolios(prev => [...prev, newPortfolio]);

      // Selecionar a nova carteira e mostrar detalhes
      setSelectedPortfolio(newPortfolio);
      setCurrentView('detail');

      // Mostrar mensagem de sucesso
      toast({
        title: "Carteira gerada com sucesso!",
        description: `Carteira otimizada criada com ${portfolio.assets.length} ativos.`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Erro ao gerar carteira:', error);
      // Mostrar mensagem de erro
      toast({
        title: "Erro ao gerar carteira",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao gerar a carteira",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenamePortfolio = (id: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "Nome inválido",
        description: "Por favor, forneça um nome válido para a carteira",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setSavedPortfolios(prev => 
      prev.map(portfolio => 
        portfolio.id === id ? { ...portfolio, name: newName } : portfolio
      )
    );

    if (selectedPortfolio?.id === id) {
      setSelectedPortfolio(prev => prev ? { ...prev, name: newName } : null);
    }

    toast({
      title: "Carteira renomeada",
      description: `A carteira foi renomeada para "${newName}"`,
      duration: 3000,
    });

    setPortfolioNameInput('');
  };

  const handleDeletePortfolio = (id: string) => {
    setPortfolioToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeletePortfolio = () => {
    if (portfolioToDelete) {
      setSavedPortfolios(prev => prev.filter(portfolio => portfolio.id !== portfolioToDelete));
      
      if (selectedPortfolio?.id === portfolioToDelete) {
        setSelectedPortfolio(null);
        setCurrentView('manage');
      }

      toast({
        title: "Carteira excluída",
        description: "A carteira foi removida com sucesso",
        duration: 3000,
      });

      setShowDeleteDialog(false);
      setPortfolioToDelete(null);
    }
  };

  const handleSelectPortfolio = (portfolio: SavedPortfolio) => {
    setSelectedPortfolio(portfolio);
    setCurrentView('detail');
  };

  const handleBackToList = () => {
    setCurrentView('manage');
    setSelectedPortfolio(null);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'BAIXO':
        return 'bg-emerald-500';
      case 'MÉDIO':
        return 'bg-blue-500';
      case 'ALTO':
        return 'bg-rose-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskGlow = (risk: string) => {
    switch (risk) {
      case 'BAIXO':
        return 'shadow-emerald-500/50';
      case 'MÉDIO':
        return 'shadow-blue-500/50';
      case 'ALTO':
        return 'shadow-rose-500/50';
      default:
        return 'shadow-gray-500/50';
    }
  };

  const getStepProgress = () => ((step / 3) * 100);

  // Efeito para simular atualização de dados em tempo real
  useEffect(() => {
    const fetchRealTimeData = async () => {
      try {
        const btcPrice = 65000; // Exemplo de preço do Bitcoin
        const btc24hChange = 2.5;
        const ethPrice = 3500;
        const eth24hChange = 1.8;
        const circulatingSupply = 19600000; // Aproximadamente o supply atual do Bitcoin
        const globalMarketCap = Number(btcPrice) * circulatingSupply;

        setRealTimeData({
          btcPrice,
          btc24hChange,
          ethPrice,
          eth24hChange,
          globalMarketCap
        });
      } catch (error) {
        console.error('Erro ao buscar dados em tempo real:', error);
      }
    };

    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Efeito para buscar dados reais para o ticker
  useEffect(() => {
    const fetchRealTickerData = async () => {
      try {
        const updatedAssets: TickerAsset[] = [];
        
        // Buscar dados de criptomoedas da CoinGecko
        try {
          const cryptoResponse = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,solana,cardano&sparkline=false&price_change_percentage=24h');
          const cryptoData = await cryptoResponse.json();
          
          if (Array.isArray(cryptoData)) {
            const cryptoMap: {[key: string]: string} = {
              'bitcoin': 'BTC',
              'ethereum': 'ETH',
              'binancecoin': 'BNB',
              'solana': 'SOL',
              'cardano': 'ADA'
            };
            
            cryptoData.forEach(crypto => {
              const symbol = cryptoMap[crypto.id];
              if (symbol) {
                updatedAssets.push({
                  symbol,
                  price: crypto.current_price,
                  change: crypto.price_change_percentage_24h,
                  isCrypto: true
                });
              }
            });
          }
        } catch (error) {
          console.error('Erro ao buscar dados de criptomoedas:', error);
        }
        
        // Buscar dados de ações brasileiras da brapi
        try {
          const brStocksString = BR_STOCKS.join(',');
          const brStocksResponse = await fetch(`https://brapi.dev/api/quote/${brStocksString}?range=1d&interval=1d`);
          const brStocksData = await brStocksResponse.json();
          
          if (brStocksData && brStocksData.results) {
            brStocksData.results.forEach((stock: any) => {
              updatedAssets.push({
                symbol: stock.symbol,
                price: stock.regularMarketPrice,
                change: stock.regularMarketChangePercent,
              });
            });
          }
        } catch (error) {
          console.error('Erro ao buscar dados de ações brasileiras:', error);
        }
        
        // Buscar dados de índices da brapi
        try {
          const indicesString = '^BVSP,^GSPC,^IXIC,^DJI';
          const indicesResponse = await fetch(`https://brapi.dev/api/quote/${indicesString}?range=1d&interval=1d`);
          const indicesData = await indicesResponse.json();
          
          if (indicesData && indicesData.results) {
            const indicesMap: {[key: string]: string} = {
              '^BVSP': 'IBOV',
              '^GSPC': 'S&P500',
              '^IXIC': 'NASDAQ',
              '^DJI': 'DJIA'
            };
            
            indicesData.results.forEach((index: any) => {
              const displaySymbol = indicesMap[index.symbol] || index.symbol;
              updatedAssets.push({
                symbol: displaySymbol,
                price: index.regularMarketPrice,
                change: index.regularMarketChangePercent,
                isIndex: true
              });
            });
          }
        } catch (error) {
          console.error('Erro ao buscar dados de índices:', error);
        }
        
        // Buscar dados de moedas da brapi
        try {
          const currenciesString = 'USD-BRL,EUR-BRL';
          const currenciesResponse = await fetch(`https://brapi.dev/api/v2/currency/?currency=${currenciesString}`);
          const currenciesData = await currenciesResponse.json();
          
          if (currenciesData && currenciesData.currencies) {
            const currenciesMap: {[key: string]: string} = {
              'USD-BRL': 'USD',
              'EUR-BRL': 'EURO'
            };
            
            Object.keys(currenciesData.currencies).forEach(key => {
              const currency = currenciesData.currencies[key];
              const displaySymbol = currenciesMap[key] || key;
              updatedAssets.push({
                symbol: displaySymbol,
                price: currency.bidPrice,
                change: currency.pctChange,
                isCurrency: true
              });
            });
          }
        } catch (error) {
          console.error('Erro ao buscar dados de moedas:', error);
        }
        
        // Se alguma categoria falhar completamente, mantenha os dados anteriores
        const categories = ['isCrypto', 'isIndex', 'isCurrency'];
        const existingByCategory = categories.map(category => 
          tickerAssets.filter(asset => asset[category as keyof TickerAsset])
        );
        
        const newByCategory = categories.map(category => 
          updatedAssets.filter(asset => asset[category as keyof TickerAsset])
        );
        
        // Para cada categoria, se não houver novos dados, use os existentes
        for (let i = 0; i < categories.length; i++) {
          if (newByCategory[i].length === 0 && existingByCategory[i].length > 0) {
            updatedAssets.push(...existingByCategory[i]);
          }
        }
        
        // Para ações brasileiras (sem categoria específica)
        const existingBrStocks = tickerAssets.filter(asset => 
          !asset.isCrypto && !asset.isIndex && !asset.isCurrency && isBrazilianStock(asset.symbol)
        );
        
        const newBrStocks = updatedAssets.filter(asset => 
          !asset.isCrypto && !asset.isIndex && !asset.isCurrency && isBrazilianStock(asset.symbol)
        );
        
        if (newBrStocks.length === 0 && existingBrStocks.length > 0) {
          updatedAssets.push(...existingBrStocks);
        }
        
        // Atualizar o estado apenas se houver dados novos
        if (updatedAssets.length > 0) {
          setTickerAssets(updatedAssets);
        }
      } catch (error) {
        console.error('Erro ao buscar dados para o ticker:', error);
      }
    };

    fetchRealTickerData();
    const interval = setInterval(fetchRealTickerData, 30000); // Atualiza a cada 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
    <Layout>
        <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
          <div className="container px-4 py-8 mx-auto pb-16">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-foreground/80">
                Portfólio
              </h1>
              <div className="flex space-x-2">
                <Button 
                  variant={currentView === 'generate' ? "default" : "outline"} 
                  onClick={() => setCurrentView('generate')}
                  className="flex items-center"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Gerar Carteira
                </Button>
                <Button 
                  variant={currentView === 'manage' || currentView === 'detail' ? "default" : "outline"} 
                  onClick={() => setCurrentView('manage')}
                  className="flex items-center"
                >
                  <Folder className="w-4 h-4 mr-2" />
                  Gerenciar Carteiras
                </Button>
              </div>
        </div>

            <AnimatePresence mode="wait">
              {currentView === 'generate' && (
                <motion.div
                  key="generate"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Tabs defaultValue="gerar" className="w-full">
                    <TabsList className="grid w-full grid-cols-1">
                      <TabsTrigger value="gerar" className="text-lg">Gerar Nova Carteira</TabsTrigger>
                    </TabsList>
                    <TabsContent value="gerar" className="pt-6">
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-lg font-medium">Passo {step} de 3</div>
                          <div className="text-sm text-muted-foreground">
                            {step === 1 ? 'Perfil e Parâmetros Básicos' : 
                             step === 2 ? 'Alocação e Configurações Avançadas' : 
                             'Resumo e Confirmação'}
                          </div>
                        </div>
                        <Progress value={getStepProgress()} className="h-2 transition-all duration-500" />
                      </div>

                      {step === 1 && (
                        <div className="space-y-8">
          <Card>
            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Shield className="w-5 h-5 mr-2 text-primary" />
                                Perfil de Risco
                              </CardTitle>
              <CardDescription>
                                Selecione seu perfil de risco para investimentos
              </CardDescription>
            </CardHeader>
            <CardContent>
                              <div className="relative">
                                <div className="absolute top-0 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                              </div>
                  <RadioGroup
                                defaultValue={formData.riskLevel} 
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                onValueChange={(value) => setFormData(prev => ({ ...prev, riskLevel: value as 'BAIXO' | 'MÉDIO' | 'ALTO' }))}
                              >
                                {[
                                  { 
                                    value: 'BAIXO', 
                                    label: 'Conservador', 
                                    description: 'Menor risco, retornos mais estáveis', 
                                    icon: <TrendingDownIcon className="w-5 h-5 text-emerald-500" />,
                                    details: 'Foco em renda fixa e ativos de baixa volatilidade',
                                    color: 'emerald'
                                  },
                                  { 
                                    value: 'MÉDIO', 
                                    label: 'Moderado', 
                                    description: 'Equilíbrio entre risco e retorno', 
                                    icon: <TrendingUpIcon className="w-5 h-5 text-blue-500" />,
                                    details: 'Mix diversificado entre renda fixa e variável',
                                    color: 'blue'
                                  },
                                  { 
                                    value: 'ALTO', 
                                    label: 'Arrojado', 
                                    description: 'Maior risco, potencial de maiores retornos', 
                                    icon: <ArrowUpIcon className="w-5 h-5 text-rose-500" />,
                                    details: 'Foco em renda variável e ativos de maior volatilidade',
                                    color: 'rose'
                                  }
                    ].map((option) => (
                                  <motion.div
                        key={option.value}
                        className={cn(
                                      "relative p-6 border-2 rounded-xl cursor-pointer transition-all",
                          formData.riskLevel === option.value
                                        ? `border-${option.color}-500 bg-${option.color}-500/5 shadow-lg ${getRiskGlow(option.value)}`
                            : "border-muted hover:border-primary/50"
                        )}
                                    onClick={() => setFormData(prev => ({ ...prev, riskLevel: option.value as 'BAIXO' | 'MÉDIO' | 'ALTO' }))}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    animate={{
                                      scale: formData.riskLevel === option.value ? 1.02 : 1,
                                      transition: { type: "spring", stiffness: 300, damping: 15 }
                                    }}
                                  >
                                    <RadioGroupItem 
                                      value={option.value} 
                                      id={`risk-${option.value}`} 
                                      className="sr-only"
                                    />
                                    <motion.div 
                                      className="space-y-2"
                                      initial={false}
                                      animate={{
                                        opacity: formData.riskLevel === option.value ? 1 : 0.7
                                      }}
                                    >
                                      <div className="flex items-center">
                                        {option.icon}
                                        <span className="ml-2 text-lg font-semibold">
                                          {option.label}
                                        </span>
                        </div>
                                      <p className="text-sm text-muted-foreground">{option.description}</p>
                                      <motion.div 
                                        className={cn(
                                          "mt-2 p-2 rounded-lg text-xs",
                                          `bg-${option.color}-500/10 text-${option.color}-500`
                                        )}
                                        initial={false}
                                        animate={{
                                          scale: formData.riskLevel === option.value ? 1.05 : 1,
                                          opacity: formData.riskLevel === option.value ? 1 : 0.8
                                        }}
                                      >
                                        {option.details}
                                      </motion.div>
                                    </motion.div>
                                    {formData.riskLevel === option.value && (
                                      <motion.div
                                        className={cn(
                                          "absolute -inset-px rounded-xl border-2",
                                          `border-${option.color}-500/50`
                                        )}
                                        initial={{ opacity: 0, scale: 1.1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.2 }}
                                      />
                                    )}
                                  </motion.div>
                    ))}
                  </RadioGroup>
                            </CardContent>
                          </Card>

                          <div className="space-y-6">
                            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16" />
                              <CardHeader>
                                <CardTitle className="flex items-center text-xl">
                                  <Target className="w-5 h-5 mr-2 text-primary" />
                                  Objetivos de Investimento
                                </CardTitle>
                                <CardDescription>
                                  Defina suas metas e parâmetros financeiros
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-6">
                                <div className="space-y-4">
                                  <Label className="text-base">Objetivo Principal</Label>
                                  <div className="relative">
                                    <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Ex: Aposentadoria, Compra de imóvel, Reserva de emergência"
                                      value={formData.investmentGoal}
                                      onChange={(e) => setFormData(prev => ({ ...prev, investmentGoal: e.target.value }))}
                                      className="pl-10"
                                    />
                                  </div>
                </div>

                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-base">Valor Inicial</Label>
                                    <span className="text-sm text-muted-foreground">
                                      Mínimo: R$ 1.000
                                    </span>
                                  </div>
                                  <div className="relative">
                                    <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={formData.initialAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, initialAmount: Number(e.target.value) }))}
                    min="1000"
                    step="1000"
                                      className="pl-10 text-lg"
                  />
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Valor atual:</span>
                                    <span className="font-medium">R$ {formData.initialAmount.toLocaleString()}</span>
                                  </div>
                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-base">Prazo do Investimento</Label>
                                    <span className="text-sm font-medium">
                                      {formData.investmentTerm} {formData.investmentTerm === 1 ? 'ano' : 'anos'}
                                    </span>
                                  </div>
                                  <div className="relative pt-2">
                                    <Slider
                                      value={[formData.investmentTerm]}
                                      onValueChange={([value]) => setFormData(prev => ({ ...prev, investmentTerm: value }))}
                                      max={30}
                                      min={1}
                                      step={1}
                                      className="my-4"
                                    />
                                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                                      <span>Curto prazo</span>
                                      <span>Médio prazo</span>
                                      <span>Longo prazo</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-sm bg-primary/5 p-2 rounded-lg">
                                    <span className="text-muted-foreground">Meta para:</span>
                                    <span className="font-medium">{new Date().getFullYear() + formData.investmentTerm}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="flex justify-end mt-8">
                            <Button 
                              onClick={() => setStep(2)} 
                              size="lg" 
                              className="w-32"
                            >
                              Continuar
                              <ArrowUpIcon className="w-4 h-4 ml-2 rotate-90" />
                </Button>
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <PieChartIcon className="w-4 h-4 mr-2" />
                                Alocação de Ativos
                              </CardTitle>
                              <CardDescription>
                                Configure a distribuição entre classes de ativos
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <Label>Alocação em Criptomoedas (%)</Label>
                                  <div className="space-y-2">
                                    <Slider
                                      value={[formData.cryptoAllocation]}
                                      onValueChange={([value]) => setFormData(prev => ({ ...prev, cryptoAllocation: value }))}
                                      max={100}
                                      step={5}
                                    />
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>{formData.cryptoAllocation}%</span>
                                      <span>{100 - formData.cryptoAllocation}% outros ativos</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <Label>Alocação em Ações (%)</Label>
                                  <div className="space-y-2">
                                    <Slider
                                      value={[formData.stocksAllocation]}
                                      onValueChange={([value]) => setFormData(prev => ({ ...prev, stocksAllocation: value }))}
                                      max={100}
                                      step={5}
                                    />
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>{formData.stocksAllocation}%</span>
                                      <span>{100 - formData.stocksAllocation}% outros ativos</span>
                                    </div>
                                  </div>
                                </div>
                </div>

                              <div className="p-4 rounded-lg bg-background/50">
                                <h4 className="font-medium mb-2">Distribuição Sugerida</h4>
                                <div className="h-[200px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={[
                                          { name: 'Criptomoedas', value: formData.cryptoAllocation },
                                          { name: 'Ações', value: formData.stocksAllocation },
                                          { name: 'Outros', value: 100 - formData.cryptoAllocation - formData.stocksAllocation }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                      >
                                        {COLORS.map((color, index) => (
                                          <Cell key={`cell-${index}`} fill={color} />
                                        ))}
                                      </Pie>
                                      <Tooltip />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
            </CardContent>
          </Card>

                          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
              <CardHeader>
                              <CardTitle className="flex items-center">
                                <SettingsIcon className="w-4 h-4 mr-2" />
                                Configurações Avançadas
                </CardTitle>
                <CardDescription>
                                Ajuste as configurações detalhadas da carteira
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                                <div className="space-y-4">
                                  <Label>Frequência de Rebalanceamento</Label>
                                  <RadioGroup
                                    value={formData.rebalanceFrequency}
                                    onValueChange={(value: 'DIÁRIO' | 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL') => 
                                      setFormData(prev => ({ ...prev, rebalanceFrequency: value }))}
                                    className="grid grid-cols-2 gap-4"
                                  >
                                    {[
                                      { value: 'DIÁRIO', label: 'Diário' },
                                      { value: 'SEMANAL', label: 'Semanal' },
                                      { value: 'MENSAL', label: 'Mensal' },
                                      { value: 'TRIMESTRAL', label: 'Trimestral' }
                                    ].map((option) => (
                                      <motion.div
                                        key={option.value}
                                        className={cn(
                                          "flex items-center p-4 border rounded-lg cursor-pointer transition-colors",
                                          formData.rebalanceFrequency === option.value
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-primary/50"
                                        )}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        animate={{
                                          scale: formData.rebalanceFrequency === option.value ? 1.02 : 1,
                                          transition: { type: "spring", stiffness: 300, damping: 15 }
                                        }}
                                      >
                                        <RadioGroupItem value={option.value} id={`rebalance-${option.value}`} />
                                        <Label htmlFor={`rebalance-${option.value}`} className="ml-2">
                                          {option.label}
                                        </Label>
                                        {formData.rebalanceFrequency === option.value && (
                                          <motion.div
                                            className="ml-auto text-primary"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                          </motion.div>
                                        )}
                                      </motion.div>
                                    ))}
                                  </RadioGroup>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="reinvestDividends"
                                    checked={formData.reinvestDividends}
                                    onCheckedChange={(checked) => 
                                      setFormData(prev => ({ ...prev, reinvestDividends: checked as boolean }))}
                                  />
                                  <label
                                    htmlFor="reinvestDividends"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    Reinvestir dividendos automaticamente
                                  </label>
                                </div>

                                <div className="space-y-4">
                                  <Label>Ativos Preferenciais</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {['BTC', 'ETH', 'PETR4', 'VALE3', 'WEGE3'].map((asset) => (
                                      <Badge
                                        key={asset}
                                        variant="outline"
                                        className={cn(
                                          "cursor-pointer transition-colors",
                                          formData.preferredAssets.includes(asset)
                                            ? "bg-primary/20 border-primary"
                                            : "hover:border-primary"
                                        )}
                                        onClick={() => {
                                          setFormData(prev => ({
                                            ...prev,
                                            preferredAssets: prev.preferredAssets.includes(asset)
                                              ? prev.preferredAssets.filter(a => a !== asset)
                                              : [...prev.preferredAssets, asset]
                                          }));
                                        }}
                                      >
                                        <motion.div
                                          initial={false}
                                          animate={{
                                            scale: formData.preferredAssets.includes(asset) ? 1.1 : 1,
                                            transition: { type: "spring", stiffness: 500, damping: 15 }
                                          }}
                                        >
                                          {asset}
                                        </motion.div>
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Selecione os ativos que você tem preferência para incluir na carteira
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}

                      {step === 2 && (
                        <div className="flex justify-between mt-8">
                          <Button 
                            onClick={() => setStep(1)} 
                            variant="outline"
                            size="lg" 
                            className="w-32"
                          >
                            <ArrowUpIcon className="w-4 h-4 mr-2 -rotate-90" />
                            Voltar
                          </Button>
                          <Button 
                            onClick={() => setStep(3)} 
                            size="lg" 
                            className="w-32"
                          >
                            Continuar
                            <ArrowUpIcon className="w-4 h-4 ml-2 rotate-90" />
                          </Button>
                        </div>
                      )}

                      {step === 3 && (
                        <motion.div
                          key="step3"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                            <CardHeader>
                              <CardTitle>Resumo da Configuração</CardTitle>
                              <CardDescription>
                                Revise as configurações antes de gerar sua carteira
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div>
                                    <h3 className="font-medium mb-2">Perfil e Objetivos</h3>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Perfil de Risco</span>
                                        <Badge variant="outline" className={getRiskColor(formData.riskLevel)}>
                                          {formData.riskLevel}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Objetivo</span>
                                        <span>{formData.investmentGoal || 'Não definido'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Prazo</span>
                                        <span>{formData.investmentTerm} anos</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h3 className="font-medium mb-2">Parâmetros Financeiros</h3>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Valor Inicial</span>
                                        <span>R$ {formData.initialAmount.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Drawdown Máximo</span>
                                        <span>{formData.maxDrawdown}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <h3 className="font-medium mb-2">Alocação</h3>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Criptomoedas</span>
                                        <span>{formData.cryptoAllocation}%</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Ações</span>
                                        <span>{formData.stocksAllocation}%</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Outros</span>
                                        <span>{100 - formData.cryptoAllocation - formData.stocksAllocation}%</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h3 className="font-medium mb-2">Configurações Avançadas</h3>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Rebalanceamento</span>
                                        <span>{formData.rebalanceFrequency}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Reinvestir Dividendos</span>
                                        <span>{formData.reinvestDividends ? 'Sim' : 'Não'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Ativos Preferenciais</span>
                                        <div className="flex gap-1">
                                          {formData.preferredAssets.map((asset) => (
                                            <Badge key={asset} variant="outline" className="text-xs">
                                              {asset}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                        </motion.div>
                      )}

                      {step === 3 && (
                        <div className="flex justify-between mt-8">
                          <Button 
                            onClick={() => setStep(2)} 
                            variant="outline"
                            size="lg" 
                            className="w-32"
                          >
                            <ArrowUpIcon className="w-4 h-4 mr-2 -rotate-90" />
                            Voltar
                          </Button>
                          <Button 
                            onClick={handleGeneratePortfolio} 
                            size="lg" 
                            className="w-48 bg-primary"
                            disabled={loading}
                          >
                            {loading ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="mr-2"
                              >
                                <Sparkles className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            {loading ? "Gerando..." : "Gerar Carteira"}
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}

              {currentView === 'manage' && (
                <motion.div
                  key="manage"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                    <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Folder className="w-5 h-5 mr-2 text-primary" />
                        Carteiras Salvas
                      </CardTitle>
                      <CardDescription>
                        Gerencie suas carteiras de investimento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {savedPortfolios.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                          <FolderX className="w-12 h-12 mb-3 text-muted-foreground" />
                          <h3 className="mb-1 text-lg font-medium">Nenhuma carteira encontrada</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Você ainda não possui carteiras salvas. Gere uma nova carteira para começar.
                          </p>
                          <Button 
                            onClick={() => setCurrentView('generate')}
                            className="flex items-center"
                          >
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Gerar Nova Carteira
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {savedPortfolios.map((portfolio) => (
                            <motion.div
                              key={portfolio.id}
                              whileHover={{ scale: 1.01 }}
                              className="p-4 border rounded-lg transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
                            >
                        <div className="flex items-center justify-between">
                                <div 
                                  className="flex-1 flex items-center" 
                                  onClick={() => handleSelectPortfolio(portfolio)}
                                >
                                  <div className={`w-3 h-3 rounded-full mr-3 ${getRiskColor(portfolio.riskLevel)}`} />
                                  <div className="flex-1">
                                    <h3 className="font-medium">{portfolio.name}</h3>
                                    <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground mt-1">
                                      <span className="flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" /> 
                                        {new Date(portfolio.dateCreated).toLocaleDateString('pt-BR')}
                                      </span>
                                      <span className="flex items-center">
                                        <DollarSignIcon className="w-3 h-3 mr-1" /> 
                                        {portfolio.initialAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                      <span className="flex items-center">
                                        <PieChartIcon className="w-3 h-3 mr-1" /> 
                                        {portfolio.assets.length} ativos
                                      </span>
                          </div>
                        </div>
                                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                                
                                <div className="ml-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Renomear
                                          </DropdownMenuItem>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Renomear Carteira</DialogTitle>
                                            <DialogDescription>
                                              Digite um novo nome para sua carteira.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="py-4">
                                            <Input
                                              id="portfolio-name"
                                              placeholder="Nome da carteira"
                                              defaultValue={portfolio.name}
                                              onChange={(e) => setPortfolioNameInput(e.target.value)}
                                              className="mb-4"
                                            />
                                          </div>
                                          <DialogFooter>
                                            <Button type="submit" onClick={() => handleRenamePortfolio(portfolio.id, portfolioNameInput || portfolio.name)}>
                                              Salvar
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                      <DropdownMenuItem onClick={() => handleDeletePortfolio(portfolio.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                      </CardContent>
                    </Card>
                </motion.div>
              )}

              {currentView === 'detail' && selectedPortfolio && (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleBackToList}
                      className="text-sm"
                    >
                      <ArrowUpIcon className="w-4 h-4 mr-1 -rotate-90" />
                      Voltar
                    </Button>
                    <h2 className="text-xl font-medium">
                      {selectedPortfolio.name}
                    </h2>
                    <div className={`px-2 py-1 text-xs rounded-full ${getRiskColor(selectedPortfolio.riskLevel)} bg-opacity-20 text-${selectedPortfolio.riskLevel === 'BAIXO' ? 'emerald' : selectedPortfolio.riskLevel === 'MÉDIO' ? 'blue' : 'rose'}-700`}>
                      {selectedPortfolio.riskLevel === 'BAIXO' ? 'Conservador' : 
                       selectedPortfolio.riskLevel === 'MÉDIO' ? 'Moderado' : 'Arrojado'}
                    </div>
                  </div>

                  <Tabs defaultValue="visao-geral" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
                      <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
                      <TabsTrigger value="ativos">Ativos</TabsTrigger>
                      <TabsTrigger value="performance">Performance</TabsTrigger>
                    </TabsList>

                    <TabsContent value="visao-geral" className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center text-lg">
                                <DollarSignIcon className="h-4 w-4 mr-2 text-primary" />
                                Valor Total
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-primary">
                                  R$ {selectedPortfolio.totalValue.toLocaleString()}
                                </span>
                                <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-500">
                                  +5.2%
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Desde o início
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center text-lg">
                                <BarChartIcon className="h-4 w-4 mr-2 text-primary" />
                                Ativos
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-primary">
                                  {selectedPortfolio.assets.length}
                                </span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  tipos diferentes
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Diversificação ideal
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center text-lg">
                                <PercentIcon className="h-4 w-4 mr-2 text-primary" />
                                Retorno 24h
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-emerald-500">
                                  +2.5%
                                </span>
                                <span className="text-sm text-emerald-500/80 ml-2">
                                  ↑ R$ 387,25
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Últimas 24 horas
                              </p>
                      </CardContent>
                    </Card>
                        </motion.div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <PieChartIcon className="h-4 w-4 mr-2" />
                              Alocação de Ativos
                            </CardTitle>
                            <CardDescription>
                              Distribuição atual do portfólio
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={selectedPortfolio.allocation}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={120}
                                    innerRadius={60}
                                    fill="#8884d8"
                                    dataKey="value"
                                    paddingAngle={2}
                                  >
                                    {selectedPortfolio.allocation.map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]}
                                        strokeWidth={2}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    content={({ payload }) => {
                                      if (payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-background/95 p-2 rounded-lg border shadow-lg">
                                            <p className="font-medium">{data.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                              R$ {data.value.toLocaleString()}
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              {selectedPortfolio.allocation.map((item, index) => (
                                <div key={item.name} className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {((item.value / selectedPortfolio.totalValue) * 100).toFixed(1)}%
                                    </p>
                          </div>
                        </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <TrendingUpIcon className="h-4 w-4 mr-2" />
                              Performance Histórica
                            </CardTitle>
                            <CardDescription>
                              Evolução do patrimônio total
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={selectedPortfolio.performance}>
                                  <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#666"
                                    tick={{ fill: '#666' }}
                                  />
                                  <YAxis 
                                    stroke="#666"
                                    tick={{ fill: '#666' }}
                                    tickFormatter={(value) => `R$ ${value.toLocaleString()}`}
                                  />
                                  <Tooltip
                                    content={({ payload, label }) => {
                                      if (payload && payload.length) {
                                        return (
                                          <div className="bg-background/95 p-3 rounded-lg border shadow-lg">
                                            <p className="font-medium">{label}</p>
                                            <p className="text-sm text-primary mt-1">
                                              R$ {payload[0].value.toLocaleString()}
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorValue)"
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                  </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                              <Card className="bg-background/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Retorno Total</p>
                                    <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
                          </div>
                                  <p className="text-2xl font-bold text-emerald-500 mt-2">+12.5%</p>
                                  <p className="text-sm text-muted-foreground">+R$ 1.750,25</p>
                                </CardContent>
                              </Card>

                              <Card className="bg-background/50">
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Melhor Ativo</p>
                                    <TrendingUpIcon className="h-4 w-4 text-emerald-500" />
                        </div>
                                  <p className="text-2xl font-bold mt-2">BTC</p>
                                  <p className="text-sm text-emerald-500">+15.3%</p>
                      </CardContent>
                    </Card>

                              <Card className="bg-background/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Volatilidade</p>
                                    <PercentIcon className="h-4 w-4 text-blue-500" />
                          </div>
                                    <p className="text-2xl font-bold text-blue-500 mt-2">5.2%</p>
                                    <p className="text-sm text-muted-foreground">30 dias</p>
                                </CardContent>
                              </Card>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                    </TabsContent>

                    <TabsContent value="ativos">
                      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                        <CardHeader>
                    <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>Meus Ativos</CardTitle>
                              <CardDescription>
                                Detalhamento de todos os ativos da carteira
                              </CardDescription>
                    </div>
                            <Button variant="outline" size="sm">
                              Exportar
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {selectedPortfolio.assets.map((asset, index) => (
                              <motion.div
                                key={asset.symbol}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center justify-between p-4 rounded-lg bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors"
                              >
                                <div className="flex items-center space-x-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    asset.currentPrice > asset.averagePrice
                                      ? "bg-emerald-500/10"
                                      : "bg-rose-500/10"
                                  )}>
                                    {asset.currentPrice > asset.averagePrice ? (
                                      <TrendingUpIcon className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                      <TrendingDownIcon className="h-5 w-5 text-rose-500" />
                                    )}
                                  </div>
                        <div>
                                    <h3 className="font-bold flex items-center">
                                      {asset.symbol}
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {asset.type}
                                      </Badge>
                                    </h3>
                                    <div className="space-y-1">
                                      <p className="text-sm text-muted-foreground">
                                        Quantidade: {asset.quantity}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Preço Médio: R$ {asset.averagePrice.toLocaleString()}
                                      </p>
                          </div>
                          </div>
                        </div>
                        <div className="text-right">
                                  <p className="font-bold">
                                    R$ {(asset.quantity * asset.currentPrice).toLocaleString()}
                                  </p>
                                  <div className="flex items-center justify-end space-x-2">
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-xs",
                                        asset.currentPrice > asset.averagePrice
                                          ? "bg-emerald-500/10 text-emerald-500"
                                          : "bg-rose-500/10 text-rose-500"
                                      )}
                                    >
                                      {asset.currentPrice > asset.averagePrice ? "+" : ""}
                                      {((asset.currentPrice - asset.averagePrice) / asset.averagePrice * 100).toFixed(2)}%
                                    </Badge>
                                    <p className="text-sm text-muted-foreground">
                                      R$ {asset.currentPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>
                              </motion.div>
                    ))}
                  </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="performance">
                      <div className="grid gap-6">
                        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>Análise de Performance</CardTitle>
                                <CardDescription>
                                  Acompanhamento detalhado do desempenho
                                </CardDescription>
                </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">1M</Button>
                                <Button variant="outline" size="sm">3M</Button>
                                <Button variant="outline" size="sm" className="bg-primary/10">6M</Button>
                                <Button variant="outline" size="sm">1A</Button>
                                <Button variant="outline" size="sm">Tudo</Button>
                        </div>
                      </div>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[400px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={selectedPortfolio.performance}>
                                  <defs>
                                    <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#666"
                                    tick={{ fill: '#666' }}
                                  />
                                  <YAxis 
                                    stroke="#666"
                                    tick={{ fill: '#666' }}
                                    tickFormatter={(value) => `R$ ${value.toLocaleString()}`}
                                  />
                                  <Tooltip
                                    content={({ payload, label }) => {
                                      if (payload && payload.length) {
                                        const currentValue = Number(payload[0].value);
                                        const previousValue = Number(selectedPortfolio.performance[0].value);
                                        const percentChange = ((currentValue - previousValue) / previousValue * 100).toFixed(2);
                                        
                                        return (
                                          <div className="bg-background/95 p-3 rounded-lg border shadow-lg">
                                            <p className="font-medium">{label}</p>
                                            <p className="text-sm text-primary mt-1">
                                              R$ {currentValue.toLocaleString()}
                                            </p>
                                            <p className={cn(
                                              "text-xs mt-1",
                                              Number(percentChange) >= 0 ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                              {Number(percentChange) >= 0 ? "+" : ""}{percentChange}%
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorPerformance)"
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                  </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                              <Card className="bg-background/50">
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Retorno Total</p>
                                    <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
                                  </div>
                                  <p className="text-2xl font-bold text-emerald-500 mt-2">+12.5%</p>
                                  <p className="text-sm text-muted-foreground">+R$ 1.750,25</p>
              </CardContent>
            </Card>

                              <Card className="bg-background/50">
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Melhor Ativo</p>
                                    <TrendingUpIcon className="h-4 w-4 text-emerald-500" />
                                  </div>
                                  <p className="text-2xl font-bold mt-2">BTC</p>
                                  <p className="text-sm text-emerald-500">+15.3%</p>
                                </CardContent>
                              </Card>

                              <Card className="bg-background/50">
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Volatilidade</p>
                                    <PercentIcon className="h-4 w-4 text-blue-500" />
                                  </div>
                                    <p className="text-2xl font-bold text-blue-500 mt-2">5.2%</p>
                                    <p className="text-sm text-muted-foreground">30 dias</p>
                                </CardContent>
                              </Card>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>
    </Layout>
      
    {/* Usar o componente TickerFooter que renderiza através de Portal */}
    <TickerFooter tickerAssets={tickerAssets} />
    
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Carteira</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta carteira? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDeletePortfolio}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Toaster />
  </>
);
}


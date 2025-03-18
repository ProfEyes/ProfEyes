import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  BarChartIcon,
  SearchIcon,
  SlidersHorizontal,
  TrendingUpIcon,
  RefreshCw,
  Info
} from "lucide-react";
import Layout from "@/components/Layout";
import { getBrapiMultipleStockQuotes, getBrapiAvailableStocks, getBrapiMarketIndices, MarketIndex } from '@/services/brapiService';
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
import { Skeleton } from "@/components/ui/skeleton";

// Interface para o item de ação na lista
interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  sector?: string;
}

// Interface para os filtros
interface StockFilters {
  sector: string;
  minPrice: number;
  maxPrice: number;
  onlyPositive: boolean;
}

export default function Stocks() {
  // Estados
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<StockFilters>({
    sector: 'all',
    minPrice: 0,
    maxPrice: 1000,
    onlyPositive: false,
  });
  const [sectors, setSectors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [loadingIndices, setLoadingIndices] = useState(true);

  // Lista de ações mais populares para carregar inicialmente
  const popularStocks = [
    'PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 
    'WEGE3', 'BBAS3', 'RENT3', 'MGLU3', 'B3SA3'
  ];

  // Segundo lote de ações (carregadas após as principais)
  const secondaryStocks = [
    'EGIE3', 'RADL3', 'RAIL3', 'SUZB3', 'PRIO3'
  ];

  // Efeito para carregar dados iniciais
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setIsLoading(true);
        
        // Buscar cotações das ações populares
        toast({
          title: "Carregando dados",
          description: "Buscando dados das ações. Isso pode levar alguns segundos devido a limitações da API gratuita.",
        });

        // Iniciar o carregamento dos índices em paralelo
        fetchMarketIndices();

        const stockQuotes = await getBrapiMultipleStockQuotes(popularStocks);
        
        if (stockQuotes && stockQuotes.length > 0) {
          const formattedStocks: StockItem[] = stockQuotes.map(quote => ({
            symbol: quote.symbol,
            name: quote.shortName || quote.longName,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume,
            sector: getSectorForStock(quote.symbol)
          }));
          
          setStocks(formattedStocks);
          setFilteredStocks(formattedStocks);
          
          // Extrair setores únicos
          const uniqueSectors = [...new Set(formattedStocks
            .map(stock => stock.sector)
            .filter(sector => sector !== undefined))] as string[];
          
          setSectors(uniqueSectors);

          // Carregar o segundo lote de ações em background
          loadSecondaryStocks();
        }
      } catch (error) {
        console.error('Erro ao carregar dados das ações:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados das ações.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchInitialData();
  }, []);

  // Função para buscar dados dos índices de mercado
  const fetchMarketIndices = async () => {
    try {
      setLoadingIndices(true);
      const indices = await getBrapiMarketIndices();
      if (indices && indices.length > 0) {
        setMarketIndices(indices);
        console.log('Índices carregados:', indices);
      }
    } catch (error) {
      console.error('Erro ao carregar índices de mercado:', error);
    } finally {
      setLoadingIndices(false);
    }
  };

  // Função para carregar o segundo lote de ações sem bloquear a interface
  const loadSecondaryStocks = async () => {
    try {
      const secondaryQuotes = await getBrapiMultipleStockQuotes(secondaryStocks);
      
      if (secondaryQuotes && secondaryQuotes.length > 0) {
        const formattedSecondaryStocks: StockItem[] = secondaryQuotes.map(quote => ({
          symbol: quote.symbol,
          name: quote.shortName || quote.longName,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          volume: quote.regularMarketVolume,
          sector: getSectorForStock(quote.symbol)
        }));
        
        // Combinar com as ações já carregadas
        setStocks(prevStocks => {
          const newStocks = [...prevStocks, ...formattedSecondaryStocks];
          // Também atualizar os filtrados se não houver filtros ativos
          if (searchQuery === '' && filters.sector === 'all' && !filters.onlyPositive) {
            setFilteredStocks(newStocks);
          }
          return newStocks;
        });
        
        // Atualizar setores disponíveis
        const allSectors = [...stocks, ...formattedSecondaryStocks]
          .map(stock => stock.sector)
          .filter(sector => sector !== undefined) as string[];
        
        setSectors([...new Set(allSectors)]);
      }
    } catch (error) {
      console.error('Erro ao carregar ações secundárias:', error);
    }
  };

  // Efeito para filtrar ações com base na pesquisa e filtros
  useEffect(() => {
    if (stocks.length === 0) return;
    
    let results = [...stocks];
    
    // Aplicar pesquisa
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(stock => 
        stock.symbol.toLowerCase().includes(query) || 
        stock.name.toLowerCase().includes(query)
      );
    }
    
    // Aplicar filtros
    if (filters.sector !== 'all') {
      results = results.filter(stock => stock.sector === filters.sector);
    }
    
    results = results.filter(stock => 
      stock.price >= filters.minPrice && 
      stock.price <= filters.maxPrice
    );
    
    if (filters.onlyPositive) {
      results = results.filter(stock => stock.change > 0);
    }
    
    // Aplicar seleção de aba
    if (activeTab === 'gainers') {
      results = results.filter(stock => stock.change > 0)
        .sort((a, b) => b.changePercent - a.changePercent);
    } else if (activeTab === 'losers') {
      results = results.filter(stock => stock.change < 0)
        .sort((a, b) => a.changePercent - b.changePercent);
    } else if (activeTab === 'volume') {
      results = results.sort((a, b) => b.volume - a.volume);
    }
    
    setFilteredStocks(results);
  }, [stocks, searchQuery, filters, activeTab]);

  // Função para atualizar dados
  const refreshData = async () => {
    try {
      setRefreshing(true);
      
      // Atualizar índices de mercado
      fetchMarketIndices();
      
      if (stocks.length > 0) {
        const symbols = stocks.map(stock => stock.symbol);
        const updatedQuotes = await getBrapiMultipleStockQuotes(symbols);
        
        if (updatedQuotes && updatedQuotes.length > 0) {
          const updatedStocks: StockItem[] = updatedQuotes.map(quote => ({
            symbol: quote.symbol,
            name: quote.shortName || quote.longName,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume,
            sector: getSectorForStock(quote.symbol)
          }));
          
          setStocks(updatedStocks);
          toast({
            title: "Dados atualizados",
            description: "As cotações foram atualizadas com sucesso.",
          });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados das ações.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Função auxiliar para obter o setor de uma ação (simulado)
  const getSectorForStock = (symbol: string): string => {
    const sectorMap: Record<string, string> = {
      'PETR4': 'Petróleo e Gás',
      'VALE3': 'Mineração',
      'ITUB4': 'Financeiro',
      'BBDC4': 'Financeiro',
      'ABEV3': 'Bebidas',
      'WEGE3': 'Industrial',
      'BBAS3': 'Financeiro',
      'RENT3': 'Locação de Veículos',
      'MGLU3': 'Varejo',
      'B3SA3': 'Financeiro',
      'EGIE3': 'Energia',
      'RADL3': 'Saúde',
      'RAIL3': 'Logística',
      'SUZB3': 'Papel e Celulose',
      'PRIO3': 'Petróleo e Gás'
    };
    
    return sectorMap[symbol] || 'Outros';
  };

  // Função para obter um índice por nome
  const getIndexByName = (name: string): MarketIndex | undefined => {
    return marketIndices.find(index => index.name === name);
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatChange = (value: number): string => {
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatPercent = (value: number): string => {
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + '%';
  };

  const formatVolume = (value: number): string => {
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(2) + 'B';
    } else if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(2) + 'M';
    } else if (value >= 1_000) {
      return (value / 1_000).toFixed(2) + 'K';
    }
    return value.toString();
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Ações Brasileiras</h1>
            <p className="text-muted-foreground">
              Acompanhe as principais ações do mercado brasileiro
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground max-w-[280px]">
              Usando API gratuita com limitação de 1 ação por requisição. Carregamento pode ser lento.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={refreshing}
              className="relative"
            >
              <RefreshCw className={cn(
                "w-4 h-4 mr-2", 
                refreshing ? "animate-spin" : ""
              )} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-3/4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle>Cotações</CardTitle>
                  <div className="relative w-full md:w-64">
                    <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar ações..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 md:w-[400px]">
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="gainers">Em Alta</TabsTrigger>
                    <TabsTrigger value="losers">Em Baixa</TabsTrigger>
                    <TabsTrigger value="volume">Volume</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  // Esqueleto de carregamento
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="py-3 border-b flex items-center justify-between">
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  ))
                ) : filteredStocks.length === 0 ? (
                  <div className="py-8 text-center">
                    <Info className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-medium">Nenhuma ação encontrada</h3>
                    <p className="text-muted-foreground">
                      Tente ajustar seus filtros ou pesquisar por outro termo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredStocks.map((stock) => (
                      <motion.div
                        key={stock.symbol}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 rounded-md px-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stock.symbol}</span>
                            {stock.sector && (
                              <Badge variant="outline" className="text-xs">
                                {stock.sector}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {stock.name}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="font-semibold">
                            {formatCurrency(stock.price)}
                          </div>
                          <div className={cn(
                            "flex items-center text-sm",
                            stock.change > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {stock.change > 0 ? (
                              <ArrowUpIcon className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownIcon className="h-3 w-3 mr-1" />
                            )}
                            {formatChange(stock.change)} ({formatPercent(stock.changePercent)})
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Vol: {formatVolume(stock.volume)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="w-full md:w-1/4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Setor</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={filters.sector}
                    onChange={(e) => setFilters({...filters, sector: e.target.value})}
                  >
                    <option value="all">Todos os setores</option>
                    {sectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Faixa de Preço</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      placeholder="Min" 
                      value={filters.minPrice} 
                      onChange={(e) => setFilters({
                        ...filters, 
                        minPrice: Number(e.target.value)
                      })}
                    />
                    <span>-</span>
                    <Input 
                      type="number" 
                      placeholder="Max" 
                      value={filters.maxPrice} 
                      onChange={(e) => setFilters({
                        ...filters, 
                        maxPrice: Number(e.target.value)
                      })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="positiveOnly"
                    checked={filters.onlyPositive}
                    onChange={(e) => setFilters({
                      ...filters, 
                      onlyPositive: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <label 
                    htmlFor="positiveOnly"
                    className="text-sm font-medium"
                  >
                    Apenas ações em alta
                  </label>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setFilters({
                    sector: 'all',
                    minPrice: 0,
                    maxPrice: 1000,
                    onlyPositive: false
                  })}
                >
                  Limpar Filtros
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Índices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingIndices ? (
                  // Esqueleto de carregamento para os índices
                  <>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between">
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {/* IBOV */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">IBOV</span>
                        <span className="font-semibold">
                          {getIndexByName('IBOV') 
                            ? formatNumber(getIndexByName('IBOV')!.price)
                            : '...'}
                        </span>
                      </div>
                      <div className={cn(
                        "flex justify-between text-sm",
                        getIndexByName('IBOV') && getIndexByName('IBOV')!.changePercent > 0 
                          ? "text-green-600" 
                          : "text-red-600"
                      )}>
                        <span className="flex items-center">
                          {getIndexByName('IBOV') && getIndexByName('IBOV')!.changePercent > 0 ? (
                            <ArrowUpIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 mr-1" />
                          )}
                          Variação
                        </span>
                        <span>
                          {getIndexByName('IBOV') 
                            ? (getIndexByName('IBOV')!.changePercent > 0 ? '+' : '') + 
                              formatPercent(getIndexByName('IBOV')!.changePercent)
                            : '...'}
                        </span>
                      </div>
                    </div>

                    {/* SMALL */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">SMALL</span>
                        <span className="font-semibold">
                          {getIndexByName('SMALL') 
                            ? formatNumber(getIndexByName('SMALL')!.price)
                            : '...'}
                        </span>
                      </div>
                      <div className={cn(
                        "flex justify-between text-sm",
                        getIndexByName('SMALL') && getIndexByName('SMALL')!.changePercent > 0 
                          ? "text-green-600" 
                          : "text-red-600"
                      )}>
                        <span className="flex items-center">
                          {getIndexByName('SMALL') && getIndexByName('SMALL')!.changePercent > 0 ? (
                            <ArrowUpIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 mr-1" />
                          )}
                          Variação
                        </span>
                        <span>
                          {getIndexByName('SMALL') 
                            ? (getIndexByName('SMALL')!.changePercent > 0 ? '+' : '') + 
                              formatPercent(getIndexByName('SMALL')!.changePercent)
                            : '...'}
                        </span>
                      </div>
                    </div>

                    {/* IFIX */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">IFIX</span>
                        <span className="font-semibold">
                          {getIndexByName('IFIX') 
                            ? formatNumber(getIndexByName('IFIX')!.price)
                            : '...'}
                        </span>
                      </div>
                      <div className={cn(
                        "flex justify-between text-sm",
                        getIndexByName('IFIX') && getIndexByName('IFIX')!.changePercent > 0 
                          ? "text-green-600" 
                          : "text-red-600"
                      )}>
                        <span className="flex items-center">
                          {getIndexByName('IFIX') && getIndexByName('IFIX')!.changePercent > 0 ? (
                            <ArrowUpIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 mr-1" />
                          )}
                          Variação
                        </span>
                        <span>
                          {getIndexByName('IFIX') 
                            ? (getIndexByName('IFIX')!.changePercent > 0 ? '+' : '') + 
                              formatPercent(getIndexByName('IFIX')!.changePercent)
                            : '...'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Toaster />
      </div>
    </Layout>
  );
} 
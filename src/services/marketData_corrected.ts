import { supabase } from "@/integrations/supabase/client";
import { Howl } from 'howler';

// Definições de interfaces
export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
}

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export interface TradingSignal {
  id: number;
  pair: string;
  type: 'COMPRA' | 'VENDA';
  entry: string;
  target: string;
  stopLoss: string;
  timestamp: string;
  status: 'ATIVO' | 'CONCLUÍDO' | 'CANCELADO';
  successRate: number;
  timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO';
  score: number;
  riskRewardRatio?: number; // Relação risco/recompensa (opcional)
}

export interface InvestmentProfile {
  timeframe: 'CURTO' | 'MÉDIO' | 'LONGO';
  riskLevel: 'ALTO' | 'MODERADO' | 'BAIXO';
  amount: number;
}

export interface Portfolio {
  id: number;
  name: string;
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO';
  initialAmount: number;
  currentValue: number;
  assets: PortfolioAsset[];
  expectedReturn: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  type: 'AÇÃO' | 'CRIPTO';
  price: number;
  quantity: number;
  value: number;
  allocation: number; // Porcentagem
  change: number;
  changePercent: number;
}

export interface MarketNews {
  id: number;
  title: string;
  content: string;
  summary?: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  relatedSymbols: string[];
  sentiment: number;
}

// Textos corrigidos para notícias
const simulatedNewsTitles = [
  "Bitcoin atinge novo recorde histórico após aprovação de ETF",
  "Ethereum completa atualização importante e preço dispara",
  "Banco Central anuncia novas diretrizes para criptomoedas",
  "Grandes empresas adicionam Bitcoin ao balanço patrimonial",
  "Análise técnica aponta para alta do mercado de criptomoedas",
  "Regulamentação de criptomoedas avança em mercados emergentes",
  "Solana se recupera após queda e atrai novos investidores",
  "Cardano implementa contratos inteligentes e ganha destaque",
  "Binance anuncia expansão de serviços no Brasil",
  "Mercado de NFTs continua em crescimento apesar da volatilidade",
  "Polkadot atrai desenvolvedores com nova infraestrutura",
  "Avalanche se destaca como alternativa ao Ethereum",
  "Ripple avança em processo judicial e XRP valoriza",
  "DeFi atinge novo recorde de valor total bloqueado",
  "Investidores institucionais aumentam exposição a criptomoedas"
];

const simulatedNewsContents = [
  "O Bitcoin atingiu um novo recorde histórico após a aprovação de ETFs pela SEC, marcando um momento importante para a adoção institucional da criptomoeda. Analistas apontam que este movimento pode atrair bilhões em novos investimentos para o mercado.",
  "A rede Ethereum completou com sucesso uma atualização importante que promete reduzir taxas e aumentar a escalabilidade. O preço do ETH reagiu positivamente, com um aumento de mais de 15% nas últimas 24 horas.",
  "O Banco Central divulgou hoje novas diretrizes para a regulamentação de criptomoedas no país, estabelecendo regras mais claras para exchanges e investidores. A medida é vista como um passo importante para a adoção mainstream de ativos digitais.",
  "Diversas empresas de capital aberto anunciaram a adição de Bitcoin em seus balanços patrimoniais como estratégia de proteção contra a inflação. Esta tendência reforça o papel da criptomoeda como reserva de valor corporativa.",
  "Análises técnicas recentes apontam para uma possível alta sustentada no mercado de criptomoedas nos próximos meses. Indicadores como o RSI e MACD mostram sinais positivos para Bitcoin e principais altcoins.",
  "Países emergentes estão avançando rapidamente na regulamentação de criptomoedas, buscando equilibrar inovação e proteção ao consumidor. Especialistas acreditam que esta abordagem pode acelerar a adoção global.",
  "Após uma queda significativa, a Solana demonstra forte recuperação técnica e fundamentalista, atraindo novos investidores institucionais. O ecossistema continua se expandindo com novos projetos e aplicações.",
  "A implementação bem-sucedida de contratos inteligentes na rede Cardano marca um momento crucial para o projeto. Desenvolvedores já começam a migrar aplicações para a plataforma, atraídos por taxas menores e maior eficiência.",
  "A Binance anunciou hoje a expansão de seus serviços no Brasil, incluindo novas parcerias e produtos financeiros. A exchange busca consolidar sua posição no mercado latino-americano, um dos que mais cresce no mundo.",
  "Apesar da volatilidade recente, o mercado de NFTs continua em expansão, com volume de negociações crescente e novas plataformas surgindo. Artistas e marcas seguem explorando o potencial da tecnologia para engajamento e monetização."
];

function generateSimulatedNews(count: number): MarketNews[] {
  const news: MarketNews[] = [];
  
  for (let i = 0; i < count; i++) {
    const titleIndex = Math.floor(Math.random() * simulatedNewsTitles.length);
    const contentIndex = Math.floor(Math.random() * simulatedNewsContents.length);
    
    news.push({
      id: i + 1,
      title: simulatedNewsTitles[titleIndex],
      content: simulatedNewsContents[contentIndex],
      summary: simulatedNewsContents[contentIndex].substring(0, 100) + "...",
      source: ["CoinDesk", "Bloomberg", "Reuters", "Forbes", "CryptoBriefing"][Math.floor(Math.random() * 5)],
      url: "https://example.com/news/" + (i + 1),
      imageUrl: `https://source.unsplash.com/random/800x600?crypto&sig=${i}`,
      publishedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      relatedSymbols: ["BTC", "ETH", "BNB", "SOL", "ADA"].slice(0, Math.floor(Math.random() * 3) + 1),
      sentiment: Math.random() * 2 - 1 // Entre -1 e 1
    });
  }
  
  return news;
}

export async function fetchMarketNews(options: { limit?: number; symbols?: string[] } = {}): Promise<MarketNews[]> {
  try {
    console.log('Buscando notícias de mercado...');
    const limit = options.limit || 10;
    
    // Primeiro, verificar se temos notícias no Supabase
    let query = supabase
      .from('market_news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    
    // Filtrar por símbolos se fornecidos
    if (options.symbols && options.symbols.length > 0) {
      // Construir filtro para símbolos relacionados
      const symbolFilters = options.symbols.map(symbol => 
        `related_symbols.cs.{${symbol}}`
      ).join(',');
      
      query = query.or(symbolFilters);
    }
    
    const { data, error } = await query;
    
    // Se temos dados no Supabase, retornar
    if (data && data.length > 0 && !error) {
      return data.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        summary: item.summary,
        source: item.source,
        url: item.url,
        imageUrl: item.image_url,
        publishedAt: item.published_at,
        relatedSymbols: item.related_symbols,
        sentiment: item.sentiment
      }));
    }
    
    // Caso contrário, gerar notícias simuladas
    return generateSimulatedNews(limit);
    
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    // Em caso de erro, retornar notícias simuladas
    return generateSimulatedNews(options.limit || 10);
  }
}

// Função corrigida para gerar sinais simulados
export function generateSimulatedSignal(pair: string, type: 'COMPRA' | 'VENDA', successRate: number): TradingSignal {
  const currentPrice = Math.random() * 1000 + 100;
  const targetPercentage = type === 'COMPRA' ? Math.random() * 0.1 + 0.05 : -(Math.random() * 0.1 + 0.05);
  const stopPercentage = type === 'COMPRA' ? -(Math.random() * 0.05 + 0.02) : Math.random() * 0.05 + 0.02;
  
  const targetPrice = currentPrice * (1 + targetPercentage);
  const stopPrice = currentPrice * (1 + stopPercentage);
  
  return {
    id: Date.now(),
    pair,
    type,
    entry: currentPrice.toFixed(2),
    target: targetPrice.toFixed(2),
    stopLoss: stopPrice.toFixed(2),
    timestamp: new Date().toISOString(),
    status: 'ATIVO',
    successRate,
    timeframe: Math.random() > 0.5 ? 'CURTO' : 'MÉDIO',
    score: Math.floor(Math.random() * 100)
  };
}

// Função corrigida para buscar portfólio
export async function fetchPortfolio(options: { riskLevel: 'ALTO' | 'MÉDIO' | 'BAIXO', initialAmount: number }): Promise<Portfolio> {
  try {
    console.log(`Buscando portfólio com nível de risco ${options.riskLevel}...`);
    
    // Verificar se já temos um portfólio salvo no Supabase
    const { data: savedPortfolios, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('risk_level', options.riskLevel)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Erro ao buscar portfólio:', error);
      throw error;
    }
    
    // Se encontramos um portfólio salvo, retornar
    if (savedPortfolios && savedPortfolios.length > 0) {
      const savedPortfolio = savedPortfolios[0];
      
      // Buscar ativos do portfólio
      const { data: portfolioAssets, error: assetsError } = await supabase
        .from('portfolio_assets')
        .select('*')
        .eq('portfolio_id', savedPortfolio.id);
        
      if (assetsError) {
        console.error('Erro ao buscar ativos do portfólio:', assetsError);
        throw assetsError;
      }
      
      // Ajustar valores com base no valor inicial solicitado
      const ratio = options.initialAmount / savedPortfolio.initial_amount;
      
      // Transformar ativos para o formato da aplicação
      const assets: PortfolioAsset[] = portfolioAssets.map(asset => ({
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type as 'AÇÃO' | 'CRIPTO',
        price: asset.price,
        quantity: asset.quantity * ratio,
        value: asset.value * ratio,
        allocation: asset.allocation,
        change: asset.change,
        changePercent: asset.change_percent
      }));
      
      return {
        id: savedPortfolio.id,
        name: `Carteira ${options.riskLevel.charAt(0) + options.riskLevel.slice(1).toLowerCase()}`,
        riskLevel: options.riskLevel,
        initialAmount: options.initialAmount,
        currentValue: savedPortfolio.current_value * ratio,
        assets,
        expectedReturn: savedPortfolio.expected_return,
        createdAt: savedPortfolio.created_at,
        updatedAt: savedPortfolio.updated_at
      };
    }
    
    // Se não encontramos, gerar um portfólio simulado
    console.log('Portfólio não encontrado, gerando simulação...');
    
    // Definir alocação com base no nível de risco
    let stockAllocation = 0;
    let cryptoAllocation = 0;
    
    switch (options.riskLevel) {
      case 'BAIXO':
        stockAllocation = 0.8;
        cryptoAllocation = 0.2;
        break;
      case 'MÉDIO':
        stockAllocation = 0.6;
        cryptoAllocation = 0.4;
        break;
      case 'ALTO':
        stockAllocation = 0.3;
        cryptoAllocation = 0.7;
        break;
    }
    
    // Simular ativos de ações
    const stocks = [
      { symbol: 'PETR4', name: 'Petrobras' },
      { symbol: 'VALE3', name: 'Vale' },
      { symbol: 'ITUB4', name: 'Itaú Unibanco' },
      { symbol: 'BBDC4', name: 'Bradesco' },
      { symbol: 'ABEV3', name: 'Ambev' },
      { symbol: 'WEGE3', name: 'WEG' },
      { symbol: 'RENT3', name: 'Localiza' },
      { symbol: 'MGLU3', name: 'Magazine Luiza' },
      { symbol: 'BBAS3', name: 'Banco do Brasil' },
      { symbol: 'RADL3', name: 'Raia Drogasil' }
    ];
    
    // Selecionar algumas ações aleatoriamente
    const selectedStocks = [];
    const stockCount = Math.floor(Math.random() * 3) + 3; // 3 a 5 ações
    
    for (let i = 0; i < stockCount; i++) {
      const randomIndex = Math.floor(Math.random() * stocks.length);
      selectedStocks.push(stocks[randomIndex]);
      stocks.splice(randomIndex, 1);
    }
    
    // Simular ativos de criptomoedas
    const cryptos = [
      { symbol: 'BTCUSDT', name: 'Bitcoin' },
      { symbol: 'ETHUSDT', name: 'Ethereum' },
      { symbol: 'BNBUSDT', name: 'Binance Coin' },
      { symbol: 'ADAUSDT', name: 'Cardano' },
      { symbol: 'SOLUSDT', name: 'Solana' },
      { symbol: 'DOGEUSDT', name: 'Dogecoin' },
      { symbol: 'DOTUSDT', name: 'Polkadot' },
      { symbol: 'AVAXUSDT', name: 'Avalanche' },
      { symbol: 'MATICUSDT', name: 'Polygon' },
      { symbol: 'LINKUSDT', name: 'Chainlink' }
    ];
    
    // Selecionar algumas criptomoedas aleatoriamente
    const selectedCryptos = [];
    const cryptoCount = Math.floor(Math.random() * 3) + 2; // 2 a 4 criptomoedas
    
    for (let i = 0; i < cryptoCount; i++) {
      const randomIndex = Math.floor(Math.random() * cryptos.length);
      selectedCryptos.push(cryptos[randomIndex]);
      cryptos.splice(randomIndex, 1);
    }
    
    // Gerar ativos do portfólio
    const assets: PortfolioAsset[] = [];
    
    // Adicionar ações
    const stockAmount = options.initialAmount * stockAllocation;
    const stockWeights = Array(selectedStocks.length).fill(0).map(() => Math.random());
    const stockWeightSum = stockWeights.reduce((a, b) => a + b, 0);
    
    for (let i = 0; i < selectedStocks.length; i++) {
      const stock = selectedStocks[i];
      const allocation = (stockWeights[i] / stockWeightSum) * 100;
      const value = stockAmount * (stockWeights[i] / stockWeightSum);
      
      // Simular preço e quantidade
      let price = 0;
      try {
        // Buscar preço atual da ação
        const { data, error } = await supabase
          .from('stock_prices')
          .select('close')
          .eq('symbol', stock.symbol)
          .order('date', { ascending: false })
          .limit(1);
          
        if (data && data.length > 0) {
          price = data[0].close;
        } else {
          // Simular preço com base em dados reais de mercado
          price = Math.random() * 100 + 10; // Preço entre 10 e 110
        }
      } catch (error) {
        console.error(`Erro ao buscar preço para ${stock.symbol}:`, error);
        price = Math.random() * 100 + 10;
      }
      
      const quantity = value / price;
      
      assets.push({
        symbol: stock.symbol,
        name: stock.name,
        type: 'AÇÃO',
        price,
        quantity,
        value,
        allocation,
        change: (Math.random() * 10) - 5, // Entre -5% e +5%
        changePercent: (Math.random() * 10) - 5 // Entre -5% e +5%
      });
    }
    
    // Adicionar criptomoedas
    const cryptoAmount = options.initialAmount * cryptoAllocation;
    const cryptoWeights = Array(selectedCryptos.length).fill(0).map(() => Math.random());
    const cryptoWeightSum = cryptoWeights.reduce((a, b) => a + b, 0);
    
    for (let i = 0; i < selectedCryptos.length; i++) {
      const crypto = selectedCryptos[i];
      const allocation = (cryptoWeights[i] / cryptoWeightSum) * 100;
      const value = cryptoAmount * (cryptoWeights[i] / cryptoWeightSum);
      
      // Simular preço e quantidade
      let price = 0;
      try {
        // Buscar preço atual da criptomoeda
        const { data, error } = await supabase
          .from('crypto_prices')
          .select('close')
          .eq('symbol', crypto.symbol)
          .order('timestamp', { ascending: false })
          .limit(1);
          
        if (data && data.length > 0) {
          price = data[0].close;
        } else {
          // Simular preço com base em dados reais de mercado
          if (crypto.symbol === 'BTCUSDT') {
            price = Math.random() * 5000 + 25000; // BTC entre 25k e 30k
          } else if (crypto.symbol === 'ETHUSDT') {
            price = Math.random() * 500 + 1500; // ETH entre 1.5k e 2k
          } else {
            price = Math.random() * 100 + 1; // Outras entre 1 e 101
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar preço para ${crypto.symbol}:`, error);
        price = Math.random() * 100 + 1;
      }
      
      const quantity = value / price;
      
      assets.push({
        symbol: crypto.symbol,
        name: crypto.name,
        type: 'CRIPTO',
        price,
        quantity,
        value,
        allocation,
        change: (Math.random() * 20) - 10, // Entre -10% e +10%
        changePercent: (Math.random() * 20) - 10 // Entre -10% e +10%
      });
    }
    
    // Calcular retorno esperado com base no nível de risco
    let expectedReturn = 0;
    switch (options.riskLevel) {
      case 'BAIXO':
        expectedReturn = 8 + Math.random() * 4; // 8% a 12%
        break;
      case 'MÉDIO':
        expectedReturn = 12 + Math.random() * 6; // 12% a 18%
        break;
      case 'ALTO':
        expectedReturn = 18 + Math.random() * 12; // 18% a 30%
        break;
    }
    
    const portfolio: Portfolio = {
      id: Date.now(),
      name: `Carteira ${options.riskLevel.charAt(0) + options.riskLevel.slice(1).toLowerCase()}`,
      riskLevel: options.riskLevel,
      initialAmount: options.initialAmount,
      currentValue: options.initialAmount,
      assets,
      expectedReturn,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Salvar portfólio no Supabase para uso futuro
    try {
      const { data: insertedPortfolio, error: insertError } = await supabase
        .from('portfolios')
        .insert({
          name: portfolio.name,
          risk_level: portfolio.riskLevel,
          initial_amount: portfolio.initialAmount,
          current_value: portfolio.currentValue,
          expected_return: portfolio.expectedReturn,
          created_at: portfolio.createdAt,
          updated_at: portfolio.updatedAt
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Erro ao salvar portfólio:', insertError);
      } else if (insertedPortfolio) {
        // Salvar ativos do portfólio
        const assetsToInsert = portfolio.assets.map(asset => ({
          portfolio_id: insertedPortfolio.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          price: asset.price,
          quantity: asset.quantity,
          value: asset.value,
          allocation: asset.allocation,
          change: asset.change,
          change_percent: asset.changePercent
        }));
        
        const { error: assetsInsertError } = await supabase
          .from('portfolio_assets')
          .insert(assetsToInsert);
          
        if (assetsInsertError) {
          console.error('Erro ao salvar ativos do portfólio:', assetsInsertError);
        }
      }
    } catch (saveError) {
      console.error('Erro ao salvar portfólio no Supabase:', saveError);
    }
    
    return portfolio;
  } catch (error) {
    console.error('Erro ao gerar carteira:', error);
    throw new Error('Não foi possível gerar a carteira recomendada.');
  }
} 
import { supabase } from "@/lib/supabase";
import { MarketNews } from "./types";
import { API_KEYS } from "./apiKeys";

// Função para verificar se a notícia é relevante para mercado financeiro, business, guerras e economia
function isRelevantFinancialNews(item: Record<string, unknown>): boolean {
  const title = (item.headline || item.title || '').toLowerCase();
  const summary = (item.summary || item.description || '').toLowerCase();
  const text = `${title} ${summary}`;
  
  // Palavras-chave para mercado financeiro e business
  const financialKeywords = [
    'stock', 'market', 'trading', 'investment', 'investor', 'finance', 'financial',
    'economy', 'economic', 'gdp', 'inflation', 'recession', 'growth',
    'earnings', 'revenue', 'profit', 'loss', 'merger', 'acquisition',
    'ipo', 'dividend', 'portfolio', 'fund', 'etf', 'bond', 'yield',
    'cryptocurrency', 'bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'bnb', 'binance', 'solana', 'sol', 'cardano', 'ada', 'polkadot', 'dot', 'avalanche', 'avax', 'polygon', 'matic', 'chainlink', 'link', 'dogecoin', 'doge', 'shiba', 'shib', 'uniswap', 'uni', 'litecoin', 'ltc', 'ripple', 'xrp', 'defi', 'nft', 'token', 'altcoin', 'stablecoin', 'usdt', 'usdc', 'mining', 'miners', 'wallet', 'exchange', 'coinbase', 'kraken', 'metamask', 'web3', 'smart contract', 'dao', 'yield farming', 'staking', 'hodl', 'satoshi', 'halving', 'fork', 'consensus', 'proof of stake', 'proof of work',
    'bank', 'banking', 'federal reserve', 'fed', 'interest rate',
    'business', 'company', 'corporate', 'ceo', 'quarterly',
    'nasdaq', 'dow jones', 's&p', 'wall street', 'nyse',
    'mercado', 'financeiro', 'economia', 'econômico', 'investimento',
    'negócios', 'empresa', 'ações', 'bolsa', 'bovespa',
    // Tópicos adicionais
    'macroeconomics', 'macroeconomia', 'macro', 'pib', 'juros', 'selic', 'monetary policy', 'política monetária', 'central bank', 'banco central',
    'commodities', 'commodity', 'oil', 'petróleo', 'gold', 'ouro', 'agricultural', 'soja', 'corn', 'milho',
    'ai', 'artificial intelligence', 'cloud', 'nuvem', 'cybersecurity', 'cyber', 'segurança cibernética',
    'sustainability', 'sustentabilidade', 'esg', 'environmental', 'social', 'governance', 'carbon', 'emission',
    'renewable', 'energia renovável', 'solar', 'wind', 'eólica', 'energy transition', 'transition',
    'real estate', 'imobiliário', 'construction', 'construção',
    'fintech', 'digital bank', 'banco digital', 'open banking',
    'geopolitics', 'geopolítica',
    'e-commerce', 'commerce', 'consumption', 'consumo',
    'healthcare', 'health', 'biotech', 'biotecnologia', 'pharma', 'pharmaceutical',
    'startup', 'start-up', 'venture capital', 'vc', 'fundraising',
    'regulation', 'regulamentação', 'compliance', 'legislation', 'lei'
  ];
  
  // Palavras-chave para guerras e conflitos que afetam economia
  const warKeywords = [
    'war', 'conflict', 'military', 'sanctions', 'trade war',
    'geopolitical', 'ukraine', 'russia', 'china', 'taiwan',
    'oil', 'energy', 'commodity', 'supply chain',
    'guerra', 'conflito', 'sanções', 'geopolítico',
    'petróleo', 'energia', 'commodities'
  ];
  
  // Palavras-chave para economia global
  const economyKeywords = [
    'unemployment', 'jobs', 'employment', 'housing', 'real estate',
    'consumer', 'retail', 'manufacturing', 'industrial',
    'export', 'import', 'trade', 'tariff', 'currency',
    'dollar', 'euro', 'yen', 'pound',
    'emprego', 'desemprego', 'consumidor', 'varejo',
    'exportação', 'importação', 'comércio', 'moeda'
  ];
  
  const allKeywords = [...financialKeywords, ...warKeywords, ...economyKeywords];
  
  // Verificar se pelo menos uma palavra-chave está presente
  return allKeywords.some(keyword => text.includes(keyword));
}

// Adicionar controle de taxa para Finnhub
const FINNHUB_RATE_LIMIT = 60; // 60 requisições por minuto
let finnhubRequestCount = 0;
let finnhubRateLimitReset = Date.now();

// Função para verificar e atualizar o controle de taxa
function checkFinnhubRateLimit(): boolean {
  const now = Date.now();
  
  // Reiniciar contador após 1 minuto
  if (now - finnhubRateLimitReset >= 60000) {
    finnhubRequestCount = 0;
    finnhubRateLimitReset = now;
    return true;
  }
  
  // Verificar se ainda temos requisições disponíveis
  if (finnhubRequestCount < FINNHUB_RATE_LIMIT) {
    finnhubRequestCount++;
    return true;
  }
  
  // Limite excedido
  console.warn(`Limite de requisições Finnhub excedido (${FINNHUB_RATE_LIMIT}/min). Aguarde ${Math.ceil((finnhubRateLimitReset + 60000 - now)/1000)} segundos.`);
  return false;
}

// Mapeamento de empresas para seus símbolos
const companyNameToSymbol: Record<string, string> = {
  'Apple': 'AAPL',
  'Microsoft': 'MSFT',
  'Google': 'GOOGL',
  'Alphabet': 'GOOGL',
  'Amazon': 'AMZN',
  'Tesla': 'TSLA',
  'Facebook': 'META',
  'Meta': 'META',
  'Nvidia': 'NVDA',
  'AMD': 'AMD',
  'Intel': 'INTC',
  'JPMorgan': 'JPM',
  'Bank of America': 'BAC',
  'Wells Fargo': 'WFC',
  'Citigroup': 'C',
  'Goldman Sachs': 'GS',
  'Visa': 'V',
  'Mastercard': 'MA',
  'PayPal': 'PYPL',
  'Netflix': 'NFLX',
  'Disney': 'DIS',
  'Cisco': 'CSCO',
  'Oracle': 'ORCL',
  'IBM': 'IBM',
  'Adobe': 'ADBE',
  'Salesforce': 'CRM',
  'Exxon': 'XOM',
  'Chevron': 'CVX',
  'Coca-Cola': 'KO',
  'Coca Cola': 'KO',
  'PepsiCo': 'PEP',
  'Pepsi': 'PEP',
  'Walmart': 'WMT',
  'Petrobras': 'PETR4',
  'Vale': 'VALE3',
  'Itaú': 'ITUB4',
  'Bradesco': 'BBDC4',
  'Ambev': 'ABEV3',
  'B3': 'B3SA3',
  'Banco do Brasil': 'BBAS3',
  'WEG': 'WEGE3',
  'Magazine Luiza': 'MGLU3',
  'Bitcoin': 'BTC',
  'Ethereum': 'ETH',
  'Ripple': 'XRP',
  'Litecoin': 'LTC',
  'Cardano': 'ADA',
  'Polkadot': 'DOT',
  'Dogecoin': 'DOGE',
  'Solana': 'SOL',
  'Shiba Inu': 'SHIB'
};

// Mapeamento inverso: de símbolo para nome da empresa (para tooltips)
const symbolToCompanyName: Record<string, string> = {};

// Preencher o mapeamento inverso
Object.entries(companyNameToSymbol).forEach(([company, symbol]) => {
  // Se já existe uma entrada para este símbolo, usar a mais curta/comum
  if (!symbolToCompanyName[symbol] || company.length < symbolToCompanyName[symbol].length) {
    symbolToCompanyName[symbol] = company;
  }
});

// Adicionar mais alguns nomes completos que podem não estar no mapeamento original
const additionalFullNames: Record<string, string> = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc. (Google)',
  'AMZN': 'Amazon.com, Inc.',
  'TSLA': 'Tesla, Inc.',
  'META': 'Meta Platforms, Inc.',
  'NVDA': 'NVIDIA Corporation',
  'JPM': 'JPMorgan Chase & Co.',
  'BAC': 'Bank of America Corporation',
  'WFC': 'Wells Fargo & Company',
  'C': 'Citigroup Inc.',
  'GS': 'The Goldman Sachs Group, Inc.',
  'V': 'Visa Inc.',
  'MA': 'Mastercard Incorporated',
  'PYPL': 'PayPal Holdings, Inc.',
  'NFLX': 'Netflix, Inc.',
  'DIS': 'The Walt Disney Company',
  'CSCO': 'Cisco Systems, Inc.',
  'ORCL': 'Oracle Corporation',
  'IBM': 'International Business Machines Corporation',
  'ADBE': 'Adobe Inc.',
  'CRM': 'Salesforce, Inc.',
  'XOM': 'Exxon Mobil Corporation',
  'CVX': 'Chevron Corporation',
  'KO': 'The Coca-Cola Company',
  'PEP': 'PepsiCo, Inc.',
  'WMT': 'Walmart Inc.',
  'PETR4': 'Petróleo Brasileiro S.A. (Petrobras)',
  'VALE3': 'Vale S.A.',
  'ITUB4': 'Itaú Unibanco Holding S.A.',
  'BBDC4': 'Banco Bradesco S.A.',
  'ABEV3': 'Ambev S.A.',
  'B3SA3': 'B3 S.A. - Brasil, Bolsa, Balcão',
  'BBAS3': 'Banco do Brasil S.A.',
  'WEGE3': 'WEG S.A.',
  'MGLU3': 'Magazine Luiza S.A.',
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'XRP': 'XRP (Ripple)',
  'LTC': 'Litecoin',
  'ADA': 'Cardano',
  'DOT': 'Polkadot',
  'DOGE': 'Dogecoin',
  'SOL': 'Solana',
  'SHIB': 'Shiba Inu'
};

// Combinar com o symbolToCompanyName
Object.entries(additionalFullNames).forEach(([symbol, fullName]) => {
  symbolToCompanyName[symbol] = fullName;
});

// Exportar o mapeamento para uso nos componentes que exibem as tags
export { symbolToCompanyName };

// Função para buscar notícias de mercado
export async function fetchMarketNews(options: { 
  limit?: number; 
  symbols?: string[]; 
  category?: 'business' | 'forex' | 'merger' | 'general';
  minId?: number;
  language?: string;
} = {}): Promise<MarketNews[]> {
  try {
    console.log('Buscando notícias de mercado via Finnhub (prioridade CNBC)...');
    const limit = options.limit || 10;
    const symbols = options.symbols || [];
    const category = options.category || 'business';
    const minId = options.minId || 0;
    const language = options.language || 'en';
    
    // Verificar se há dados em localStorage antes de fazer chamada API
    try {
      // Criar uma chave de cache baseada nos parâmetros para diferenciar diferentes tipos de consultas
      const cacheKey = `cached_market_news_${category}_${minId}_${symbols.join('_')}`;
      const cachedNews = localStorage.getItem(cacheKey);
      const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      if (cachedNews && cachedTimestamp) {
        const parsedNews = JSON.parse(cachedNews);
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        
        // Reduzir o tempo de cache para 15 minutos para manter as notícias mais frescas
        if (now - timestamp < 15 * 60 * 1000 && parsedNews.length > 0) {
          console.log(`Usando notícias em cache do localStorage para ${category}`);
          
          // Filtrar para remover notícias da SeekingAlpha do cache
          const filteredNews = parsedNews.filter(item => 
            item.source !== 'SeekingAlpha' && 
            item.source !== 'Yahoo' && 
            !item.source.includes('Yahoo')
          );
          
          // Priorizar notícias da CNBC com imagens
          const cnbcNews = filteredNews.filter(item => 
            item.source === 'CNBC' && item.imageUrl && item.imageUrl.trim() !== ''
          );
          const otherNews = filteredNews.filter(item => 
            item.source !== 'CNBC' && item.imageUrl && item.imageUrl.trim() !== ''
          );
          
          // Combinar com CNBC primeiro
          const sortedNews = [...cnbcNews, ...otherNews];
          
          // Otimização: retornar apenas a quantidade solicitada sem processar todos os dados
          const limitedNews = sortedNews.slice(0, limit);
          
          // Atualizar em segundo plano apenas se o cache tiver mais de 5 minutos
          if (now - timestamp > 5 * 60 * 1000) {
            // Atualize a página em segundo plano após retornar dados do cache
            setTimeout(() => refreshNewsInBackground(options), 10);
          }
          
          return limitedNews;
        }
      }
    } catch (localStorageError) {
      console.warn('Erro ao acessar localStorage:', localStorageError);
      // Continuar execução
    }
    
    // Tentar buscar notícias do Finnhub
    try {
      // Primeiro verificar se estamos dentro do limite de taxa
      if (!checkFinnhubRateLimit()) {
        throw new Error('Limite de requisições Finnhub excedido. Tente novamente mais tarde.');
      }

      // 1. Se temos símbolos específicos, buscar notícias para cada símbolo
      if (symbols.length > 0) {
        let allNews: MarketNews[] = [];
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        const from = sevenDaysAgo.toISOString().split('T')[0];
        const to = today.toISOString().split('T')[0];
        
        // Limitar a quantidade de símbolos para evitar exceder o limite
        const limitedSymbols = symbols.slice(0, Math.min(2, symbols.length));
        
        for (const symbol of limitedSymbols) {
          // Verificar o limite de taxa antes de cada chamada
          if (!checkFinnhubRateLimit()) {
            console.warn(`Limite de requisições atingido após processamento de alguns símbolos. Retornando dados parciais.`);
            break;
          }

          // Buscar notícias relacionadas à empresa/símbolo
          const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${API_KEYS.FINNHUB.API_KEY}`;
          console.log(`Buscando notícias para ${symbol} via Finnhub (${from} até ${to})`);
          
          const response = await fetch(url, {
            cache: 'no-store' // Forçar atualização para dados recentes
          });
          
          if (!response.ok) {
            console.warn(`Erro ao buscar notícias para ${symbol}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            // Filtrar para excluir SeekingAlpha e incluir apenas tópicos relevantes
            const filteredData = data.filter(item => 
              item.source !== 'SeekingAlpha' && 
              item.source !== 'Yahoo' && 
              !item.source.includes('Yahoo') &&
              isRelevantFinancialNews(item)
            );
            
            // Primeiro buscar notícias da CNBC com imagens
            const cnbcNewsWithImages = filteredData.filter(item => 
              item.source === 'CNBC' && 
              item.image && 
              item.image.trim() !== '' && 
              (item.image.includes('cnbcfm.com') || item.image.includes('cnbc.com'))
            );
            
            if (cnbcNewsWithImages.length > 0) {
              // Se temos notícias CNBC, mapear e adicionar
              const mappedNews = cnbcNewsWithImages.map(item => ({
                id: `finnhub-${item.id || Date.now()}`,
                title: item.headline || '',
                summary: item.summary || '',
                url: item.url || '',
                imageUrl: item.image || '',
                source: item.source,
                datetime: item.datetime * 1000, // Finnhub usa segundos, convertemos para ms
                published_at: new Date(item.datetime * 1000).toISOString(),
                symbols: [symbol],
                sentiment: 0,
                category: item.category || 'business'
              }));
              
              allNews = [...allNews, ...mappedNews];
              continue; // Vá para o próximo símbolo se já encontramos CNBC
            }
            
            // Se não encontramos CNBC, buscar outras fontes com imagens
            const otherNewsWithImages = filteredData.filter(item => 
              item.source !== 'CNBC' && 
              item.source !== 'SeekingAlpha' && 
              item.source !== 'Yahoo' && 
              !item.source.includes('Yahoo') && 
              item.image && 
              item.image.trim() !== ''
            );
            
            if (otherNewsWithImages.length > 0) {
              const mappedNews = otherNewsWithImages.slice(0, Math.ceil(limit / limitedSymbols.length)).map(item => ({
                id: `finnhub-${item.id || Date.now()}`,
                title: item.headline || '',
                summary: item.summary || '',
                url: item.url || '',
                imageUrl: item.image || '',
                source: item.source,
                datetime: item.datetime * 1000,
                published_at: new Date(item.datetime * 1000).toISOString(),
                symbols: [symbol],
                sentiment: 0,
                category: item.category || 'general'
              }));
              
              allNews = [...allNews, ...mappedNews];
            }
          }
        }
        
        if (allNews.length > 0) {
          // Ordenar por data (mais recentes primeiro)
          allNews.sort((a, b) => {
            return (b.datetime || 0) - (a.datetime || 0);
          });
          
          // Priorizar notícias da CNBC
          const cnbcNews = allNews.filter(item => item.source === 'CNBC');
          const otherNews = allNews.filter(item => item.source !== 'CNBC');
          allNews = [...cnbcNews, ...otherNews];
      
          // Salvar no localStorage para acesso mais rápido depois
          try {
            const cacheKey = `cached_market_news_company_${symbols.join('_')}`;
            localStorage.setItem(cacheKey, JSON.stringify(allNews));
            localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
          } catch (saveError) {
            console.warn('Erro ao salvar notícias no localStorage:', saveError);
          }
      
          return allNews.slice(0, limit);
        }
      }
      
      // 2. Se não temos símbolos específicos ou não encontramos notícias, buscar notícias gerais
      // Verificar o limite de taxa novamente
      if (!checkFinnhubRateLimit()) {
        throw new Error('Limite de requisições Finnhub excedido. Tente novamente mais tarde.');
      }
      
      // Buscar todas as notícias com a categoria especificada
      const url = `https://finnhub.io/api/v1/news?category=${category}${minId > 0 ? `&minId=${minId}` : ''}&token=${API_KEYS.FINNHUB.API_KEY}`;
      console.log(`Buscando notícias da categoria ${category} via Finnhub${minId > 0 ? ` com minId=${minId}` : ''}`);
      
      const response = await fetch(url, {
        cache: 'no-store' // Forçar atualização para dados recentes
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Filtrar para excluir SeekingAlpha e incluir apenas tópicos relevantes
        const filteredData = data.filter(item => 
          item.source !== 'SeekingAlpha' && 
          item.source !== 'Yahoo' && 
          !item.source.includes('Yahoo') &&
          isRelevantFinancialNews(item)
        );
        
        // Primeiro buscar notícias da CNBC com imagens
        const cnbcNewsWithImages = filteredData.filter(item => 
          item.source === 'CNBC' && 
          item.image && 
          item.image.trim() !== '' && 
          (item.image.includes('cnbcfm.com') || item.image.includes('cnbc.com'))
        );
        
        if (cnbcNewsWithImages.length > 0) {
          // Mapear notícias da CNBC
          const cnbcMappedNews = cnbcNewsWithImages.slice(0, limit).map(item => ({
            id: `finnhub-${item.id || Date.now()}`,
            title: item.headline || '',
            summary: item.summary || '',
            url: item.url || '',
            imageUrl: item.image || '',
            source: item.source,
            datetime: item.datetime * 1000,
            published_at: new Date(item.datetime * 1000).toISOString(),
            symbols: item.related ? item.related.split(',').filter(Boolean) : [],
            sentiment: 0,
            category: item.category || 'business'
          }));
          
          // Salvar no localStorage para acesso mais rápido depois
          try {
            const cacheKey = `cached_market_news_${category}_${minId}`;
            localStorage.setItem(cacheKey, JSON.stringify(cnbcMappedNews));
            localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
          } catch (saveError) {
            console.warn('Erro ao salvar notícias no localStorage:', saveError);
          }
          
          return cnbcMappedNews.slice(0, limit);
        }
        
        // Se não encontramos CNBC, buscar outras fontes com imagens (exceto SeekingAlpha)
        const otherNewsWithImages = filteredData.filter(item => 
          item.source !== 'CNBC' && 
          item.source !== 'SeekingAlpha' && 
          item.source !== 'Yahoo' && 
          !item.source.includes('Yahoo') && 
          item.image && 
          item.image.trim() !== ''
        );
        
        if (otherNewsWithImages.length > 0) {
          const mappedNews = otherNewsWithImages.slice(0, limit).map(item => ({
            id: `finnhub-${item.id || Date.now()}`,
            title: item.headline || '',
            summary: item.summary || '',
            url: item.url || '',
            imageUrl: item.image || '',
            source: item.source,
            datetime: item.datetime * 1000,
            published_at: new Date(item.datetime * 1000).toISOString(),
            symbols: item.related ? item.related.split(',').filter(Boolean) : [],
            sentiment: 0,
            category: item.category || 'general'
          }));
          
          // Salvar no localStorage para acesso mais rápido depois
          try {
            const cacheKey = `cached_market_news_${category}_${minId}`;
            localStorage.setItem(cacheKey, JSON.stringify(mappedNews));
            localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
          } catch (saveError) {
            console.warn('Erro ao salvar notícias no localStorage:', saveError);
          }
          
          return mappedNews.slice(0, limit);
        }
      }
      
      // Se não encontrou notícias
      throw new Error(`Não foi possível encontrar notícias para a categoria ${category}`);
    } catch (finnhubError) {
      console.error('Erro ao buscar notícias via Finnhub:', finnhubError);
      throw finnhubError; // Propagate o erro para que o chamador possa tratá-lo
    }
  } catch (error) {
    console.error('Erro ao buscar notícias de mercado:', error);
    throw error; // Propagate o erro para que o chamador possa tratá-lo
  }
}

// Função para atualizar as notícias em segundo plano sem bloqueio de UI
async function refreshNewsInBackground(options: { 
  limit?: number; 
  symbols?: string[];
  category?: 'business' | 'forex' | 'merger' | 'general';
  minId?: number;
  language?: string;
} = {}) {
  try {
    const limit = options.limit || 10;
    const symbols = options.symbols || [];
    const category = options.category || 'business';
    const minId = options.minId || 0;
    const language = options.language || 'en';
    
    // Criar uma chave de cache baseada nos parâmetros
    const cacheKey = symbols.length > 0 
      ? `cached_market_news_company_${symbols.join('_')}`
      : `cached_market_news_${category}_${minId}`;
      
    const cacheTime = localStorage.getItem(`${cacheKey}_timestamp`);
    const now = Date.now();
    
    // Rastrear a última tentativa de atualização em segundo plano
    const lastBackgroundUpdate = localStorage.getItem('last_background_update_timestamp');
    
    // Só permitir atualizações em segundo plano a cada 5 minutos no máximo
    if (lastBackgroundUpdate && (now - parseInt(lastBackgroundUpdate, 10)) < 5 * 60 * 1000) {
      console.log('Atualização em segundo plano ignorada - última atualização muito recente');
      return;
    }
    
    // Registrar tentativa de atualização
    localStorage.setItem('last_background_update_timestamp', now.toString());
    
    // Só atualizar se o cache for mais antigo que 15 minutos
    if (!cacheTime || (now - parseInt(cacheTime, 10)) > 15 * 60 * 1000) {
      console.log(`Atualizando cache de notícias em segundo plano para ${category}...`);
      
      // Verificar se estamos dentro do limite de taxa antes de continuar
      if (!checkFinnhubRateLimit()) {
        console.warn('Limite de requisições Finnhub excedido. Atualizando o cache mais tarde.');
        return;
      }
      
      // Tentar buscar notícias do Finnhub em segundo plano
      try {
        if (symbols.length > 0) {
          // Lógica para atualizar notícias de empresas específicas
          console.log(`Atualização em segundo plano para símbolos: ${symbols.join(', ')}`);
          // Esta parte seria implementada se necessário
        } else {
          // Buscar notícias gerais da categoria especificada
          const url = `https://finnhub.io/api/v1/news?category=${category}${minId > 0 ? `&minId=${minId}` : ''}&token=${API_KEYS.FINNHUB.API_KEY}`;
          console.log(`Buscando notícias de ${category} em segundo plano${minId > 0 ? ` com minId=${minId}` : ''}`);
          
          const response = await fetch(url, {
            cache: 'no-store' // Forçar atualização para dados recentes
          });
          
          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            // Filtrar notícias relevantes com imagens
            const relevantNews = data.filter(item => 
              item.source !== 'SeekingAlpha' && 
              item.source !== 'Yahoo' && 
              !item.source.includes('Yahoo') &&
              isRelevantFinancialNews(item)
            );
            
            const newsWithImages = relevantNews.filter(item => item.image && item.image.trim() !== '');
            
            // Preferir notícias com imagens
            let newsData = newsWithImages.length > 0 ? newsWithImages : relevantNews;
            
            // Preferir notícias da CNBC se disponíveis
            const cnbcNews = newsData.filter(item => item.source === 'CNBC');
            
            if (cnbcNews.length > 0) {
              newsData = cnbcNews;
              console.log(`Encontradas ${cnbcNews.length} notícias da CNBC em segundo plano`);
            }
            
            const mappedNews = newsData.slice(0, limit).map(item => ({
              id: `finnhub-${item.id || Date.now()}`,
              title: item.headline,
              summary: item.summary,
              url: item.url,
              imageUrl: item.image || '', // Usar apenas imagens da API 
              source: item.source,
              datetime: item.datetime * 1000, // Finnhub usa segundos, convertemos para ms
              published_at: new Date(item.datetime * 1000).toISOString(),
              symbols: item.related ? item.related.split(',').filter(Boolean) : [],
              sentiment: item.sentiment || 0,
              category: item.category
            }));
            
            // Salvar no localStorage para acesso mais rápido depois
            try {
              localStorage.setItem(cacheKey, JSON.stringify(mappedNews));
              localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
              console.log('Cache de notícias atualizado com sucesso em segundo plano');
            } catch (saveError) {
              console.warn('Erro ao salvar notícias no localStorage:', saveError);
            }
          }
        }
      } catch (finnhubError) {
        console.error('Erro ao buscar notícias via Finnhub em segundo plano:', finnhubError);
      }
    } else {
      console.log('Cache ainda recente, atualização em segundo plano ignorada');
    }
  } catch (error) {
    console.warn('Erro na atualização de notícias em segundo plano:', error);
  }
}

// Função específica para buscar notícias de empresas
export async function fetchCompanyNews(options: {
  symbol: string; // Símbolo da empresa (obrigatório)
  from?: string; // Data de início YYYY-MM-DD (padrão: 7 dias atrás)
  to?: string;   // Data final YYYY-MM-DD (padrão: hoje)
  limit?: number; // Limite de notícias a retornar
}): Promise<MarketNews[]> {
  try {
    if (!options.symbol) {
      throw new Error('Symbol é obrigatório para buscar notícias de empresas');
    }

    const symbol = options.symbol;
    const limit = options.limit || 10;
    
    // Definir datas padrão se não fornecidas
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const from = options.from || sevenDaysAgo.toISOString().split('T')[0];
    const to = options.to || today.toISOString().split('T')[0];
    
    // Verificar cache primeiro
    const cacheKey = `cached_company_news_${symbol}_${from}_${to}`;
    try {
      const cachedNews = localStorage.getItem(cacheKey);
      const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      if (cachedNews && cachedTimestamp) {
        const parsedNews = JSON.parse(cachedNews);
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        
        // Cache válido por 30 minutos
        if (now - timestamp < 30 * 60 * 1000 && parsedNews.length > 0) {
          console.log(`Usando notícias em cache para ${symbol}`);
          return parsedNews.slice(0, limit);
        }
      }
    } catch (localStorageError) {
      console.warn('Erro ao acessar localStorage:', localStorageError);
    }
    
    // Verificar limite de taxa
    if (!checkFinnhubRateLimit()) {
      throw new Error('Limite de requisições Finnhub excedido. Tente novamente mais tarde.');
    }
    
    // Buscar notícias da empresa
    console.log(`Buscando notícias para ${symbol} (${from} até ${to})`);
    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${API_KEYS.FINNHUB.API_KEY}`;
    
    const response = await fetch(url, {
      cache: 'no-store' // Forçar atualização para dados recentes
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`Nenhuma notícia encontrada para ${symbol}`);
      return [];
    }
    
    // Filtrar notícias relevantes primeiro
    const relevantNews = data.filter(item => 
      item.source !== 'SeekingAlpha' && 
      item.source !== 'Yahoo' && 
      !item.source.includes('Yahoo') &&
      isRelevantFinancialNews(item)
    );
    
    // Filtrar notícias com imagens
    const newsWithImages = relevantNews.filter(item => item.image && item.image.trim() !== '');
    
    // Priorizar notícias com imagens, mas incluir todas se necessário
    const filteredNews = newsWithImages.length > 0 ? newsWithImages : relevantNews;
    
    // Dar preferência a notícias da CNBC, mas não limitar apenas a elas
    const cnbcNews = filteredNews.filter(item => item.source === 'CNBC');
    
    // Se temos notícias da CNBC, colocá-las no início da lista
    let prioritizedNews = [...filteredNews];
    if (cnbcNews.length > 0) {
      const otherNews = filteredNews.filter(item => item.source !== 'CNBC');
      prioritizedNews = [...cnbcNews, ...otherNews];
    }
    
    // Mapear os dados para o formato MarketNews
    const mappedNews = prioritizedNews.slice(0, limit).map(item => ({
      id: `finnhub-${item.id || Date.now()}`,
      title: item.headline,
      summary: item.summary,
      url: item.url,
      imageUrl: item.image || '', // Usar apenas imagens da API
      source: item.source,
      datetime: item.datetime * 1000,
      published_at: new Date(item.datetime * 1000).toISOString(),
      symbols: [symbol],
      sentiment: item.sentiment || 0,
      category: item.category
    }));
    
    // Salvar no cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(mappedNews));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (saveError) {
      console.warn('Erro ao salvar notícias no localStorage:', saveError);
    }
    
    return mappedNews;
  } catch (error) {
    console.error(`Erro ao buscar notícias para ${options.symbol}:`, error);
    throw error;
  }
} 
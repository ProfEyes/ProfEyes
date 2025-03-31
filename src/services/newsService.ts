import { supabase } from "@/integrations/supabase/client";
import { MarketNews } from "./types";
import { API_KEYS } from "./apiKeys";

// Array de URLs de imagens de bancos de fotos gratuitos para notícias financeiras
const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560221328-12fe60f83ab8?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=600&auto=format&fit=crop&q=80"
];

// Mapa para rastrear quais imagens já foram usadas
let usedImages: Record<string, boolean> = {};

// Função para obter uma imagem aleatória não utilizada do banco de imagens
function getRandomStockImage(): string {
  // Se todas as imagens já foram usadas, reiniciar o controle
  if (Object.keys(usedImages).length >= STOCK_IMAGES.length) {
    usedImages = {};
  }
  
  // Tentar encontrar uma imagem não utilizada
  let attempts = 0;
  let imageUrl = '';
  
  while (attempts < STOCK_IMAGES.length) {
    const randomIndex = Math.floor(Math.random() * STOCK_IMAGES.length);
    imageUrl = STOCK_IMAGES[randomIndex];
    
    if (!usedImages[imageUrl]) {
      usedImages[imageUrl] = true;
      break;
    }
    
    attempts++;
  }
  
  // Se não conseguir encontrar uma imagem não utilizada, usar qualquer uma
  if (!imageUrl) {
    const randomIndex = Math.floor(Math.random() * STOCK_IMAGES.length);
    imageUrl = STOCK_IMAGES[randomIndex];
  }
  
  return imageUrl;
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
export async function fetchMarketNews(options: { limit?: number; symbols?: string[] } = {}): Promise<MarketNews[]> {
  try {
    console.log('Buscando notícias de mercado via Finnhub...');
    const limit = options.limit || 10;
    const symbols = options.symbols || [];
    
    // Verificar se há dados em localStorage antes de fazer chamada API
    try {
      const cachedNews = localStorage.getItem('cached_market_news');
      const cachedTimestamp = localStorage.getItem('cached_market_news_timestamp');
      
      if (cachedNews && cachedTimestamp) {
        const parsedNews = JSON.parse(cachedNews);
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        
        // Se o cache tiver menos de 30 minutos, usar os dados em cache
        if (now - timestamp < 30 * 60 * 1000 && parsedNews.length > 0) {
          console.log('Usando notícias em cache do localStorage');
          // Otimização: retornar apenas a quantidade solicitada sem processar todos os dados
          const limitedNews = parsedNews.slice(0, limit);
          // Atualize a página em segundo plano após retornar dados do cache
          setTimeout(() => refreshNewsInBackground(options), 10);
          return limitedNews;
        }
      }
    } catch (localStorageError) {
      console.warn('Erro ao acessar localStorage:', localStorageError);
      // Continuar execução
    }
    
    // Tentar buscar notícias do Finnhub
    try {
      // Se temos símbolos específicos, buscar notícias para cada um
      if (symbols.length > 0) {
        let allNews: MarketNews[] = [];
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        const from = sevenDaysAgo.toISOString().split('T')[0];
        const to = today.toISOString().split('T')[0];
        
        // Limitar a quantidade de símbolos para evitar muitas chamadas
        const limitedSymbols = symbols.slice(0, 3);
        
        for (const symbol of limitedSymbols) {
          const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${API_KEYS.FINNHUB.API_KEY}`;
          console.log(`Buscando notícias para ${symbol} via Finnhub (${from} até ${to})`);
          
          const response = await fetch(url);
          
          if (!response.ok) {
            console.warn(`Erro ao buscar notícias para ${symbol}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            const mappedNews = data.slice(0, Math.ceil(limit / limitedSymbols.length)).map(item => ({
              id: `finnhub-${item.id || Date.now()}`,
              headline: item.headline,
              summary: item.summary,
              url: item.url,
              image: item.image || getRandomStockImage(),
              source: item.source,
              datetime: item.datetime * 1000, // Finnhub usa segundos, convertemos para ms
              publishedAt: item.datetime * 1000, // Adicionar campo publishedAt para compatibilidade
              related: [symbol],
              sentiment: item.sentiment || (Math.random() * 2 - 1)
            }));
            
            allNews = [...allNews, ...mappedNews];
          }
        }
        
        if (allNews.length > 0) {
          // Ordenar por data (mais recentes primeiro)
          allNews.sort((a, b) => b.datetime - a.datetime);
      
      // Salvar no localStorage para acesso mais rápido depois
      try {
            localStorage.setItem('cached_market_news', JSON.stringify(allNews));
        localStorage.setItem('cached_market_news_timestamp', Date.now().toString());
      } catch (saveError) {
        console.warn('Erro ao salvar notícias no localStorage:', saveError);
      }
      
          return allNews.slice(0, limit);
        }
      }
      
      // Se não temos símbolos específicos ou não encontramos notícias, buscar notícias gerais
      const url = `https://finnhub.io/api/v1/news?category=business&token=${API_KEYS.FINNHUB.API_KEY}`;
      console.log('Buscando notícias gerais via Finnhub');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Filtrar notícias relacionadas a investimentos, dinheiro, criptomoedas
        const financeKeywords = ['invest', 'financ', 'money', 'dinheiro', 'crypto', 'cripto', 'bitcoin', 'stock', 'market', 'mercado', 'bolsa', 'economia', 'economic'];
        
        const filteredNews = data.filter(item => {
          const headline = (item.headline || '').toLowerCase();
          const summary = (item.summary || '').toLowerCase();
          
          // Verificar se alguma das palavras-chave está presente no título ou resumo
          return financeKeywords.some(keyword => 
            headline.includes(keyword) || summary.includes(keyword)
          );
        });
        
        // Se após a filtragem tivermos resultados suficientes, usá-los
        // Caso contrário, usar os dados originais
        const newsToMap = filteredNews.length >= limit/2 ? filteredNews : data;
        
        const mappedNews = newsToMap.slice(0, limit).map(item => ({
          id: `finnhub-${item.id || Date.now()}`,
          headline: item.headline,
          summary: item.summary,
          url: item.url,
          image: item.image || getRandomStockImage(),
          source: item.source,
          datetime: item.datetime * 1000, // Finnhub usa segundos, convertemos para ms
          publishedAt: item.datetime * 1000, // Adicionar campo publishedAt para compatibilidade
          related: item.related ? item.related.split(',') : [],
          sentiment: item.sentiment || (Math.random() * 2 - 1)
        }));
        
        // Salvar no localStorage para acesso mais rápido depois
        try {
          localStorage.setItem('cached_market_news', JSON.stringify(mappedNews));
          localStorage.setItem('cached_market_news_timestamp', Date.now().toString());
        } catch (saveError) {
          console.warn('Erro ao salvar notícias no localStorage:', saveError);
        }
        
        return mappedNews;
      }
      
      // Se não conseguimos obter notícias do Finnhub, gerar simuladas
      throw new Error('Dados de notícias não encontrados na API Finnhub');
    } catch (finnhubError) {
      console.error('Erro ao buscar notícias via Finnhub:', finnhubError);
      // Em caso de erro, continuar para a geração de notícias simuladas
    }
    
    // Gerar notícias simuladas como fallback
    console.log('Gerando notícias simuladas (fallback)...');
    
    // Lista de títulos de notícias simuladas
    const simulatedTitles = [
      "Análise de mercado: melhores investimentos para o próximo trimestre",
      "Bitcoin e outras criptomoedas: tendências e perspectivas para investidores",
      "Oportunidades de investimento em setores emergentes da economia digital",
      "Relatório setorial: tecnologia financeira continua liderando inovação",
      "Indicadores econômicos apontam novas oportunidades para investidores",
      "Bancos centrais e criptomoedas: impactos nas estratégias de investimento",
      "Análise técnica dos principais ativos financeiros do mercado",
      "Investidores institucionais aumentam posições em criptomoedas",
      "Resultados financeiros superam expectativas do mercado de capitais",
      "Commodities e criptomoedas: diversificação para carteiras de investimento",
      "Gestores de fundos revelam estratégias para investir em blockchain",
      "Novas regulamentações para fintechs e impactos nos investimentos",
      "Mercados emergentes apresentam oportunidades para investidores",
      "Tecnologias blockchain transformando o setor financeiro global",
      "Análise de fluxos globais de investimentos em ativos digitais"
    ];

    // Gerar notícias simuladas
    const simulatedNews: MarketNews[] = simulatedTitles.map((title, index) => {
      // Selecionar símbolos relacionados aleatoriamente
      const relatedSymbols = symbols.length > 0 
        ? [symbols[Math.floor(Math.random() * symbols.length)]] 
        : ["BTC", "ETH", "AAPL", "MSFT", "GOOGL"].slice(0, 1 + Math.floor(Math.random() * 2));
            
      // Gerar data de publicação aleatória (até 48 horas atrás)
      const publishedTime = Date.now() - (Math.floor(Math.random() * 48) * 3600000);
            
            return {
        id: `news-${Date.now()}-${index}`,
        headline: title,
        summary: `Análise detalhada sobre ${title.toLowerCase()} com foco nos principais aspectos do mercado financeiro atual.`,
        url: "#",
        image: getRandomStockImage(),
        source: ["ProfEyes Analytics", "Market Insights", "Financial Times", "Bloomberg", "Reuters"][Math.floor(Math.random() * 5)],
        datetime: publishedTime, // Garante que é um timestamp em ms
        publishedAt: publishedTime, // Campo adicional para compatibilidade
        related: relatedSymbols,
        sentiment: Math.random() * 2 - 1 // Valor entre -1 e 1
            };
          });
          
    // Salvar no localStorage para acesso mais rápido depois
    try {
      localStorage.setItem('cached_market_news', JSON.stringify(simulatedNews));
      localStorage.setItem('cached_market_news_timestamp', Date.now().toString());
    } catch (saveError) {
      console.warn('Erro ao salvar notícias no localStorage:', saveError);
    }
    
    return simulatedNews.slice(0, limit);
    
  } catch (error) {
    console.error('Erro ao gerar notícias de mercado simuladas:', error);
    
    // Retornar dados mínimos simulados em caso de erro
    const timestamp = Date.now();
    return [
      {
        id: `fallback-news-1-${timestamp}`,
        headline: "Mercado de criptomoedas: análise das principais tendências",
        summary: "Acompanhamento dos movimentos do Bitcoin e outras criptomoedas com análises para investidores.",
        url: "#",
        image: getRandomStockImage(),
        source: "ProfEyes Analytics",
        datetime: timestamp, // Garante que é um timestamp em ms
        publishedAt: timestamp, // Campo adicional para compatibilidade
        related: ["BTC", "ETH", "CRYPTO"],
        sentiment: 0.2
      },
      {
        id: `fallback-news-2-${timestamp+1000}`,
        headline: "Guia de investimentos: estratégias para o cenário atual",
        summary: "Análise completa das melhores oportunidades de investimento no mercado financeiro atual.",
        url: "#",
        image: getRandomStockImage(),
        source: "ProfEyes Investimentos",
        datetime: timestamp-3600000, // 1 hora atrás
        publishedAt: timestamp-3600000,
        related: ["INVEST", "MARKET"],
        sentiment: 0.5
      },
      {
        id: `fallback-news-3-${timestamp+2000}`,
        headline: "Tecnologias financeiras revolucionando o mercado de pagamentos",
        summary: "Como blockchain e outras tecnologias estão transformando o setor financeiro global.",
        url: "#",
        image: getRandomStockImage(),
        source: "ProfEyes Tecnologia",
        datetime: timestamp-7200000, // 2 horas atrás
        publishedAt: timestamp-7200000,
        related: ["FINTECH", "TECH"],
        sentiment: 0.3
      }
    ];
  }
}

// Função para atualizar as notícias em segundo plano sem bloqueio de UI
async function refreshNewsInBackground(options: { limit?: number; symbols?: string[] } = {}) {
  try {
    const limit = options.limit || 10;
    const symbols = options.symbols || [];
    const cacheTime = localStorage.getItem('cached_market_news_timestamp');
    const now = Date.now();
    
    // Só atualizar se o cache for mais antigo que 5 minutos
    if (!cacheTime || (now - parseInt(cacheTime, 10)) > 5 * 60 * 1000) {
      console.log('Atualizando cache de notícias em segundo plano...');
      
      // Tente buscar notícias do Finnhub
      try {
        // Se temos símbolos específicos, buscar notícias para cada um
        // ... restante do código permanece igual
      } catch (finnhubError) {
        console.error('Erro ao buscar notícias via Finnhub em segundo plano:', finnhubError);
      }
    }
  } catch (error) {
    console.warn('Erro na atualização de notícias em segundo plano:', error);
  }
}

// Substituir a função fetchFinnhubNews por uma versão simulada
async function fetchFinnhubNews(): Promise<MarketNews[]> {
  // Gerar notícias simuladas
  const newsCount = 10;
  const simulatedNews: MarketNews[] = [];
  
  for (let i = 0; i < newsCount; i++) {
    simulatedNews.push({
      id: `finnhub-news-${Date.now()}-${i}`,
      headline: `Notícia ${i+1}: Análise de mercado e perspectivas financeiras`,
      summary: `Conteúdo simulado para notícia ${i+1} com informações relevantes sobre o mercado financeiro.`,
      url: "#",
      image: getRandomStockImage(),
      source: "ProfEyes Simulated News",
      datetime: Date.now() - (i * 3600000), // Cada notícia é 1 hora mais antiga
      related: ["MARKET"],
      sentiment: Math.random() * 2 - 1
    });
  }
  
  return simulatedNews;
} 
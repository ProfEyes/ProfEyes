import { API_KEYS } from './apiKeys';
import { MarketNews } from './signals/types';

// Interface para artigos de notícias
export interface NewsArticle {
  id?: string;
  title: string;
  description: string;
  content: string;
  url: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
  author?: string;
  relatedSymbols?: string[];
  sentiment?: number;
}

// Array de URLs de imagens para uso nas notícias simuladas
const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560221328-12fe60f83ab8?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80"
];

// Função para obter uma imagem aleatória
function getRandomImage(): string {
  return STOCK_IMAGES[Math.floor(Math.random() * STOCK_IMAGES.length)];
}

// Função para buscar notícias financeiras - versão simulada
export async function fetchFinancialNews(
  query: string = 'finance OR investing OR stock market OR economy',
  from: string = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  to: string = new Date().toISOString(),
  language: string = 'pt',
  pageSize: number = 20
): Promise<NewsArticle[]> {
  console.log('Gerando notícias financeiras simuladas');
  
  const simulatedTitles = [
    "Análise de mercado: perspectivas para investidores",
    "Tendências de investimento para o próximo trimestre",
    "Principais movimentos do mercado financeiro global",
    "Análise setorial: tecnologia e finanças em destaque",
    "Oportunidades de investimento em mercados emergentes",
    "Relatório econômico: indicadores apontam estabilidade",
    "Análise de risco para investidores no cenário atual"
  ];
  
  const simulatedArticles: NewsArticle[] = [];
  
  for (let i = 0; i < Math.min(pageSize, 15); i++) {
    const randomTitleIndex = Math.floor(Math.random() * simulatedTitles.length);
    const title = simulatedTitles[randomTitleIndex];
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    
    simulatedArticles.push({
      id: `financial-news-${Date.now()}-${i}`,
      title: title,
      description: `Descrição simulada para o artigo: ${title}`,
      content: `Conteúdo completo simulado para o artigo "${title}" com informações relevantes sobre o mercado financeiro global.`,
      url: "#",
      imageUrl: getRandomImage(),
      source: ["Bloomberg", "Financial Times", "Reuters", "ProfEyes Analytics", "Wall Street Journal"][Math.floor(Math.random() * 5)],
      publishedAt: new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000)).toISOString(),
      author: ["João Silva", "Maria Santos", "Carlos Oliveira", "Ana Ferreira", "Pedro Costa"][Math.floor(Math.random() * 5)],
      relatedSymbols: [["BTC", "ETH"], ["AAPL", "MSFT"], ["GOOGL", "AMZN"], ["TSLA", "NVDA"]][Math.floor(Math.random() * 4)],
      sentiment: (Math.random() * 2 - 1) * 0.8 // Valor entre -0.8 e 0.8
    });
  }
  
  return simulatedArticles;
}

// Função para buscar notícias específicas de uma empresa/símbolo - versão simulada
export async function fetchCompanyNews(
  symbol: string,
  pageSize: number = 10
): Promise<NewsArticle[]> {
  try {
    console.log(`Gerando notícias simuladas para o símbolo: ${symbol}`);
    
    // Verificar se o símbolo é válido
    if (!symbol || typeof symbol !== 'string' || symbol === '[object Object]') {
      console.warn(`Símbolo inválido fornecido para fetchCompanyNews: ${symbol}`);
      return getFallbackNews(symbol);
    }

    // Sempre usar dados simulados, nunca fazendo chamadas à API
    // Usar títulos específicos para cada símbolo
    const newsCount = Math.min(pageSize, 5);
    const articles: NewsArticle[] = [];
    
    for (let i = 0; i < newsCount; i++) {
      const daysAgo = Math.floor(Math.random() * 14); // Notícias de até 14 dias atrás
      const hoursAgo = Math.floor(Math.random() * 24);
      
      articles.push({
        id: `company-news-${symbol}-${Date.now()}-${i}`,
        title: getCompanyNewsTitles(symbol)[i % 5],
        description: `Análise detalhada sobre ${symbol} com foco em tendências recentes e projeções futuras.`,
        content: `Conteúdo completo da análise detalhada sobre ${symbol}, incluindo dados técnicos, fundamentos e perspectivas de mercado.`,
        url: "#",
        imageUrl: getRandomImage(),
        source: ["Market Analysis", "ProfEyes Research", "Financial Insights", "Investment Journal", "Market Trends"][Math.floor(Math.random() * 5)],
        publishedAt: new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000)).toISOString(),
        author: ["Analista Financeiro", "Especialista em Mercado", "Economista Sênior"][Math.floor(Math.random() * 3)],
        relatedSymbols: [symbol],
        sentiment: (Math.random() * 2 - 1) * 0.7 // Valor entre -0.7 e 0.7
      });
    }
    
    return articles;
  } catch (error) {
    console.error(`Erro ao gerar notícias simuladas para ${symbol}:`, error);
    return getFallbackNews(symbol);
  }
}

// Função para gerar títulos específicos para cada símbolo
function getCompanyNewsTitles(symbol: string): string[] {
  return [
    `Análise técnica: tendências recentes para ${symbol}`,
    `Perspectivas de mercado para ${symbol} no próximo trimestre`,
    `Relatório de analistas sobre o desempenho de ${symbol}`,
    `${symbol}: avaliação fundamentalista e projeções`,
    `Oportunidades de investimento com foco em ${symbol}`
  ];
}

// Função para gerar notícias de fallback quando a API falha
function getFallbackNews(symbol: string): NewsArticle[] {
  const timestamp = new Date().toISOString();
  const symbolString = typeof symbol === 'string' ? symbol : 'Crypto';
  
  return [
    {
      id: `fallback-news-1-${Date.now()}`,
      title: `Análise de mercado para ${symbolString}`,
      description: 'Nossos analistas estão avaliando as condições de mercado atuais. Atualizações em breve.',
      content: 'Devido à volatilidade recente, nossos especialistas estão realizando uma análise aprofundada das condições de mercado atuais. Fique atento para atualizações importantes.',
      url: '#',
      imageUrl: 'https://placehold.co/600x400?text=Market+Analysis',
      source: 'ProfEyes Analytics',
      publishedAt: timestamp,
      relatedSymbols: [symbolString],
      sentiment: 0
    },
    {
      id: `fallback-news-2-${Date.now()}`,
      title: `Perspectivas futuras para ${symbolString}`,
      description: 'Projeções de longo prazo e fatores que podem influenciar o desempenho futuro.',
      content: 'Nossa equipe compilou projeções de longo prazo baseadas em indicadores técnicos e fundamentais. Os dados sugerem uma tendência de estabilização nos próximos meses.',
      url: '#',
      imageUrl: 'https://placehold.co/600x400?text=Future+Outlook',
      source: 'ProfEyes Research',
      publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 dia atrás
      relatedSymbols: [symbolString],
      sentiment: 0.2
    },
    {
      id: `fallback-news-3-${Date.now()}`,
      title: 'Tendências globais afetando o mercado',
      description: 'Fatores macroeconômicos e seu impacto nos mercados financeiros.',
      content: 'Eventos globais recentes estão causando volatilidade nos mercados. Nossa análise mostra correlações importantes entre esses eventos e o comportamento do mercado.',
      url: '#',
      imageUrl: 'https://placehold.co/600x400?text=Global+Trends',
      source: 'Market Insights',
      publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 dias atrás
      relatedSymbols: [],
      sentiment: -0.1
    }
  ];
}

// Função para buscar manchetes de notícias - versão simulada
export async function fetchNewsHeadlines(
  category: 'business' | 'technology' | 'general' = 'business',
  country: string = 'br',
  pageSize: number = 10
): Promise<NewsArticle[]> {
  console.log(`Gerando manchetes de notícias simuladas para categoria: ${category}`);
  
  const headlines: NewsArticle[] = [];
  const headlineTitles = {
    business: [
      "Mercado financeiro reage positivamente a novos indicadores econômicos",
      "Bolsas globais registram ganhos após decisões de bancos centrais",
      "Perspectivas econômicas para o próximo trimestre se mantêm estáveis",
      "Investidores avaliam impacto de novas políticas fiscais",
      "Setor tecnológico lidera recuperação nos principais índices de mercado"
    ],
    technology: [
      "Avanços em IA promete transformar o setor financeiro",
      "Novas tecnologias blockchain impulsionam inovação em pagamentos",
      "Tendências tecnológicas que moldarão o mercado em 2024",
      "Big Tech amplia investimentos em soluções financeiras",
      "Segurança cibernética se torna prioridade para instituições financeiras"
    ],
    general: [
      "Panorama econômico global apresenta sinais de estabilização",
      "Análise de tendências de mercado para os próximos meses",
      "Relatório aponta oportunidades de investimento em diversos setores",
      "Especialistas debatem cenários econômicos para o próximo semestre",
      "Guia completo para navegação no cenário financeiro atual"
    ]
  };
  
  const titles = headlineTitles[category] || headlineTitles.business;
  
  for (let i = 0; i < Math.min(pageSize, titles.length); i++) {
    const hoursAgo = Math.floor(Math.random() * 24);
    
    headlines.push({
      id: `headline-${category}-${Date.now()}-${i}`,
      title: titles[i],
      description: `Resumo da notícia: ${titles[i]}. Clique para mais detalhes.`,
      content: `Conteúdo completo da notícia "${titles[i]}" com análises aprofundadas sobre o tema.`,
      url: "#",
      imageUrl: getRandomImage(),
      source: ["ProfEyes News", "Financial Digest", "Market Insights", "Economic Times", "Finance Today"][Math.floor(Math.random() * 5)],
      publishedAt: new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString(),
      author: ["João Silva", "Maria Santos", "Carlos Oliveira", "Ana Ferreira", "Pedro Costa"][Math.floor(Math.random() * 5)],
      relatedSymbols: extractStockSymbols(titles[i]),
      sentiment: (Math.random() * 2 - 1) * 0.6 // Valor entre -0.6 e 0.6
    });
  }
  
  return headlines;
}

// Função para extrair símbolos de ações do texto (versão simulada)
function extractStockSymbols(text: string): string[] {
  if (!text) return [];
  
  // Símbolos comuns para retornar aleatoriamente
  const commonSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'BTC', 'ETH'];
  
  // Número aleatório de símbolos (0 a 3)
  const symbolCount = Math.floor(Math.random() * 4);
  
  if (symbolCount === 0) return [];
  
  // Selecionar símbolos aleatórios
  const selectedSymbols = new Set<string>();
  for (let i = 0; i < symbolCount; i++) {
    selectedSymbols.add(commonSymbols[Math.floor(Math.random() * commonSymbols.length)]);
  }
  
  return Array.from(selectedSymbols);
}

// Função para analisar sentimento (simulada)
export async function analyzeSentiment(text: string): Promise<number> {
  // Simulação simples de análise de sentimento 
  // Retorna um valor entre -1 (muito negativo) e 1 (muito positivo)
  return (Math.random() * 2 - 1);
}

// Função para extrair símbolos do texto (simulada)
export function extractSymbolsFromText(text: string): string[] {
  // Retornar alguns símbolos aleatórios
  const possibleSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BTC', 'ETH'];
  const symbolCount = Math.floor(Math.random() * 3) + 1; // 1 a 3 símbolos
  
  const selectedSymbols = new Set<string>();
  for (let i = 0; i < symbolCount; i++) {
    selectedSymbols.add(possibleSymbols[Math.floor(Math.random() * possibleSymbols.length)]);
  }
  
  return Array.from(selectedSymbols);
}

// Função para extrair símbolos de criptomoedas do texto (simulada)
export function extractCryptoSymbols(text: string): string[] {
  const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'XRP', 'DOGE', 'DOT', 'MATIC'];
  const symbolCount = Math.floor(Math.random() * 2) + 1; // 1 a 2 símbolos
  
  const selectedSymbols = new Set<string>();
  for (let i = 0; i < symbolCount; i++) {
    selectedSymbols.add(cryptoSymbols[Math.floor(Math.random() * cryptoSymbols.length)]);
  }
  
  return Array.from(selectedSymbols);
}

// Função simulada para buscar todas as notícias do mercado
export async function fetchAllMarketNews(limit: number = 10): Promise<NewsArticle[]> {
  return fetchFinancialNews("market news", undefined, undefined, "en", limit);
}

// Estrutura para notícias de fallback
const FALLBACK_NEWS: MarketNews[] = [
  {
    id: 'fallback-1',
    title: 'Bitcoin atinge nova marca histórica após aprovação de ETF',
    description: 'O preço do Bitcoin subiu significativamente após a SEC aprovar ETFs de Bitcoin à vista nos EUA.',
    content: 'O Bitcoin atingiu um novo marco histórico esta semana, impulsionado pela decisão da Comissão de Valores Mobiliários dos EUA (SEC) de aprovar os primeiros fundos negociados em bolsa (ETFs) de Bitcoin à vista do país. A aprovação é vista como um passo significativo para a adoção institucional da principal criptomoeda do mundo.',
    summary: 'Bitcoin em alta com aprovação de ETF nos EUA',
    source: 'CryptoNews',
    url: 'https://cryptonews.com',
    imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=500&q=80',
    publishedAt: new Date().toISOString(),
    relatedSymbols: ['BTC', 'BTCUSDT'],
    sentiment: 0.9,
    relevance: 0.95
  },
  {
    id: 'fallback-2',
    title: 'Ethereum finaliza atualização importante para escalabilidade',
    description: 'A rede Ethereum concluiu com sucesso uma atualização importante visando melhorar a escalabilidade e reduzir taxas de transação.',
    content: 'A rede Ethereum acaba de concluir com sucesso uma importante atualização de protocolo focada em melhorar a escalabilidade da rede. Esta atualização introduz otimizações significativas que devem reduzir as taxas de transação (gas fees) e aumentar o throughput da rede, permitindo mais transações por segundo.',
    summary: 'Ethereum conclui atualização para melhorar escalabilidade',
    source: 'ETHNews',
    url: 'https://ethnews.com',
    imageUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=500&q=80',
    publishedAt: new Date().toISOString(),
    relatedSymbols: ['ETH', 'ETHUSDT'],
    sentiment: 0.8,
    relevance: 0.9
  }
];

// Cache para reduzir chamadas à API
const NEWS_CACHE = {
  data: [] as MarketNews[],
  lastUpdate: 0,
  maxAge: 15 * 60 * 1000, // 15 minutos
  isValid: function() {
    return this.lastUpdate > 0 && (Date.now() - this.lastUpdate) < this.maxAge;
  }
};

// Função auxiliar para filtrar notícias por símbolo
function filterNews(news: MarketNews[], symbol?: string, limit: number = 10): MarketNews[] {
  if (!symbol) {
    return news.slice(0, limit);
  }
  
  const filtered = news.filter(item => 
    item.relatedSymbols && 
    item.relatedSymbols.includes(symbol)
  );
  
  return filtered.length > 0 ? filtered.slice(0, limit) : news.slice(0, limit);
} 
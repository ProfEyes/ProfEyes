import { supabase } from "@/integrations/supabase/client";
import { API_KEYS } from "./apiKeys";
import { fetchNewsForSymbol } from "./newsService";
import { fetchCompanyNews } from "./finnhubApi";
import { MarketNews } from './types';

interface SentimentResult {
  score: number;  // -1 a 1, onde -1 é muito negativo, 0 é neutro e 1 é muito positivo
  magnitude: number;  // 0 a Infinito, indica a força do sentimento
  sources: {
    news: number;
    twitter: number;
    reddit: number;
  };
  keywords: Array<{
    word: string;
    sentiment: number;
    occurrences: number;
  }>;
  lastUpdated: Date;
}

// Cache para resultados de sentimento
const sentimentCache: Record<string, {
  result: SentimentResult;
  timestamp: Date;
}> = {};

// Função para buscar notícias relacionadas a um ativo
async function fetchNewsForAsset(symbol: string): Promise<Array<{title: string; content: string; source: string; date: Date}>> {
  try {
    // Tentar usar nossa função de busca de notícias específicas para o símbolo
    const newsData = await fetchNewsForSymbol(symbol);
    
    if (newsData && newsData.length > 0) {
      return newsData.map(item => ({
        title: item.title,
        content: item.content || item.summary || '',
        source: item.source,
        date: new Date(item.publishedAt)
      }));
    }
    
    // Se não encontrarmos notícias no nosso serviço, usar Finnhub
    try {
      // Adaptar símbolo para Finnhub
      const finnhubSymbol = symbol.replace('.SA', '').replace('USDT', '');
      const finnhubResults = await fetchCompanyNews(finnhubSymbol);
      
      if (finnhubResults && finnhubResults.length > 0) {
        return finnhubResults.slice(0, 20).map(item => ({
          title: item.headline,
          content: item.summary,
          source: item.source,
          date: new Date(item.datetime * 1000)
        }));
      }
    } catch (finnhubError) {
      console.error(`Erro ao buscar notícias para ${symbol} do Finnhub:`, finnhubError);
    }
    
    // Se não encontrar em nenhuma fonte, retornar array vazio
    return [];
  } catch (error) {
    console.error('Erro ao buscar notícias do ativo:', error);
    return [];
  }
}

// Função para buscar dados de redes sociais
async function fetchSocialMediaData(symbol: string): Promise<Array<{text: string; source: 'twitter' | 'reddit'; date: Date}>> {
  try {
    // Buscar dados sociais do Supabase
    const { data: socialData, error } = await supabase
      .from('social_mentions')
      .select('*')
      .filter('symbol', 'eq', symbol)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Erro ao buscar dados sociais do Supabase:', error);
      return [];
    }
    
    if (socialData && socialData.length > 0) {
      return socialData.map(item => ({
        text: item.text,
        source: item.source as 'twitter' | 'reddit',
        date: new Date(item.created_at)
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar dados sociais:', error);
    return [];
  }
}

// Função para analisar o sentimento de um texto
function analyzeSentimentText(text: string): { score: number; magnitude: number } {
  // Esta é uma versão simplificada de análise de sentimento
  // Em produção, seria ideal usar um serviço de NLP como Google Cloud Natural Language
  
  // Lista de palavras positivas e negativas para análise simples
  const positiveWords = [
    'alta', 'subir', 'crescer', 'lucro', 'ganho', 'positivo', 'bom', 'excelente', 
    'forte', 'recomendo', 'comprar', 'oportunidade', 'promissor', 'otimista',
    'bull', 'bullish', 'up', 'support', 'green', 'buy', 'long'
  ];
  
  const negativeWords = [
    'queda', 'cair', 'perda', 'prejuízo', 'negativo', 'ruim', 'fraco', 'vender', 
    'risco', 'preocupante', 'pessimista', 'problema', 'dificuldade', 'desvalorização',
    'bear', 'bearish', 'down', 'resistance', 'red', 'sell', 'short'
  ];
  
  // Normalizar texto
  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/\s+/);
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  // Contar palavras positivas e negativas
  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) {
      positiveCount++;
    }
    if (negativeWords.some(nw => word.includes(nw))) {
      negativeCount++;
    }
  });
  
  // Calcular score e magnitude
  const totalSentimentWords = positiveCount + negativeCount;
  const score = totalSentimentWords === 0 ? 0 : (positiveCount - negativeCount) / totalSentimentWords;
  const magnitude = Math.min(10, totalSentimentWords / words.length * 10); // Normalizado para 0-10
  
  return { score, magnitude };
}

// Função para extrair palavras-chave relevantes para análise de sentimento
function extractKeywords(text: string | string[]): Array<{word: string; sentiment: number; occurrences: number}> | string[] {
  // Se o input for um array de textos, usar a implementação original para análise de sentimento
  if (Array.isArray(text)) {
    if (!text || text.length === 0) {
      return [];
    }
    
    // Lista de stop words em português e inglês
    const stopWords = [
      'a', 'e', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
      'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob', 'sobre',
      'the', 'a', 'an', 'and', 'is', 'in', 'on', 'at', 'to', 'for', 'with', 'without',
      'by', 'of', 'from', 'that', 'this', 'these', 'those', 'it', 'its', 'it\'s'
    ];
    
    // Contagem de palavras
    const wordCount: Record<string, {count: number; sentimentScores: number[]}> = {};
    
    // Processar todos os textos
    text.forEach(t => {
      if (!t) return;
      
      const words = t.toLowerCase()
        .split(/\W+/)
        .filter(word => 
          word.length > 3 && !stopWords.includes(word) && !/^\d+$/.test(word)
        );
      
      // Analisar sentimento do texto completo
      const { score } = analyzeSentimentText(t);
      
      // Contabilizar palavras únicas no texto e associar ao sentimento
      const uniqueWords = Array.from(new Set(words));
      uniqueWords.forEach(word => {
        if (!wordCount[word]) {
          wordCount[word] = { count: 0, sentimentScores: [] };
        }
        wordCount[word].count++;
        wordCount[word].sentimentScores.push(score);
      });
    });
    
    // Converter para array e ordenar por ocorrências
    return Object.entries(wordCount)
      .map(([word, data]) => ({
        word,
        occurrences: data.count,
        sentiment: data.sentimentScores.reduce((sum, score) => sum + score, 0) / data.sentimentScores.length
      }))
      .filter(item => item.occurrences >= 2) // Filtrar palavras que aparecem pelo menos 2 vezes
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 20); // Pegar as 20 palavras mais frequentes
  } 
  // Se o input for uma string única, usar a implementação simplificada para análise de mercado
  else {
    const keywords = new Set<string>();
    
    // Lista de palavras-chave relevantes para mercado
    const marketKeywords = [
      'mercado', 'ações', 'bitcoin', 'crypto', 'investimento', 'tendência',
      'alta', 'baixa', 'análise', 'técnica', 'fundamental', 'regulação'
    ];

    // Extrair palavras do texto
    const words = text.toLowerCase().split(/\W+/);
    
    // Identificar palavras-chave
    words.forEach(word => {
      if (marketKeywords.includes(word)) {
        keywords.add(word);
      }
    });

    return Array.from(keywords);
  }
}

// Função principal para analisar sentimento de um símbolo
export async function analyzeAssetSentiment(symbol: string): Promise<SentimentResult> {
  try {
    // Verificar cache (validade de 1 hora)
    const cachedResult = sentimentCache[symbol];
    if (cachedResult && (new Date().getTime() - cachedResult.timestamp.getTime()) < 60 * 60 * 1000) {
      return cachedResult.result;
    }
    
    console.log(`Analisando sentimento para ${symbol}...`);
    
    // Buscar dados do Supabase primeiro
    const { data, error } = await supabase
      .from('sentiment_analysis')
      .select('*')
      .eq('symbol', symbol)
      .order('created_at', { ascending: false })
      .limit(1);
      
    // Se tiver um resultado recente (menos de 12 horas), usar esse
    if (!error && data && data.length > 0) {
      const lastAnalysis = data[0];
      const lastAnalysisTime = new Date(lastAnalysis.created_at);
      
      if ((new Date().getTime() - lastAnalysisTime.getTime()) < 12 * 60 * 60 * 1000) {
        const result: SentimentResult = {
          score: lastAnalysis.score,
          magnitude: lastAnalysis.magnitude,
          sources: lastAnalysis.sources,
          keywords: lastAnalysis.keywords,
          lastUpdated: lastAnalysisTime
        };
        
        // Atualizar cache
        sentimentCache[symbol] = {
          result,
          timestamp: new Date()
        };
        
        return result;
      }
    }
    
    // Buscar dados para análise
    const news = await fetchNewsForAsset(symbol);
    const socialMentions = await fetchSocialMediaData(symbol);
    
    // Calcular sentimento de cada fonte
    const calculateAverage = (items: Array<{score: number; magnitude: number}>) => {
      if (items.length === 0) return { score: 0, magnitude: 0 };
      
      const sum = items.reduce(
        (acc, item) => ({ 
          score: acc.score + item.score, 
          magnitude: acc.magnitude + item.magnitude 
        }), 
        { score: 0, magnitude: 0 }
      );
      
      return {
        score: sum.score / items.length,
        magnitude: sum.magnitude / items.length
      };
    };
    
    // Analisar sentimento de notícias
    const newsSentiments = news.map(item => 
      analyzeSentimentText(item.title + ' ' + item.content)
    );
    const newsAvg = calculateAverage(newsSentiments);
    
    // Analisar sentimento de redes sociais
    const twitterMentions = socialMentions.filter(item => item.source === 'twitter');
    const redditMentions = socialMentions.filter(item => item.source === 'reddit');
    
    const twitterSentiments = twitterMentions.map(item => 
      analyzeSentimentText(item.text)
    );
    const redditSentiments = redditMentions.map(item => 
      analyzeSentimentText(item.text)
    );
    
    const twitterAvg = calculateAverage(twitterSentiments);
    const redditAvg = calculateAverage(redditSentiments);
    
    // Extrair palavras-chave
    const allTexts = [
      ...news.map(item => item.title + ' ' + item.content),
      ...socialMentions.map(item => item.text)
    ];
    const keywords = extractKeywords(allTexts);
    
    // Calcular média ponderada do sentimento geral
    const newsWeight = news.length > 0 ? 0.6 : 0;
    const twitterWeight = twitterMentions.length > 0 ? 0.25 : 0;
    const redditWeight = redditMentions.length > 0 ? 0.15 : 0;
    
    // Ajustar pesos se alguma fonte estiver faltando
    const totalWeight = newsWeight + twitterWeight + redditWeight;
    const normalizationFactor = totalWeight > 0 ? 1 / totalWeight : 0;
    
    const normalizedNewsWeight = newsWeight * normalizationFactor;
    const normalizedTwitterWeight = twitterWeight * normalizationFactor;
    const normalizedRedditWeight = redditWeight * normalizationFactor;
    
    // Calcular pontuação final de sentimento
    const overallScore = 
      newsAvg.score * normalizedNewsWeight +
      twitterAvg.score * normalizedTwitterWeight +
      redditAvg.score * normalizedRedditWeight;
    
    const overallMagnitude = 
      newsAvg.magnitude * normalizedNewsWeight +
      twitterAvg.magnitude * normalizedTwitterWeight +
      redditAvg.magnitude * normalizedRedditWeight;
    
    // Limitar score entre -1 e 1
    const finalScore = Math.max(-1, Math.min(1, overallScore));
    
    // Criar resultado
    const result: SentimentResult = {
      score: finalScore,
      magnitude: overallMagnitude,
      sources: {
        news: newsAvg.score,
        twitter: twitterAvg.score,
        reddit: redditAvg.score
      },
      keywords,
      lastUpdated: new Date()
    };
    
    // Salvar no Supabase
    try {
      await supabase.from('sentiment_analysis').insert({
        symbol,
        score: result.score,
        magnitude: result.magnitude,
        sources: result.sources,
        keywords: result.keywords,
        created_at: result.lastUpdated.toISOString()
      });
    } catch (saveError) {
      console.error('Erro ao salvar análise de sentimento:', saveError);
      // Continuar mesmo com erro no salvamento
    }
    
    // Atualizar cache
    sentimentCache[symbol] = {
      result,
      timestamp: new Date()
    };
    
    return result;
  } catch (error) {
    console.error('Erro ao analisar sentimento:', error);
    
    // Retornar resultado neutro em caso de erro
    return {
      score: 0,
      magnitude: 0,
      sources: { news: 0, twitter: 0, reddit: 0 },
      keywords: [],
      lastUpdated: new Date()
    };
  }
}

// Interface para resultado da análise de sentimento
export interface SentimentAnalysis {
  score: number;        // Score de -1 a 1 (-1 muito negativo, 1 muito positivo)
  magnitude: number;    // Força do sentimento (0 a 1)
  keywords: string[];   // Palavras-chave identificadas
  entities: string[];   // Entidades mencionadas (empresas, pessoas, etc)
}

// Função para analisar o score de sentimento de um texto
export async function analyzeSentimentScore(text: string): Promise<number> {
  try {
    // Lista de palavras positivas e negativas para análise
    const positiveWords = [
      'alta', 'subida', 'crescimento', 'lucro', 'ganho', 'positivo', 'otimista',
      'bull', 'bullish', 'valorização', 'forte', 'recuperação', 'oportunidade',
      'superar', 'sucesso', 'inovação', 'desenvolvimento', 'progresso', 'avanço'
    ];

    const negativeWords = [
      'queda', 'baixa', 'prejuízo', 'perda', 'negativo', 'pessimista', 'bear',
      'bearish', 'desvalorização', 'fraco', 'recessão', 'risco', 'preocupação',
      'falha', 'problema', 'crise', 'dívida', 'inflação', 'default'
    ];

    // Converter texto para minúsculas para comparação
    const lowerText = text.toLowerCase();
    
    // Contar ocorrências de palavras positivas e negativas
    let positiveCount = positiveWords.reduce((count, word) => 
      count + (lowerText.split(word).length - 1), 0
    );

    let negativeCount = negativeWords.reduce((count, word) => 
      count + (lowerText.split(word).length - 1), 0
    );

    // Calcular score normalizado entre -1 e 1
    const total = positiveCount + negativeCount;
    if (total === 0) return 0;

    return (positiveCount - negativeCount) / total;
  } catch (error) {
    console.error('Erro ao analisar sentimento:', error);
    return 0;
  }
}

// Função para calcular o impacto do sentimento no preço
export async function calculateSentimentImpact(
  news: MarketNews[],
  currentPrice: number
): Promise<{
  predictedImpact: number;
  confidence: number;
  mainFactors: string[];
}> {
  try {
    let totalScore = 0;
    let totalConfidence = 0;
    const factors: string[] = [];

    // Analisar cada notícia
    for (const item of news) {
      // Calcular score de sentimento para título e conteúdo
      const titleScore = await analyzeSentimentScore(item.title);
      const contentScore = item.content ? await analyzeSentimentScore(item.content) : 0;

      // Média ponderada (título tem peso maior por ser mais impactante)
      const combinedScore = (titleScore * 0.6) + (contentScore * 0.4);

      // Calcular confiança baseada em fatores como fonte, tempo, etc
      const confidence = calculateNewsConfidence(item);

      totalScore += combinedScore * confidence;
      totalConfidence += confidence;

      // Adicionar fatores relevantes
      if (Math.abs(combinedScore) > 0.5) {
        factors.push(item.title);
      }
    }

    // Calcular impacto médio ponderado pela confiança
    const averageImpact = totalConfidence > 0 ? totalScore / totalConfidence : 0;

    // Converter score de sentimento para impacto percentual no preço
    // Usando uma escala conservadora de ±2% máximo
    const predictedImpact = currentPrice * (averageImpact * 0.02);

    return {
      predictedImpact,
      confidence: Math.min(totalConfidence / news.length, 1),
      mainFactors: factors.slice(0, 3) // Retornar até 3 fatores principais
    };
  } catch (error) {
    console.error('Erro ao calcular impacto do sentimento:', error);
    return {
      predictedImpact: 0,
      confidence: 0,
      mainFactors: []
    };
  }
}

// Função para analisar sentimento (versão mais completa)
export async function analyzeSentiment(text: string): Promise<SentimentAnalysis> {
  try {
    // Calcular score básico de sentimento
    const score = await analyzeSentimentScore(text);

    // Extrair palavras-chave relevantes
    const keywords = extractKeywords(text);

    // Identificar entidades mencionadas
    const entities = extractEntities(text);

    // Calcular magnitude do sentimento baseado na força das palavras usadas
    const magnitude = calculateMagnitude(text);

    return {
      score,
      magnitude,
      keywords,
      entities
    };
  } catch (error) {
    console.error('Erro na análise de sentimento:', error);
    return {
      score: 0,
      magnitude: 0,
      keywords: [],
      entities: []
    };
  }
}

// Funções auxiliares

function calculateNewsConfidence(news: MarketNews): number {
  let confidence = 0.5; // Base confidence

  // Ajustar com base na fonte
  if (news.source) {
    const reliableSources = ['Reuters', 'Bloomberg', 'Financial Times', 'Wall Street Journal'];
    if (reliableSources.includes(news.source)) {
      confidence += 0.2;
    }
  }

  // Ajustar com base no tempo (notícias mais recentes são mais relevantes)
  if (news.timestamp) {
    const ageInHours = (Date.now() - new Date(news.timestamp).getTime()) / (1000 * 60 * 60);
    if (ageInHours < 1) confidence += 0.2;
    else if (ageInHours < 4) confidence += 0.1;
    else if (ageInHours > 24) confidence -= 0.2;
  }

  return Math.max(0, Math.min(1, confidence));
}

function extractEntities(text: string): string[] {
  const entities = new Set<string>();
  
  // Lista de entidades conhecidas
  const knownEntities = [
    'Bitcoin', 'Ethereum', 'BTC', 'ETH', 'Binance', 'SEC', 'FED',
    'NASDAQ', 'NYSE', 'CVM', 'B3'
  ];

  // Procurar por entidades conhecidas no texto
  knownEntities.forEach(entity => {
    if (text.includes(entity)) {
      entities.add(entity);
    }
  });

  return Array.from(entities);
}

function calculateMagnitude(text: string): number {
  // Lista de intensificadores
  const intensifiers = [
    'muito', 'extremamente', 'fortemente', 'significativamente',
    'drasticamente', 'substancialmente', 'massivamente'
  ];

  // Contar intensificadores
  const intensifierCount = intensifiers.reduce((count, word) => 
    count + (text.toLowerCase().split(word).length - 1), 0
  );

  // Calcular magnitude baseada na presença de intensificadores
  return Math.min(1, 0.5 + (intensifierCount * 0.1));
} 
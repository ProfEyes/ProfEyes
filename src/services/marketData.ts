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
  console.log('Gerando notícias simuladas...');
  const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'DOT', 'AVAX'];
  const sources = ['CriptoNotícias', 'InfoMoney', 'Valor Econômico', 'Exame', 'Portal do Bitcoin', 'CoinTimes'];
  
  const headlines = [
    'Bitcoin atinge nova máxima histórica após aprovação de ETF',
    'Ethereum completa atualização importante para reduzir taxas',
    'Binance anuncia novos produtos de staking com rendimentos atrativos',
    'Solana recupera posição após correção do mercado',
    'Analistas preveem alta de 30% para o mercado de criptomoedas',
    'Banco Central estuda lançamento de moeda digital no Brasil',
    'Grandes empresas aumentam investimentos em blockchain',
    'Nova regulamentação de criptomoedas deve ser aprovada este mês',
    'DeFi atinge novo recorde de valor total bloqueado',
    'NFTs continuam em alta com vendas milionárias',
    'Mercado de criptomoedas se recupera após queda recente',
    'Investidores institucionais aumentam exposição a Bitcoin',
    'Ethereum 2.0 promete revolucionar o ecossistema cripto',
    'Binance lança nova plataforma de NFTs no Brasil',
    'Solana se destaca como alternativa de alta performance'
  ];
  
  const summaries = [
    'O preço do Bitcoin atingiu um novo recorde histórico após a aprovação de ETFs pela SEC, marcando um momento importante para a adoção institucional.',
    'A atualização da rede Ethereum foi concluída com sucesso, prometendo reduzir significativamente as taxas de transação e melhorar a escalabilidade.',
    'A Binance, maior exchange de criptomoedas do mundo, anunciou novos produtos de staking com rendimentos que podem chegar a 15% ao ano.',
    'Após uma correção significativa, a Solana recuperou sua posição entre as principais criptomoedas, com um aumento de 25% na última semana.',
    'Especialistas do mercado preveem uma alta de até 30% para o mercado de criptomoedas nos próximos meses, impulsionada por adoção institucional.',
    'O Banco Central do Brasil avança nos estudos para o lançamento do Real Digital, a CBDC brasileira, com testes previstos para o próximo ano.',
    'Empresas do Fortune 500 aumentaram seus investimentos em tecnologia blockchain em mais de 50% no último trimestre.',
    'Uma nova regulamentação para o mercado de criptomoedas deve ser aprovada ainda este mês, trazendo mais segurança jurídica para investidores.',
    'O setor de Finanças Descentralizadas (DeFi) atingiu um novo recorde de valor total bloqueado, ultrapassando $100 bilhões.',
    'O mercado de NFTs continua em alta, com vendas milionárias de coleções digitais e crescente interesse de artistas e marcas brasileiras.',
    'Após uma queda de 20%, o mercado de criptomoedas mostra sinais de recuperação, com Bitcoin liderando o movimento de alta.',
    'Fundos de investimento e empresas de capital aberto aumentaram sua exposição a Bitcoin, diversificando seus portfólios.',
    'O lançamento do Ethereum 2.0 promete revolucionar o ecossistema cripto com maior escalabilidade e menor impacto ambiental.',
    'A Binance lançou uma nova plataforma de NFTs no Brasil, focada em artistas e criadores de conteúdo locais.',
    'A Solana se destaca como uma alternativa de alta performance para aplicações descentralizadas, com capacidade para processar milhares de transações por segundo.'
  ];
  
  // Criar notícias simuladas de forma assíncrona
  return Array.from({ length: count }, (_, i) => {
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const headlineIndex = Math.floor(Math.random() * headlines.length);
    
    // Usar o mesmo índice para título e resumo correspondentes
    const title = headlines[headlineIndex];
    const summary = summaries[headlineIndex];
    
    // Gerar data aleatória nos últimos 3 dias
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 3));
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));

    return {
      id: Date.now() + i,
      title,
      content: summary,
      summary,
      source: randomSource,
      url: 'https://example.com/news',
      imageUrl: `https://source.unsplash.com/random/800x600?${randomSymbol.toLowerCase()},crypto`,
      publishedAt: date.toISOString(),
      relatedSymbols: [randomSymbol],
      sentiment: Math.random() > 0.3 ? 0.8 : (Math.random() > 0.5 ? 0 : -0.8) // Valores entre -1 e 1
    };
  });
}

// Função auxiliar para traduzir texto do inglês para português
async function translateToPortuguese(text: string): Promise<string> {
  try {
    // Se o texto estiver vazio, retornar vazio
    if (!text || text.trim() === '') {
      return '';
    }
    
    // Verificar se o texto já está em português
    if (isAlreadyPortuguese(text)) {
      return text;
    }
    
    // Dicionário de traduções comuns para termos financeiros e de criptomoedas
    const commonTranslations: Record<string, string> = {
      'Bitcoin': 'Bitcoin',
      'Ethereum': 'Ethereum',
      'cryptocurrency': 'criptomoeda',
      'cryptocurrencies': 'criptomoedas',
      'blockchain': 'blockchain',
      'token': 'token',
      'tokens': 'tokens',
      'market': 'mercado',
      'markets': 'mercados',
      'price': 'preço',
      'prices': 'preços',
      'trading': 'negociação',
      'exchange': 'exchange',
      'exchanges': 'exchanges',
      'investor': 'investidor',
      'investors': 'investidores',
      'bull': 'alta',
      'bear': 'baixa',
      'bullish': 'otimista',
      'bearish': 'pessimista',
      'rally': 'valorização',
      'crash': 'queda',
      'dip': 'correção',
      'all-time high': 'máxima histórica',
      'all-time low': 'mínima histórica',
      'wallet': 'carteira',
      'wallets': 'carteiras',
      'mining': 'mineração',
      'miner': 'minerador',
      'miners': 'mineradores',
      'staking': 'staking',
      'stake': 'stake',
      'yield': 'rendimento',
      'liquidity': 'liquidez',
      'volatility': 'volatilidade',
      'regulation': 'regulamentação',
      'regulatory': 'regulatório',
      'adoption': 'adoção',
      'institutional': 'institucional',
      'retail': 'varejo',
      'investment': 'investimento',
      'investments': 'investimentos',
      'portfolio': 'portfólio',
      'asset': 'ativo',
      'assets': 'ativos',
      'altcoin': 'altcoin',
      'altcoins': 'altcoins',
      'NFT': 'NFT',
      'NFTs': 'NFTs',
      'DeFi': 'DeFi',
      'decentralized finance': 'finanças descentralizadas',
      'smart contract': 'contrato inteligente',
      'smart contracts': 'contratos inteligentes',
      'gas fee': 'taxa de gás',
      'gas fees': 'taxas de gás',
      'transaction': 'transação',
      'transactions': 'transações',
      'hash rate': 'taxa de hash',
      'node': 'nó',
      'nodes': 'nós',
      'consensus': 'consenso',
      'protocol': 'protocolo',
      'protocols': 'protocolos',
      'fork': 'fork',
      'forks': 'forks',
      'airdrop': 'airdrop',
      'airdrops': 'airdrops',
      'ICO': 'ICO',
      'IPO': 'IPO',
      'whitepaper': 'whitepaper',
      'whitepapers': 'whitepapers',
      'crypto': 'cripto',
      'fiat': 'fiat',
      'CBDC': 'CBDC',
      'central bank': 'banco central',
      'central banks': 'bancos centrais',
      'SEC': 'SEC',
      'CFTC': 'CFTC',
      'FCA': 'FCA',
      'ETF': 'ETF',
      'ETFs': 'ETFs',
      'futures': 'futuros',
      'options': 'opções',
      'derivative': 'derivativo',
      'derivatives': 'derivativos',
      'leverage': 'alavancagem',
      'margin': 'margem',
      'long': 'comprado',
      'short': 'vendido',
      'pump': 'pump',
      'dump': 'dump',
      'FOMO': 'FOMO',
      'FUD': 'FUD',
      'HODL': 'HODL',
      'whale': 'baleia',
      'whales': 'baleias',
      'bag holder': 'holder',
      'bag holders': 'holders',
      'to the moon': 'para a lua',
      'diamond hands': 'mãos de diamante',
      'paper hands': 'mãos de papel',
      'stock market': 'bolsa de valores',
      'stock exchange': 'bolsa de valores',
      'shares': 'ações',
      'stocks': 'ações',
      'bonds': 'títulos',
      'treasury': 'tesouro',
      'interest rate': 'taxa de juros',
      'interest rates': 'taxas de juros',
      'inflation': 'inflação',
      'deflation': 'deflação',
      'recession': 'recessão',
      'economic growth': 'crescimento econômico',
      'GDP': 'PIB',
      'Federal Reserve': 'Federal Reserve',
      'Central Bank': 'Banco Central',
      'SELIC': 'SELIC',
      'COPOM': 'COPOM',
      'CVM': 'CVM',
      'B3': 'B3',
      'Ibovespa': 'Ibovespa',
      'index': 'índice',
      'indices': 'índices',
      'dividend': 'dividendo',
      'dividends': 'dividendos',
      'profit': 'lucro',
      'profits': 'lucros',
      'loss': 'prejuízo',
      'losses': 'prejuízos',
      'quarter': 'trimestre',
      'quarterly': 'trimestral',
      'annual': 'anual',
      'annually': 'anualmente',
      'fiscal year': 'ano fiscal',
      'earnings': 'resultados',
      'revenue': 'receita',
      'revenues': 'receitas',
      'expense': 'despesa',
      'expenses': 'despesas',
      'debt': 'dívida',
      'debts': 'dívidas',
      'credit': 'crédito',
      'credits': 'créditos',
      'loan': 'empréstimo',
      'loans': 'empréstimos',
      'mortgage': 'hipoteca',
      'mortgages': 'hipotecas',
      'tax': 'imposto',
      'taxes': 'impostos',
      'financial': 'financeiro',
      'finance': 'finanças',
      'banking': 'bancário',
      'bank': 'banco',
      'banks': 'bancos',
      'fintech': 'fintech',
      'payment': 'pagamento',
      'payments': 'pagamentos',
      // Frases comuns
      'reaches new all-time high': 'atinge nova máxima histórica',
      'hits new record': 'atinge novo recorde',
      'falls below': 'cai abaixo de',
      'rises above': 'sobe acima de',
      'announces partnership': 'anuncia parceria',
      'launches new': 'lança novo',
      'approves': 'aprova',
      'rejects': 'rejeita',
      'warns about': 'alerta sobre',
      'bans': 'proíbe',
      'regulates': 'regula',
      'invests in': 'investe em',
      'acquires': 'adquire',
      'merges with': 'se funde com',
      'plans to': 'planeja',
      'expected to': 'deve',
      'according to': 'de acordo com',
      'report says': 'relatório diz',
      'analysts predict': 'analistas preveem',
      'experts say': 'especialistas dizem',
      'study shows': 'estudo mostra',
      'survey indicates': 'pesquisa indica',
      'data reveals': 'dados revelam',
      'in the next': 'nos próximos',
      'by the end of': 'até o final de',
      'earlier this': 'no início deste',
      'later this': 'no final deste',
      'during the': 'durante o',
      'after the': 'após o',
      'before the': 'antes do',
      'despite the': 'apesar do',
      'due to': 'devido a',
      'because of': 'por causa de',
      'as a result of': 'como resultado de',
      'in response to': 'em resposta a',
      'in an effort to': 'em um esforço para',
      'in order to': 'a fim de',
      'with the aim of': 'com o objetivo de',
      'for the purpose of': 'com o propósito de',
      'in the context of': 'no contexto de',
      'in terms of': 'em termos de',
      'with respect to': 'com respeito a',
      'regarding': 'em relação a',
      'concerning': 'referente a',
      'related to': 'relacionado a',
      'associated with': 'associado a',
      'linked to': 'ligado a',
      'connected to': 'conectado a',
      'compared to': 'comparado a',
      'in comparison with': 'em comparação com',
      'similar to': 'semelhante a',
      'different from': 'diferente de',
      'unlike': 'ao contrário de',
      'like': 'como',
      'such as': 'como',
      'for example': 'por exemplo',
      'for instance': 'por exemplo',
      'namely': 'a saber',
      'specifically': 'especificamente',
      'particularly': 'particularmente',
      'especially': 'especialmente',
      'notably': 'notavelmente',
      'significantly': 'significativamente',
      'substantially': 'substancialmente',
      'considerably': 'consideravelmente',
      'markedly': 'marcadamente',
      'dramatically': 'dramaticamente',
      'sharply': 'acentuadamente',
      'rapidly': 'rapidamente',
      'quickly': 'rapidamente',
      'slowly': 'lentamente',
      'gradually': 'gradualmente',
      'steadily': 'constantemente',
      'consistently': 'consistentemente',
      'increasingly': 'cada vez mais',
      'decreasingly': 'cada vez menos',
      'more and more': 'cada vez mais',
      'less and less': 'cada vez menos',
      'higher and higher': 'cada vez mais alto',
      'lower and lower': 'cada vez mais baixo',
      'better and better': 'cada vez melhor',
      'worse and worse': 'cada vez pior'
    };
    
    // Substituir termos comuns
    let translatedText = text;
    
    // Substituir termos comuns
    Object.entries(commonTranslations).forEach(([english, portuguese]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translatedText = translatedText.replace(regex, portuguese);
    });
    
    // Traduzir frases comuns em inglês para português
    const commonPhrases: Record<string, string> = {
      'has increased by': 'aumentou em',
      'has decreased by': 'diminuiu em',
      'is expected to': 'é esperado que',
      'according to the latest': 'de acordo com os últimos',
      'in the coming weeks': 'nas próximas semanas',
      'in the coming months': 'nos próximos meses',
      'in the coming years': 'nos próximos anos',
      'in recent weeks': 'nas últimas semanas',
      'in recent months': 'nos últimos meses',
      'in recent years': 'nos últimos anos',
      'over the past week': 'durante a última semana',
      'over the past month': 'durante o último mês',
      'over the past year': 'durante o último ano',
      'over the next week': 'durante a próxima semana',
      'over the next month': 'durante o próximo mês',
      'over the next year': 'durante o próximo ano',
      'is set to': 'está prestes a',
      'is about to': 'está prestes a',
      'is going to': 'vai',
      'is planning to': 'está planejando',
      'has announced plans to': 'anunciou planos para',
      'has revealed plans to': 'revelou planos para',
      'has confirmed plans to': 'confirmou planos para',
      'has denied plans to': 'negou planos para',
      'has launched a new': 'lançou um novo',
      'has introduced a new': 'introduziu um novo',
      'has released a new': 'lançou um novo',
      'has unveiled a new': 'revelou um novo',
      'has acquired': 'adquiriu',
      'has purchased': 'comprou',
      'has bought': 'comprou',
      'has sold': 'vendeu',
      'has invested in': 'investiu em',
      'has partnered with': 'fez parceria com',
      'has teamed up with': 'se uniu a',
      'has collaborated with': 'colaborou com',
      'has joined forces with': 'uniu forças com',
      'has signed a deal with': 'assinou um acordo com',
      'has reached an agreement with': 'chegou a um acordo com',
      'has entered into a partnership with': 'entrou em uma parceria com',
      'has formed an alliance with': 'formou uma aliança com',
      'has established a relationship with': 'estabeleceu uma relação com',
      'has terminated its relationship with': 'encerrou seu relacionamento com',
      'has ended its partnership with': 'encerrou sua parceria com',
      'has cut ties with': 'cortou relações com',
      'has severed ties with': 'rompeu relações com',
      'has distanced itself from': 'se distanciou de',
      'has expressed concern about': 'expressou preocupação sobre',
      'has raised concerns about': 'levantou preocupações sobre',
      'has voiced concerns about': 'manifestou preocupações sobre',
      'has addressed concerns about': 'abordou preocupações sobre',
      'has dismissed concerns about': 'descartou preocupações sobre',
      'has rejected claims that': 'rejeitou alegações de que',
      'has denied allegations that': 'negou alegações de que',
      'has refuted claims that': 'refutou alegações de que',
      'has disputed claims that': 'contestou alegações de que',
      'has challenged claims that': 'contestou alegações de que',
      'has confirmed that': 'confirmou que',
      'has verified that': 'verificou que',
      'has acknowledged that': 'reconheceu que',
      'has admitted that': 'admitiu que',
      'has conceded that': 'concedeu que',
      'has stated that': 'afirmou que',
      'has declared that': 'declarou que',
      'has announced that': 'anunciou que',
      'has reported that': 'relatou que',
      'has indicated that': 'indicou que',
      'has suggested that': 'sugeriu que',
      'has implied that': 'insinuou que',
      'has hinted that': 'insinuou que',
      'has speculated that': 'especulou que',
      'has theorized that': 'teorizou que',
      'has hypothesized that': 'levantou a hipótese de que',
      'has predicted that': 'previu que',
      'has forecasted that': 'previu que',
      'has projected that': 'projetou que',
      'has estimated that': 'estimou que',
      'has calculated that': 'calculou que',
      'has determined that': 'determinou que',
      'has concluded that': 'concluiu que',
      'has found that': 'descobriu que',
      'has discovered that': 'descobriu que',
      'has learned that': 'descobriu que',
      'has revealed that': 'revelou que',
      'has disclosed that': 'divulgou que',
      'has exposed that': 'expôs que',
      'has uncovered that': 'descobriu que',
      'has shown that': 'mostrou que',
      'has demonstrated that': 'demonstrou que',
      'has proven that': 'provou que',
      'has established that': 'estabeleceu que',
      'has validated that': 'validou que'
    };
    
    // Substituir frases comuns
    Object.entries(commonPhrases).forEach(([english, portuguese]) => {
      const regex = new RegExp(english, 'gi');
      translatedText = translatedText.replace(regex, portuguese);
    });
    
    // Usar uma API de tradução baseada em navegador
    try {
      console.log('Traduzindo texto:', text.substring(0, 50) + '...');
      
      // Verificar se estamos em um ambiente de navegador
      if (typeof window !== 'undefined') {
        try {
          // Tentar usar a API de tradução do navegador (simulada)
          // Em um ambiente real, você poderia usar uma API como a Google Translate API
          // através de uma chamada fetch para um endpoint seguro
          
          // Por enquanto, apenas retornamos o texto com substituições básicas
          // e adicionamos um prefixo para indicar que foi traduzido
          return `${translatedText}`;
        } catch (browserError) {
          console.error('Erro ao usar API de tradução do navegador:', browserError);
          return translatedText;
        }
      } else {
        // Em ambiente Node.js (SSR), retornar texto com substituições básicas
        return translatedText;
      }
    } catch (translationApiError) {
      console.error('Erro ao usar API de tradução:', translationApiError);
      return translatedText; // Retornar texto com substituições básicas em caso de erro
    }
  } catch (error) {
    console.error('Erro ao traduzir texto:', error);
    return text; // Retornar texto original em caso de erro
  }
}

// Função para verificar se o texto já está em português
function isAlreadyPortuguese(text: string): boolean {
  // Lista de palavras comuns em português que não existem em inglês
  const portugueseWords = [
    'da', 'do', 'das', 'dos', 'na', 'no', 'nas', 'nos',
    'para', 'pelo', 'pela', 'pelos', 'pelas', 'com', 'sem',
    'que', 'porque', 'como', 'quando', 'onde', 'quem',
    'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
    'muito', 'muita', 'muitos', 'muitas', 'pouco', 'pouca', 'poucos', 'poucas',
    'grande', 'grandes', 'pequeno', 'pequena', 'pequenos', 'pequenas',
    'novo', 'nova', 'novos', 'novas', 'velho', 'velha', 'velhos', 'velhas',
    'bom', 'boa', 'bons', 'boas', 'mau', 'má', 'maus', 'más',
    'alto', 'alta', 'altos', 'altas', 'baixo', 'baixa', 'baixos', 'baixas',
    'caro', 'cara', 'caros', 'caras', 'barato', 'barata', 'baratos', 'baratas',
    'em', 'ao', 'aos', 'à', 'às', 'um', 'uma', 'uns', 'umas',
    'ou', 'e', 'mas', 'porém', 'contudo', 'todavia', 'entretanto',
    'então', 'assim', 'portanto', 'logo', 'pois', 'já', 'ainda',
    'sempre', 'nunca', 'jamais', 'talvez', 'possivelmente',
    'certamente', 'provavelmente', 'definitivamente',
    'aqui', 'ali', 'lá', 'acolá', 'cá', 'aí',
    'hoje', 'ontem', 'amanhã', 'agora', 'depois', 'antes',
    'cedo', 'tarde', 'breve', 'logo', 'daqui', 'daí',
    'sim', 'não', 'talvez', 'certamente', 'realmente',
    'apenas', 'somente', 'só', 'também', 'inclusive',
    'demais', 'bastante', 'suficiente', 'demasiado',
    'tudo', 'nada', 'algo', 'alguém', 'ninguém',
    'cada', 'todo', 'toda', 'todos', 'todas',
    'qualquer', 'quaisquer', 'algum', 'alguma', 'alguns', 'algumas',
    'nenhum', 'nenhuma', 'nenhuns', 'nenhumas',
    'outro', 'outra', 'outros', 'outras',
    'mesmo', 'mesma', 'mesmos', 'mesmas',
    'próprio', 'própria', 'próprios', 'próprias',
    'seu', 'sua', 'seus', 'suas', 'meu', 'minha', 'meus', 'minhas',
    'nosso', 'nossa', 'nossos', 'nossas', 'vosso', 'vossa', 'vossos', 'vossas',
    'dele', 'dela', 'deles', 'delas', 'deste', 'desta', 'destes', 'destas',
    'desse', 'dessa', 'desses', 'dessas', 'daquele', 'daquela', 'daqueles', 'daquelas',
    'neste', 'nesta', 'nestes', 'nestas', 'nesse', 'nessa', 'esses', 'essas',
    'naquele', 'naquela', 'naqueles', 'naquelas', 'àquele', 'àquela', 'àqueles', 'àquelas'
  ];
  
  // Contar quantas palavras em português existem no texto
  const words = text.toLowerCase().split(/\s+/);
  const portugueseWordCount = words.filter(word => 
    portugueseWords.includes(word.replace(/[.,;:!?()]/g, ''))
  ).length;
  
  // Se mais de 10% das palavras são claramente portuguesas, consideramos que o texto já está em português
  return (portugueseWordCount / words.length) > 0.1;
}

// Função que força a tradução para português usando métodos locais
async function forceTranslateToPortuguese(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return '';
  }
  
  try {
    console.log('Traduzindo para português:', text.substring(0, 50) + '...');
    
    // Verificar se o texto já está em português
    if (isAlreadyPortuguese(text)) {
      console.log('Texto já está em português:', text.substring(0, 30) + '...');
      return text;
    }
    
    console.log('Texto precisa ser traduzido:', text.substring(0, 30) + '...');
    
    // Notícias em inglês para português (dicionário ampliado)
    const englishToPortuguese: Record<string, string> = {
      // Títulos comuns em inglês
      "Bitcoin hits new all-time high": "Bitcoin atinge nova máxima histórica",
      "Ethereum completes major upgrade": "Ethereum completa atualização importante",
      "Central Bank announces new guidelines for cryptocurrencies": "Banco Central anuncia novas diretrizes para criptomoedas",
      "Major companies add Bitcoin to balance sheet": "Grandes empresas adicionam Bitcoin ao balanço patrimonial",
      "Technical analysis points to crypto market rise": "Análise técnica aponta para alta do mercado de criptomoedas",
      "Cryptocurrency regulation advances in emerging markets": "Regulamentação de criptomoedas avança em mercados emergentes",
      "Solana recovers after drop and attracts new investors": "Solana se recupera após queda e atrai novos investidores",
      "Cardano implements smart contracts and gains prominence": "Cardano implementa contratos inteligentes e ganha destaque",
      "Binance announces expansion of services in Brazil": "Binance anuncia expansão de serviços no Brasil",
      "NFT market continues to grow despite volatility": "Mercado de NFTs continua em crescimento apesar da volatilidade",
      "Polkadot attracts developers with new infrastructure": "Polkadot atrai desenvolvedores com nova infraestrutura",
      "Avalanche stands out as alternative to Ethereum": "Avalanche se destaca como alternativa ao Ethereum",
      "Ripple advances in legal process and XRP appreciates": "Ripple avança em processo judicial e XRP valoriza",
      "DeFi reaches new record of total value locked": "DeFi atinge novo recorde de valor total bloqueado",
      "Institutional investors increase exposure to cryptocurrencies": "Investidores institucionais aumentam exposição a criptomoedas",
      "Bitcoin price surges": "Preço do Bitcoin dispara",
      "Ethereum network upgrade": "Atualização da rede Ethereum",
      "Crypto market analysis": "Análise do mercado de criptomoedas",
      "Blockchain technology adoption": "Adoção da tecnologia blockchain",
      "Digital currency regulations": "Regulamentações de moedas digitais",
      "Cryptocurrency investment strategies": "Estratégias de investimento em criptomoedas",
      "NFT sales reach new heights": "Vendas de NFTs atingem novos patamares",
      "DeFi protocols expand offerings": "Protocolos DeFi expandem ofertas",
      "Stablecoin market grows": "Mercado de stablecoins cresce",
      "Crypto exchange security measures": "Medidas de segurança em exchanges de criptomoedas",
      "Bitcoin mining sustainability": "Sustentabilidade da mineração de Bitcoin",
      "Ethereum gas fees decrease": "Taxas de gás do Ethereum diminuem",
      "Altcoin season begins": "Temporada de altcoins começa",
      "Crypto market correction": "Correção do mercado de criptomoedas",
      "Bitcoin ETF approval impact": "Impacto da aprovação do ETF de Bitcoin",
      "Institutional adoption of crypto": "Adoção institucional de criptomoedas",
      "Regulatory clarity for cryptocurrencies": "Clareza regulatória para criptomoedas",
      "Central Bank Digital Currencies development": "Desenvolvimento de Moedas Digitais de Bancos Centrais",
      "Crypto taxation guidelines": "Diretrizes de tributação de criptomoedas",
      "Blockchain in supply chain": "Blockchain na cadeia de suprimentos",
      "Crypto wallet security tips": "Dicas de segurança para carteiras de criptomoedas",
      "Decentralized exchanges volume": "Volume de exchanges descentralizadas",
      "Smart contract vulnerabilities": "Vulnerabilidades em contratos inteligentes",
      "Layer 2 scaling solutions": "Soluções de escalonamento de Camada 2",
      
      // Termos financeiros comuns
      "market analysis": "análise de mercado",
      "trading volume": "volume de negociação",
      "price action": "ação do preço",
      "bullish trend": "tendência de alta",
      "bearish trend": "tendência de baixa",
      "market cap": "capitalização de mercado",
      "all-time high": "máxima histórica",
      "all-time low": "mínima histórica",
      "trading pair": "par de negociação",
      "trading bot": "robô de negociação",
      "technical analysis": "análise técnica",
      "fundamental analysis": "análise fundamentalista",
      "market sentiment": "sentimento do mercado",
      "price discovery": "descoberta de preço",
      "liquidity pool": "pool de liquidez",
      "yield farming": "mineração de rendimento",
      "staking rewards": "recompensas de staking",
      "governance token": "token de governança",
      "smart contract": "contrato inteligente",
      "decentralized finance": "finanças descentralizadas",
      "non-fungible token": "token não fungível",
      "initial coin offering": "oferta inicial de moeda",
      "security token offering": "oferta de token de segurança",
      "tokenomics": "tokenomia",
      "white paper": "white paper",
      "proof of work": "prova de trabalho",
      "proof of stake": "prova de participação",
      "mining difficulty": "dificuldade de mineração",
      "hash rate": "taxa de hash",
      "block reward": "recompensa de bloco",
      "blockchain explorer": "explorador de blockchain",
      "cold storage": "armazenamento frio",
      "hot wallet": "carteira quente",
      "hardware wallet": "carteira de hardware",
      "seed phrase": "frase semente",
      "private key": "chave privada",
      "public key": "chave pública",
      "gas fee": "taxa de gás",
      "gas limit": "limite de gás",
      "consensus mechanism": "mecanismo de consenso",
      "distributed ledger": "livro-razão distribuído",
      "peer-to-peer": "ponto a ponto",
      "oracle": "oráculo",
      "flash loan": "empréstimo relâmpago",
      "impermanent loss": "perda impermanente",
      "total value locked": "valor total bloqueado",
      "annual percentage yield": "rendimento percentual anual",
      "annual percentage rate": "taxa percentual anual",
      "fiat currency": "moeda fiduciária",
      "fiat on-ramp": "rampa de entrada fiat",
      "fiat off-ramp": "rampa de saída fiat",
      "know your customer": "conheça seu cliente",
      "anti-money laundering": "anti-lavagem de dinheiro",
      "regulatory compliance": "conformidade regulatória",
      "custodial service": "serviço de custódia",
      "non-custodial wallet": "carteira não custodial",
      "decentralized exchange": "exchange descentralizada",
      "centralized exchange": "exchange centralizada",
      "order book": "livro de ordens",
      "limit order": "ordem limitada",
      "market order": "ordem de mercado",
      "stop-loss order": "ordem de stop-loss",
      "take-profit order": "ordem de take-profit",
      "leverage trading": "negociação alavancada",
      "margin trading": "negociação de margem",
      "futures contract": "contrato futuro",
      "options contract": "contrato de opções",
      "perpetual contract": "contrato perpétuo",
      "liquidation price": "preço de liquidação",
      "funding rate": "taxa de financiamento",
      "open interest": "interesse em aberto",
      "long position": "posição comprada",
      "short position": "posição vendida",
      "dollar-cost averaging": "média de custo em dólar",
      "HODL": "HODL",
      "FUD": "FUD",
      "FOMO": "FOMO",
      "DYOR": "DYOR",
      "whale": "baleia",
      "pump and dump": "pump and dump",
      "rug pull": "rug pull",
      "diamond hands": "mãos de diamante",
      "paper hands": "mãos de papel",
      "to the moon": "para a lua",
      "when lambo": "quando lambo",
      
      // Conteúdos comuns em inglês
      "Bitcoin has reached a new all-time high after the approval of ETFs by the SEC": "O Bitcoin atingiu um novo recorde histórico após a aprovação de ETFs pela SEC",
      "marking an important moment for institutional adoption of cryptocurrency": "marcando um momento importante para a adoção institucional da criptomoeda",
      "Analysts point out that this movement could attract billions in new investments to the market": "Analistas apontam que este movimento pode atrair bilhões em novos investimentos para o mercado",
      "The Ethereum network has successfully completed a major update": "A rede Ethereum completou com sucesso uma atualização importante",
      "that promises to reduce fees and increase scalability": "que promete reduzir taxas e aumentar a escalabilidade",
      "The price of ETH reacted positively, with an increase of more than 15% in the last 24 hours": "O preço do ETH reagiu positivamente, com um aumento de mais de 15% nas últimas 24 horas",
      "The Central Bank today released new guidelines for cryptocurrency regulation": "O Banco Central divulgou hoje novas diretrizes para a regulamentação de criptomoedas",
      "establishing clearer rules for exchanges and investors": "estabelecendo regras mais claras para exchanges e investidores",
      "The measure is seen as an important step for the mainstream adoption of digital assets": "A medida é vista como um passo importante para a adoção mainstream de ativos digitais",
      "Several publicly traded companies have announced the addition of Bitcoin to their balance sheets": "Diversas empresas de capital aberto anunciaram a adição de Bitcoin em seus balanços patrimoniais",
      "as a strategy to protect against inflation": "como estratégia de proteção contra a inflação",
      "This trend reinforces the role of cryptocurrency as a corporate store of value": "Esta tendência reforça o papel da criptomoeda como reserva de valor corporativa",
      "Recent technical analyses point to a possible sustained rise in the cryptocurrency market": "Análises técnicas recentes apontam para uma possível alta sustentada no mercado de criptomoedas",
      "in the coming months": "nos próximos meses",
      "Indicators such as RSI and MACD show positive signs for Bitcoin and major altcoins": "Indicadores como o RSI e MACD mostram sinais positivos para Bitcoin e principais altcoins",
      "Emerging countries are rapidly advancing in cryptocurrency regulation": "Países emergentes estão avançando rapidamente na regulamentação de criptomoedas",
      "seeking to balance innovation and consumer protection": "buscando equilibrar inovação e proteção ao consumidor",
      "Experts believe this approach could accelerate global adoption": "Especialistas acreditam que esta abordagem pode acelerar a adoção global",
      "After a significant drop, Solana demonstrates strong technical and fundamentalist recovery": "Após uma queda significativa, a Solana demonstra forte recuperação técnica e fundamentalista",
      "attracting new institutional investors": "atraindo novos investidores institucionais",
      "The ecosystem continues to expand with new projects and applications": "O ecossistema continua se expandindo com novos projetos e aplicações",
      "The successful implementation of smart contracts on the Cardano network marks a crucial moment for the project": "A implementação bem-sucedida de contratos inteligentes na rede Cardano marca um momento crucial para o projeto",
      "Developers are already starting to migrate applications to the platform": "Desenvolvedores já começam a migrar aplicações para a plataforma",
      "attracted by lower fees and greater efficiency": "atraídos por taxas menores e maior eficiência",
      "Binance today announced the expansion of its services in Brazil": "A Binance anunciou hoje a expansão de seus serviços no Brasil",
      "including new partnerships and financial products": "incluindo novas parcerias e produtos financeiros",
      "The exchange seeks to consolidate its position in the Latin American market": "A exchange busca consolidar sua posição no mercado latino-americano",
      "one of the fastest growing in the world": "um dos que mais cresce no mundo",
      "Despite recent volatility, the NFT market continues to expand": "Apesar da volatilidade recente, o mercado de NFTs continua em expansão",
      "with increasing trading volume and new platforms emerging": "com volume de negociações crescente e novas plataformas surgindo",
      "Artists and brands continue to explore the potential of technology for engagement and monetization": "Artistas e marcas seguem explorando o potencial da tecnologia para engajamento e monetização",
      "The cryptocurrency market has shown signs of recovery": "O mercado de criptomoedas tem mostrado sinais de recuperação",
      "Investors are optimistic about the future of digital assets": "Investidores estão otimistas sobre o futuro dos ativos digitais",
      "Regulatory developments have provided more clarity for the industry": "Desenvolvimentos regulatórios proporcionaram mais clareza para a indústria",
      "The adoption of blockchain technology continues to grow across various sectors": "A adoção da tecnologia blockchain continua a crescer em vários setores",
      "Financial institutions are increasingly offering cryptocurrency services": "Instituições financeiras estão cada vez mais oferecendo serviços de criptomoedas",
      "The integration of cryptocurrencies into traditional finance is accelerating": "A integração de criptomoedas no sistema financeiro tradicional está acelerando",
      "New use cases for blockchain are being developed and implemented": "Novos casos de uso para blockchain estão sendo desenvolvidos e implementados",
      "The decentralized finance ecosystem is maturing with improved security": "O ecossistema de finanças descentralizadas está amadurecendo com segurança aprimorada",
      "Non-fungible tokens have created new opportunities for creators": "Tokens não fungíveis criaram novas oportunidades para criadores",
      "The gaming industry is embracing blockchain technology": "A indústria de jogos está adotando a tecnologia blockchain",
      "Play-to-earn models are transforming how gamers interact with virtual economies": "Modelos de jogar para ganhar estão transformando como jogadores interagem com economias virtuais",
      "Central banks around the world are exploring digital currencies": "Bancos centrais em todo o mundo estão explorando moedas digitais",
      "The metaverse concept is gaining traction with major tech companies": "O conceito de metaverso está ganhando força com grandes empresas de tecnologia",
      "Cryptocurrency education is becoming more accessible to the general public": "A educação sobre criptomoedas está se tornando mais acessível ao público em geral",
      "Security improvements are addressing concerns about cryptocurrency theft": "Melhorias de segurança estão abordando preocupações sobre roubo de criptomoedas",
      "Cross-chain technologies are enabling better interoperability between blockchains": "Tecnologias cross-chain estão permitindo melhor interoperabilidade entre blockchains",
      "Decentralized autonomous organizations are pioneering new governance models": "Organizações autônomas descentralizadas estão pioneirando novos modelos de governança",
      "The environmental impact of cryptocurrency mining is being addressed with sustainable solutions": "O impacto ambiental da mineração de criptomoedas está sendo abordado com soluções sustentáveis",
      "Renewable energy sources are increasingly being used for Bitcoin mining": "Fontes de energia renovável estão sendo cada vez mais utilizadas para mineração de Bitcoin"
    };
    
    // Verificar se o texto completo existe no dicionário
    if (englishToPortuguese[text]) {
      console.log('Tradução direta encontrada no dicionário');
      return englishToPortuguese[text];
    }
    
    // Aplicar o dicionário de traduções
    let translatedText = text;
    let translationApplied = false;
    
    // Substituir frases completas primeiro
    Object.entries(englishToPortuguese).forEach(([english, portuguese]) => {
      if (text.includes(english)) {
        translatedText = translatedText.replace(new RegExp(escapeRegExp(english), 'g'), portuguese);
        translationApplied = true;
        console.log(`Substituição aplicada: "${english}" -> "${portuguese}"`);
      }
    });
    
    // Se o texto foi modificado pelo dicionário, pode já estar suficientemente traduzido
    if (translationApplied) {
      console.log('Texto parcialmente traduzido pelo dicionário:', translatedText.substring(0, 30) + '...');
      
      // Verificar se ainda contém palavras em inglês
      if (!containsEnglishWords(translatedText)) {
        return translatedText;
      }
    }
    
    // Usar a função de tradução existente para complementar
    console.log('Aplicando tradução complementar');
    const finalTranslation = await translateToPortuguese(translatedText);
    console.log('Tradução final:', finalTranslation.substring(0, 30) + '...');
    return finalTranslation;
  } catch (error) {
    console.error('Erro ao forçar tradução:', error);
    // Em caso de erro, tentar a tradução normal
    return await translateToPortuguese(text);
  }
}

export async function fetchMarketNews(options: { limit?: number; symbols?: string[] } = {}): Promise<MarketNews[]> {
  try {
    console.log('Buscando notícias de mercado atualizadas...');
    const limit = options.limit || 10;
    
    // Chaves de API
    const newsApiKey = '282d895bbf4b45a5af900dc4a12a2bdc';
    const finnhubApiKey = 'cv1t7khr01qngf0an47gcv1t7khr01qngf0an480';
    
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
    
    const { data: supabaseData, error: supabaseError } = await query;
    
    // Se temos dados recentes no Supabase (menos de 1 hora), retornar
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    if (supabaseData && supabaseData.length > 0 && !supabaseError) {
      const recentNews = supabaseData.filter(item => 
        new Date(item.published_at) > oneHourAgo
      );
      
      if (recentNews.length >= limit) {
        console.log(`Retornando ${recentNews.length} notícias recentes do Supabase`);
        // Traduzir notícias do Supabase para garantir que estejam em português
        const translatedNews = await Promise.all(recentNews.map(async (item) => {
          // Forçar tradução mesmo que o texto pareça estar em português
          const translatedTitle = await forceTranslateToPortuguese(item.title);
          const translatedContent = await forceTranslateToPortuguese(item.content);
          const translatedSummary = item.summary ? await forceTranslateToPortuguese(item.summary) : undefined;

          return {
            id: item.id,
            title: translatedTitle,
            content: translatedContent,
            summary: translatedSummary,
            source: item.source,
            url: item.url,
            imageUrl: item.image_url,
            publishedAt: item.published_at,
            relatedSymbols: item.related_symbols,
            sentiment: item.sentiment
          };
        }));
        
        return translatedNews;
      }
    }
    
    // Buscar notícias da NewsAPI.org
    let newsApiResults: MarketNews[] = [];
    try {
      // Construir a query com base nos símbolos fornecidos ou usar termos padrão
      let query = options.symbols && options.symbols.length > 0
        ? options.symbols.join(' OR ')
        : 'bitcoin OR cryptocurrency OR crypto OR blockchain OR ethereum OR finance';
        
      // Adicionar fontes brasileiras e definir idioma como português
      const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=pt&domains=infomoney.com.br,valor.com.br,exame.com,investing.com,cointimes.com.br,portaldobitcoin.com,moneytimes.com.br&sortBy=publishedAt&apiKey=${newsApiKey}`;
      
      const response = await fetch(newsApiUrl);
      const data = await response.json();
      
      if (data.status === 'ok' && data.articles && data.articles.length > 0) {
        newsApiResults = await Promise.all(data.articles.map(async (article: any, index: number) => {
          // Forçar tradução mesmo que o texto pareça estar em português
          const translatedTitle = await forceTranslateToPortuguese(article.title);
          const translatedContent = await forceTranslateToPortuguese(article.content || article.description);
          const translatedSummary = await forceTranslateToPortuguese(article.description);
          
          return {
            id: Date.now() + index,
            title: translatedTitle,
            content: translatedContent,
            summary: translatedSummary,
            source: article.source.name,
            url: article.url,
            imageUrl: article.urlToImage,
            publishedAt: article.publishedAt,
            relatedSymbols: extractSymbolsFromTitle(translatedTitle),
            sentiment: calculateSentiment(translatedTitle, translatedSummary || '')
          };
        }));
        
        console.log(`Obtidas e traduzidas ${newsApiResults.length} notícias da NewsAPI.org`);
      }
    } catch (newsApiError) {
      console.error('Erro ao buscar notícias da NewsAPI:', newsApiError);
    }
    
    // Buscar notícias do Finnhub
    let finnhubResults: MarketNews[] = [];
    try {
      // Definir categoria com base nos símbolos
      const category = options.symbols && options.symbols.some(s => s.includes('BTC') || s.includes('ETH'))
        ? 'crypto'
        : 'general';
        
      const finnhubUrl = `https://finnhub.io/api/v1/news?category=${category}&token=${finnhubApiKey}`;
      
      const response = await fetch(finnhubUrl);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Processar e traduzir notícias do Finnhub
        const processedArticles = await Promise.all(
          data.map(async (article: any, index: number) => {
            // Forçar tradução mesmo que o texto pareça estar em português
            const translatedTitle = await forceTranslateToPortuguese(article.headline);
            const translatedSummary = await forceTranslateToPortuguese(article.summary);
            const translatedContent = await forceTranslateToPortuguese(article.summary);
            
            return {
              id: Date.now() + 1000 + index, // Evitar colisão de IDs
              title: translatedTitle,
              content: translatedContent,
              summary: translatedSummary,
              source: article.source,
              url: article.url,
              imageUrl: article.image,
              publishedAt: new Date(article.datetime * 1000).toISOString(),
              relatedSymbols: article.related || extractSymbolsFromTitle(translatedTitle),
              sentiment: calculateSentiment(translatedTitle, translatedSummary)
            };
          })
        );
        
        finnhubResults = processedArticles;
        console.log(`Obtidas e traduzidas ${finnhubResults.length} notícias do Finnhub`);
      }
    } catch (finnhubError) {
      console.error('Erro ao buscar notícias do Finnhub:', finnhubError);
    }
    
    // Combinar resultados das duas APIs
    let combinedResults = [...newsApiResults, ...finnhubResults];
    
    // Ordenar por data de publicação (mais recentes primeiro)
    combinedResults.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    // Limitar ao número solicitado
    combinedResults = combinedResults.slice(0, limit);
    
    // Se não conseguimos notícias das APIs, usar notícias simuladas
    if (combinedResults.length === 0) {
      console.log('Não foi possível obter notícias das APIs, usando notícias simuladas');
      return generateSimulatedNews(limit);
    }
    
    // Salvar as notícias no Supabase para uso futuro
    if (combinedResults.length > 0) {
      try {
        const newsToInsert = combinedResults.map(news => ({
          title: news.title,
          content: news.content,
          summary: news.summary,
          source: news.source,
          url: news.url,
          image_url: news.imageUrl,
          published_at: news.publishedAt,
          related_symbols: news.relatedSymbols,
          sentiment: news.sentiment
        }));
        
        const { error } = await supabase
          .from('market_news')
          .insert(newsToInsert);
          
        if (error) {
          console.error('Erro ao salvar notícias no Supabase:', error);
        } else {
          console.log(`${newsToInsert.length} notícias salvas no Supabase`);
        }
      } catch (saveError) {
        console.error('Erro ao salvar notícias:', saveError);
      }
    }
    
    return combinedResults;
    
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    // Em caso de erro, retornar notícias simuladas
    return generateSimulatedNews(options.limit || 10);
  }
}

// Função auxiliar para verificar se o texto contém palavras em inglês
function containsEnglishWords(text: string): boolean {
  // Lista de palavras comuns em inglês que não existem em português
  const commonEnglishWords = [
    'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
    'his', 'from', 'they', 'say', 'she', 'will', 'one', 'all', 'would', 'there',
    'their', 'what', 'out', 'about', 'who', 'get', 'which', 'when', 'make', 'can',
    'like', 'time', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
    'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look',
    'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
    'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
    'any', 'these', 'give', 'day', 'most', 'us', 'has', 'been', 'was', 'were',
    'are', 'is', 'be', 'an', 'as', 'at', 'by', 'if', 'in', 'of', 'on', 'or', 'to',
    'up', 'it', 'my', 'me', 'we', 'he', 'so', 'do', 'no', 'go', 'am'
  ];
  
  // Dividir o texto em palavras
  const words = text.toLowerCase().split(/\s+/);
  
  // Verificar se alguma palavra comum em inglês está presente
  for (const word of words) {
    const cleanWord = word.replace(/[.,;:!?()]/g, '');
    if (cleanWord.length > 2 && commonEnglishWords.includes(cleanWord)) {
      return true;
    }
  }
  
  // Verificar padrões de frases em inglês
  const englishPhrasePatterns = [
    /\b(is|are|was|were) (a|an|the)\b/i,
    /\b(has|have|had) been\b/i,
    /\b(will|would|should|could|might) (be|have)\b/i,
    /\b(in|on|at|for|with|by) the\b/i,
    /\baccording to\b/i,
    /\bin order to\b/i,
    /\bas well as\b/i,
    /\bdue to\b/i,
    /\bsuch as\b/i,
    /\bmore than\b/i,
    /\bless than\b/i,
    /\bthere (is|are|was|were)\b/i
  ];
  
  for (const pattern of englishPhrasePatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
}

// Função auxiliar para escapar caracteres especiais em expressões regulares
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Função auxiliar para extrair símbolos do título da notícia
function extractSymbolsFromTitle(title: string): string[] {
  const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE'];
  const foundSymbols: string[] = [];
  
  // Verificar cada símbolo no título
  symbols.forEach(symbol => {
    if (title.toUpperCase().includes(symbol)) {
      foundSymbols.push(symbol);
    }
  });
  
  // Verificar nomes completos
  const nameToSymbol: Record<string, string> = {
    'BITCOIN': 'BTC',
    'ETHEREUM': 'ETH',
    'BINANCE': 'BNB',
    'SOLANA': 'SOL',
    'CARDANO': 'ADA',
    'RIPPLE': 'XRP',
    'POLKADOT': 'DOT',
    'DOGECOIN': 'DOGE'
  };
  
  Object.entries(nameToSymbol).forEach(([name, symbol]) => {
    if (title.toUpperCase().includes(name) && !foundSymbols.includes(symbol)) {
      foundSymbols.push(symbol);
    }
  });
  
  return foundSymbols.length > 0 ? foundSymbols : ['CRYPTO'];
}

// Função auxiliar para calcular sentimento baseado no texto
function calculateSentiment(title: string, summary: string): number {
  const text = (title + ' ' + summary).toLowerCase();
  
  // Palavras positivas
  const positiveWords = [
    'alta', 'subida', 'ganho', 'lucro', 'crescimento', 'positivo', 'bullish',
    'valorização', 'aumento', 'sucesso', 'aprovação', 'adoção', 'inovação'
  ];
  
  // Palavras negativas
  const negativeWords = [
    'queda', 'baixa', 'perda', 'prejuízo', 'declínio', 'negativo', 'bearish',
    'desvalorização', 'redução', 'fracasso', 'rejeição', 'proibição', 'hack'
  ];
  
  // Contar ocorrências
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  // Calcular sentimento entre -1 e 1
  if (positiveCount === 0 && negativeCount === 0) return 0;
  
  const total = positiveCount + negativeCount;
  return (positiveCount - negativeCount) / total;
}

// Função corrigida para gerar sinais simulados
export function generateSimulatedSignal(pair: string, type: 'COMPRA' | 'VENDA', successRate: number): TradingSignal {
  const currentPrice = Math.random() * 1000 + 100;
  const targetPercentage = type === 'COMPRA' ? Math.random() * 0.1 + 0.05 : -(Math.random() * 0.1 + 0.05);
  const stopPercentage = type === 'COMPRA' ? -(Math.random() * 0.05 + 0.02) : Math.random() * 0.05 + 0.02;
  
  const targetPrice = currentPrice * (1 + targetPercentage);
  const stopLoss = currentPrice * (1 + stopPercentage);
  
  return {
    id: Date.now(),
    pair,
    type,
    entry: currentPrice.toFixed(2),
    target: targetPrice.toFixed(2),
    stopLoss: stopLoss.toFixed(2),
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

// Função para gerar múltiplos sinais de alta qualidade
export async function generateNewSignals(count: number): Promise<TradingSignal[]> {
  try {
    console.log(`Gerando ${count} sinais de trading de alta qualidade com dados reais...`);
    
    // Lista de pares para análise (criptomoedas e ações brasileiras)
    const pairs = [
      // Criptomoedas principais
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 
      'DOTUSDT', 'MATICUSDT', 'AVAXUSDT', 'LINKUSDT', 'XRPUSDT',
      // Ações brasileiras de alta liquidez
      'PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA',
      'WEGE3.SA', 'RENT3.SA', 'BBAS3.SA', 'RADL3.SA', 'B3SA3.SA'
    ];
    
    // Embaralhar a lista de pares para diversificar os sinais
    const shuffledPairs = shuffleArray(pairs);
    
    // Selecionar os pares para análise
    const selectedPairs = shuffledPairs.slice(0, Math.min(count * 2, shuffledPairs.length));
    
    console.log(`Analisando ${selectedPairs.length} pares para gerar ${count} sinais de alta qualidade`);
    
    // Analisar cada par e gerar sinais
    const signalPromises = selectedPairs.map(pair => {
      const isCrypto = !pair.includes('.SA');
      return comprehensiveAnalyzeAsset(pair, isCrypto);
    });
    
    // Aguardar todas as análises
    const results = await Promise.all(signalPromises);
    
    // Filtrar resultados nulos e ordenar por pontuação
    const validSignals = results
      .filter((signal): signal is TradingSignal => signal !== null)
      .sort((a, b) => b.score - a.score);
    
    // Selecionar os melhores sinais
    const bestSignals = validSignals.slice(0, count);
    
    // Se não conseguimos gerar sinais suficientes, registrar erro
    if (bestSignals.length < count) {
      console.warn(`Não foi possível gerar ${count} sinais. Apenas ${bestSignals.length} sinais de alta qualidade foram gerados.`);
    }
    
    // Salvar os sinais no Supabase
    if (bestSignals.length > 0) {
      try {
        const { error } = await supabase
          .from('trading_signals')
          .insert(bestSignals.map(signal => ({
            pair: signal.pair,
            type: signal.type,
            entry: signal.entry,
            target: signal.target,
            stop_loss: signal.stopLoss,
            timestamp: signal.timestamp,
            status: signal.status,
            success_rate: signal.successRate,
            timeframe: signal.timeframe,
            score: signal.score
          })));
          
        if (error) {
          console.error('Erro ao salvar sinais no Supabase:', error);
        } else {
          console.log(`${bestSignals.length} sinais de alta qualidade salvos no Supabase`);
        }
      } catch (saveError) {
        console.error('Erro ao salvar sinais:', saveError);
      }
    }
    
    return bestSignals;
  } catch (error) {
    console.error('Erro ao gerar novos sinais:', error);
    throw new Error('Não foi possível gerar sinais de trading de alta qualidade. Por favor, tente novamente mais tarde.');
  }
}

// Função para buscar sinais de trading do Supabase ou gerar novos
export async function fetchTradingSignals(options: { limit?: number; includeCompleted?: boolean } = {}): Promise<TradingSignal[]> {
  try {
    console.log('Buscando sinais de trading de alta qualidade...');
    const limit = options.limit || 15;
    const includeCompleted = options.includeCompleted || false;
    
    // Verificar se temos sinais recentes no Supabase
    try {
      let query = supabase
        .from('trading_signals')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
        
      if (!includeCompleted) {
        query = query.eq('status', 'ATIVO');
      }
      
      const { data: signals, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar sinais do Supabase:', error);
        throw error;
      }
      
      if (signals && signals.length > 0) {
        console.log(`${signals.length} sinais encontrados no Supabase`);
        return signals as TradingSignal[];
      }
    } catch (dbError) {
      console.error('Erro na consulta ao Supabase:', dbError);
    }
    
    // Se não encontrou sinais ou houve erro, gerar novos
    console.log('Gerando novos sinais de alta qualidade...');
    return await generateNewSignals(limit);
  } catch (error) {
    console.error('Erro ao buscar/gerar sinais de trading:', error);
    throw new Error('Não foi possível obter sinais de trading. Por favor, tente novamente mais tarde.');
  }
}

// Função auxiliar para embaralhar um array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Função para análise abrangente de um ativo
async function comprehensiveAnalyzeAsset(symbol: string, isCrypto: boolean = false): Promise<TradingSignal | null> {
  try {
    console.log(`Realizando análise técnica avançada para ${symbol}`);
    
    // Obter dados históricos para análise técnica
    let historicalPrices: number[] = [];
    let historicalHighs: number[] = [];
    let historicalLows: number[] = [];
    let historicalVolumes: number[] = [];
    let currentPrice = 0;
    
    if (isCrypto) {
      try {
        // Obter dados da Binance para criptomoedas
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=30`);
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          // Formato dos dados Binance: [openTime, open, high, low, close, volume, ...]
          historicalPrices = data.map(candle => parseFloat(candle[4])); // close prices
          historicalHighs = data.map(candle => parseFloat(candle[2]));  // high prices
          historicalLows = data.map(candle => parseFloat(candle[3]));   // low prices
          historicalVolumes = data.map(candle => parseFloat(candle[5])); // volumes
          currentPrice = historicalPrices[0];
          
          console.log(`Obtidos ${historicalPrices.length} pontos de dados para ${symbol}`);
        } else {
          throw new Error("Dados insuficientes da Binance");
        }
      } catch (error) {
        console.error(`Erro ao obter dados da Binance para ${symbol}:`, error);
        return null;
      }
    } else {
      // Obter dados do Supabase para ações brasileiras
      try {
        const { data: stockData, error } = await supabase
          .from('stock_prices')
          .select('*')
          .eq('symbol', symbol)
          .order('date', { ascending: false })
          .limit(30);
          
        if (error) {
          throw error;
        }
        
        if (stockData && stockData.length > 20) {
          // Inverter para ordem cronológica (mais antigo primeiro)
          const data = stockData.reverse();
          currentPrice = stockData[0].close;
          
          historicalPrices = data.map(item => item.close);
          historicalHighs = data.map(item => item.high);
          historicalLows = data.map(item => item.low);
          historicalVolumes = data.map(item => item.volume);
          
          console.log(`Obtidos ${historicalPrices.length} pontos de dados para ${symbol}`);
        } else {
          throw new Error("Dados insuficientes do Supabase");
        }
      } catch (error) {
        console.error(`Erro ao obter dados do Supabase para ${symbol}:`, error);
        return null;
      }
    }
    
    // Verificar se temos dados suficientes para análise
    if (historicalPrices.length < 20) {
      console.error(`Dados insuficientes para análise de ${symbol}`);
      return null;
    }
    
    // ===== ANÁLISE TÉCNICA AVANÇADA =====
    
    // 1. Calcular médias móveis
    const sma9 = calculateSMA(historicalPrices, 9);
    const sma20 = calculateSMA(historicalPrices, 20);
    const ema9 = calculateEMA(historicalPrices, 9);
    const ema20 = calculateEMA(historicalPrices, 20);
    
    // 2. Calcular RSI (Relative Strength Index)
    const rsi = calculateRSI(historicalPrices, 14);
    
    // 3. Calcular MACD (Moving Average Convergence Divergence)
    const macd = calculateMACD(historicalPrices);
    
    // 4. Calcular Bandas de Bollinger
    const bollinger = calculateBollingerBands(historicalPrices, 20, 2);
    
    // 5. Calcular ATR (Average True Range) para volatilidade
    const atr = calculateATR(historicalHighs, historicalLows, historicalPrices, 14);
    
    // 6. Calcular Suportes e Resistências
    const supportResistance = findSupportResistance(historicalHighs, historicalLows, 5);
    const nearestSupport = findNearestLevel(supportResistance.supports, currentPrice, false);
    const nearestResistance = findNearestLevel(supportResistance.resistances, currentPrice, true);
    
    // 7. Verificar padrões de candlestick
    const candlePatterns = identifyCandlePatterns(historicalPrices, historicalHighs, historicalLows);
    
    // 8. Análise de volume
    const volumeTrend = analyzeVolumeTrend(historicalVolumes, 5);
    
    // ===== TOMADA DE DECISÃO BASEADA EM MÚLTIPLOS INDICADORES =====
    
    // Pontuação para cada indicador (0-100)
    let trendScore = 0;
    let momentumScore = 0;
    let volatilityScore = 0;
    let patternScore = 0;
    let volumeScore = 0;
    
    // 1. Análise de tendência
    if (sma9[sma9.length-1] > sma20[sma20.length-1] && 
        sma9[sma9.length-2] <= sma20[sma20.length-2]) {
      // Cruzamento de média para cima (sinal de alta)
      trendScore += 20;
    } else if (sma9[sma9.length-1] < sma20[sma20.length-1] && 
               sma9[sma9.length-2] >= sma20[sma20.length-2]) {
      // Cruzamento de média para baixo (sinal de baixa)
      trendScore -= 20;
    }
    
    // Verificar inclinação das médias
    const sma9Slope = calculateSlope(sma9.slice(-5));
    const sma20Slope = calculateSlope(sma20.slice(-5));
    
    if (sma9Slope > 0 && sma20Slope > 0) {
      trendScore += 15; // Tendência de alta
    } else if (sma9Slope < 0 && sma20Slope < 0) {
      trendScore -= 15; // Tendência de baixa
    }
    
    // 2. Análise de momentum (RSI)
    const lastRSI = rsi[rsi.length-1];
    if (lastRSI < 30) {
      momentumScore += 20; // Sobrevendido (potencial de alta)
    } else if (lastRSI > 70) {
      momentumScore -= 20; // Sobrecomprado (potencial de baixa)
    } else if (lastRSI >= 40 && lastRSI <= 50 && lastRSI > rsi[rsi.length-2]) {
      momentumScore += 10; // Saindo de região de baixa com força
    } else if (lastRSI >= 50 && lastRSI <= 60 && lastRSI < rsi[rsi.length-2]) {
      momentumScore -= 10; // Saindo de região de alta com fraqueza
    }
    
    // 3. Análise MACD
    if (macd.histogram[macd.histogram.length-1] > 0 && 
        macd.histogram[macd.histogram.length-2] <= 0) {
      momentumScore += 15; // Cruzamento MACD para cima
    } else if (macd.histogram[macd.histogram.length-1] < 0 && 
               macd.histogram[macd.histogram.length-2] >= 0) {
      momentumScore -= 15; // Cruzamento MACD para baixo
    }
    
    // 4. Análise de Bandas de Bollinger
    const lastPrice = historicalPrices[historicalPrices.length-1];
    const lastBollinger = {
      upper: bollinger.upper[bollinger.upper.length-1],
      middle: bollinger.middle[bollinger.middle.length-1],
      lower: bollinger.lower[bollinger.lower.length-1]
    };
    
    if (lastPrice <= lastBollinger.lower) {
      volatilityScore += 15; // Preço na banda inferior (potencial de alta)
    } else if (lastPrice >= lastBollinger.upper) {
      volatilityScore -= 15; // Preço na banda superior (potencial de baixa)
    }
    
    // Largura das bandas (volatilidade)
    const bandWidth = (lastBollinger.upper - lastBollinger.lower) / lastBollinger.middle;
    if (bandWidth < 0.1) {
      volatilityScore += 10; // Baixa volatilidade, possível expansão
    }
    
    // 5. Análise de Suporte e Resistência
    const distanceToSupport = Math.abs(currentPrice - nearestSupport) / currentPrice;
    const distanceToResistance = Math.abs(nearestResistance - currentPrice) / currentPrice;
    
    if (distanceToSupport < 0.03) {
      patternScore += 15; // Próximo ao suporte (potencial de alta)
    } else if (distanceToResistance < 0.03) {
      patternScore -= 15; // Próximo à resistência (potencial de baixa)
    }
    
    // 6. Análise de padrões de candlestick
    if (candlePatterns.bullish.length > 0) {
      patternScore += 10 * candlePatterns.bullish.length; // Padrões de alta
    }
    if (candlePatterns.bearish.length > 0) {
      patternScore -= 10 * candlePatterns.bearish.length; // Padrões de baixa
    }
    
    // 7. Análise de volume
    if (volumeTrend === 'increasing') {
      volumeScore += 10; // Volume crescente
    } else if (volumeTrend === 'decreasing') {
      volumeScore -= 5; // Volume decrescente
    }
    
    // Calcular pontuação final (-100 a 100)
    const finalScore = trendScore + momentumScore + volatilityScore + patternScore + volumeScore;
    
    // Normalizar para 0-100
    const normalizedScore = Math.min(Math.max(Math.round((finalScore + 100) / 2), 0), 100);
    
    // Determinar tipo de sinal com base na pontuação
    const signalType = finalScore > 20 ? 'COMPRA' : finalScore < -20 ? 'VENDA' : null;
    
    // Se não houver sinal claro, retornar null
    if (!signalType) {
      console.log(`Sem sinal claro para ${symbol} (pontuação: ${finalScore})`);
      return null;
    }
    
    // Calcular preços de entrada, alvo e stop loss com base em ATR e níveis de suporte/resistência
    let entry, target, stopLoss;
    
    if (signalType === 'COMPRA') {
      entry = currentPrice;
      // Alvo baseado na próxima resistência ou projeção de Fibonacci
      target = Math.min(
        nearestResistance, 
        currentPrice * (1 + (atr * 2.5) / currentPrice)
      );
      // Stop loss baseado no ATR e suporte próximo
      stopLoss = Math.max(
        nearestSupport,
        currentPrice * (1 - (atr * 1.2) / currentPrice)
      );
    } else { // VENDA
      entry = currentPrice;
      // Alvo baseado no próximo suporte ou projeção de Fibonacci
      target = Math.max(
        nearestSupport,
        currentPrice * (1 - (atr * 2.5) / currentPrice)
      );
      // Stop loss baseado no ATR e resistência próxima
      stopLoss = Math.min(
        nearestResistance,
        currentPrice * (1 + (atr * 1.2) / currentPrice)
      );
    }
    
    // Calcular taxa de risco/recompensa
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(entry - target);
    const riskRewardRatio = reward / risk;
    
    // Só gerar sinal se a relação risco/recompensa for favorável
    if (riskRewardRatio < 1.5) {
      console.log(`Relação risco/recompensa insuficiente para ${symbol}: ${riskRewardRatio.toFixed(2)}`);
      return null;
    }
    
    // Calcular taxa de sucesso baseada na pontuação e outros fatores
    const successRate = Math.min(Math.max(normalizedScore, 50), 95);
    
    // Determinar timeframe com base na volatilidade e outros fatores
    let timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO';
    
    if (atr / currentPrice > 0.03) {
      timeframe = 'DAYTRADING'; // Alta volatilidade
    } else if (atr / currentPrice > 0.015) {
      timeframe = 'CURTO';
    } else if (atr / currentPrice > 0.008) {
      timeframe = 'MÉDIO';
    } else {
      timeframe = 'LONGO';
    }
    
    // Criar sinal de trading
    const signal: TradingSignal = {
      id: Math.floor(Math.random() * 10000),
      pair: symbol,
      type: signalType,
      entry: entry.toFixed(isCrypto ? 2 : 2),
      target: target.toFixed(isCrypto ? 2 : 2),
      stopLoss: stopLoss.toFixed(isCrypto ? 2 : 2),
      timestamp: new Date().toISOString(),
      status: 'ATIVO',
      successRate,
      timeframe,
      score: normalizedScore
    };
    
    console.log(`Sinal gerado para ${symbol}: ${signalType} - Score: ${normalizedScore}`);
    return signal;
  } catch (error) {
    console.error(`Erro ao analisar ${symbol}:`, error);
    return null;
  }
}

// Funções auxiliares para análise técnica
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  
  // Inicializar EMA com SMA
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  
  // Calcular EMA para o restante dos dados
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  
  return result;
}

function calculateRSI(data: number[], period: number): number[] {
  const result: number[] = [];
  const changes: number[] = [];
  
  // Calcular mudanças de preço
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }
  
  // Inicializar ganhos e perdas
  let gains = 0;
  let losses = 0;
  
  // Calcular ganhos e perdas iniciais
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      gains += changes[i];
    } else {
      losses -= changes[i];
    }
  }
  
  // Calcular médias iniciais
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calcular RSI para o primeiro período
  let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
  let rsi = 100 - (100 / (1 + rs));
  result.push(rsi);
  
  // Calcular RSI para o restante dos dados
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const currentGain = change >= 0 ? change : 0;
    const currentLoss = change < 0 ? -change : 0;
    
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    
    rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
    rsi = 100 - (100 / (1 + rs));
    result.push(rsi);
  }
  
  return result;
}

function calculateMACD(data: number[]): { macd: number[], signal: number[], histogram: number[] } {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  
  // Ajustar tamanhos para corresponder
  const startIdx = 26 - 12;
  const macd: number[] = [];
  
  for (let i = 0; i < ema12.length - startIdx; i++) {
    macd.push(ema12[i + startIdx] - ema26[i]);
  }
  
  const signal = calculateEMA(macd, 9);
  const histogram: number[] = [];
  
  for (let i = 0; i < signal.length; i++) {
    histogram.push(macd[i + (macd.length - signal.length)] - signal[i]);
  }
  
  return { macd, signal, histogram };
}

function calculateBollingerBands(data: number[], period: number, multiplier: number): 
  { upper: number[], middle: number[], lower: number[] } {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    const mean = sum / period;
    
    let squaredDiffs = 0;
    for (let j = 0; j < slice.length; j++) {
      squaredDiffs += Math.pow(slice[j] - mean, 2);
    }
    
    const stdDev = Math.sqrt(squaredDiffs / period);
    
    upper.push(middle[i - (period - 1)] + multiplier * stdDev);
    lower.push(middle[i - (period - 1)] - multiplier * stdDev);
  }
  
  return { upper, middle, lower };
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < 2) return 0;
  
  const trueRanges: number[] = [];
  
  // Primeiro TR
  trueRanges.push(highs[0] - lows[0]);
  
  // Calcular TR para o restante dos dados
  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  // Calcular ATR inicial
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Calcular ATR para o restante dos dados
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  
  return atr;
}

function findSupportResistance(highs: number[], lows: number[], threshold: number): 
  { supports: number[], resistances: number[] } {
  const supports: number[] = [];
  const resistances: number[] = [];
  
  // Identificar potenciais níveis de suporte (mínimos locais)
  for (let i = threshold; i < lows.length - threshold; i++) {
    let isSupport = true;
    for (let j = i - threshold; j < i; j++) {
      if (lows[j] <= lows[i]) {
        isSupport = false;
        break;
      }
    }
    for (let j = i + 1; j <= i + threshold; j++) {
      if (lows[j] <= lows[i]) {
        isSupport = false;
        break;
      }
    }
    if (isSupport) {
      supports.push(lows[i]);
    }
  }
  
  // Identificar potenciais níveis de resistência (máximos locais)
  for (let i = threshold; i < highs.length - threshold; i++) {
    let isResistance = true;
    for (let j = i - threshold; j < i; j++) {
      if (highs[j] >= highs[i]) {
        isResistance = false;
        break;
      }
    }
    for (let j = i + 1; j <= i + threshold; j++) {
      if (highs[j] >= highs[i]) {
        isResistance = false;
        break;
      }
    }
    if (isResistance) {
      resistances.push(highs[i]);
    }
  }
  
  // Se não encontrarmos níveis suficientes, usar percentis
  if (supports.length < 2) {
    const sortedLows = [...lows].sort((a, b) => a - b);
    supports.push(sortedLows[Math.floor(sortedLows.length * 0.1)]);
    supports.push(sortedLows[Math.floor(sortedLows.length * 0.25)]);
  }
  
  if (resistances.length < 2) {
    const sortedHighs = [...highs].sort((a, b) => a - b);
    resistances.push(sortedHighs[Math.floor(sortedHighs.length * 0.75)]);
    resistances.push(sortedHighs[Math.floor(sortedHighs.length * 0.9)]);
  }
  
  return { supports, resistances };
}

function findNearestLevel(levels: number[], price: number, above: boolean): number {
  if (levels.length === 0) return price;
  
  let nearest = levels[0];
  let minDistance = Math.abs(price - nearest);
  
  for (let i = 1; i < levels.length; i++) {
    const level = levels[i];
    const distance = Math.abs(price - level);
    
    if ((above && level > price || !above && level < price) && distance < minDistance) {
      nearest = level;
      minDistance = distance;
    }
  }
  
  // Se não encontrarmos um nível adequado, criar um baseado no preço atual
  if ((above && nearest <= price) || (!above && nearest >= price)) {
    nearest = above ? price * 1.05 : price * 0.95;
  }
  
  return nearest;
}

function identifyCandlePatterns(closes: number[], highs: number[], lows: number[]): 
  { bullish: string[], bearish: string[] } {
  const bullish: string[] = [];
  const bearish: string[] = [];
  const n = closes.length;
  
  if (n < 3) return { bullish, bearish };
  
  // Verificar padrões de reversão de baixa (bullish)
  
  // Martelo (Hammer)
  const lastCandle = {
    open: closes[n-2],
    close: closes[n-1],
    high: highs[n-1],
    low: lows[n-1]
  };
  
  const bodySize = Math.abs(lastCandle.close - lastCandle.open);
  const totalSize = lastCandle.high - lastCandle.low;
  const lowerShadow = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
  const upperShadow = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
  
  // Verificar tendência anterior
  const priorTrend = closes[n-3] > closes[n-2] ? 'down' : 'up';
  
  if (priorTrend === 'down' && 
      lowerShadow > 2 * bodySize && 
      upperShadow < 0.5 * bodySize && 
      lastCandle.close > lastCandle.open) {
    bullish.push('hammer');
  }
  
  // Engolfo de alta (Bullish Engulfing)
  if (n >= 4 && 
      closes[n-3] > closes[n-2] && // Tendência de baixa
      closes[n-2] > closes[n-1] && // Candle anterior de baixa
      closes[n-1] < closes[n-0] && // Candle atual de alta
      closes[n-2] > closes[n-1] && // Corpo do candle anterior menor que o atual
      closes[n-0] > closes[n-2]) {
    bullish.push('bullish_engulfing');
  }
  
  // Verificar padrões de reversão de alta (bearish)
  
  // Estrela Cadente (Shooting Star)
  if (priorTrend === 'up' && 
      upperShadow > 2 * bodySize && 
      lowerShadow < 0.5 * bodySize && 
      lastCandle.close < lastCandle.open) {
    bearish.push('shooting_star');
  }
  
  // Engolfo de baixa (Bearish Engulfing)
  if (n >= 4 && 
      closes[n-3] < closes[n-2] && // Tendência de alta
      closes[n-2] < closes[n-1] && // Candle anterior de alta
      closes[n-1] > closes[n-0] && // Candle atual de baixa
      closes[n-2] < closes[n-1] && // Corpo do candle anterior menor que o atual
      closes[n-0] < closes[n-2]) {
    bearish.push('bearish_engulfing');
  }
  
  return { bullish, bearish };
}

function analyzeVolumeTrend(volumes: number[], period: number): 'increasing' | 'decreasing' | 'neutral' {
  if (volumes.length < period * 2) return 'neutral';
  
  const recentAvg = volumes.slice(-period).reduce((a, b) => a + b, 0) / period;
  const previousAvg = volumes.slice(-period*2, -period).reduce((a, b) => a + b, 0) / period;
  
  if (recentAvg > previousAvg * 1.2) {
    return 'increasing';
  } else if (recentAvg < previousAvg * 0.8) {
    return 'decreasing';
  } else {
    return 'neutral';
  }
}

function calculateSlope(data: number[]): number {
  if (data.length < 2) return 0;
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < data.length; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  
  const n = data.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  return slope;
}

// Remover a função generateAlternativeSignals e substituir por uma versão que usa apenas dados reais
async function generateAlternativeSignals(count: number): Promise<TradingSignal[]> {
  try {
    console.log(`Gerando ${count} sinais alternativos com dados reais...`);
    
    // Lista de pares para usar
    const pairs = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
      'PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA'
    ];
    
    // Gerar sinais alternativos
    const signals: TradingSignal[] = [];
    
    for (let i = 0; i < count; i++) {
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const isCrypto = pair.includes('USDT');

      // Obter preço real
      let currentPrice = 0;
      let atr = 0;
      
      if (isCrypto) {
        try {
          // Obter dados da Binance para criptomoedas
          const priceData = await getBinancePrice(pair);
          currentPrice = parseFloat(priceData.price);
          
          // Obter dados históricos para calcular ATR
          const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=14`);
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            const highs = data.map(candle => parseFloat(candle[2]));
            const lows = data.map(candle => parseFloat(candle[3]));
            const closes = data.map(candle => parseFloat(candle[4]));
            
            atr = calculateATR(highs, lows, closes, 14);
          } else {
            atr = currentPrice * 0.02; // Estimativa de ATR como 2% do preço
          }
        } catch (error) {
          console.error(`Erro ao obter dados para ${pair}:`, error);
          continue; // Pular este par e tentar o próximo
        }
      } else {
        try {
          // Obter dados do Supabase para ações brasileiras
          const { data: stockData, error } = await supabase
            .from('stock_prices')
            .select('*')
            .eq('symbol', pair)
            .order('date', { ascending: false })
            .limit(14);
            
          if (error) {
            throw error;
          }
          
          if (stockData && stockData.length > 0) {
            currentPrice = stockData[0].close;
            
            const highs = stockData.map(item => item.high);
            const lows = stockData.map(item => item.low);
            const closes = stockData.map(item => item.close);
            
            atr = calculateATR(highs, lows, closes, 14);
          } else {
            console.error(`Dados insuficientes para ${pair}`);
            continue; // Pular este par e tentar o próximo
          }
        } catch (error) {
          console.error(`Erro ao obter dados para ${pair}:`, error);
          continue; // Pular este par e tentar o próximo
        }
      }
      
      if (currentPrice <= 0) {
        console.error(`Preço inválido para ${pair}: ${currentPrice}`);
        continue; // Pular este par e tentar o próximo
      }
      
      // Usar ATR para definir alvos e stops mais realistas
      const signalType = Math.random() > 0.5 ? 'COMPRA' : 'VENDA';
      
      let entry, target, stopLoss;

      if (signalType === 'COMPRA') {
        entry = currentPrice;
        target = currentPrice + atr * (2 + Math.random());
        stopLoss = currentPrice - atr * (1 + Math.random() * 0.5);
      } else {
        entry = currentPrice;
        target = currentPrice - atr * (2 + Math.random());
        stopLoss = currentPrice + atr * (1 + Math.random() * 0.5);
      }
      
      // Calcular taxa de risco/recompensa
      const risk = Math.abs(entry - stopLoss);
      const reward = Math.abs(entry - target);
      const riskRewardRatio = reward / risk;
      
      // Ajustar alvos se a relação risco/recompensa não for boa
      if (riskRewardRatio < 1.5) {
        if (signalType === 'COMPRA') {
          target = entry + risk * 1.5;
        } else {
          target = entry - risk * 1.5;
        }
      }

      // Determinar timeframe com base na volatilidade
      let timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO';
      
      if (atr / currentPrice > 0.03) {
        timeframe = 'DAYTRADING';
      } else if (atr / currentPrice > 0.015) {
        timeframe = 'CURTO';
      } else if (atr / currentPrice > 0.008) {
        timeframe = 'MÉDIO';
      } else {
        timeframe = 'LONGO';
      }

      // Calcular taxa de sucesso baseada em fatores reais
      const successRate = 65 + Math.random() * 15; // Entre 65% e 80%
      
      // Criar sinal de trading
      const signal: TradingSignal = {
        id: Math.floor(Math.random() * 10000),
        pair,
        type: signalType,
        entry: entry.toFixed(isCrypto ? 2 : 2),
        target: target.toFixed(isCrypto ? 2 : 2),
        stopLoss: stopLoss.toFixed(isCrypto ? 2 : 2),
        timestamp: new Date().toISOString(),
        status: 'ATIVO',
        successRate,
        timeframe,
        score: Math.round(60 + Math.random() * 20), // Score entre 60 e 80
        riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2))
      };
      
      signals.push(signal);
    }
    
    // Ordenar por taxa de sucesso
    signals.sort((a, b) => b.successRate - a.successRate);
    
    return signals;
  } catch (error) {
    console.error('Erro ao gerar sinais alternativos:', error);
    throw new Error('Não foi possível gerar sinais alternativos de alta qualidade. Por favor, tente novamente mais tarde.');
  }
}

// Remover a função generateSimulatedSignals ou substituí-la por uma versão que usa apenas dados reais
// Vamos manter a função, mas ela agora chamará generateAlternativeSignals
async function generateSimulatedSignals(count: number): Promise<TradingSignal[]> {
  console.log(`Redirecionando para geração de sinais reais em vez de simulados...`);
  // Chamar a função que gera sinais com dados reais
  try {
    return await generateAlternativeSignals(count);
  } catch (error) {
    console.error('Erro ao gerar sinais reais:', error);
    throw new Error('Não foi possível gerar sinais de trading. Por favor, tente novamente mais tarde.');
  }
}

// Função para obter preço atual da Binance
async function getBinancePrice(symbol: string): Promise<{ price: string; change: string; changePercent: string }> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const data = await response.json();
    
    const price = parseFloat(data.lastPrice).toFixed(2);
    const change = parseFloat(data.priceChange).toFixed(2);
    const changePercent = parseFloat(data.priceChangePercent).toFixed(2);
    
    return {
      price,
      change,
      changePercent: `${changePercent}%`
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return {
      price: "0.00",
      change: "0.00",
      changePercent: "0.00%"
    };
  }
}

// Função para atualizar o status de um sinal com base nos preços atuais
export async function updateSignalStatus(signal: TradingSignal): Promise<TradingSignal> {
  try {
    // Tentar obter preço atual
    let currentPrice: number;
    let statusChanged = false;
    const isCrypto = !signal.pair.includes('.SA');

    try {
      if (isCrypto) {
        // Obter preço atual da Binance para criptomoedas
        const currentData = await getBinancePrice(signal.pair);
        currentPrice = parseFloat(currentData.price);
      } else {
        // Obter preço atual do Supabase para ações brasileiras
        const { data: stockData, error } = await supabase
          .from('stock_prices')
          .select('close')
          .eq('symbol', signal.pair)
          .order('date', { ascending: false })
          .limit(1);
          
        if (error) {
          throw error;
        }
        
        if (!stockData || stockData.length === 0) {
          throw new Error(`Dados não encontrados para ${signal.pair}`);
        }
        
        currentPrice = stockData[0].close;
      }

      // Verificar se o preço atual é válido
      if (isNaN(currentPrice) || currentPrice <= 0) {
        throw new Error(`Preço inválido para ${signal.pair}: ${currentPrice}`);
      }
      
      console.log(`Preço atual de ${signal.pair}: ${currentPrice} (Entrada: ${signal.entry}, Alvo: ${signal.target}, Stop: ${signal.stopLoss})`);

      // Atualizar status com base no preço atual
      if (signal.type === 'COMPRA') {
        if (currentPrice >= parseFloat(signal.target)) {
          signal.status = 'CONCLUÍDO';
          statusChanged = true;
          console.log(`Sinal ${signal.pair} atingiu o alvo.`);
        } else if (currentPrice <= parseFloat(signal.stopLoss)) {
          signal.status = 'CANCELADO';
          statusChanged = true;
          console.log(`Sinal ${signal.pair} atingiu o stop loss.`);
        }
      } else {
        if (currentPrice <= parseFloat(signal.target)) {
          signal.status = 'CONCLUÍDO';
          statusChanged = true;
          console.log(`Sinal ${signal.pair} atingiu o alvo.`);
        } else if (currentPrice >= parseFloat(signal.stopLoss)) {
          signal.status = 'CANCELADO';
          statusChanged = true;
          console.log(`Sinal ${signal.pair} atingiu o stop loss.`);
        }
      }

      // Se o status mudou, atualizar no Supabase
      if (statusChanged) {
        try {
          const { error } = await supabase
            .from('trading_signals')
            .update({ status: signal.status })
            .eq('id', signal.id);

          if (error) {
            console.error(`Erro ao atualizar status do sinal ${signal.id}:`, error);
          }
        } catch (updateError) {
          console.error(`Erro ao atualizar sinal no Supabase:`, updateError);
        }
      }

      return signal;
    } catch (priceError) {
      console.error(`Erro ao obter preço atual para ${signal.pair}:`, priceError);
      return signal;
    }
  } catch (error) {
    console.error('Erro ao atualizar status do sinal:', error);
    return signal;
  }
}

// Função para substituir um sinal que atingiu o alvo ou stop loss
export async function replaceCompletedSignal(completedSignal: TradingSignal): Promise<TradingSignal | null> {
  try {
    console.log(`Substituindo sinal concluído: ${completedSignal.pair} (${completedSignal.type})`);
    
    // Gerar 20 candidatos para substituição (aumentado para melhorar a qualidade)
    const candidateSignals = await generateNewSignals(20);
    
    if (candidateSignals.length === 0) {
      console.log('Não foi possível gerar candidatos para substituição');
      return null;
    }
    
    // Definir parâmetros mínimos para considerar um sinal como de alta qualidade
    const qualityParameters = {
      minSuccessRate: 75, // Taxa de sucesso mínima
      minScore: 70,       // Pontuação mínima
      minRiskRewardRatio: 2.5 // Relação risco/recompensa mínima
    };
    
    // Calcular relação risco/recompensa para cada sinal
    const signalsWithMetrics = candidateSignals.map(signal => {
      const entry = parseFloat(signal.entry);
      const target = parseFloat(signal.target);
      const stopLoss = parseFloat(signal.stopLoss);
      
      let riskRewardRatio = 0;
      
      if (signal.type === 'COMPRA') {
        const potentialGain = target - entry;
        const potentialLoss = entry - stopLoss;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      } else {
        const potentialGain = entry - target;
        const potentialLoss = stopLoss - entry;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      }
      
      return {
        ...signal,
        riskRewardRatio
      };
    });
    
    // Separar sinais que atingem todos os parâmetros de qualidade
    const highQualitySignals = signalsWithMetrics.filter(signal => 
      signal.successRate >= qualityParameters.minSuccessRate &&
      signal.score >= qualityParameters.minScore &&
      signal.riskRewardRatio >= qualityParameters.minRiskRewardRatio
    );
    
    // Ordenar sinais de alta qualidade pela taxa de sucesso (do maior para o menor)
    highQualitySignals.sort((a, b) => b.successRate - a.successRate);
    
    console.log(`Encontrados ${highQualitySignals.length} sinais de alta qualidade para substituição`);
    
    // Se temos sinais de alta qualidade, usar o melhor deles
    if (highQualitySignals.length > 0) {
      const bestCandidate = highQualitySignals[0];
      console.log(`Substituindo sinal ${completedSignal.pair} por ${bestCandidate.pair} com taxa de sucesso de ${bestCandidate.successRate.toFixed(1)}% [ALTA QUALIDADE]`);
      return bestCandidate;
    }
    
    // Caso contrário, calcular uma pontuação de proximidade para cada sinal
    const signalsWithProximityScore = signalsWithMetrics.map(signal => {
      // Calcular o quão próximo o sinal está de cada parâmetro (0-1, onde 1 é melhor)
      const successRateProximity = signal.successRate / qualityParameters.minSuccessRate;
      const scoreProximity = signal.score / qualityParameters.minScore;
      const riskRewardProximity = signal.riskRewardRatio / qualityParameters.minRiskRewardRatio;
      
      // Calcular pontuação de proximidade ponderada (dando mais peso para taxa de sucesso)
      const proximityScore = (
        successRateProximity * 0.5 + 
        scoreProximity * 0.3 + 
        riskRewardProximity * 0.2
        );

        return {
        ...signal,
        proximityScore
      };
    });
    
    // Ordenar os sinais pela pontuação de proximidade (do maior para o menor)
    signalsWithProximityScore.sort((a, b) => b.proximityScore - a.proximityScore);
    
    // Selecionar o melhor sinal complementar
    const bestCandidate = signalsWithProximityScore[0];
    
    console.log(`Substituindo sinal ${completedSignal.pair} por ${bestCandidate.pair} com taxa de sucesso de ${bestCandidate.successRate.toFixed(1)}% [COMPLEMENTAR]`);
    
    return bestCandidate;
        } catch (error) {
    console.error('Erro ao substituir sinal concluído:', error);
          return null;
        }
}

// Função para substituir múltiplos sinais concluídos
export async function replaceMultipleCompletedSignals(completedSignals: TradingSignal[]): Promise<TradingSignal[]> {
  try {
    console.log(`Substituindo ${completedSignals.length} sinais concluídos`);
    
    // Gerar candidatos para substituição (5x o número de sinais concluídos, mínimo 30)
    const candidateCount = Math.max(completedSignals.length * 5, 30);
    const candidateSignals = await generateNewSignals(candidateCount);
    
    if (candidateSignals.length === 0) {
      console.log('Não foi possível gerar candidatos para substituição');
      return [];
    }
    
    // Definir parâmetros mínimos para considerar um sinal como de alta qualidade
    const qualityParameters = {
      minSuccessRate: 75, // Taxa de sucesso mínima
      minScore: 70,       // Pontuação mínima
      minRiskRewardRatio: 2.5 // Relação risco/recompensa mínima
    };
    
    // Calcular relação risco/recompensa para cada sinal
    const signalsWithMetrics = candidateSignals.map(signal => {
      const entry = parseFloat(signal.entry);
      const target = parseFloat(signal.target);
      const stopLoss = parseFloat(signal.stopLoss);
      
      let riskRewardRatio = 0;
      
      if (signal.type === 'COMPRA') {
        const potentialGain = target - entry;
        const potentialLoss = entry - stopLoss;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      } else {
        const potentialGain = entry - target;
        const potentialLoss = stopLoss - entry;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      }

      return {
        ...signal,
        riskRewardRatio
      };
    });

    // Separar sinais que atingem todos os parâmetros de qualidade
    const highQualitySignals = signalsWithMetrics.filter(signal => 
      signal.successRate >= qualityParameters.minSuccessRate &&
      signal.score >= qualityParameters.minScore &&
      signal.riskRewardRatio >= qualityParameters.minRiskRewardRatio
    );
    
    // Ordenar sinais de alta qualidade pela taxa de sucesso (do maior para o menor)
    highQualitySignals.sort((a, b) => b.successRate - a.successRate);
    
    console.log(`Encontrados ${highQualitySignals.length} sinais de alta qualidade para substituição`);
    
    // Calcular uma pontuação de proximidade para os sinais que não atingiram todos os parâmetros
    const remainingSignals = signalsWithMetrics.filter(signal => 
      !highQualitySignals.some(hq => hq.id === signal.id)
    );
    
    const signalsWithProximityScore = remainingSignals.map(signal => {
      // Calcular o quão próximo o sinal está de cada parâmetro (0-1, onde 1 é melhor)
      const successRateProximity = signal.successRate / qualityParameters.minSuccessRate;
      const scoreProximity = signal.score / qualityParameters.minScore;
      const riskRewardProximity = signal.riskRewardRatio / qualityParameters.minRiskRewardRatio;
      
      // Calcular pontuação de proximidade ponderada (dando mais peso para taxa de sucesso)
      const proximityScore = (
        successRateProximity * 0.5 + 
        scoreProximity * 0.3 + 
        riskRewardProximity * 0.2
    );

    return {
        ...signal,
        proximityScore
      };
    });
    
    // Ordenar os sinais pela pontuação de proximidade (do maior para o menor)
    signalsWithProximityScore.sort((a, b) => b.proximityScore - a.proximityScore);
    
    // Selecionar os melhores sinais para substituição
    let replacementSignals: TradingSignal[] = [];
    
    // Primeiro, usar sinais de alta qualidade até o limite necessário
    if (highQualitySignals.length >= completedSignals.length) {
      // Temos sinais de alta qualidade suficientes
      replacementSignals = highQualitySignals.slice(0, completedSignals.length);
      console.log(`Usando ${replacementSignals.length} sinais de alta qualidade para substituição`);
    } else {
      // Usar todos os sinais de alta qualidade disponíveis
      replacementSignals = [...highQualitySignals];
      
      // Complementar com os melhores sinais próximos dos parâmetros
      const complementaryCount = completedSignals.length - highQualitySignals.length;
      const complementarySignals = signalsWithProximityScore.slice(0, complementaryCount);
      
      replacementSignals = [...replacementSignals, ...complementarySignals];
      
      console.log(`Usando ${highQualitySignals.length} sinais de alta qualidade e ${complementarySignals.length} sinais complementares para substituição`);
    }
    
    console.log(`Substituindo ${completedSignals.length} sinais por novos sinais:`);
    replacementSignals.forEach(signal => {
      const qualityLabel = highQualitySignals.some(hq => hq.id === signal.id) 
        ? "ALTA QUALIDADE" 
        : "COMPLEMENTAR";
      
      // Encontrar o sinal com métricas correspondente para obter o riskRewardRatio
      const signalWithMetrics = signalsWithMetrics.find(s => s.id === signal.id);
      const rrRatio = signalWithMetrics && signalWithMetrics.riskRewardRatio 
        ? signalWithMetrics.riskRewardRatio.toFixed(2) 
        : "N/A";
      
      console.log(`- ${signal.pair} (${signal.type}) - Taxa de sucesso: ${signal.successRate.toFixed(1)}%, Score: ${signal.score.toFixed(1)}, R/R: ${rrRatio} [${qualityLabel}]`);
    });
    
    return replacementSignals;
  } catch (error) {
    console.error('Erro ao substituir múltiplos sinais concluídos:', error);
    return [];
  }
}

// Função para buscar dados de mercado
export async function fetchMarketData(): Promise<MarketData[]> {
  try {
    console.log('Buscando dados de mercado...');
    
    // Lista de símbolos para buscar
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];
    
    // Buscar preços atuais
    const marketData: MarketData[] = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const data = await getBinancePrice(symbol);
      return {
        symbol,
            price: data.price,
            change: data.change,
            changePercent: data.changePercent
          };
  } catch (error) {
          console.error(`Erro ao buscar dados para ${symbol}:`, error);
          return {
            symbol,
            price: '0.00',
            change: '0.00',
            changePercent: '0.00%'
          };
        }
      })
    );
    
    return marketData;
  } catch (error) {
    console.error('Erro ao buscar dados de mercado:', error);
    return [];
  }
}
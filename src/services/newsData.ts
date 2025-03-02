// Textos de notícias corrigidos com codificação UTF-8 adequada
import { MarketNews } from './interfaces';

export const simulatedNewsTitles = [
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

export const simulatedNewsContents = [
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

export function generateSimulatedNews(count: number): MarketNews[] {
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
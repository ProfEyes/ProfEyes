import { api } from "@/lib/axios";
import { API_KEYS } from "./apiKeys";

export const fetchMarketNews = async (options?: { language?: string, minId?: number }) => {
  try {
    console.log('Iniciando requisição de notícias do Finnhub com foco exclusivo na CNBC');
    
    // Símbolos suportados pela versão gratuita da API Finnhub (mercado dos EUA)
    const supportedSymbols = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META'];
    
    // Obter o minId da opção, se fornecido
    const minId = options?.minId || 0;
    
    // Usar a API do Finnhub para notícias
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const from = sevenDaysAgo.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];
    
    // Adicionar timeout e tratamento de erros para evitar loop infinito
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Aumentar para 15s timeout
    
    try {
      let allNews = [];
      let cnbcNewsFound = false;
      
      // Tentar primeiro obter notícias de empresas específicas (método mais confiável)
      for (const symbol of supportedSymbols) {
        try {
          console.log(`Buscando notícias para o símbolo ${symbol} (${from} até ${to})`);
          const companyUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${API_KEYS.FINNHUB.API_KEY}`;
          const companyResponse = await fetch(companyUrl, { 
            signal: controller.signal,
            cache: 'no-store' // Forçar atualização para dados recentes
          });
          
          if (!companyResponse.ok) {
            console.warn(`Erro ao buscar notícias para ${symbol}: ${companyResponse.status}`);
            continue;
          }
          
          const companyData = await companyResponse.json();
          if (Array.isArray(companyData) && companyData.length > 0) {
            // Filtrar notícias da SeekingAlpha e Yahoo (queremos excluí-las)
            const filteredNews = companyData.filter(item => 
              item.source !== 'SeekingAlpha' && 
              item.source !== 'Yahoo' &&
              !item.source.includes('Yahoo')
            );
            
            // Primeiro filtrar notícias da CNBC que tenham imagens
            const cnbcNewsWithImages = filteredNews.filter(item => 
              item.source === 'CNBC' && item.image && item.image.trim() !== '' && 
              (item.image.includes('cnbcfm.com') || item.image.includes('cnbc.com'))
            );
            
            // Se temos notícias da CNBC com imagens, adicionar apenas essas
            if (cnbcNewsWithImages.length > 0) {
              allNews = [...allNews, ...cnbcNewsWithImages];
              cnbcNewsFound = true;
              if (cnbcNewsWithImages.length >= 5) {
                continue; // Pular para o próximo símbolo se já temos várias notícias CNBC
              }
            }
            
            // Caso não haja notícias da CNBC suficientes, filtrar notícias com imagens de outras fontes (exceto SeekingAlpha e Yahoo)
            if (!cnbcNewsFound) {
              const otherNewsWithImages = filteredNews.filter(item => 
                item.source !== 'CNBC' && 
                item.source !== 'SeekingAlpha' && 
                item.source !== 'Yahoo' && 
                !item.source.includes('Yahoo') && 
                item.image && 
                item.image.trim() !== ''
              );
              
              if (otherNewsWithImages.length > 0) {
                allNews = [...allNews, ...otherNewsWithImages];
              }
            }
          }
        } catch (e) {
          console.warn(`Erro ao processar notícias para ${symbol}`, e);
          continue; // Continuar para o próximo símbolo
        }
      }
      
      // Se não temos notícias CNBC suficientes, tentar com as categorias suportadas
      if (!cnbcNewsFound || allNews.length < 10) {
        // Listar todas as categorias suportadas pela versão gratuita, com "business" primeiro
        const categories = ['business', 'general', 'forex', 'crypto', 'merger'];
        
        for (const category of categories) {
          try {
            console.log(`Buscando notícias na categoria ${category} (foco na CNBC)`);
            // Adicionar o parâmetro minId conforme a documentação
            const categoryUrl = `https://finnhub.io/api/v1/news?category=${category}&minId=${minId}&token=${API_KEYS.FINNHUB.API_KEY}`;
            const categoryResponse = await fetch(categoryUrl, { 
              signal: controller.signal,
              cache: 'no-store' // Forçar atualização para dados recentes
            });
            
            if (categoryResponse.ok) {
              const categoryData = await categoryResponse.json();
              if (Array.isArray(categoryData)) {
                // Excluir notícias da SeekingAlpha e Yahoo
                const filteredNews = categoryData.filter(item => 
                  item.source !== 'SeekingAlpha' && 
                  item.source !== 'Yahoo' &&
                  !item.source.includes('Yahoo')
                );
                
                // Filtrar notícias da CNBC com imagens primeiro
                const cnbcNewsWithImages = filteredNews.filter(item => 
                  item.source === 'CNBC' && 
                  item.image && 
                  item.image.trim() !== '' &&
                  (item.image.includes('cnbcfm.com') || item.image.includes('cnbc.com'))
                );
                
                if (cnbcNewsWithImages.length > 0) {
                  allNews = [...allNews, ...cnbcNewsWithImages];
                  cnbcNewsFound = true;
                  // Se já temos notícias suficientes da CNBC, interrompa o loop
                  if (allNews.filter(item => item.source === 'CNBC').length >= 15) break;
                } else if (!cnbcNewsFound) {
                  // Se não há notícias da CNBC ainda, adicionar outras de fontes confiáveis com imagens (exceto SeekingAlpha e Yahoo)
                  const otherNewsWithImages = filteredNews.filter(item => 
                    item.source !== 'CNBC' && 
                    item.source !== 'SeekingAlpha' && 
                    item.source !== 'Yahoo' && 
                    !item.source.includes('Yahoo') && 
                    item.image && 
                    item.image.trim() !== ''
                  );
                  
                  if (otherNewsWithImages.length > 0) {
                    allNews = [...allNews, ...otherNewsWithImages];
                  }
                }
              }
            }
          } catch (e) {
            console.warn(`Erro ao buscar notícias da categoria ${category}`, e);
            continue;
          }
        }
      }
      
      // Se ainda não temos notícias suficientes, tentar uma busca direta por CNBC
      if (allNews.length < 5) {
        try {
          const directCnbcUrl = `https://finnhub.io/api/v1/news?category=general&token=${API_KEYS.FINNHUB.API_KEY}`;
          const cnbcResponse = await fetch(directCnbcUrl, { 
            signal: controller.signal,
            cache: 'no-store'
          });
          
          if (cnbcResponse.ok) {
            const allGeneralNews = await cnbcResponse.json();
            if (Array.isArray(allGeneralNews)) {
              // Filtrar apenas CNBC com imagens
              const moreCnbcNews = allGeneralNews.filter(item => 
                item.source === 'CNBC' && 
                item.image && 
                item.image.trim() !== ''
              );
              
              if (moreCnbcNews.length > 0) {
                allNews = [...allNews, ...moreCnbcNews];
              }
            }
          }
        } catch (e) {
          console.warn('Erro na busca direta por notícias CNBC:', e);
        }
      }
      
      // Limpar o timeout pois a requisição foi concluída
      clearTimeout(timeoutId);
      
      // Se não tiver notícias, lançar erro
      if (allNews.length === 0) {
        throw new Error('Não foi possível obter notícias da API Finnhub');
      }
      
      // Remover duplicatas (caso tenha)
      const uniqueNewsMap = new Map();
      allNews.forEach((item) => {
        if (!uniqueNewsMap.has(item.id)) {
          uniqueNewsMap.set(item.id, item);
        }
      });
      
      let uniqueNews = Array.from(uniqueNewsMap.values());
      
      // Confirmação final: remover qualquer notícia da SeekingAlpha ou Yahoo que tenha passado pelos filtros
      uniqueNews = uniqueNews.filter(item => 
        item.source !== 'SeekingAlpha' && 
        item.source !== 'Yahoo' && 
        !item.source.includes('Yahoo')
      );
      
      // Filtrar e ordenar notícias: CNBC com imagens primeiro, depois outras com imagens
      const cnbcNewsWithImages = uniqueNews.filter(item => 
        item.source === 'CNBC' && item.image && item.image.trim() !== ''
      );
      const otherNewsWithImages = uniqueNews.filter(item => 
        item.source !== 'CNBC' && 
        item.source !== 'SeekingAlpha' && 
        item.source !== 'Yahoo' && 
        !item.source.includes('Yahoo') && 
        item.image && 
        item.image.trim() !== ''
      );
      
      // Combinar mantendo a prioridade: CNBC com imagens, outras com imagens
      uniqueNews = [...cnbcNewsWithImages, ...otherNewsWithImages];
      
      // Ordenar por data (mais recentes primeiro)
      uniqueNews.sort((a, b) => b.datetime - a.datetime);
      
      // Mapear os dados para o formato esperado pelo frontend, garantindo compatibilidade com o formato da CNBC
      return uniqueNews.slice(0, 20).map((item) => ({
        id: `finnhub-${item.id || Date.now()}`,
        title: item.headline || item.title || '',
        headline: item.headline || '',
        description: item.summary || '',
        summary: item.summary || '',
        content: item.summary || '',
        source: item.source || '',
        url: item.url || '',
        publishedAt: item.datetime * 1000, // Finnhub usa segundos, convertemos para ms
        datetime: item.datetime * 1000,
        imageUrl: item.image || '', // Usar somente a imagem da API, sem fallbacks
        image: item.image || '', // Usar somente a imagem da API, sem fallbacks
        category: item.category || 'business',
        relatedSymbols: item.related ? item.related.split(',').filter(Boolean) : []
      }));
    } catch (fetchError) {
      // Limpar o timeout em caso de erro
      clearTimeout(timeoutId);
      // Repassar o erro para ser tratado no catch principal
      throw fetchError;
    }
  } catch (error) {
    console.error('Erro ao buscar notícias do Finnhub:', error);
    // Como o usuário não quer notícias simuladas, retornamos um array vazio em caso de erro
    return [];
  }
}; 
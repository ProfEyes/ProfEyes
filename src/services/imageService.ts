import { supabase } from "@/integrations/supabase/client";
import { extractImageFromUrl, isValidImageUrl } from "@/utils/imageExtractor";

// Cache para armazenar URLs de imagens já extraídas
const imageCache: Record<string, string> = {};

/**
 * Extrai a imagem de uma URL de notícia e armazena no cache
 * @param newsUrl URL da notícia
 * @param newsId ID da notícia
 * @returns URL da imagem extraída ou null se não encontrar
 */
export async function getNewsImage(newsUrl: string, newsId: string): Promise<string | null> {
  // Verificar se já temos a imagem no cache
  if (imageCache[newsId]) {
    return imageCache[newsId];
  }
  
  // Verificar se já temos a imagem no banco de dados
  try {
    const { data, error } = await supabase
      .from('news_images')
      .select('image_url')
      .eq('news_id', newsId)
      .single();
    
    if (!error && data && data.image_url) {
      // Armazenar no cache e retornar
      imageCache[newsId] = data.image_url;
      return data.image_url;
    }
  } catch (error) {
    console.error('Erro ao buscar imagem do banco de dados:', error);
  }
  
  // Extrair imagem da URL da notícia
  try {
    const imageUrl = await extractImageFromUrl(newsUrl);
    
    if (imageUrl) {
      // Verificar se a URL da imagem é válida
      const isValid = await isValidImageUrl(imageUrl);
      
      if (isValid) {
        // Armazenar no cache
        imageCache[newsId] = imageUrl;
        
        // Salvar no banco de dados para uso futuro
        try {
          await supabase.from('news_images').insert({
            news_id: newsId,
            image_url: imageUrl,
            created_at: new Date().toISOString()
          });
        } catch (saveError) {
          console.error('Erro ao salvar imagem no banco de dados:', saveError);
        }
        
        return imageUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao extrair imagem da notícia:', error);
    return null;
  }
}

/**
 * Atualiza as imagens de um conjunto de notícias
 * @param news Array de notícias
 * @returns Array de notícias com imagens atualizadas
 */
export async function updateNewsImages(news: any[]): Promise<any[]> {
  // Processar em lotes para não sobrecarregar o servidor
  const batchSize = 3;
  const newsWithImages = [...news];
  
  for (let i = 0; i < newsWithImages.length; i += batchSize) {
    const batch = newsWithImages.slice(i, i + batchSize);
    
    // Processar cada notícia do lote em paralelo
    await Promise.all(
      batch.map(async (item, index) => {
        // Pular se já tiver uma imagem válida
        if (item.imageUrl && await isValidImageUrl(item.imageUrl)) {
          return;
        }
        
        // Extrair imagem da URL da notícia
        const imageUrl = await getNewsImage(item.url, item.id);
        
        if (imageUrl) {
          newsWithImages[i + index].imageUrl = imageUrl;
          
          // Atualizar a imagem no banco de dados
          try {
            await supabase
              .from('market_news')
              .update({ image_url: imageUrl })
              .eq('id', item.id);
          } catch (error) {
            console.error('Erro ao atualizar imagem no banco de dados:', error);
          }
        }
      })
    );
    
    // Pequeno atraso entre lotes para não sobrecarregar
    if (i + batchSize < newsWithImages.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return newsWithImages;
} 
/**
 * Utilitário para extrair imagens de páginas web
 */

/**
 * Extrai a imagem principal de uma página web
 * @param url URL da página web
 * @returns Promise com a URL da imagem ou null se não encontrar
 */
export async function extractImageFromUrl(url: string): Promise<string | null> {
  try {
    // Usar um proxy CORS para acessar a página
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Erro ao acessar a URL: ${response.status}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    // Criar um parser de HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Tentar encontrar a imagem principal em ordem de prioridade
    
    // 1. Meta tag og:image (Open Graph)
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage && ogImage.getAttribute('content')) {
      return ogImage.getAttribute('content');
    }
    
    // 2. Meta tag twitter:image
    const twitterImage = doc.querySelector('meta[name="twitter:image"]');
    if (twitterImage && twitterImage.getAttribute('content')) {
      return twitterImage.getAttribute('content');
    }
    
    // 3. Primeira imagem grande no conteúdo
    const images = Array.from(doc.querySelectorAll('img'));
    const largeImages = images.filter(img => {
      const width = parseInt(img.getAttribute('width') || '0', 10);
      const height = parseInt(img.getAttribute('height') || '0', 10);
      return (width >= 300 && height >= 200) || (img.src && img.src.includes('header') || img.src.includes('featured'));
    });
    
    if (largeImages.length > 0 && largeImages[0].src) {
      return largeImages[0].src;
    }
    
    // 4. Qualquer imagem no conteúdo
    if (images.length > 0 && images[0].src) {
      return images[0].src;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao extrair imagem da URL:', error);
    return null;
  }
}

/**
 * Verifica se uma URL é uma imagem válida
 * @param url URL da imagem
 * @returns Promise com true se for uma imagem válida, false caso contrário
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;
    
    const contentType = response.headers.get('content-type');
    return contentType ? contentType.startsWith('image/') : false;
  } catch (error) {
    return false;
  }
} 
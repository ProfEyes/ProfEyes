export const fetchMarketNews = async () => {
  try {
    const response = await api.get('/news');
    return response.data.map((news: any) => ({
      ...news,
      // Garantir que a imageUrl seja a URL completa da imagem
      imageUrl: news.imageUrl?.startsWith('http') ? news.imageUrl : null
    }));
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    return [];
  }
}; 
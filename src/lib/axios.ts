import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://api.marketmindset.com.br', // Ajuste para a URL correta da sua API
  timeout: 30000, // Aumentando o timeout para 30 segundos
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptors para tratamento de erros
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
); 
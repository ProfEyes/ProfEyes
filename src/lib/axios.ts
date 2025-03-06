import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://api.marketmindset.com.br', // Ajuste para a URL correta da sua API
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptors para tratamento de erros
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
); 
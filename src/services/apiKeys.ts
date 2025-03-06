// API Keys for various financial data services

export const API_KEYS = {
  BINANCE: {
    API_KEY: 'pB3q3dkR2VvORmNfgvHvnb2mPmHAwRXZYew8ZyucprJITU8ZiHu0H6hHJqoAnc7r',
    API_SECRET: 'wui3PhUUMKA1F2jKnAkOIdw7vbJnFRrSoxjJmsEj1MYskSQ2YKmgWpf2S7I7EMlp'
  },
  ALPHA_VANTAGE: {
    API_KEY: 'R3BHKD32T0RNX19Q'
  },
  FINNHUB: {
    API_KEY: 'cv2i8npr01qhefskfc2gcv2i8npr01qhefskfc30',
    WEBHOOK: 'cv2i8npr01qhefskfc40'
  },
  NEWS_API: {
    API_KEY: '3f28acaf-96e1-42df-b5c7-57316a076c0c'
  },
  NEWSDATA_IO: {
    API_KEY: 'pub_3551878a9c0e1b9e5f5a3e8a9c5a3e8a9c5a3e8a9c5a3e8a9c5a3e8a9c5a3e'
  }
};

// Exportar as chaves individuais para uso pelo Binance API
export const BINANCE_API_KEY = API_KEYS.BINANCE.API_KEY;
export const BINANCE_API_SECRET = API_KEYS.BINANCE.API_SECRET; 
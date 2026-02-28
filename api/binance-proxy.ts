/**
 * VERCEL SERVERLESS FUNCTION - PROXY BINANCE API
 * 
 * Esta função faz proxy das requisições para a API Binance,
 * resolvendo problemas de CORS ao chamar diretamente do navegador.
 * 
 * Endpoint: /api/binance-proxy?endpoint=/api/v3/ticker/price&symbol=BTCUSDT
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const BINANCE_BASE_URL = 'https://api.binance.com';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas GET é permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { endpoint, ...params } = req.query;

    // Validar endpoint
    if (!endpoint || Array.isArray(endpoint)) {
      return res.status(400).json({ 
        error: 'Endpoint é obrigatório',
        example: '/api/binance-proxy?endpoint=/api/v3/ticker/price&symbol=BTCUSDT'
      });
    }

    // Validar que o endpoint começa com /api/v3 (segurança)
    if (!endpoint.startsWith('/api/v3/')) {
      return res.status(400).json({ 
        error: 'Endpoint inválido. Deve começar com /api/v3/'
      });
    }

    console.log(`📊 [Binance Proxy] ${endpoint}`, params);

    // Construir query string
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        acc[key] = Array.isArray(value) ? value[0] : value;
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const fullUrl = `${BINANCE_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        code: response.status, 
        msg: response.statusText 
      }));
      
      console.error(`❌ Binance API erro: ${response.status}`, errorData);
      
      return res.status(response.status).json({ 
        error: `Erro Binance: ${errorData.msg || response.statusText}`,
        code: errorData.code,
        binanceError: errorData
      });
    }

    const data = await response.json();

    console.log(`✅ [Binance Proxy] Resposta recebida`);

    // Cache por 10 segundos (preços mudam rápido)
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');

    return res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Binance Proxy] Erro:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
}

import { tradingSignalService, TradingSignalService, SignalType, SignalStrength } from './index';

/**
 * Exemplo de uso da nova estrutura de sinais de trading
 * Este arquivo serve como documentação e guia para desenvolvedores
 */

// Exemplo 1: Usar a instância padrão do serviço
async function fetchSignalsWithDefaultService() {
  try {
    // Buscar sinais com a instância padrão
    const signals = await tradingSignalService.fetchTradingSignals();
    console.log(`Encontrados ${signals.length} sinais de trading`);
    
    // Atualizar status de todos os sinais ativos
    const updatedSignals = await tradingSignalService.updateAllSignalsStatus();
    console.log(`Atualizados ${updatedSignals.length} sinais ativos`);
    
    return signals;
  } catch (error) {
    console.error('Erro ao buscar sinais:', error);
    return [];
  }
}

// Exemplo 2: Criar uma instância personalizada do serviço
async function createCustomTradingService() {
  // Criar configuração personalizada
  const customConfig = TradingSignalService.createDefaultConfig();
  
  // Personalizar configuração
  customConfig.symbols = ['BTCUSDT', 'ETHUSDT', 'AAPL', 'MSFT']; // Apenas alguns símbolos
  customConfig.refreshInterval = 10 * 60 * 1000; // 10 minutos
  
  // Habilitar apenas sinais técnicos
  Object.keys(customConfig.signalGenerators).forEach(type => {
    customConfig.signalGenerators[type as SignalType].enabled = false;
  });
  customConfig.signalGenerators[SignalType.TECHNICAL].enabled = true;
  
  // Configurar agregador para exigir pelo menos 2 sinais
  customConfig.aggregator.minSignalsRequired = 2;
  
  // Criar instância personalizada
  const customService = new TradingSignalService(customConfig);
  
  // Buscar sinais com a instância personalizada
  const signals = await customService.fetchTradingSignals();
  console.log(`Encontrados ${signals.length} sinais com configuração personalizada`);
  
  return signals;
}

// Exemplo 3: Salvar um sinal manualmente
async function saveCustomSignal() {
  const customSignal = {
    symbol: 'BTCUSDT',
    type: SignalType.TECHNICAL,
    signal: 'BUY' as const,
    reason: 'Sinal manual de teste',
    strength: SignalStrength.STRONG,
    timestamp: Date.now(),
    price: 50000,
    entry_price: 50000,
    stop_loss: 48000,
    target_price: 55000,
    success_rate: 0.75,
    timeframe: '1d',
    expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    risk_reward: '2.5',
    status: 'active' as const
  };
  
  const savedSignal = await tradingSignalService.saveSignal(customSignal);
  console.log('Sinal salvo com ID:', savedSignal.id);
  
  return savedSignal;
}

// Exportar funções de exemplo
export {
  fetchSignalsWithDefaultService,
  createCustomTradingService,
  saveCustomSignal
}; 
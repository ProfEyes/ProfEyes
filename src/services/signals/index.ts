// Exportar tipos
export * from './types';

// Exportar classes base
export * from './BaseSignalGenerator';

// Exportar geradores de sinais
export * from './TechnicalSignalGenerator';
// Outros geradores serão adicionados aqui conforme implementados

// Exportar agregador
export * from './SignalAggregator';

// Exportar serviço principal
export * from './TradingSignalService';

// Criar e exportar instância padrão do serviço
import { TradingSignalService } from './TradingSignalService';

// Criar instância com configuração padrão
const tradingSignalService = new TradingSignalService(
  TradingSignalService.createDefaultConfig()
);

export { tradingSignalService }; 
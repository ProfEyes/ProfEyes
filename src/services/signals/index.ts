// Exportar tipos
export * from './types';

// Exportar serviço de notificações prévias
export { default as preSignalNotificationService } from './PreSignalNotificationService';

// Exportar funções de sinais diários
export {
  fetchTradingSignals,
  get3FirstSignalsFromDB,
  get7SignalsFromDB,
  getAllDailySignalsFromDB,
  regenerateDailySignals
} from '../dailySignals';

export type {
  DailySignalFromDB,
  DailySignalFormatted
} from '../dailySignals'; 
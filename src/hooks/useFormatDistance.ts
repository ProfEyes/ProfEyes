import { formatDistanceToNow as formatDistanceToNowFn } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useFormatDistance() {
  const formatDistanceToNow = (date: Date | number | string) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return formatDistanceToNowFn(date, {
      addSuffix: true,
      locale: ptBR
    });
  };

  return { formatDistanceToNow };
} 
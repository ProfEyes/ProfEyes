import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface RealtimeStatusProps {
  status: 'connected' | 'disconnected' | 'connecting';
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RealtimeStatus: React.FC<RealtimeStatusProps> = ({
  status,
  label = 'Tempo Real',
  showLabel = true,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          label: 'Conectado',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          label: 'Conectando...',
          pulse: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          label: 'Desconectado',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${sizeClasses[size]}`}
      title={`${label}: ${config.label}`}
    >
      <Icon
        size={iconSizes[size]}
        className={`${config.color} ${config.pulse ? 'animate-spin' : ''}`}
      />
      {showLabel && (
        <span className={`font-medium ${config.color}`}>
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * Componente para mostrar múltiplos status de conexão
 */
interface MultiRealtimeStatusProps {
  connections: Array<{
    label: string;
    status: 'connected' | 'disconnected' | 'connecting';
  }>;
  size?: 'sm' | 'md' | 'lg';
}

export const MultiRealtimeStatus: React.FC<MultiRealtimeStatusProps> = ({
  connections,
  size = 'sm',
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {connections.map((conn) => (
        <RealtimeStatus
          key={conn.label}
          status={conn.status}
          label={conn.label}
          showLabel={true}
          size={size}
        />
      ))}
    </div>
  );
};

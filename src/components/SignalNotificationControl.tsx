import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { signalNotificationService } from '@/services/signalNotifications';
import { toast } from 'sonner';

export function SignalNotificationControl() {
  const [isActive, setIsActive] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Verificar status inicial
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setIsActive(signalNotificationService.isActive());
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      const success = await signalNotificationService.initialize();
      
      if (success) {
        setPermission('granted');
        setIsActive(true);
        toast.success('Notificações de sinais ativadas!', {
          description: 'Você receberá alertas 10 minutos antes de cada sinal.'
        });
      } else {
        toast.error('Não foi possível ativar notificações', {
          description: 'Verifique as permissões do navegador.'
        });
      }
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      toast.error('Erro ao ativar notificações');
    }
  };

  const handleDisableNotifications = () => {
    signalNotificationService.stop();
    setIsActive(false);
    toast.info('Notificações de sinais desativadas');
  };

  if (!('Notification' in window)) {
    return (
      <Card className="p-4 bg-red-500/10 border-red-500/20">
        <div className="flex items-center gap-3 text-red-400">
          <XCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">Notificações não suportadas</p>
            <p className="text-sm text-red-400/70">Seu navegador não suporta notificações</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-black/20 border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isActive ? (
            <Bell className="h-5 w-5 text-green-400" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <p className="font-medium text-white">
              Notificações de Sinais
              {isActive && <CheckCircle className="inline h-4 w-4 ml-2 text-green-400" />}
            </p>
            <p className="text-sm text-white/60">
              {isActive 
                ? 'Receba alertas 10 minutos antes de cada sinal'
                : 'Ative para receber alertas antes dos sinais'
              }
            </p>
            {permission === 'denied' && (
              <p className="text-xs text-red-400 mt-1">
                ⚠️ Permissão negada. Habilite nas configurações do navegador.
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={isActive ? handleDisableNotifications : handleEnableNotifications}
          variant={isActive ? 'outline' : 'default'}
          size="sm"
          disabled={permission === 'denied'}
          className={isActive ? 'border-white/20' : ''}
        >
          {isActive ? 'Desativar' : 'Ativar'}
        </Button>
      </div>
    </Card>
  );
}

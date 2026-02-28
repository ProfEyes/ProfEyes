import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  Chrome, 
  Globe, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

interface NotificationPermissionHelperProps {
  onPermissionChanged?: (permission: NotificationPermission) => void;
}

export function NotificationPermissionHelper({ onPermissionChanged }: NotificationPermissionHelperProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = () => {
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      setPermission(currentPermission);
      onPermissionChanged?.(currentPermission);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    
    setIsCheckingPermission(true);
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      onPermissionChanged?.(result);
      
      if (result === 'granted') {
        // Testar notificação
        new Notification('✅ Permissões habilitadas!', {
          body: 'Agora você receberá alertas de sinais.',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: 'Permitido',
          color: 'bg-green-500/10 text-green-400 border-green-500/20'
        };
      case 'denied':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: 'Negado',
          color: 'bg-red-500/10 text-red-400 border-red-500/20'
        };
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          text: 'Não definido',
          color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        };
    }
  };

  const status = getPermissionStatus();

  return (
    <Card className="bg-black/40 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bell className="h-5 w-5" />
          Permissões de Notificação
        </CardTitle>
        <CardDescription>
          Configure as notificações para receber alertas de sinais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Atual */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Status atual:</span>
          <Badge className={status.color}>
            {status.icon}
            {status.text}
          </Badge>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2">
          {permission === 'default' && (
            <Button
              onClick={requestPermission}
              disabled={isCheckingPermission}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCheckingPermission ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Permitir Notificações
                </>
              )}
            </Button>
          )}

          <Button
            onClick={checkPermission}
            variant="outline"
            size="sm"
            className="w-full border-white/20 text-white/80 hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Verificar Status
          </Button>
        </div>

        {/* Instruções para Reabilitar */}
        {permission === 'denied' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-red-400">Como reabilitar as notificações</h4>
                
                <div className="space-y-3 text-sm text-white/80">
                  <div>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <Chrome className="h-4 w-4" />
                      Chrome/Edge
                    </div>
                    <ol className="list-decimal list-inside space-y-1 ml-6 text-xs">
                      <li>Clique no ícone de cadeado/informações na barra de endereços</li>
                      <li>Encontre "Notificações" e mude para "Permitir"</li>
                      <li>Recarregue a página</li>
                    </ol>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <Globe className="h-4 w-4" />
                      Firefox
                    </div>
                    <ol className="list-decimal list-inside space-y-1 ml-6 text-xs">
                      <li>Clique no ícone de escudo na barra de endereços</li>
                      <li>Vá em "Configurações de permissões"</li>
                      <li>Ative as notificações</li>
                      <li>Recarregue a página</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informações Adicionais */}
        {permission === 'granted' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-white/80">
                <p className="text-green-400 font-medium mb-1">Notificações ativas!</p>
                <p>Você receberá alertas 5 minutos antes de cada sinal de trading.</p>
              </div>
            </div>
          </div>
        )}

        {!('Notification' in window) && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-white/80">
                <p className="text-yellow-400 font-medium mb-1">Navegador não suportado</p>
                <p>Seu navegador não suporta notificações. Você ainda receberá alertas na tela.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
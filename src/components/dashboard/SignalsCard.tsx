import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { TradingSignal, fetchTradingSignals, replaceCompletedSignal, replaceMultipleCompletedSignals, updateSignalStatus } from "@/services/marketData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const SignalsCard = () => {
  const navigate = useNavigate();
  const [localSignals, setLocalSignals] = useState<TradingSignal[]>([]);
  
  const { data: signals, isLoading, refetch } = useQuery({
    queryKey: ['tradingSignals'],
    queryFn: () => fetchTradingSignals({ limit: 5 }), // Limitado a 5 sinais
    refetchInterval: 300000, // Atualiza a cada 5 minutos
  });

  // Atualizar sinais locais quando os dados da query mudarem
  useEffect(() => {
    if (signals) {
      setLocalSignals(signals);
    }
  }, [signals]);

  // Verificar status dos sinais a cada 1 minuto
  useEffect(() => {
    const checkSignalStatus = async () => {
      if (!localSignals || localSignals.length === 0) return;
      
      let needsRefresh = false;
      const updatedSignals = [...localSignals];
      const completedSignals: TradingSignal[] = [];
      
      for (let i = 0; i < updatedSignals.length; i++) {
        const signal = updatedSignals[i];
        
        // Pular sinais que já foram concluídos ou cancelados
        if (signal.status !== 'ATIVO') continue;
        
        try {
          // Verificar preço atual e atualizar status usando a função do serviço
          const updatedSignal = await updateSignalStatus(signal);
          updatedSignals[i] = updatedSignal;
          
          // Se o status mudou, adicionar à lista de sinais concluídos
          if (updatedSignal.status !== 'ATIVO') {
            console.log(`Sinal ${signal.pair} mudou para ${updatedSignal.status}`);
            needsRefresh = true;
            completedSignals.push(updatedSignal);
          }
        } catch (error) {
          console.error(`Erro ao verificar status do sinal ${signal.pair}:`, error);
        }
      }
      
      // Se temos sinais concluídos, substituí-los pelos melhores disponíveis
      if (completedSignals.length > 0) {
        try {
          let replacementSignals: TradingSignal[] = [];
          
          if (completedSignals.length === 1) {
            // Apenas um sinal para substituir
            const newSignal = await replaceCompletedSignal(completedSignals[0]);
            if (newSignal) {
              replacementSignals = [newSignal];
            }
          } else {
            // Múltiplos sinais para substituir
            replacementSignals = await replaceMultipleCompletedSignals(completedSignals);
          }
          
          if (replacementSignals.length > 0) {
            // Substituir os sinais concluídos pelos novos
            const activeSignals = updatedSignals.filter(s => s.status === 'ATIVO');
            const finalSignals = [...activeSignals];
            
            // Adicionar os sinais de substituição
            for (const signal of replacementSignals) {
              if (finalSignals.length < 5) { // Limite de 5 sinais
                finalSignals.push(signal);
              }
            }
            
            // Ordenar por taxa de sucesso (do maior para o menor)
            finalSignals.sort((a, b) => b.successRate - a.successRate);
            
            setLocalSignals(finalSignals);
            needsRefresh = true;
          }
        } catch (error) {
          console.error('Erro ao substituir sinais concluídos:', error);
        }
      }
      
      // Atualizar sinais locais se houve mudanças mas não substituições
      if (needsRefresh && completedSignals.length === 0) {
        // Ordenar por taxa de sucesso (do maior para o menor)
        updatedSignals.sort((a, b) => b.successRate - a.successRate);
        setLocalSignals(updatedSignals);
      }
      
      // Se houve mudanças, forçar um refetch para garantir dados atualizados
      if (needsRefresh) {
        refetch();
      }
    };
    
    // Verificar status a cada 1 minuto
    const intervalId = setInterval(checkSignalStatus, 60000);
    
    // Limpar intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, [localSignals, refetch]);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 75) return "text-green-400";
    if (rate >= 65) return "text-yellow-400";
    return "text-orange-400";
  };

  const getSuccessRateText = (rate: number) => {
    if (rate >= 75) return "Alta";
    if (rate >= 65) return "Média";
    return "Baixa";
  };

  const getStatusBadge = (status: string) => {
    if (status === 'CONCLUÍDO') return <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Concluído</span>;
    if (status === 'CANCELADO') return <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">Cancelado</span>;
    return null;
  };

  return (
    <Card className="col-span-2 hover-scale glass">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle>Melhores Trades</CardTitle>
        <Button 
          variant="ghost" 
          className="text-sm text-muted-foreground hover:text-white"
          onClick={() => navigate('/signals')}
        >
          Ver todas (15)
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <span className="text-sm text-muted-foreground">Analisando mercado...</span>
            </div>
          ) : localSignals && localSignals.length > 0 ? (
            localSignals.map((signal) => (
              <div 
                key={signal.id} 
                className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={signal.type === "COMPRA" ? "bg-market-up/10 p-2 rounded-full" : "bg-market-down/10 p-2 rounded-full"}>
                    {signal.type === "COMPRA" ? (
                      <ArrowUpRight className="h-5 w-5 text-market-up" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-market-down" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{signal.pair}</p>
                    <p className={`text-sm ${signal.type === "COMPRA" ? "text-market-up" : "text-market-down"}`}>
                      {signal.type} • <span className={getSuccessRateColor(signal.successRate)}>
                        Chance {getSuccessRateText(signal.successRate)} ({signal.successRate.toFixed(1)}%)
                      </span>
                      {getStatusBadge(signal.status)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <p className="text-sm">
                      Entrada: <span className="font-medium">${signal.entry}</span>
                    </p>
                    <p className="text-sm text-market-up">
                      Alvo: <span className="font-medium">${signal.target}</span>
                    </p>
                    <p className="text-sm text-market-down">
                      Stop: <span className="font-medium">${signal.stopLoss}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(signal.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center p-4">
              <span className="text-sm text-muted-foreground">Nenhum sinal disponível no momento</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalsCard;


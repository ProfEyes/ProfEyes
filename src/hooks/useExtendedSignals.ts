/**
 * Hook para buscar 7 sinais (3 ativos + 4 adicionais) via RPC
 * Usado APENAS na aba Trades
 * Dashboard usa useRealtimeSignals() para 3 sinais
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { ActiveSignal } from '@/services/realtimeSignals';
import { useAuth } from '@/contexts/AuthContext';

// Declaração global para debounce
declare global {
  interface Window {
    __lastExtendedSignalsFetch?: number;
  }
}

export function useExtendedSignals() {
  const { loading: authLoading } = useAuth();  // ✅ Pega status de loading do auth
  
  const STORAGE_KEY = 'extended_signals_cache';
  const CACHE_DATE_KEY = 'extended_signals_cache_date';
  
  // 🔥 VERSÃO 3.0: LIMPEZA INTELIGENTE
  const CACHE_VERSION_KEY = 'extended_signals_cache_version';
  const CURRENT_VERSION = '3.0'; // Incrementar sempre que mudar estrutura de dados
  
  const [signals, setSignals] = useState<ActiveSignal[]>(() => {
    // Verificar versão do cache
    // Verificando versão do cache (silenciado)
    
    try {
      const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      
      // Se versão diferente, limpar
      if (cachedVersion !== CURRENT_VERSION) {
        // Versão diferente (silenciado)
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CACHE_DATE_KEY);
        localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
      } else {
        // Cache na versão correta (silenciado)
      }
    } catch (error) {
      console.warn('⚠️ [Extended] Erro durante verificação:', error);
    }
    
    // NÃO carregar cache inicial - sempre buscar do servidor
    // Não carregar cache (silenciado)
    return [];
    
    /* CÓDIGO ANTIGO DESABILITADO - Estava retornando cache antigo
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      const cacheDate = localStorage.getItem(CACHE_DATE_KEY);
      const today = new Date().toDateString();
      
      if (cached && cacheDate === today) {
        const parsedSignals = JSON.parse(cached);
        // Sinais do cache (silenciado)
        console.warn('⚠️ [Extended] Cache pode estar desatualizado - será atualizado do servidor em seguida');
        return parsedSignals;
      } else if (cached) {
        // Cache expirado (silenciado)
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CACHE_DATE_KEY);
      } else {
        // Sem cache (silenciado)
      }
    } catch (error) {
      console.warn('⚠️ [Extended] Erro ao carregar cache:', error);
    }
    return [];
    */
  });
  
  // ✅ SEMPRE mostrar loading no início (já que não carregamos cache inicial)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // 🔥 TIMEOUT GLOBAL: Garantir que isLoading sempre vire false após 12s
  useEffect(() => {
    // Timeout global (silenciado)
    const globalTimeout = setTimeout(() => {
      // Timeout atingido - forçando isLoading=false silenciosamente
      setIsLoading(false);
    }, 12000);
    
    return () => {
      clearTimeout(globalTimeout);
    };
  }, []); // Executar apenas uma vez ao montar

  const fetchExtendedSignals = useCallback(async () => {
    // 🔥 TIMEOUT DE SEGURANÇA: Se demorar mais de 10s, desativar loading
    const safetyTimeout = setTimeout(() => {
      console.error('⏰ [Extended] TIMEOUT DE SEGURANÇA! Fetch demorou > 10s, forçando isLoading=false');
      setIsLoading(false);
    }, 10000);
    
    try {
      // fetchExtendedSignals iniciado (silenciado)
      
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      const now = new Date().toLocaleTimeString('pt-BR');
      // Buscando sinais (silenciado)

      // ⚡ RETRY com TIMEOUT REDUZIDO de 8s por tentativa (evitar travamento)
      let result;
      let lastError: Error | null = null;
      const maxRetries = 1; // ⚡ Reduzido para 1 tentativa
      
      // ⚡ RETRY: Tentar apenas 1 vez
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Tentativa (silenciado)
          
          // ⚡ Criar nova promise para cada tentativa com timeout reduzido
          const attemptPromise = (supabase as any).rpc('get_extended_signals');
          const attemptTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`RPC timeout tentativa ${attempt}`)), 8000)
          );
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await Promise.race([attemptPromise, attemptTimeout]) as any;
          // Tentativa bem-sucedida
          break; // Sucesso, sair do loop
        } catch (error) {
          lastError = error as Error;
          console.error(`❌ [Extended] Tentativa ${attempt} falhou:`, error);
          
          if (attempt < maxRetries) {
            // Aguardando (silenciado)
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error('❌ [Extended] TODAS as tentativas falharam!');
            throw lastError;
          }
        }
      }
      
      // ✅ Verificar se result foi atribuído (pelo menos uma tentativa teve sucesso)
      if (!result) {
        console.error('❌ [Extended] Nenhuma tentativa teve sucesso, result undefined');
        throw lastError || new Error('Todas as tentativas falharam');
      }
      
      const { data, error: rpcError } = result;

      if (rpcError) {
        console.error('❌ [Extended] Erro RPC retornado pelo Supabase:', rpcError);
        throw rpcError;
      }

      // RPC respondeu com sinais

      if (!data || data.length === 0) {
        console.warn('⚠️ [Extended] RPC retornou array vazio!');
        
        // ✅ FALLBACK: Se RPC retornar vazio mas tem cache, manter cache
        const currentSignals = signals.length > 0 ? signals : JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (currentSignals.length > 0) {
          console.warn(`⚠️ [Extended] Mantendo ${currentSignals.length} sinais do cache`);
          setSignals(currentSignals);
        }
        clearTimeout(safetyTimeout); // Limpar timeout de segurança
        setIsLoading(false);
        return;
      }

      // Converter JSON para ActiveSignal COM VALIDAÇÃO
      const currentDate = new Date();
      const currentHour = currentDate.getHours();
      const currentMinute = currentDate.getMinutes();
      
      // Horário atual
      
      const convertedSignals = (data || [])
        .map((signalJson: unknown) => {
          const signal = signalJson as ActiveSignal;
          
          // ✅ VALIDAÇÃO: Verificar se entry_time não é muito antigo
          const entryTimeStr = signal.entry_time?.substring(0, 5) || signal.entry_time;
          const [entryHourStr, entryMinuteStr] = entryTimeStr.split(':');
          const entryHour = parseInt(entryHourStr);
          const entryMinute = parseInt(entryMinuteStr);
          
          // Calcular diferença em minutos considerando wrap de 24h
          let timeDiffMinutes = (currentHour * 60 + currentMinute) - (entryHour * 60 + entryMinute);
          
          // ✅ CORREÇÃO COMPLETA: Ajustar para horários que cruzam meia-noite
          // Se a diferença for > 720 minutos (12 horas), o sinal é do próximo dia (futuro)
          // Ex: Agora 22:53 (1373min), Sinal 00:03 (3min) = 1370min → futuro (faltam 10min)
          if (timeDiffMinutes > 720) {
            // Horário é do próximo dia - subtrair 24h (1440 minutos)
            timeDiffMinutes -= 1440;
            // Ajuste meia-noite FUTURO (silenciado)
          }
          // Se a diferença for < -720, o horário é do dia anterior (muito antigo)
          else if (timeDiffMinutes < -720) {
            // Horário é do dia anterior - adicionar 24h
            timeDiffMinutes += 1440;
            // Ajuste meia-noite ANTIGO (silenciado)
          }
          
          // 🔥 VALIDAÇÃO RIGOROSA: REJEITAR sinais com entry_time > 30 minutos no PASSADO
          // (mas aceitar sinais futuros - diff negativo)
          if (timeDiffMinutes > 30) {
            console.warn(`⚠️ [Extended] Sinal ${signal.symbol} REJEITADO - entry_time muito antigo (>30min):`, {
              entry_time: entryTimeStr,
              current_time: `${currentHour}:${currentMinute}`,
              diff_minutes: timeDiffMinutes,
              position: signal.position
            });
            return null;
          }
          
          const status = timeDiffMinutes < 0 ? 'FUTURO' : 'ATUAL';
          // Sinal aceito
          
          // Se passou na validação, processar normalmente
          return {
            ...signal,
            // Remover segundos dos horários
            entry_time: entryTimeStr,
            expiry_time: signal.expiry_time?.substring(0, 5) || signal.expiry_time,
            gale1_time: signal.gale1_time?.substring(0, 5) || signal.gale1_time,
            gale2_time: signal.gale2_time?.substring(0, 5) || signal.gale2_time,
          };
        })
        .filter((s): s is ActiveSignal => s !== null); // Remove sinais rejeitados
      
      // Validação completa

      // ✅ CORREÇÃO CRÍTICA: Ordenar por POSITION (não por entry_time)
      // O banco já garante a ordem correta via position
      const sortedSignals = convertedSignals.sort((a, b) => {
        return (a.position || 0) - (b.position || 0);
      });

      // ✅ ESTABILIZAÇÃO: Verificar se os sinais realmente mudaram
      // Verificando mudanças nos sinais
      const currentCache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const currentOrder = sortedSignals.map(s => `${s.symbol}_${s.entry_time}_${s.position}`).join('|');
      const cachedOrder = currentCache.map((s: ActiveSignal) => `${s.symbol}_${s.entry_time}_${s.position}`).join('|');
      
      // Comparação de sinais
      
      if (currentOrder === cachedOrder && currentCache.length === sortedSignals.length) {
        // Sinais idênticos - não atualizar
        setIsLoading(false);
        return;
      }
      
      // Sinais mudaram (silenciado)
      
      if (currentCache.length > 0) {
        // ROTAÇÃO DETECTADA (silenciado)
        
        // Verificar se os 3 primeiros mudaram (rotação) ou se os 4 últimos mudaram (erro)
        const first3Changed = currentCache.length >= 3 && sortedSignals.length >= 3 &&
          (currentCache[0].symbol !== sortedSignals[0].symbol ||
           currentCache[1].symbol !== sortedSignals[1].symbol ||
           currentCache[2].symbol !== sortedSignals[2].symbol);
           
        const last4Changed = currentCache.length === 7 && sortedSignals.length === 7 &&
          (currentCache[3].symbol !== sortedSignals[3].symbol ||
           currentCache[4].symbol !== sortedSignals[4].symbol ||
           currentCache[5].symbol !== sortedSignals[5].symbol ||
           currentCache[6].symbol !== sortedSignals[6].symbol);
        
        if (first3Changed && !last4Changed) {
          // Rotação normal executada
        } else if (first3Changed && last4Changed) {
          // Rotação completa (silenciado)
        } else if (!first3Changed && last4Changed) {
          console.warn('   ❌ ERRO: Apenas os 4 sinais adicionais mudaram (não deveria acontecer!)');
        }
      }
      
      // Sinais ordenados (silenciado)
      
      // ✅ VALIDAÇÃO: Verificar integridade dos sinais
      if (typeof window !== 'undefined') {
        import('@/utils/signalValidation').then(({ validateSignalSet, logValidationResult }) => {
          const validation = validateSignalSet(sortedSignals);
          logValidationResult('Extended Signals', validation);
        }).catch(err => console.warn('⚠️ Não foi possível validar sinais:', err));
      }
      
      // ✅ Salvar cache com timestamp
      try {
        const today = new Date().toDateString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedSignals));
        localStorage.setItem(CACHE_DATE_KEY, today);
        // Cache salvo (silenciado)
      } catch (error) {
        console.warn('⚠️ [Extended] Erro ao salvar cache:', error);
      }
      
      // ATUALIZANDO ESTADO REACT (silenciado)
      
      setSignals(sortedSignals);
      // setSignals chamado (silenciado)
      
      clearTimeout(safetyTimeout); // Limpar timeout de segurança
      // Safety timeout limpo (silenciado)
      
      setIsLoading(false);
      // isLoading=false (silenciado)
    } catch (err) {
      clearTimeout(safetyTimeout); // Limpar timeout de segurança
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ [Extended] Erro ao buscar sinais:', errorMessage);
      console.error('   📊 Stack trace:', err);
      
      // ✅ FALLBACK: Em caso de erro, manter sinais do cache
      const currentSignals = signals.length > 0 ? signals : JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (currentSignals.length > 0) {
        console.warn(`⚠️ [Extended] Erro na busca (${errorMessage}), mantendo ${currentSignals.length} sinais do cache`);
        setSignals(currentSignals);
      } else {
        console.error(`❌ [Extended] Sem cache e com erro - setando error state`);
        setError(err as Error);
      }
      setIsLoading(false);
      // isLoading=false após erro (silenciado)
    }
  }, []); // ✅ SEM DEPENDÊNCIAS - função estável

  // ✅ CORREÇÃO: Buscar APENAS UMA VEZ ao montar (depois só via Realtime)
  const hasInitialized = useRef(false);
  
  // ✅ Cache da última ordenação para evitar embaralhamento
  const lastOrderRef = useRef<string[]>([]);
  
  useEffect(() => {
    // useEffect PRINCIPAL (silenciado)
    
    // ✅ AGUARDAR AUTENTICAÇÃO COMPLETAR
    if (authLoading) {
      // Aguardando autenticação (silenciado)
      
      // 🔥 Timeout de segurança: Se authLoading ficar true por muito tempo, forçar
      const authTimeout = setTimeout(() => {
        console.warn('⚠️ [Extended] authLoading ficou true por 10s! FORÇANDO isLoading=false...');
        setIsLoading(false); // Forçar loading false para desbloquear UI
      }, 10000);
      
      return () => clearTimeout(authTimeout);
    }
    
    // Auth não está mais carregando (silenciado)
    
    // ✅ SIMPLIFICADO: Buscar UMA VEZ ao montar, sem verificações de cache
    if (hasInitialized.current) {
      // Já inicializado (silenciado)
      return;
    }
    
    // PRIMEIRA INICIALIZAÇÃO (silenciado)
    hasInitialized.current = true;
    
    // Autenticação completa (silenciado)
    
    // ✅ CRÍTICO: SEMPRE limpar cache ao montar o hook (não confiar na limpeza do main.tsx)
    // LIMPEZA FORÇADA (silenciado)
    const keysToRemove = [
      'tradesSignals',
      'dailyTradingSignals',
      'dashboardSignals',
      'extended_signals_cache',
      'extended_signals_cache_date'
    ];
    
    keysToRemove.forEach(key => {
      const hadCache = localStorage.getItem(key) !== null;
      if (hadCache) {
        // Removendo cache (silenciado)
        localStorage.removeItem(key);
      }
    });
    
    // Limpeza concluída (silenciado)
    fetchExtendedSignals();
    
    // ✅ DEBOUNCE: Evitar múltiplos refreshes consecutivos (piscar 3x)
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    // ✅ NOVO: Escutar evento de atualização forçada após background
    const handleBackgroundResume = (event: Event) => {
      const customEvent = event as CustomEvent;
      const timeInBackground = customEvent.detail?.timeInBackground || 0;
      // Forçando atualização (silenciado)
      
      // 🔥 DEBOUNCE: Cancelar refresh anterior se houver
      if (refreshTimeout) {
        // Cancelando refresh (silenciado)
        clearTimeout(refreshTimeout);
      }
      
      // Aguardar 500ms antes de fazer refresh para evitar múltiplas chamadas
      refreshTimeout = setTimeout(() => {
        // Executando refresh (silenciado)
        fetchExtendedSignals();
      }, 500);
    };
    
    const handleForceRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      const reason = customEvent.detail?.reason || 'unknown';
      // Refresh forçado (silenciado)
      
      // 🔥 DEBOUNCE: Cancelar refresh anterior se houver
      if (refreshTimeout) {
        // Cancelando refresh (silenciado)
        clearTimeout(refreshTimeout);
      }
      
      // Aguardar 500ms antes de fazer refresh para evitar múltiplas chamadas
      refreshTimeout = setTimeout(() => {
        // Executando refresh (silenciado)
        fetchExtendedSignals();
      }, 500);
    };
    
    window.addEventListener('force-update-after-background', handleBackgroundResume);
    window.addEventListener('force-refresh-signals', handleForceRefresh);
    
    // ✅ Cleanup: remover listeners e timeouts
    return () => {
      // Componente desmontado (silenciado)
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      window.removeEventListener('force-update-after-background', handleBackgroundResume);
      window.removeEventListener('force-refresh-signals', handleForceRefresh);
    };
  }, [authLoading, fetchExtendedSignals]); // ✅ Observa mudanças no authLoading e fetchExtendedSignals

  // ✅ REALTIME: Escutar mudanças APENAS nos 3 sinais principais (active_signals)
  useEffect(() => {
    // ✅ AGUARDAR AUTENTICAÇÃO COMPLETAR
    if (authLoading) {
      console.log('⏳ [Extended Realtime] Aguardando autenticação para configurar Realtime...');
      return;
    }
    
    // ✅ Aguardar inicialização antes de conectar Realtime
    if (!hasInitialized.current) {
      console.log('⏳ [Extended Realtime] Aguardando primeira busca completar...');
      return;
    }
    
    const supabase = getSupabase();
    
    // Configurando Realtime

    // Subscrever à tabela active_signals
    const channel = supabase
      .channel('extended-signals-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'active_signals'
        },
        (payload) => {
          const now = new Date().toLocaleTimeString('pt-BR');
          // Active signals mudaram (silenciado)
          
          // ✅ DEBOUNCE MAIS AGRESSIVO: Evitar múltiplas chamadas rápidas (5s)
          const lastCall = window.__lastExtendedSignalsFetch || 0;
          const timeSinceLastCall = Date.now() - lastCall;
          
          if (timeSinceLastCall < 5000) {
            // Ignorando atualização (silenciado)
            return;
          }
          
          window.__lastExtendedSignalsFetch = Date.now();
          fetchExtendedSignals();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime conectado
        }
      });

    // ✅ Listener para eventos customizados da Dashboard (rotação)
    const handleDashboardRotation = (event: Event) => {
      const now = new Date().toLocaleTimeString('pt-BR');
      const customEvent = event as CustomEvent;
      console.log(`🔔 [Extended] Rotação detectada da Dashboard (${now})`);
      console.log('   📊 Detalhes:', customEvent.detail?.signals?.slice(0, 3).map((s: any) => s.symbol).join(', '));
      
      // ✅ ROTAÇÃO = SEMPRE FORÇAR ATUALIZAÇÃO (ignorar debounce)
      console.log('🔄 [Extended] ROTAÇÃO DETECTADA - forçando atualização imediata...');
      
      // Atualizar timestamp para evitar chamadas duplicadas apenas de outros eventos
      window.__lastExtendedSignalsFetch = Date.now();
      
      // Buscar novos sinais
      console.log('📡 [Extended] Buscando 7 novos sinais após rotação...');
      fetchExtendedSignals();
    };

    window.addEventListener('signalsRotated', handleDashboardRotation);

    // ✅ LISTENER CRÍTICO: Forçar atualização quando voltar do background
    const handleForceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const timeInBackground = customEvent.detail?.timeInBackground || 0;
      const now = new Date().toLocaleTimeString('pt-BR');
      
      console.log(`🔄 [Extended] VOLTOU DO BACKGROUND! (${Math.floor(timeInBackground / 1000)}s ausente) - ${now}`);
      console.log('   🔄 Forçando atualização IMEDIATA dos sinais...');
      
      // Resetar contador de verificações consecutivas
      consecutiveChecks = 0;
      
      // Forçar busca imediata (ignorar debounce)
      window.__lastExtendedSignalsFetch = Date.now();
      fetchExtendedSignals();
    };

    const handleForceRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      const reason = customEvent.detail?.reason || 'unknown';
      const now = new Date().toLocaleTimeString('pt-BR');
      
      console.log(`🔄 [Extended] Force refresh solicitado (${reason}) - ${now}`);
      
      // Forçar busca imediata
      window.__lastExtendedSignalsFetch = Date.now();
      fetchExtendedSignals();
    };

    window.addEventListener('force-update-after-background', handleForceUpdate);
    window.addEventListener('force-refresh-signals', handleForceRefresh);

    // ✅ POLLING OTIMIZADO: Sistema de verificação recursiva que funciona em background
    // Iniciando polling
    
    let pollingTimeoutId: NodeJS.Timeout | null = null;
    let consecutiveChecks = 0;
    const MAX_CONSECUTIVE = 100; // Limite de segurança
    
    const checkRotation = () => {
      // Proteção contra loop infinito
      if (consecutiveChecks > MAX_CONSECUTIVE) {
        console.error('❌ [Extended Polling] Limite de verificações excedido - parando polling');
        return;
      }
      consecutiveChecks++;
      
      if (signals.length === 0) {
        // Sem sinais (silenciado)
        pollingTimeoutId = setTimeout(checkRotation, 30000); // Tentar novamente em 30s
        return;
      }
      
      // Pegar o primeiro sinal (posição 1)
      const firstSignal = signals[0];
      if (!firstSignal) {
        pollingTimeoutId = setTimeout(checkRotation, 30000);
        return;
      }
      
      const entryTime = firstSignal.entry_time;
      const [entryHour, entryMinute] = entryTime.split(':').map(Number);
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Calcular minutos desde o entry_time
      let minutesSinceEntry = (currentHour * 60 + currentMinute) - (entryHour * 60 + entryMinute);
      
      // Ajustar para meia-noite
      if (minutesSinceEntry > 720) {
        minutesSinceEntry -= 1440;
      } else if (minutesSinceEntry < -720) {
        minutesSinceEntry += 1440;
      }
      
      // Verificar se está visível ou em background
      const isVisible = document.visibilityState === 'visible';
      const statusIcon = isVisible ? '👁️' : '💤';
      
      // Se passou 15 minutos desde o entry_time, rotacionar
      if (minutesSinceEntry >= 15) {
        console.log(`🔄 ${statusIcon} [Extended Polling] Rotação automática detectada! (${isVisible ? 'VISÍVEL' : 'BACKGROUND'})`);
        console.log(`   ⏰ Sinal atual: ${firstSignal.symbol} ${entryTime}`);
        console.log(`   ⏱️  Tempo desde entrada: ${minutesSinceEntry} minutos`);
        console.log(`   🔄 Forçando atualização...`);
        
        consecutiveChecks = 0; // Reset contador após ação bem-sucedida
        fetchExtendedSignals();
        
        // Após rotação, verificar novamente em 1 minuto
        pollingTimeoutId = setTimeout(checkRotation, 60000);
      } else {
        const timeUntilRotation = 15 - minutesSinceEntry;
        
        // ✅ OTIMIZAÇÃO: Intervalo adaptativo baseado no tempo restante
        let nextCheckInterval;
        if (timeUntilRotation <= 1) {
          // Se falta 1 minuto ou menos, verificar a cada 15 segundos
          nextCheckInterval = 15000;
          // ROTAÇÃO IMINENTE (silenciado)
        } else if (timeUntilRotation <= 3) {
          // Se falta 3 minutos ou menos, verificar a cada 30 segundos
          nextCheckInterval = 30000;
          // Próxima rotação em breve
        } else {
          // Caso contrário, verificar a cada 1 minuto
          nextCheckInterval = 60000;
          // Próxima rotação
        }
        
        // Agendar próxima verificação
        pollingTimeoutId = setTimeout(checkRotation, nextCheckInterval);
      }
    };
    
    // Iniciar polling
    checkRotation();

    return () => {
      // Desconectando Realtime
      if (pollingTimeoutId) {
        clearTimeout(pollingTimeoutId);
        pollingTimeoutId = null;
      }
      supabase.removeChannel(channel);
      window.removeEventListener('signalsRotated', handleDashboardRotation);
      window.removeEventListener('force-update-after-background', handleForceUpdate);
      window.removeEventListener('force-refresh-signals', handleForceRefresh);
    };
  }, [authLoading, fetchExtendedSignals, signals]); // ✅ Adicionar signals como dependência

  return {
    signals,
    isLoading,
    error,
    refresh: fetchExtendedSignals,
  };
}

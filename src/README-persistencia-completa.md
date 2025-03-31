# Persistência Completa de Sinais - 10 Minutos Garantidos

Este documento descreve a implementação da persistência completa de sinais no sistema ProfEyes. As modificações garantem que os sinais permaneçam exatamente os mesmos por 10 minutos, mesmo quando o usuário:

- Alterna entre abas
- Navega entre diferentes páginas do app
- Fecha e reabre o navegador
- Atualiza a página (F5)

## Implementação em 3 Camadas de Persistência

Para uma solução robusta, implementamos a persistência em três camadas complementares:

### 1. Cache Local no Serviço de Sinais

- Criamos um cache local dentro do serviço `tradingSignals.ts` que armazena os sinais gerados.
- Implementamos a lógica para verificar se o cache é válido (menos de 10 minutos).
- Adicionamos a função `cacheEhValido()` para verificação consistente.

```typescript
function cacheEhValido() {
  const agora = Date.now();
  return (
    signalsCache.data && 
    signalsCache.data.length > 0 && 
    signalsCache.timestamp > 0 &&
    (agora - signalsCache.timestamp) <= CACHE_DURATION
  );
}
```

### 2. Persistência no LocalStorage

- Implementamos as funções `carregarCacheDoLocalStorage()` e `salvarCacheNoLocalStorage()`.
- Usamos uma chave constante `SIGNALS_CACHE_KEY = 'profeyes_signals_cache'` para evitar erros.
- Salvamos todos os dados relevantes do cache, incluindo timestamp, para garantir a validade.

```typescript
function salvarCacheNoLocalStorage() {
  try {
    if (signalsCache.data && signalsCache.data.length > 0) {
      localStorage.setItem(SIGNALS_CACHE_KEY, JSON.stringify(signalsCache));
      console.log('Cache salvo no localStorage com sucesso. Expira em:', 
                   Math.floor(CACHE_DURATION / 1000), 'segundos');
      return true;
    }
    // ...
  }
}
```

### 3. Persistência do React Query

- Adicionamos a persistência do React Query usando `@tanstack/react-query-persist-client`.
- Configuramos o `createSyncStoragePersister` para salvar no localStorage.
- Definimos critérios específicos para quais queries persistir.

```typescript
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: CACHE_DURATION, // 10 minutos
  dehydrateOptions: {
    shouldDehydrateQuery: query => {
      // Só persiste queries que não são de tempo real (como sinais)
      return query.queryKey[0] === 'dashboardSignals' || 
             query.queryKey[0] === 'tradingSignals';
    },
  },
});
```

## Desativação Completa de Atualizações Automáticas

Para evitar que os sinais sejam atualizados automaticamente, configuramos o React Query:

```typescript
const { data: signals, isLoading, error } = useQuery({
  queryKey: ['dashboardSignals'],
  queryFn: fetchSignals,
  // Desativar completamente todas as recargas automáticas
  refetchInterval: false,        // Não recarregar periodicamente
  refetchOnWindowFocus: false,   // Não recarregar quando a janela ganha foco
  refetchOnReconnect: false,     // Não recarregar quando reconecta à internet
  refetchOnMount: false,         // Não recarregar quando o componente monta
  staleTime: CACHE_DURATION,     // 10 minutos
  cacheTime: CACHE_DURATION * 2, // 20 minutos
});
```

## Componentes Modificados

1. **tradingSignals.ts**
   - Adicionamos funções de persistência no localStorage
   - Implementamos verificações robustas de validade do cache
   - Garantimos que o cache seja reutilizado em todas as situações possíveis

2. **SignalsCard.tsx (Dashboard)**
   - Criamos uma função `fetchSignals` dedicada que NUNCA força atualização
   - Desativamos todas as recargas automáticas do React Query
   - Implementamos verificação prévia do localStorage

3. **Signals.tsx (Página de Sinais)**
   - Desativamos atualizações automáticas
   - Garantimos que sempre use os mesmos sinais do cache

4. **App.tsx (Configuração Global)**
   - Configuramos a persistência global do React Query
   - Definimos critérios específicos para persistência de queries

## Fluxo Completo de Dados

1. Quando o usuário acessa o app pela primeira vez:
   - Verificamos se existe cache válido no localStorage
   - Se não existir, geramos novos sinais
   - Salvamos os sinais no cache local e no localStorage
   - React Query também persiste os dados

2. Durante a navegação:
   - Ao alternar entre abas ou páginas, React Query mantém os dados
   - A configuração `refetchOnWindowFocus: false` impede atualizações
   - Os sinais permanecem idênticos em todas as páginas

3. Ao fechar e reabrir o app:
   - Primeiro, o React Query tenta restaurar os dados
   - Se não conseguir, verificamos o localStorage
   - Se encontrarmos cache válido, usamos ele
   - Garantimos que o timestamp seja respeitado

4. Após 10 minutos:
   - O cache expira naturalmente
   - Na próxima requisição, novos sinais são gerados
   - Todo o ciclo reinicia

## Benefícios da Implementação

- **Consistência Perfeita:** Os sinais permanecem exatamente iguais por 10 minutos
- **Múltiplas Camadas de Segurança:** Mesmo se uma camada falhar, as outras garantem a persistência
- **Performance Aprimorada:** Menos requisições e processamento de dados
- **Economia de Recursos:** Redução significativa de operações no servidor
- **Experiência do Usuário Melhorada:** Sem alterações inesperadas nos sinais

Esta implementação garante que os sinais permaneçam consistentes durante toda a experiência do usuário, respeitando rigorosamente o período de 10 minutos de validade. 
# Persistência de Sinais ao Alternar Abas

Este documento descreve a implementação de persistência de sinais no sistema, garantindo que os sinais permaneçam os mesmos por 10 minutos, mesmo ao alternar abas ou fechar e reabrir a guia.

## Modificações Implementadas

### 1. Armazenamento em LocalStorage

Implementamos o armazenamento do cache de sinais no `localStorage` do navegador, o que permite:
- Persistência dos sinais mesmo quando a página é recarregada
- Consistência dos sinais em todas as abas abertas
- Manutenção do tempo de expiração do cache (10 minutos)

As funções principais adicionadas foram:

```typescript
// Função para carregar o cache do localStorage
function carregarCacheDoLocalStorage() {
  try {
    const cacheString = localStorage.getItem('signalsCache');
    if (cacheString) {
      const cache = JSON.parse(cacheString);
      // Verificar se o cache é válido e não expirou
      const agora = Date.now();
      if (cache && cache.timestamp && (agora - cache.timestamp) <= CACHE_DURATION) {
        signalsCache.data = cache.data || [];
        signalsCache.timestamp = cache.timestamp || 0;
        signalsCache.lastAsset = cache.lastAsset || null;
        signalsCache.lastSignalType = cache.lastSignalType || null;
        signalsCache.nextGenerationTime = cache.nextGenerationTime || 0;
        signalsCache.userInitialized = true;
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Erro ao carregar cache do localStorage:', error);
    return false;
  }
}

// Função para salvar o cache no localStorage
function salvarCacheNoLocalStorage() {
  try {
    localStorage.setItem('signalsCache', JSON.stringify(signalsCache));
    return true;
  } catch (error) {
    console.error('Erro ao salvar cache no localStorage:', error);
    return false;
  }
}
```

### 2. Configuração do React Query

Modificamos as configurações do React Query para evitar atualizações automáticas:

#### Configuração Global no App.tsx:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // Não atualizar quando a janela ganha foco
      refetchOnReconnect: false,    // Não atualizar quando reconecta à internet
      refetchOnMount: false,        // Não atualizar quando o componente monta
      staleTime: 10 * 60 * 1000,    // 10 minutos (mesmo tempo do cache)
      cacheTime: 20 * 60 * 1000,    // 20 minutos de cache
      retry: 1,                     // Apenas uma tentativa de retry
    },
  },
});
```

#### Configuração nos Componentes:

Em todos os componentes que utilizam sinais (SignalsCard, Signals), configuramos:
- `refetchInterval: false` para desativar atualizações periódicas
- `staleTime` e `cacheTime` alinhados com o tempo de cache (10 minutos)
- Desativamos `refetchOnWindowFocus` e `refetchOnReconnect` para evitar atualizações ao trocar de aba

### 3. Lógica para Controle de Cache

Modificamos a lógica de validação do cache:
- O cache agora dura exatamente 10 minutos, independentemente de eventos de navegação
- Removemos a condição `userInitialized` para que o cache seja sempre respeitado
- O cache só é gerado novamente quando expira ou quando explicitamente solicitado

### 4. Desativação de Botões de Atualização

Para garantir consistência na experiência do usuário:
- Desativamos os botões de atualização nas páginas de sinais
- Removemos as funções de atualização automática

## Como Funciona

1. Quando o usuário acessa a aplicação pela primeira vez:
   - Os sinais são gerados e armazenados no cache
   - O cache é salvo no localStorage com timestamp

2. Durante a navegação na aplicação:
   - Qualquer requisição de sinais verifica primeiro o cache
   - Se o cache existe e é válido (menos de 10 minutos), os mesmos sinais são mostrados
   - O React Query é configurado para não atualizar automaticamente

3. Ao fechar e reabrir o navegador:
   - O sistema verifica se existe cache no localStorage
   - Se o cache for válido, ele é carregado e os mesmos sinais são exibidos
   - Se o cache tiver expirado, novos sinais são gerados

4. Após 10 minutos:
   - O cache expira naturalmente
   - Na próxima requisição, novos sinais são gerados

## Benefícios

- Experiência consistente para o usuário
- Redução de operações desnecessárias de geração de sinais
- Consistência dos sinais em todas as abas e após recarregar a página
- Manutenção do padrão de expiração de 10 minutos 
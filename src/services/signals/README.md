# Sistema de Geração de Sinais de Trading

Este módulo implementa um sistema modular e extensível para geração de sinais de trading, com suporte a múltiplos tipos de sinais, agregação inteligente e gerenciamento de cache.

## Estrutura

O sistema é composto pelos seguintes componentes principais:

- **BaseSignalGenerator**: Classe base para todos os geradores de sinais
- **TechnicalSignalGenerator**: Implementação de sinais técnicos
- **SignalAggregator**: Responsável por agregar sinais de diferentes geradores
- **TradingSignalService**: Serviço principal que coordena os geradores e o agregador

## Tipos de Sinais

O sistema suporta os seguintes tipos de sinais:

- **TECHNICAL**: Sinais baseados em análise técnica (médias móveis, RSI, MACD, etc.)
- **FUNDAMENTAL**: Sinais baseados em análise fundamentalista
- **NEWS**: Sinais baseados em notícias e eventos
- **CORRELATION**: Sinais baseados em correlações entre ativos
- **SENTIMENT**: Sinais baseados em análise de sentimento
- **VOLUME**: Sinais baseados em análise de volume
- **PATTERN**: Sinais baseados em padrões de candlestick

## Como Usar

### Uso Básico

```typescript
import { tradingSignalService } from '@/services/signals';

// Buscar sinais de trading
const signals = await tradingSignalService.fetchTradingSignals();

// Atualizar status de todos os sinais ativos
await tradingSignalService.updateAllSignalsStatus();
```

### Configuração Personalizada

```typescript
import { TradingSignalService, SignalType } from '@/services/signals';

// Criar configuração personalizada
const customConfig = TradingSignalService.createDefaultConfig();

// Personalizar configuração
customConfig.symbols = ['BTCUSDT', 'ETHUSDT']; // Apenas alguns símbolos
customConfig.refreshInterval = 10 * 60 * 1000; // 10 minutos

// Habilitar apenas sinais técnicos
Object.keys(customConfig.signalGenerators).forEach(type => {
  customConfig.signalGenerators[type as SignalType].enabled = false;
});
customConfig.signalGenerators[SignalType.TECHNICAL].enabled = true;

// Criar instância personalizada
const customService = new TradingSignalService(customConfig);

// Buscar sinais com a instância personalizada
const signals = await customService.fetchTradingSignals();
```

### Implementar um Novo Gerador de Sinais

Para adicionar um novo tipo de gerador de sinais, siga estes passos:

1. Crie uma nova classe que estenda `BaseSignalGenerator`
2. Implemente o método `generateSignals`
3. Registre o gerador no serviço

Exemplo:

```typescript
import { BaseSignalGenerator, SignalType, MarketData, SignalGeneratorResult } from '@/services/signals';

export class MyCustomSignalGenerator extends BaseSignalGenerator {
  public type = SignalType.CUSTOM;
  
  public async generateSignals(marketData: MarketData, options?: any): Promise<SignalGeneratorResult> {
    // Implementar lógica de geração de sinais
    const signals = [];
    
    // ... lógica personalizada ...
    
    return { signals };
  }
}

// Registrar o gerador personalizado
tradingSignalService.registerGenerator(new MyCustomSignalGenerator());
```

## Configuração

A configuração do sistema é feita através da interface `TradingSignalConfig`, que inclui:

- **symbols**: Lista de símbolos a serem monitorados
- **refreshInterval**: Intervalo de atualização dos sinais
- **signalGenerators**: Configuração de cada gerador de sinais
- **aggregator**: Configuração do agregador de sinais
- **cache**: Configuração do cache

## Agregação de Sinais

O sistema suporta três estratégias de agregação de sinais:

- **majority**: Escolhe o tipo de sinal mais comum e usa o mais forte desse tipo
- **weighted**: Combina sinais usando pesos baseados em tipo, força e taxa de sucesso
- **strongest**: Simplesmente escolhe o sinal mais forte

## Extensibilidade

O sistema foi projetado para ser facilmente extensível:

- Novos geradores de sinais podem ser adicionados implementando a interface `SignalGenerator`
- Novas estratégias de agregação podem ser adicionadas ao `SignalAggregator`
- Novos tipos de sinais podem ser adicionados ao enum `SignalType`

## Exemplo Completo

Veja o arquivo `example.ts` para exemplos completos de uso do sistema. 
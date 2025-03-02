import * as tf from '@tensorflow/tfjs';

interface TrainingData {
  features: number[][];
  labels: number[];
}

// Cache para modelos treinados
const modelCache: Record<string, {
  model: tf.LayersModel;
  lastUpdated: Date;
  meanAbsoluteError: number;
}> = {};

// Normaliza os dados para melhorar o treinamento
function normalizeData(data: number[]): { normalized: number[], min: number, max: number } {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const normalized = range === 0 
    ? data.map(() => 0.5) 
    : data.map(x => (x - min) / range);
  
  return { normalized, min, max };
}

// Desnormaliza os dados para obter valores reais
function denormalizeValue(value: number, min: number, max: number): number {
  return value * (max - min) + min;
}

// Prepara os dados para treinamento
function prepareData(prices: number[], windowSize: number = 14): TrainingData {
  const { normalized, min, max } = normalizeData(prices);
  const features: number[][] = [];
  const labels: number[] = [];

  for (let i = windowSize; i < normalized.length; i++) {
    features.push(normalized.slice(i - windowSize, i));
    labels.push(normalized[i]);
  }

  return { features, labels };
}

// Cria um modelo LSTM para previsão de séries temporais
function createModel(windowSize: number): tf.LayersModel {
  const model = tf.sequential();
  
  // Camada LSTM com 50 unidades
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: false,
    inputShape: [windowSize, 1]
  }));
  
  // Camada densa para saída
  model.add(tf.layers.dense({ units: 1 }));
  
  // Compilar o modelo
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['meanAbsoluteError']
  });
  
  return model;
}

// Treina o modelo com os dados históricos
export async function trainModel(
  symbol: string, 
  prices: number[], 
  epochs: number = 100, 
  windowSize: number = 14
): Promise<number> {
  try {
    console.log(`Treinando modelo para ${symbol} com ${prices.length} pontos de dados`);
    
    if (prices.length < windowSize * 2) {
      console.error(`Dados insuficientes para treinar o modelo (${prices.length} pontos)`);
      return 0;
    }
    
    const { features, labels } = prepareData(prices, windowSize);
    
    // Converter para tensores
    const xs = tf.tensor3d(features.map(f => f.map(v => [v])));
    const ys = tf.tensor2d(labels.map(l => [l]));
    
    // Criar e treinar o modelo
    const model = createModel(windowSize);
    
    const history = await model.fit(xs, ys, {
      epochs,
      batchSize: 32,
      shuffle: true,
      validationSplit: 0.1,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(6)}, MAE = ${logs?.meanAbsoluteError.toFixed(6)}`);
          }
        }
      }
    });
    
    // Avaliar o modelo
    const evaluation = model.evaluate(xs, ys) as tf.Tensor[];
    const mae = await evaluation[1].dataSync()[0];
    
    // Armazenar o modelo em cache
    modelCache[symbol] = {
      model,
      lastUpdated: new Date(),
      meanAbsoluteError: mae
    };
    
    // Liberar memória
    xs.dispose();
    ys.dispose();
    
    console.log(`Modelo para ${symbol} treinado com sucesso. MAE: ${mae.toFixed(6)}`);
    return mae;
  } catch (error) {
    console.error('Erro ao treinar modelo:', error);
    return 0;
  }
}

// Faz previsões com o modelo treinado
export async function predict(
  symbol: string, 
  prices: number[], 
  daysAhead: number = 1, 
  windowSize: number = 14
): Promise<{
  prediction: number;
  confidence: number;
  trend: 'up' | 'down' | 'neutral';
}> {
  try {
    // Verificar se temos um modelo em cache
    let cachedModel = modelCache[symbol];
    
    // Se não temos modelo ou ele está desatualizado (mais de 24h), treinar novamente
    if (!cachedModel || 
        (new Date().getTime() - cachedModel.lastUpdated.getTime()) > 24 * 60 * 60 * 1000) {
      await trainModel(symbol, prices, 100, windowSize);
      cachedModel = modelCache[symbol];
    }
    
    if (!cachedModel) {
      throw new Error(`Modelo para ${symbol} não encontrado`);
    }
    
    // Preparar dados para previsão
    const { normalized, min, max } = normalizeData(prices);
    const lastWindow = normalized.slice(-windowSize);
    
    // Converter para tensor
    const input = tf.tensor3d([lastWindow.map(x => [x])]);
    
    // Fazer previsão
    const predictionNormalized = cachedModel.model.predict(input) as tf.Tensor;
    const predictionValue = await predictionNormalized.dataSync()[0];
    
    // Desnormalizar o resultado
    const prediction = denormalizeValue(predictionValue, min, max);
    
    // Calcular tendência
    const lastPrice = prices[prices.length - 1];
    const trend = prediction > lastPrice * 1.005 ? 'up' : 
                 prediction < lastPrice * 0.995 ? 'down' : 'neutral';
    
    // Calcular confiança baseada no erro médio absoluto
    const confidence = Math.max(0, Math.min(100, 100 * (1 - cachedModel.meanAbsoluteError)));
    
    // Liberar memória
    input.dispose();
    predictionNormalized.dispose();
    
    return {
      prediction,
      confidence,
      trend
    };
  } catch (error) {
    console.error('Erro ao fazer previsão:', error);
    return {
      prediction: prices[prices.length - 1],
      confidence: 0,
      trend: 'neutral'
    };
  }
} 
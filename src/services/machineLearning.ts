// Módulo de Machine Learning com TensorFlow.js
import * as tf from '@tensorflow/tfjs';

// Interface para o resultado da predição
export interface PredictionResult {
  trend: string;
  confidence: number;
}

// Normaliza os dados de entrada para melhor performance do modelo
function normalizeData(data: number[]): tf.Tensor {
  const tensorData = tf.tensor2d(data, [data.length, 1]);
  const min = tensorData.min();
  const max = tensorData.max();
  const normalizedData = tensorData.sub(min).div(max.sub(min));
  
  return normalizedData;
}

// Cria um modelo sequencial para previsão de série temporal
function createModel(): tf.Sequential {
  const model = tf.sequential();
  
  // Camada LSTM para capturar padrões temporais
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: true,
    inputShape: [10, 1]
  }));
  
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: false
  }));
  
  model.add(tf.layers.dense({ units: 1 }));
  
  // Compilando o modelo
  model.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError',
    metrics: ['accuracy']
  });
  
  return model;
}

// Prepara os dados para treino em formato de sequência temporal
function prepareSequenceData(data: number[], sequenceLength: number = 10): {
  inputs: tf.Tensor, 
  outputs: tf.Tensor
} {
  const sequences = [];
  const targets = [];
  
  for (let i = 0; i < data.length - sequenceLength; i++) {
    const sequence = data.slice(i, i + sequenceLength);
    const target = data[i + sequenceLength];
    sequences.push(sequence);
    targets.push(target);
  }
  
  const inputTensor = tf.tensor3d(sequences, [sequences.length, sequenceLength, 1]);
  const outputTensor = tf.tensor2d(targets, [targets.length, 1]);
  
  return {
    inputs: inputTensor,
    outputs: outputTensor
  };
}

// Função para treinar um modelo com dados históricos
export async function trainModel(data: number[]): Promise<tf.Sequential> {
  if (data.length < 50) {
    throw new Error('Conjunto de dados insuficiente para treinamento (mínimo 50 pontos)');
  }
  
  // Criar modelo
  const model = createModel();
  
  // Preparar dados
  const { inputs, outputs } = prepareSequenceData(data);
  
  // Treinar modelo
  await model.fit(inputs, outputs, {
    epochs: 100,
    batchSize: 32,
    shuffle: true,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Época ${epoch+1}/100, Loss: ${logs?.loss?.toFixed(4)}, Accuracy: ${logs?.acc?.toFixed(4)}`);
      }
    }
  });
  
  console.log('Treinamento concluído com sucesso');
  return model;
}

// Função para fazer predições com o modelo
export async function predict(model: tf.Sequential, data: number[]): Promise<PredictionResult> {
  if (!model || data.length < 10) {
    throw new Error('Modelo inválido ou dados insuficientes para predição');
  }
  
  // Preparar os últimos N pontos para previsão
  const lastPoints = data.slice(-10);
  const input = tf.tensor3d([[...lastPoints.map(value => [value])]], [1, 10, 1]);
  
  // Fazer predição
  const prediction = model.predict(input) as tf.Tensor;
  const predictedValue = prediction.dataSync()[0];
  const lastValue = data[data.length - 1];
  
  // Determinar tendência
  const trend = predictedValue > lastValue ? 'ALTA' : 'BAIXA';
  
  // Calcular confiança baseada na magnitude da diferença
  const difference = Math.abs((predictedValue - lastValue) / lastValue);
  const confidence = Math.min(Math.max(difference * 200, 50), 95);
  
  return {
    trend,
    confidence
  };
}

// Função para avaliar o desempenho do modelo
export async function evaluateModel(model: tf.Sequential, testData: number[]): Promise<number> {
  if (testData.length < 20) {
    throw new Error('Dados de teste insuficientes para avaliação');
  }
  
  // Preparar dados para teste
  const { inputs, outputs } = prepareSequenceData(testData);
  
  // Avaliar o modelo
  const evaluation = await model.evaluate(inputs, outputs) as tf.Tensor[];
  const loss = await evaluation[0].dataSync()[0];
  
  // Converter loss para uma métrica de precisão (simplificado)
  // Quanto menor o loss, maior a precisão
  const accuracy = 1 / (1 + loss);
  
  return accuracy;
} 
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase (recomendado usar variáveis de ambiente)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vaxiqvowvavrfyjmrxpl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGlxdm93dmF2cmZ5am1yeHBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU1ODMxMiwiZXhwIjoyMDU5MTM0MzEyfQ.7LqejUFxjrpH7G8ZW_eF6e-BktUZ-w-E5FhSb_IOFK0';

// Configurar cliente Supabase com service key para acesso administrativo
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Função para executar migrações SQL
 */
async function runMigrations() {
  try {
    console.log('Iniciando execução das migrações do banco de dados PostgreSQL...');

    // Obter arquivos de migração da pasta
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    console.log(`Buscando migrações em: ${migrationsDir}`);

    const files = await fs.promises.readdir(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));

    console.log(`Encontradas ${sqlFiles.length} migrações para executar.`);

    // Executar as migrações em ordem
    for (const file of sqlFiles) {
      console.log(`\nExecutando migração: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.promises.readFile(filePath, 'utf8');

      // Executar o SQL diretamente com query
      try {
        const { data, error } = await supabase.from('_exec_sql').rpc('exec_sql', { 
          sql_query: sql 
        });

        if (error) {
          console.error(`Erro ao executar migração ${file}:`, error);
          
          // Tentar método alternativo - executar diretamente com query
          try {
            console.log(`Tentando método alternativo para ${file}...`);
            // No ambiente Supabase, podemos tentar executar SQL diretamente
            const { error: queryError } = await supabase.rpc('exec_sql', { sql_query: sql });
            
            if (queryError) {
              throw queryError;
            } else {
              console.log(`Migração ${file} executada com sucesso (método alternativo).`);
            }
          } catch (altError) {
            console.error(`Erro no método alternativo para ${file}:`, altError);
            console.log('Considere executar esta migração manualmente no SQL Editor do Supabase.');
          }
        } else {
          console.log(`Migração ${file} executada com sucesso.`);
        }
      } catch (execError) {
        console.error(`Exceção ao executar ${file}:`, execError);
        console.log('Considere executar esta migração manualmente no SQL Editor do Supabase.');
      }
    }

    console.log('\nMigrações concluídas.');

  } catch (error) {
    console.error('Erro ao executar migrações:', error);
    process.exit(1);
  }
}

/**
 * Função para verificar conexão com o banco de dados
 */
async function testConnection() {
  try {
    console.log('Testando conexão com o banco de dados Supabase...');
    
    // Testar uma query simples para verificar se a conexão está funcionando
    const { data, error } = await supabase.from('_dummy_query_test').select('*').limit(1).maybeSingle();
    
    if (error && !error.message.includes('does not exist')) {
      // Erro diferente de "tabela não existe" (que é esperado)
      throw error;
    }
    
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    
    return true;
  } catch (error) {
    if (error.message && error.message.includes('does not exist')) {
      // Este é um erro esperado e indica que a conexão está funcionando
      console.log('Conexão com o banco de dados estabelecida com sucesso!');
      return true;
    }
    
    console.error('Erro ao conectar com o banco de dados:', error);
    return false;
  }
}

/**
 * Função principal para configurar o banco de dados
 */
async function setupDatabase() {
  console.log('Iniciando configuração do banco de dados PostgreSQL...');
  
  // Testar conexão antes de prosseguir
  const connected = await testConnection();
  if (!connected) {
    console.error('Não foi possível conectar ao banco de dados. Verifique as credenciais e conexão.');
    process.exit(1);
  }
  
  // Executar migrações
  await runMigrations();
  
  console.log('\nConfigurações do banco de dados PostgreSQL concluídas com sucesso!');
}

// Iniciar configuração do banco de dados
setupDatabase().catch(error => {
  console.error('Erro durante configuração do banco de dados:', error);
  process.exit(1);
}); 
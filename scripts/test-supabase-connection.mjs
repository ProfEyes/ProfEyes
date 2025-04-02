import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar variáveis de ambiente
console.log('=== Verificação de Variáveis de Ambiente ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'Não definido');
console.log('SUPABASE_SERVICE_KEY (truncado):', 
  process.env.SUPABASE_SERVICE_KEY 
    ? `${process.env.SUPABASE_SERVICE_KEY.substring(0, 10)}...` 
    : 'Não definido'
);

// Se não encontrarmos as variáveis de ambiente, vamos verificar o arquivo .env
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.log('\nVerificando arquivo .env...');
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('Conteúdo do arquivo .env (parcial):');
      
      // Mostrar apenas as linhas relevantes para Supabase (ocultando valores completos)
      const envLines = envContent.split('\n');
      envLines.forEach(line => {
        if (line.includes('SUPABASE')) {
          const parts = line.split('=');
          if (parts.length >= 2) {
            const key = parts[0];
            const value = parts[1];
            console.log(`${key}=${value.substring(0, 10)}...`);
          }
        }
      });
    } else {
      console.log('Arquivo .env não encontrado!');
    }
  } catch (error) {
    console.error('Erro ao ler arquivo .env:', error);
  }
}

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vaxiqvowvavrfyjmrxpl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGlxdm93dmF2cmZ5am1yeHBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU1ODMxMiwiZXhwIjoyMDU5MTM0MzEyfQ.7LqejUFxjrpH7G8ZW_eF6e-BktUZ-w-E5FhSb_IOFK0';

// Exibir valores usados para conexão
console.log('\n=== Valores usados para conexão ===');
console.log('URL:', SUPABASE_URL);
console.log('Key (truncada):', `${SUPABASE_KEY.substring(0, 10)}...`);

// Criar cliente Supabase
console.log('\nCriando cliente Supabase...');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Função para testar a conexão
 */
async function testConnection() {
  try {
    console.log('Testando conexão simples...');
    
    // Abordagem 1: Tentar usar rpc para verificar conexão
    try {
      console.log('\nTestando com RPC...');
      const { data: version, error: rpcError } = await supabase.rpc('version');
      
      if (rpcError) {
        console.log('Erro na chamada RPC:', rpcError.message);
      } else {
        console.log('Resposta RPC:', version);
        console.log('Conexão RPC bem-sucedida!');
      }
    } catch (rpcErr) {
      console.log('Exceção ao chamar RPC:', rpcErr.message);
    }
    
    // Abordagem 2: Tentar consulta na tabela auth.users
    try {
      console.log('\nTestando com consulta à tabela auth.users...');
      const { data: users, error: usersError } = await supabase
        .from('auth.users')
        .select('count(*)', { count: 'exact', head: true });
      
      if (usersError) {
        console.log('Erro ao consultar auth.users:', usersError.message);
      } else {
        console.log('Consulta auth.users bem-sucedida!');
        console.log('Resultado:', users);
      }
    } catch (usersErr) {
      console.log('Exceção ao consultar auth.users:', usersErr.message);
    }
    
    // Abordagem 3: Consulta direta na tabela de usuários
    try {
      console.log('\nTestando com consulta direta...');
      const { data: usersData, error: usersDirect } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
      
      if (usersDirect) {
        console.log('Erro ao consultar user_profiles:', usersDirect.message);
      } else if (usersData) {
        console.log('Consulta user_profiles bem-sucedida!');
        console.log('Número de registros encontrados:', usersData.length);
      }
    } catch (directErr) {
      console.log('Exceção ao consultar user_profiles:', directErr.message);
    }
    
    // Abordagem 4: Tentar listar tabelas usando SQL bruto
    try {
      console.log('\nTestando com SQL bruto para listar tabelas...');
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (tablesError) {
        console.log('Erro ao listar tabelas via information_schema:', tablesError.message);
      } else {
        console.log('Consulta de tabelas bem-sucedida!');
        if (tablesData && tablesData.length > 0) {
          console.log('Tabelas encontradas:');
          tablesData.forEach((table, i) => console.log(`${i+1}. ${table.table_name}`));
        } else {
          console.log('Nenhuma tabela pública encontrada.');
        }
      }
    } catch (tablesErr) {
      console.log('Exceção ao listar tabelas:', tablesErr.message);
    }
    
    return true;
  } catch (error) {
    console.error('Erro durante o teste de conexão:', error);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('Iniciando testes de conexão com o PostgreSQL via Supabase...\n');
  
  const success = await testConnection();
  
  console.log('\n=== Conclusão ===');
  console.log('Testes de conexão concluídos.');
  console.log('Para migrar suas tabelas, utilize o arquivo combined_migrations.sql no SQL Editor do Supabase.');
  console.log('URL do console Supabase: https://supabase.com/dashboard/project/vaxiqvowvavrfyjmrxpl');
}

// Executar a função principal
main().catch(error => {
  console.error('Erro não tratado:', error);
  process.exit(1);
}); 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vaxiqvowvavrfyjmrxpl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGlxdm93dmF2cmZ5am1yeHBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU1ODMxMiwiZXhwIjoyMDU5MTM0MzEyfQ.7LqejUFxjrpH7G8ZW_eF6e-BktUZ-w-E5FhSb_IOFK0';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Lista de tabelas para fazer backup
const TABLES_TO_BACKUP = [
  'user_profiles',
  'notification_settings',
  'trading_preferences',
  'user_management_logs',
  'auth_tokens',
  'user_sessions'
];

/**
 * Função para fazer backup de uma tabela
 */
async function backupTable(tableName) {
  try {
    console.log(`Fazendo backup da tabela: ${tableName}`);
    
    // Obter todos os registros da tabela
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`Erro ao obter dados da tabela ${tableName}:`, error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log(`Tabela ${tableName} está vazia. Nenhum dado para backup.`);
      return true;
    }
    
    // Criar diretório de backup se não existir
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Obter data atual formatada para o nome do arquivo
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Nome do arquivo de backup
    const fileName = `${tableName}_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    // Salvar os dados em um arquivo JSON
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`Backup da tabela ${tableName} concluído com sucesso: ${data.length} registros salvos em ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Erro ao fazer backup da tabela ${tableName}:`, error);
    return false;
  }
}

/**
 * Função principal para backup
 */
async function backupDatabase() {
  console.log('Iniciando backup do banco de dados Supabase...');
  
  let successful = 0;
  let failed = 0;
  
  for (const table of TABLES_TO_BACKUP) {
    const success = await backupTable(table);
    if (success) {
      successful++;
    } else {
      failed++;
    }
  }
  
  console.log('\nResumo do backup:');
  console.log(`Total de tabelas: ${TABLES_TO_BACKUP.length}`);
  console.log(`Concluídas com sucesso: ${successful}`);
  console.log(`Falhas: ${failed}`);
  
  if (failed === 0) {
    console.log('\nBackup concluído com sucesso!');
  } else {
    console.log('\nBackup concluído com erros. Verifique o log para mais detalhes.');
  }
}

// Executar o backup
backupDatabase().catch(error => {
  console.error('Erro não tratado durante o backup:', error);
  process.exit(1);
}); 
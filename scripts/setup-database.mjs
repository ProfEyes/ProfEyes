import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vaxiqvowvavrfyjmrxpl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGlxdm93dmF2cmZ5am1yeHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NTgzMTIsImV4cCI6MjA1OTEzNDMxMn0.t4u27nvbPmvtC25WMdSCxxb3nZVGvUFxr6GC34lg7Ok';

// Obtém o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  try {
    console.log('Conectando ao Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Lê o arquivo SQL
    const sqlPath = path.join(__dirname, 'setup-database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Arquivo SQL carregado. Verificando tabelas existentes...');

    // Verifica as tabelas user_profiles e user_management_logs
    const { error: profilesError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    const { error: logsError } = await supabase
      .from('user_management_logs')
      .select('id')
      .limit(1);

    if (profilesError) {
      console.log('Tabela user_profiles não encontrada. Erro:', profilesError.message);
    } else {
      console.log('Tabela user_profiles já existe!');
    }

    if (logsError) {
      console.log('Tabela user_management_logs não encontrada. Erro:', logsError.message);
    } else {
      console.log('Tabela user_management_logs já existe!');
    }

    // Se alguma tabela não existe, cria todas as tabelas
    if (profilesError || logsError) {
      console.log('Executando SQL para criar tabelas...');
      
      // Dividir o arquivo SQL em comandos individuais
      const commands = sqlContent
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0);

      console.log(`Total de ${commands.length} comandos SQL para executar`);

      // Execute each SQL command using Supabase's rpc
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        console.log(`Executando comando SQL ${i + 1}/${commands.length}...`);

        try {
          // Use rpc to run SQL
          const { error } = await supabase.rpc('exec_sql', {
            sql_query: command
          });

          if (error) {
            console.error(`Erro ao executar comando SQL ${i + 1}:`, error.message);
          }
        } catch (err) {
          console.error(`Exceção ao executar comando SQL ${i + 1}:`, err);
        }
      }

      console.log('Configuração do banco de dados concluída!');
    } else {
      console.log('Todas as tabelas já existem. Nenhuma ação necessária.');
    }

  } catch (error) {
    console.error('Erro ao configurar o banco de dados:', error);
  }
}

// Executar o script
setupDatabase(); 
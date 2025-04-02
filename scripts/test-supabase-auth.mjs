import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vaxiqvowvavrfyjmrxpl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGlxdm93dmF2cmZ5am1yeHBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU1ODMxMiwiZXhwIjoyMDU5MTM0MzEyfQ.7LqejUFxjrpH7G8ZW_eF6e-BktUZ-w-E5FhSb_IOFK0';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Interface para entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Função para listar usuários
 */
async function listUsers() {
  try {
    console.log('\nBuscando lista de usuários...');
    
    // Com service role key, podemos acessar diretamente a tabela auth.users
    const { data: users, error } = await supabase
      .from('auth.users')
      .select('id, email')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar usuários:', error.message);
      return [];
    }
    
    if (users && users.length > 0) {
      console.log('\nUsuários encontrados:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id} | Email: ${user.email}`);
      });
    } else {
      console.log('Nenhum usuário encontrado.');
    }
    
    return users || [];
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return [];
  }
}

/**
 * Função para criar um usuário
 */
async function createUser(email, password) {
  try {
    console.log(`\nCriando usuário com email: ${email}`);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Confirma o email automaticamente
    });
    
    if (error) {
      console.error('Erro ao criar usuário:', error.message);
      return null;
    }
    
    console.log('Usuário criado com sucesso!');
    console.log('Dados do usuário:', data.user);
    
    // Verificar se o trigger criou o perfil automaticamente
    await checkUserProfile(data.user.id);
    
    return data.user;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return null;
  }
}

/**
 * Função para verificar o perfil de usuário
 */
async function checkUserProfile(userId) {
  try {
    console.log(`\nVerificando perfil para o usuário ${userId}`);
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Erro ao verificar perfil:', error.message);
      console.log('Isso pode indicar que o trigger para criação automática de perfil não está funcionando.');
      return null;
    }
    
    console.log('Perfil encontrado:', profile);
    console.log('O trigger para criação automática de perfil está funcionando corretamente!');
    
    return profile;
  } catch (error) {
    console.error('Erro ao verificar perfil:', error);
    return null;
  }
}

/**
 * Menu interativo
 */
async function showMenu() {
  console.log('\n=== Menu de Teste de Autenticação Supabase ===');
  console.log('1. Listar usuários');
  console.log('2. Criar novo usuário');
  console.log('3. Verificar perfil de usuário');
  console.log('0. Sair');
  
  rl.question('\nEscolha uma opção: ', async (option) => {
    switch (option) {
      case '1':
        await listUsers();
        showMenu();
        break;
      
      case '2':
        rl.question('Email para o novo usuário: ', (email) => {
          rl.question('Senha para o novo usuário: ', async (password) => {
            await createUser(email, password);
            showMenu();
          });
        });
        break;
      
      case '3':
        rl.question('ID do usuário para verificar o perfil: ', async (userId) => {
          await checkUserProfile(userId);
          showMenu();
        });
        break;
      
      case '0':
        console.log('Encerrando...');
        rl.close();
        process.exit(0);
        break;
      
      default:
        console.log('Opção inválida. Tente novamente.');
        showMenu();
        break;
    }
  });
}

/**
 * Função principal
 */
async function main() {
  console.log('=== Teste de Autenticação Supabase ===');
  console.log('URL:', SUPABASE_URL);
  
  // Verificar conexão
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao conectar com o Supabase:', error.message);
      process.exit(1);
    }
    
    console.log('Conexão com o Supabase estabelecida com sucesso!');
    showMenu();
    
  } catch (error) {
    console.error('Erro durante conexão:', error);
    process.exit(1);
  }
}

// Iniciar o programa
main(); 
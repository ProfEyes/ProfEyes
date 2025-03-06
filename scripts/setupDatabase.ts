import { createTables } from '../src/services/supabaseApi'

async function setupDatabase() {
  console.log('Iniciando configuração do banco de dados...')
  
  try {
    await createTables()
    console.log('Tabelas criadas com sucesso!')
  } catch (error) {
    console.error('Erro ao configurar o banco de dados:', error)
    process.exit(1)
  }
}

setupDatabase() 
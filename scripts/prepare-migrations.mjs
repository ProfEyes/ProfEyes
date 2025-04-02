import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Função principal para consolidar as migrações
 */
async function prepareMigrations() {
  try {
    console.log('Preparando migrações para execução manual...');

    // Obter arquivos de migração da pasta
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    console.log(`Buscando migrações em: ${migrationsDir}`);

    const files = await fs.promises.readdir(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));

    console.log(`Encontradas ${sqlFiles.length} migrações para consolidar.`);

    // Arquivo de saída
    const outputPath = path.join(__dirname, '..', 'combined_migrations.sql');
    
    // Iniciar com um cabeçalho
    let combinedSQL = `-- Migrações consolidadas para execução manual no SQL Editor do Supabase
-- Gerado em: ${new Date().toISOString()}
-- Total de arquivos: ${sqlFiles.length}

`;

    // Ler e concatenar as migrações
    for (const file of sqlFiles) {
      console.log(`Processando: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.promises.readFile(filePath, 'utf8');
      
      combinedSQL += `
-- =========================================================
-- Início da migração: ${file}
-- =========================================================

${sql}

-- =========================================================
-- Fim da migração: ${file}
-- =========================================================

`;
    }

    // Escrever o arquivo consolidado
    await fs.promises.writeFile(outputPath, combinedSQL, 'utf8');
    
    console.log(`\nMigrações consolidadas com sucesso em: ${outputPath}`);
    console.log('\nInstruções para execução manual:');
    console.log('1. Acesse o Dashboard do Supabase para seu projeto');
    console.log('2. Navegue até "SQL Editor"');
    console.log('3. Crie uma nova consulta');
    console.log('4. Copie e cole o conteúdo do arquivo combined_migrations.sql');
    console.log('5. Execute a consulta (pode ser necessário dividir em partes menores)');

  } catch (error) {
    console.error('Erro ao preparar migrações:', error);
    process.exit(1);
  }
}

// Iniciar preparação das migrações
prepareMigrations().catch(error => {
  console.error('Erro durante preparação das migrações:', error);
  process.exit(1);
}); 
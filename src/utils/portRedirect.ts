/**
 * Utilitário para garantir que o app sempre rode na porta correta (8090)
 */

const CORRECT_PORT = '8090';
const CORRECT_URL = `http://127.0.0.1:${CORRECT_PORT}`;

/**
 * Verifica se estamos na porta correta e redireciona se necessário
 */
export function ensureCorrectPort(): void {
  // Só executar no browser
  if (typeof window === 'undefined') return;
  
  const currentPort = window.location.port;
  const currentHost = window.location.hostname;
  
  // Se não estamos no localhost/127.0.0.1 ou já estamos na porta correta, não fazer nada
  if ((currentHost !== 'localhost' && currentHost !== '127.0.0.1') || currentPort === CORRECT_PORT) {
    return;
  }
  
  // Se estamos em uma porta diferente, redirecionar para a porta correta
  if (currentPort && currentPort !== CORRECT_PORT) {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    
    const correctUrl = `${CORRECT_URL}${currentPath}${currentSearch}${currentHash}`;
    
    console.log(`Redirecionando da porta ${currentPort} para a porta ${CORRECT_PORT}`);
    console.log(`URL original: ${window.location.href}`);
    console.log(`URL correta: ${correctUrl}`);
    
    // Redirecionar para a porta correta
    window.location.replace(correctUrl);
  }
}

/**
 * Obtém sempre a URL base correta (porta 8090)
 */
export function getCorrectBaseUrl(): string {
  return CORRECT_URL;
}

/**
 * Constrói uma URL sempre com a porta correta
 */
export function buildCorrectUrl(path: string): string {
  // Remover barra inicial se existir para evitar dupla barra
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${CORRECT_URL}${cleanPath}`;
} 
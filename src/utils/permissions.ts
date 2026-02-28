// Função para verificar se o usuário tem permissão para iniciar lives
export const canStartLive = (userEmail: string): boolean => {
  // Apenas o email específico pode iniciar lives
  return userEmail === 'ie702959@gmail.com';
};

// Função para verificar se deve mostrar o botão de iniciar live
export const shouldShowStartLiveButton = (userEmail: string | undefined | null): boolean => {
  if (!userEmail) return false;
  return canStartLive(userEmail);
}; 
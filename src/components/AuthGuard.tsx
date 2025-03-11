import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationTimeout, setVerificationTimeout] = useState(false);

  // Dá um pequeno delay para que a autenticação seja verificada corretamente
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 1000);

    // Adiciona um timeout máximo para evitar carregamento infinito
    const maxTimeout = setTimeout(() => {
      setVerificationTimeout(true);
      setIsVerifying(false);
    }, 10000); // 10 segundos de timeout máximo

    return () => {
      clearTimeout(timer);
      clearTimeout(maxTimeout);
    };
  }, []);

  // Se o timeout máximo foi atingido, redireciona para a página de login
  if (verificationTimeout && loading) {
    console.error('Timeout na verificação de autenticação. Redirecionando para login.');
    return <Navigate to="/auth" state={{ from: location, error: 'timeout' }} replace />;
  }

  // Mostra um indicador de carregamento enquanto verifica a autenticação
  if (loading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <h2 className="mt-4 text-white/70 text-lg">Verificando autenticação...</h2>
          {loading && !isVerifying && (
            <p className="mt-2 text-white/50 text-sm">
              Preparando seu ambiente personalizado...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Redireciona para a página de login se não estiver autenticado
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Renderiza os componentes filhos se estiver autenticado
  return <>{children}</>;
} 
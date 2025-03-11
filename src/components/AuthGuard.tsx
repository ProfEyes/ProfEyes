import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationTimeout, setVerificationTimeout] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Dá um pequeno delay para que a autenticação seja verificada corretamente
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 700); // Reduzido de 1000ms para 700ms

    // Adiciona um timeout máximo para evitar carregamento infinito
    const maxTimeout = setTimeout(() => {
      setVerificationTimeout(true);
      setIsVerifying(false);
    }, 8000); // Reduzido de 10s para 8s

    // Adiciona um efeito de fade-in suave
    setTimeout(() => {
      setFadeIn(true);
    }, 100);

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
      <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black">
        <div 
          className={`flex flex-col items-center transition-opacity duration-500 ease-in-out ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
        >
          <Loader className="h-8 w-8 text-blue-400 animate-spin opacity-80" />
          <div className="overflow-hidden relative">
            <h2 className="mt-3 text-blue-400/70 text-base font-light animate-pulse">
              Verificando acesso...
            </h2>
          </div>
          {loading && !isVerifying && (
            <div className="overflow-hidden">
              <p className="mt-2 text-blue-300/50 text-xs font-light transition-all duration-300 ease-in-out animate-pulse">
                Preparando seu ambiente...
              </p>
            </div>
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
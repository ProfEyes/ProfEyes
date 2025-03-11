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
  const [loadingText, setLoadingText] = useState('Verificando');
  const [dots, setDots] = useState('');

  // Dá um pequeno delay para que a autenticação seja verificada corretamente
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 600); // Reduzido de 1000ms para 600ms

    // Adiciona um timeout máximo para evitar carregamento infinito
    const maxTimeout = setTimeout(() => {
      setVerificationTimeout(true);
      setIsVerifying(false);
    }, 8000); // Reduzido de 10s para 8s

    // Animação suave dos pontos
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length < 3 ? prev + '.' : '');
    }, 400);

    // Alterna entre mensagens de carregamento
    const textInterval = setInterval(() => {
      if (!isVerifying) {
        setLoadingText('Preparando ambiente');
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(maxTimeout);
      clearInterval(dotsInterval);
      clearInterval(textInterval);
    };
  }, [isVerifying]);

  // Se o timeout máximo foi atingido, redireciona para a página de login
  if (verificationTimeout && loading) {
    console.error('Timeout na verificação de autenticação. Redirecionando para login.');
    return <Navigate to="/auth" state={{ from: location, error: 'timeout' }} replace />;
  }

  // Mostra um indicador de carregamento enquanto verifica a autenticação
  if (loading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
        <div className="flex flex-col items-center opacity-80">
          <div className="relative h-8 w-8">
            <Loader2 className="h-8 w-8 text-gray-500 dark:text-gray-400 animate-spin opacity-80" />
          </div>
          <h2 className="mt-3 text-gray-700 dark:text-gray-300 text-sm font-medium tracking-wide transition-all duration-300 ease-in-out">
            {loadingText}<span className="inline-block w-6 text-left">{dots}</span>
          </h2>
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
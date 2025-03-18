import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface AuthGuardProps {
  children: ReactNode;
  checkOnly?: boolean;
}

export function AuthGuard({ children, checkOnly = false }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [showLoadingText, setShowLoadingText] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Efeito para dar um tempo adequado para verificação de autenticação
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 2000); // Aumentado para garantir tempo suficiente

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Quando o loading termina, marcamos que a checagem de autenticação foi concluída
  useEffect(() => {
    if (!loading && !isVerifying) {
      // Damos um delay extra para garantir que o estado está atualizado
      const completeTimer = setTimeout(() => {
        setAuthCheckComplete(true);
      }, 800); // Aumentado para evitar flash da tela principal
      
      return () => clearTimeout(completeTimer);
    }
  }, [loading, isVerifying]);

  // Efeito para mostrar o texto de carregamento após um breve delay
  useEffect(() => {
    if (loading && !isVerifying) {
      const timer = setTimeout(() => {
        setShowLoadingText(true);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [loading, isVerifying]);

  // Mostra um indicador de carregamento enquanto verifica a autenticação
  if ((loading || isVerifying) || !authCheckComplete) {
    // Se checkOnly for true, não mostrar a tela de carregamento
    // porque ela já estará sendo mostrada pelo componente pai (App.tsx)
    if (checkOnly) {
      return null;
    }
    return <LoadingScreen />;
  }

  // Redireciona para a página de login se não estiver autenticado
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Renderiza os componentes filhos se estiver autenticado
  return <>{children}</>;
} 
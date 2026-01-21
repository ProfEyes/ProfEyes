import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthGuardProps {
  children: ReactNode;
  checkOnly?: boolean;
}

export function AuthGuard({ children, checkOnly = false }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [forceRedirect, setForceRedirect] = useState(false);

  // Efeito para dar um tempo reduzido para verificação de autenticação
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 500); // Reduzido para apenas 500ms

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Timeout de segurança: se após 3 segundos ainda estiver loading sem usuário, redirecionar
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (loading && !user) {
        console.warn('⚠️ AuthGuard: Timeout de segurança - forçando redirecionamento para /auth');
        setForceRedirect(true);
      }
    }, 3000); // 3 segundos de timeout

    return () => {
      clearTimeout(safetyTimer);
    };
  }, [loading, user]);

  // Se o timeout foi atingido, redirecionar imediatamente
  if (forceRedirect && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Mostra um indicador de carregamento simples enquanto verifica a autenticação
  if (loading || isVerifying) {
    // Se checkOnly for true, não mostrar o loader porque o componente pai já pode estar lidando com isso
    if (checkOnly) {
      return null;
    }
    
    // Exibir um indicador de carregamento mais simples
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
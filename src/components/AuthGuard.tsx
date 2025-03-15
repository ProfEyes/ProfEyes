import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden">
        {/* Nova tela de carregamento com fundo preto */}
        <div className="flex flex-col items-center justify-center">
          {/* Logo ProfEyes com a fonte Mollen Extra Bold */}
          <h1 
            style={{
              fontFamily: 'Mollen',
              fontWeight: 'bold',
              fontSize: '3.5rem',
              color: 'white',
              marginBottom: '2rem',
              letterSpacing: '0.05em'
            }}
          >
            ProfEyes
          </h1>
          
          {/* Spinner loader */}
          <motion.div
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="relative"
          >
            <div className="w-16 h-16 rounded-full border-t-4 border-l-4 border-r-4 border-b-4 border-b-transparent border-white/30 border-t-white/90 border-l-white/60 border-r-white/60"></div>
          </motion.div>
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
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
  const [verificationTimeout, setVerificationTimeout] = useState(false);
  const [loadingTextProgress, setLoadingTextProgress] = useState(0);
  const loadingText = "Preparando tudo para você...";

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

  // Efeito para animar o texto de carregamento
  useEffect(() => {
    if (loading && !isVerifying) {
      const interval = setInterval(() => {
        setLoadingTextProgress(prev => {
          if (prev < loadingText.length) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 80); // Velocidade da digitação

      return () => clearInterval(interval);
    }
  }, [loading, isVerifying, loadingText.length]);

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
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, repeatType: "reverse" }
            }}
          >
            <Loader2 className="h-12 w-12 text-blue-500" />
          </motion.div>
          
          <motion.h2 
            className="mt-4 text-white/70 text-lg font-light"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Verificando autenticação...
          </motion.h2>
          
          <AnimatePresence>
            {loading && !isVerifying && (
              <motion.div
                className="mt-2 h-6 overflow-hidden"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.p 
                  className="relative text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 text-sm font-medium"
                  style={{
                    backgroundSize: "200% 100%",
                  }}
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  {loadingText.substring(0, loadingTextProgress)}
                  <motion.span 
                    className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 relative top-[1px]"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
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
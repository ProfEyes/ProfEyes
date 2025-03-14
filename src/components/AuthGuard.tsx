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
  const [showLoadingText, setShowLoadingText] = useState(false);
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

  // Efeito para mostrar o texto de carregamento após um breve delay
  useEffect(() => {
    if (loading && !isVerifying) {
      const timer = setTimeout(() => {
        setShowLoadingText(true);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [loading, isVerifying]);

  // Se o timeout máximo foi atingido, redireciona para a página de login
  if (verificationTimeout && loading) {
    console.error('Timeout na verificação de autenticação. Redirecionando para login.');
    return <Navigate to="/auth" state={{ from: location, error: 'timeout' }} replace />;
  }

  // Mostra um indicador de carregamento enquanto verifica a autenticação
  if (loading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden">
        {/* Fundo dinâmico */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-black to-black" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-800/10 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-900/20 via-transparent to-transparent" />
        </div>

        {/* Container principal com borda gradiente */}
        <div className="relative flex flex-col items-center">
          {/* Círculo de luz de fundo */}
          <div className="absolute -inset-10 bg-gradient-to-t from-blue-500/5 to-transparent blur-3xl" />
          
          {/* Loader com animação simples */}
          <motion.div
            className="relative"
          >
            {/* Loader principal */}
            <motion.div
              animate={{
                rotate: 360
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
              className="relative"
            >
              <Loader2 className="h-12 w-12 text-gray-300/90" />
            </motion.div>
          </motion.div>
          
          {/* Textos com animações suaves */}
          <motion.h2 
            className="mt-8 text-gray-200 text-xl font-light tracking-widest"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            Verificando autenticação
          </motion.h2>
          
          <AnimatePresence>
            {loading && !isVerifying && (
              <motion.div
                className="mt-4 overflow-hidden"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 1 }}
              >
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: showLoadingText ? 1 : 0,
                    y: showLoadingText ? 0 : 10
                  }}
                  transition={{ 
                    duration: 1.5, 
                    ease: "easeOut"
                  }}
                  className="text-gray-400 text-base font-light tracking-wider"
                >
                  {loadingText}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Elementos decorativos flutuantes */}
          <motion.div
            className="absolute -z-10"
            animate={{
              rotate: [0, 360],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="w-80 h-80 rounded-full border border-gray-800/30 blur-sm" />
          </motion.div>
          
          <motion.div
            className="absolute -z-10"
            animate={{
              rotate: [360, 0],
              scale: [1.2, 0.8, 1.2],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="w-96 h-96 rounded-full border border-blue-900/20 blur-sm" />
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
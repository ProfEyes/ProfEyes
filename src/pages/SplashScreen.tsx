import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Definir português como idioma padrão
    if (!localStorage.getItem('app-language')) {
      localStorage.setItem('app-language', 'pt');
    }
    
    // Marcar que o idioma foi selecionado
    sessionStorage.setItem('language-selection-completed', 'true');

    // Redirecionar direto para autenticação após 3 segundos
    const redirectTimer = setTimeout(() => {
      navigate('/auth');
    }, 3000);

    return () => {
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black"
      style={{ zIndex: 9999 }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: 3, 
          ease: "linear" 
        }}
        className="flex items-center justify-center"
      >
        <motion.img 
          src="/profeyes-logo-removebg-preview.png" 
          alt="ProfEyes Logo" 
          className="w-56 h-auto" 
          style={{ 
            filter: "drop-shadow(0 0 25px rgba(255, 255, 255, 0.2))"
          }}
          animate={{
            filter: ["drop-shadow(0 0 20px rgba(255, 255, 255, 0.15))", "drop-shadow(0 0 30px rgba(255, 255, 255, 0.25))", "drop-shadow(0 0 20px rgba(255, 255, 255, 0.15))"],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      </motion.div>
    </div>
  );
} 
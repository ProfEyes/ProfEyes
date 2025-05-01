import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
  isReady?: boolean;
  onLoadComplete?: () => void;
}

export function LoadingScreen({ message, isReady = false, onLoadComplete }: LoadingScreenProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!isReady && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 w-full h-full flex items-center justify-center bg-black z-[9999]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 1.5,
              ease: [0.22, 1, 0.36, 1]
            }}
            onAnimationComplete={() => {
              if (onLoadComplete) {
                onLoadComplete();
              }
            }}
            className="flex flex-col items-center justify-center"
          >
            <img 
              src="/dragon-logo.svg" 
              alt="Dragon Logo" 
              className="w-40 h-40"
              style={{
                filter: 'brightness(1.1) drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))'
              }}
              onError={() => setImageError(true)}
            />
            
            {imageError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-sm text-red-400/90"
              >
                Imagem do dragão não encontrada
              </motion.p>
            )}
            
            {message && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="mt-6 text-sm text-white/70"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
  isReady?: boolean;
  onLoadComplete?: () => void;
}

export function LoadingScreen({ message, isReady = false, onLoadComplete }: LoadingScreenProps) {
  return (
    <AnimatePresence mode="wait">
      {!isReady && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 w-full h-full flex items-center justify-center bg-black z-[9999]"
        >
          <style>
            {`          
              .logo-text {
                font-family: 'Mollen', sans-serif;
                font-weight: bold;
                letter-spacing: 0.03em;
                color: white;
                text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                filter: brightness(1.05);
                font-size: 40px;
              }
              
              .shimmer-container {
                width: 100px;
                height: 20px;
                margin-top: 24px;
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              
              .shimmer {
                position: absolute;
                height: 1px;
                width: 100%;
                background: linear-gradient(
                  90deg,
                  rgba(255, 255, 255, 0) 0%,
                  rgba(255, 255, 255, 0.8) 50%,
                  rgba(255, 255, 255, 0) 100%
                );
                animation: shimmer 2.5s infinite linear;
                transform: translateX(-100%);
              }
              
              @keyframes shimmer {
                0% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(100%);
                }
              }
            `}
          </style>
          
          <div className="flex flex-col items-center justify-center">
            <div className="flex flex-col items-center">
              <motion.h1 
                className="logo-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ 
                  duration: 4.5,
                  ease: [0.22, 1, 0.36, 1]
                }}
                onAnimationComplete={() => {
                  if (onLoadComplete) {
                    onLoadComplete();
                  }
                }}
              >
                ProfEyes
              </motion.h1>
              
              <div className="shimmer-container">
                <div className="shimmer"></div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
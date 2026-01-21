import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Apenas logar o erro - redirecionamento automático desabilitado para debug
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
      "Search params:",
      location.search
    );
    
    // Verificar se é uma tentativa de redefinição de senha para logging
    const isResetPasswordAttempt = 
      location.pathname.includes('reset-password') || 
      location.search.includes('type=recovery') ||
      location.search.includes('code=');
    
    if (isResetPasswordAttempt) {
      console.log("⚠️ IMPORTANTE: Detectada tentativa de acesso à página de redefinição de senha");
      console.log("Caminho atual:", location.pathname);
      console.log("Parâmetros de busca:", location.search);
      console.log("URL completa:", window.location.href);
    }
  }, [location.pathname, location.search]);

  const goToHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="text-center p-8 bg-gray-800/30 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/30">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-300 mb-6">{t('notfound.subtitle')}</p>
        
        {isRedirecting ? (
          <div className="mb-8">
            <p className="text-emerald-400 animate-pulse mb-2">
              Redirecionando para a página correta...
            </p>
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 mb-8 max-w-md">
            {t('notfound.message')}
          </p>
        )}
        
        {!isRedirecting && (
          <div className="space-y-4">
          <Button 
            onClick={goToHome}
              className="bg-blue-600 hover:bg-blue-700 transition-colors mr-4"
          >
            {t('notfound.button')}
          </Button>
            
            {/* Botão de teste para redefinição de senha */}
            {location.search.includes('code=') && (
              <Button 
                onClick={() => navigate(`/auth/reset-password${location.search}`)}
                className="bg-green-600 hover:bg-green-700 transition-colors"
              >
                Tentar Redefinição de Senha
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound;

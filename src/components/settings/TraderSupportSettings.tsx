import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Link as LinkIcon, Check, ChevronRight } from "lucide-react";
import { traderLinkService } from "@/services/traderLinkService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

const TraderSupportSettings = () => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [preferredTraderLink, setPreferredTraderLink] = useState<string>("");
  const [isUsingDefault, setIsUsingDefault] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  // Debounce do link para evitar salvamentos excessivos
  const debouncedLink = useDebounce(preferredTraderLink, 500);

  // Carregar preferências atuais
  useEffect(() => {
    if (isExpanded) {
      loadPreferences();
    }
  }, [isExpanded]);

  // Marcar componente como montado após carregar
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Salvar automaticamente quando houver alterações
  useEffect(() => {
    // Evitar salvar na montagem inicial
    if (!isMounted) return;
    
    savePreferences();
  }, [debouncedLink, isUsingDefault]);

    const loadPreferences = async () => {
      setLoading(true);
      try {
        const { data: preferences } = await traderLinkService.getUserPreferences();
        if (preferences) {
          setPreferredTraderLink(preferences.preferred_trader_link || "");
          setIsUsingDefault(!preferences.preferred_trader_link || preferences.preferred_trader_link.trim() === "");
        }
      } catch (error) {
        console.error("Erro ao carregar preferências do trader:", error);
      } finally {
        setLoading(false);
      // Marcar como montado após carregar dados iniciais
      setIsMounted(true);
      }
    };

  // Função para validar URL
  const validateUrl = (url: string): boolean => {
    if (!url || !url.trim()) return true; // Empty is OK (will use default)
    
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Função para alternar o uso do link padrão
  const toggleDefaultLink = (e?: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => {
    // Prevenir comportamento padrão para evitar que a propagação cause problemas
    if (e) e.preventDefault();
    
    // Inverte o valor atual
    const newValue = !isUsingDefault;
    setIsUsingDefault(newValue);
    
    // Se estiver ativando a opção padrão, limpa o link
    if (newValue) {
    setPreferredTraderLink("");
    }
  };

  // Função para salvar as preferências
  const savePreferences = async () => {
    // Não salvar durante o carregamento inicial
    if (!isMounted) return;
    
    // Validar URL se não estiver usando o padrão
    if (!isUsingDefault && preferredTraderLink && !validateUrl(preferredTraderLink)) {
      toast.error("Por favor, insira um link válido");
      return;
    }

    setLoading(true);
    try {
      // Se estiver usando o padrão, salvar link vazio
      const linkToSave = isUsingDefault ? "" : preferredTraderLink;
      const success = await traderLinkService.updateTraderPreferences(linkToSave);
      
      if (success) {
        // Notificação silenciosa ou nenhuma notificação para não interromper a experiência
        console.log("Preferências salvas com sucesso");
      } else {
        toast.error("Erro ao salvar as preferências");
      }
    } catch (error) {
      console.error("Erro ao salvar preferências:", error);
      toast.error("Erro ao salvar as preferências");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Cabeçalho clicável */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-black/10 transition-colors duration-200 group"
      >
      <div className="flex items-center space-x-2">
          <div className={cn(
            "relative p-1 rounded-full transition-colors duration-300",
            isExpanded ? "bg-purple-600/20" : "bg-black/20 group-hover:bg-purple-600/10"
          )}>
            <Heart className={cn(
              "h-4 w-4 transition-colors duration-300",
              isExpanded ? "text-purple-600" : "text-white/70 group-hover:text-purple-500/80"
            )} />
          </div>
          <h3 className="text-base font-medium text-white/90">{t('trader.support.title')}</h3>
      </div>
      
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4 text-white/50" />
        </motion.div>
      </button>
      
      {/* Conteúdo expansível */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-3 pb-2.5 px-3.5 space-y-4 border-t border-white/5">
              {/* Descrição compacta */}
              <div className="flex items-start space-x-2">
                <p className="text-xs text-white/70 leading-relaxed">
                  {t('trader.support.description')}
                </p>
              </div>
              
          {/* Opção para usar link padrão */}
              <div className="bg-black/20 backdrop-blur-sm rounded-lg border border-white/5 p-2.5 hover:border-white/10 transition-all duration-300">
                <div className="flex items-center space-x-2.5">
                  {/* Checkbox com estrutura original mas com comportamento melhorado */}
                  <div 
                    className="relative" 
                    onClick={toggleDefaultLink}
                    style={{ zIndex: 10 }}
                  >
                    {/* Input real (invisível) */}
              <input
                type="checkbox"
                id="use-default"
                checked={isUsingDefault}
                      onChange={toggleDefaultLink}
                      className="peer absolute opacity-0 w-0 h-0 cursor-pointer"
                      style={{ zIndex: 20 }}
                    />
                    
                    {/* Label visual do checkbox */}
                    <label
                      htmlFor="use-default"
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-md border transition-all duration-300 cursor-pointer",
                        isUsingDefault
                          ? "border-purple-600/50 bg-purple-600/20"
                          : "border-white/10 bg-black/30 hover:bg-black/50"
                      )}
                      style={{ zIndex: 30 }}
                    >
                      {isUsingDefault && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                        >
                          <Check className="h-2.5 w-2.5 text-purple-400" />
                        </motion.div>
                      )}
                    </label>

                    {/* Efeito de brilho clicável */}
                    {isUsingDefault && (
                      <motion.div
                        className="absolute -inset-1 rounded-md bg-purple-600/10 blur-sm cursor-pointer"
                        onClick={toggleDefaultLink}
                        animate={{ opacity: [0.4, 0.6, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{ zIndex: 5 }}
                      />
                    )}
            </div>
                  
                  {/* Label clicável */}
                  <span 
                    onClick={toggleDefaultLink}
                    className={cn(
                      "text-xs cursor-pointer transition-colors duration-300",
                      isUsingDefault ? "text-purple-400/90" : "text-white/70"
                    )}
                  >
                    {t('trader.support.use.default')}
                  </span>
          </div>
          
                {isUsingDefault && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 pl-6 text-xs text-white/60"
                  >
                    {t('trader.support.default.info')}
                  </motion.div>
                )}
          </div>
          
          {/* Link do trader */}
              <div className={cn(
                "space-y-1.5 transition-opacity duration-300",
                isUsingDefault ? "opacity-50" : "opacity-100"
              )}>
                <Label htmlFor="trader-link" className="text-xs text-white/60 flex items-center">
                  <LinkIcon className="h-3.5 w-3.5 mr-1.5 text-purple-600/80" />
                  {t('trader.support.link')}
            </Label>
                
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/3 to-white/5 rounded-lg blur transition-opacity duration-300 pointer-events-none" 
                       style={{ opacity: preferredTraderLink && !isUsingDefault ? 0.2 : 0 }}></div>
            <Input
              id="trader-link"
              type="url"
              value={preferredTraderLink}
              onChange={(e) => setPreferredTraderLink(e.target.value)}
                    placeholder={t('trader.support.link.placeholder')}
                    className={cn(
                      "bg-black/30 border-white/10 h-9 rounded-lg py-0 px-2.5",
                      "hover:bg-black/40 transition-all duration-300",
                      "text-xs text-white/80 placeholder:text-white/20",
                      "focus:outline-none focus:bg-black/40 focus:border-white/15",
                      isUsingDefault ? "cursor-not-allowed" : "shadow-inner"
                    )}
              disabled={isUsingDefault || loading}
            />
            </div>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TraderSupportSettings; 
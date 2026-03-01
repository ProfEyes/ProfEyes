import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, LogOut, User, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSavedAvatar } from "@/utils/imageUtils";
import { hasInconsistentAuthData, forceLogout } from "@/utils/autoAuth";

export const ProfileMenu = () => {
  const { userName, setUserName, avatarUrl, refreshUserData } = useUser();
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Função para obter textos baseados no idioma atual
  const getTexts = () => {
    switch (language) {
      case 'en':
        return {
          myProfile: 'My Profile',
          logout: 'Logout',
          fixLogin: 'Fix Login'
        };
      case 'es':
        return {
          myProfile: 'Mi Perfil',
          logout: 'Salir',
          fixLogin: 'Corregir Login'
        };
      default: // 'pt'
        return {
          myProfile: 'Meu Perfil',
          logout: 'Sair',
          fixLogin: 'Corrigir Login'
        };
    }
  };

  const texts = getTexts();
  const [open, setOpen] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const localAvatarRef = useRef<string | null>(localAvatarUrl);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasAuthInconsistencies, setHasAuthInconsistencies] = useState(false);
  
  // Cache de imagens para evitar flickering
  const cacheImage = useCallback((url: string | null) => {
    if (!url) return;
    
    // Criar uma imagem em background para pré-carregar
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImageLoaded(true);
    };
    
    // Manter a referência para a imagem atual
    if (imageRef.current) {
      imageRef.current.src = url;
    }
  }, []); // ✅ Sem dependências - função estável

  // Inicializar o avatar no carregamento inicial - isso ajuda com o SSR
  useEffect(() => {
    // Verificar localStorage imediatamente para evitar flickering
    const cachedAvatar = localStorage.getItem("user-avatar");
    if (cachedAvatar) {
      setLocalAvatarUrl(cachedAvatar);
      cacheImage(cachedAvatar);
    }
    
    // Verificar inconsistências de autenticação
    const checkAuthConsistency = async () => {
      try {
        const inconsistent = await hasInconsistentAuthData();
        setHasAuthInconsistencies(inconsistent);
        
        if (inconsistent && import.meta.env.DEV) {
          console.warn('⚠️ [ProfileMenu] Dados de autenticação inconsistentes detectados');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ [ProfileMenu] Erro ao verificar inconsistências:', error);
        }
      }
    };
    
    checkAuthConsistency();
  }, []); // ✅ Apenas uma vez ao montar

  // Ref para avatarUrl para evitar re-criação de callback
  const avatarUrlRef = useRef(avatarUrl);
  useEffect(() => {
    avatarUrlRef.current = avatarUrl;
  }, [avatarUrl]);

  // Função para verificar o avatar no localStorage e sincronizar estado
  const checkAndSyncAvatar = useCallback(() => {
    const storedAvatar = getSavedAvatar();
    // Usar ref para evitar dependencia direta em localAvatarUrl e re-criação frequente
    if (storedAvatar && storedAvatar !== localAvatarRef.current) {
      setLocalAvatarUrl(storedAvatar);
      cacheImage(storedAvatar);
    } else if (avatarUrlRef.current && avatarUrlRef.current !== localAvatarRef.current) {
      setLocalAvatarUrl(avatarUrlRef.current);
      cacheImage(avatarUrlRef.current);
    }
  }, []); // ✅ Sem dependências - usa refs

  // Sincronizar ref sempre que o estado mudar
  useEffect(() => {
    localAvatarRef.current = localAvatarUrl;
  }, [localAvatarUrl]);

  // Sincronizar avatar do contexto com o estado local
  useEffect(() => {
    if (avatarUrl && avatarUrl !== localAvatarRef.current) {
      setLocalAvatarUrl(avatarUrl);
      localAvatarRef.current = avatarUrl;
      cacheImage(avatarUrl);
    }
  }, [avatarUrl]); // ✅ Removido cacheImage das dependências

  // Escutar por atualizações de avatar (CONSOLIDADO)
  useEffect(() => {
    const handleAvatarUpdated = (event: Event) => {
      const { avatarUrl: newAvatarUrl } = (event as CustomEvent).detail;
      if (newAvatarUrl && newAvatarUrl !== localAvatarRef.current) {
        setLocalAvatarUrl(newAvatarUrl);
        localAvatarRef.current = newAvatarUrl;
        cacheImage(newAvatarUrl);
      }
    };

    // Verificar o avatar quando o foco retorna à janela - OTIMIZADO
    const handleFocus = () => {
      const storedAvatar = getSavedAvatar();
      if (storedAvatar && storedAvatar !== localAvatarRef.current) {
        setLocalAvatarUrl(storedAvatar);
        localAvatarRef.current = storedAvatar;
        cacheImage(storedAvatar);
      }
    };

    window.addEventListener('avatar-updated', handleAvatarUpdated);
    window.addEventListener('focus', handleFocus);
    
    // Verificar imediatamente ao montar
    const initialAvatar = getSavedAvatar();
    if (initialAvatar && initialAvatar !== localAvatarRef.current) {
      setLocalAvatarUrl(initialAvatar);
      localAvatarRef.current = initialAvatar;
      cacheImage(initialAvatar);
    }
    
    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdated);
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // ✅ Apenas uma vez ao montar - funções são estáveis

  // Garantir que temos o nome correto do usuário
  useEffect(() => {
    // Atualizar o nome quando o userName do contexto mudar
    if (userName && userName.trim() !== '') {
      setUserDisplayName(userName);
      if (import.meta.env.DEV) {
        // Atualizando userDisplayName
      }
    }
  }, [userName]);

  // Refs para userName e setUserName para evitar re-criação de callbacks
  const userNameRef = useRef(userName);
  const setUserNameRef = useRef(setUserName);
  
  useEffect(() => {
    userNameRef.current = userName;
    setUserNameRef.current = setUserName;
  }, [userName, setUserName]);

  // Função para garantir que temos o nome mais atualizado
  const updateUserDisplayName = useCallback(async () => {
    try {
      // Verificar primeiro se há nome no localStorage (prioridade alta)
      const localUserName = localStorage.getItem("user-name");
      
      if (localUserName && localUserName.trim() !== '') {
        setUserDisplayName(localUserName);
        if (import.meta.env.DEV) {
          // Usando nome do localStorage
        }
        
        // Sincronizar com o contexto se necessário
        if (userNameRef.current !== localUserName) {
          setUserNameRef.current(localUserName);
        }
        return;
      }
      
      // Verificar dados do usuário autenticado
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      
      // Buscar da tabela user_profiles que é mais confiável para persistência
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', data.user.id)
          .maybeSingle();
          
        if (profileData?.display_name && profileData.display_name.trim() !== '') {
          setUserDisplayName(profileData.display_name);
          if (import.meta.env.DEV) {
            console.log("ProfileMenu: Usando nome do banco de dados:", profileData.display_name);
          }
          
          // Sincronizar com o contexto e localStorage
          if (userNameRef.current !== profileData.display_name) {
            setUserNameRef.current(profileData.display_name);
          }
          
          // Atualizar localStorage para acessos futuros
          localStorage.setItem("user-name", profileData.display_name);
          
          return; // Encontramos na tabela user_profiles
        }
      } catch (profileError) {
        console.warn('Erro ao buscar nome da tabela user_profiles:', profileError);
        // Continua para verificar os metadados
      }
      
      // Fallback para os metadados (menos confiável para persistência)
      const name = 
        data.user.user_metadata?.full_name || 
        data.user.user_metadata?.name || 
        userNameRef.current || 
        data.user.email?.split('@')[0] || 
        "Usuário";
      
      setUserDisplayName(name);
      if (import.meta.env.DEV) {
        console.log("ProfileMenu: Usando nome dos metadados:", name);
      }
      
      // Atualizar o contexto se necessário
      if (!userNameRef.current && name) {
        setUserNameRef.current(name);
        // Salvar no localStorage para acessos futuros
        localStorage.setItem("user-name", name);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
    }
  }, []); // ✅ Sem dependências - usa refs

  // Chamar a função de atualização quando o componente montar
  useEffect(() => {
    updateUserDisplayName();
    
    // Escutar eventos para atualizar o nome
    const handleUsernameUpdated = (event: Event) => {
      const { userName: newUserName, fromUpdate } = (event as CustomEvent).detail;
      
      // Só atualizar se for uma atualização final (não durante digitação)
      if (newUserName && newUserName.trim() !== '' && fromUpdate !== true) {
        if (import.meta.env.DEV) {
          // Atualizando nome (silenciado)
        }
        setUserDisplayName(newUserName);
      }
    };
    
    const handleFocus = () => {
      // OTIMIZADO: Verificar apenas se há diferença real
      const storedName = localStorage.getItem("user-name");
      if (storedName && storedName.trim() !== '' && storedName !== userDisplayName) {
        setUserDisplayName(storedName);
        if (import.meta.env.DEV) {
          // Nome atualizado do localStorage
        }
      }
    };
    
    // Registrar para eventos
    window.addEventListener('username-updated', handleUsernameUpdated);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('user-data-refreshed', updateUserDisplayName);
    
    return () => {
      window.removeEventListener('username-updated', handleUsernameUpdated);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('user-data-refreshed', updateUserDisplayName);
    };
  }, []); // ✅ Apenas uma vez ao montar - updateUserDisplayName é estável

  // 📌 REF para userDisplayName — necessária para estabilizar handleOpenChange
  const userDisplayNameRef = useRef(userDisplayName);
  
  useEffect(() => {
    userDisplayNameRef.current = userDisplayName;
  }, [userDisplayName]);

  // Otimizar atualização quando o menu abrir — ESTÁVEL para evitar loop no Radix Popper
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    
    // Se o menu estiver abrindo, verificar apenas se há mudanças
    if (newOpen) {
      // Verificar se há nome no localStorage diferente (usa ref para evitar dependência)
      const storedName = localStorage.getItem("user-name");
      if (storedName && storedName !== userDisplayNameRef.current) {
        setUserDisplayName(storedName);
      }
      
      // Verificar avatar apenas se necessário
      checkAndSyncAvatar();
    }
  }, [checkAndSyncAvatar]); // ✅ ESTÁVEL — checkAndSyncAvatar já é estável ([])

  // 📌 REF para refreshUserData — usada nos onError handlers para evitar recriação
  const refreshUserDataRef = useRef(refreshUserData);
  
  useEffect(() => {
    refreshUserDataRef.current = refreshUserData;
  }, [refreshUserData]);

  // Handler estável para erro de carregamento de imagem do avatar
  const handleAvatarError = useCallback(() => {
    refreshUserDataRef.current();
  }, []);

  // Função de logout que preserva dados de perfil para recarregar do banco
  const handleLogout = () => {
    // Fechamos o menu
    setOpen(false);
    
    // Limpar dados e redirecionar
    try {
      if (import.meta.env.DEV) {
        console.log('🚪 [ProfileMenu] Iniciando logout - preservando dados de perfil...');
      }
      
      // Limpar APENAS dados de autenticação, preservando dados de perfil
      // que serão recarregados do banco de dados no próximo login
      const authKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || 
        key.includes('supabase') ||
        key === 'supabase.auth.token' ||
        key === 'auth_last_email' ||
        key === 'auth_remember' ||
        key === 'auth_user_email' ||
        key === 'currentUser'
      );
      
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        if (import.meta.env.DEV) {
          console.log(`🗑️ [ProfileMenu] Removido: ${key}`);
        }
      });
      
      // Limpar sessionStorage completamente
      sessionStorage.clear();
      
      // Logout do Supabase
      supabase.auth.signOut();
      
      if (import.meta.env.DEV) {
        console.log('✅ [ProfileMenu] Logout concluído - dados de perfil preservados');
      }
      
      // Ir para a página de autenticação
      window.location.href = "/auth";
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Mesmo com erro, redirecionar
      window.location.href = "/auth";
    }
  };

  // Função para forçar re-login quando há dados inconsistentes
  const handleForceRelogin = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('🔄 [ProfileMenu] Forçando re-login - limpando dados inconsistentes...');
      }
      
      // Fechar menu
      setOpen(false);
      
      // Forçar logout completo e limpeza
      await forceLogout();
      
      // Redirecionar para login
      window.location.href = "/auth";
      
      if (import.meta.env.DEV) {
        console.log('✅ [ProfileMenu] Re-login forçado concluído');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ [ProfileMenu] Erro ao forçar re-login:', error);
      }
      
      // Mesmo com erro, tentar redirecionar
      window.location.href = "/auth";
    }
  };

  // Usar o nome real com fallbacks
  const displayName = userDisplayName || 
    user?.user_metadata?.full_name || 
    user?.user_metadata?.name || 
    userName || 
    user?.email?.split('@')[0] || 
    "Usuário";

  // Usar a imagem do estado local, ou fazer fallback para avatar do context ou null
  const displayAvatarUrl = localAvatarUrl || avatarUrl;
  
  // Estilo para pré-carregamento da imagem (escondido da UI)
  const preloadStyle: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    opacity: 0,
    pointerEvents: 'none',
  };

  // Verificar quando a página é restaurada após fechamento/suspensão (similar ao WhatsApp)
  useEffect(() => {
    const handleAppResume = () => {
      const storedAvatar = getSavedAvatar();
      if (storedAvatar && storedAvatar !== localAvatarRef.current) {
        setLocalAvatarUrl(storedAvatar);
        localAvatarRef.current = storedAvatar;
        cacheImage(storedAvatar);
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAppResume();
      }
    };
    
    window.addEventListener('pageshow', handleAppResume);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('pageshow', handleAppResume);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cacheImage]);

  return (
    <>
      {/* Imagem pré-carregada escondida para evitar flickering */}
      {displayAvatarUrl && (
        <img 
          src={displayAvatarUrl} 
          alt="Preload avatar" 
          style={preloadStyle} 
          ref={imageRef}
          onLoad={() => setImageLoaded(true)}
          key={displayAvatarUrl} // Garantir re-render quando a URL mudar
        />
      )}
      
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger className="focus:outline-none" asChild>
          <button 
            className="flex items-center gap-2 rounded-full focus:outline-none"
            onClick={checkAndSyncAvatar} // Referência direta à função estável
          >
            <Avatar className="h-10 w-10 ring-1 ring-white/10 hover:ring-white/20 transition-all cursor-pointer">
              <AvatarImage 
                src={displayAvatarUrl || null} 
                alt={displayName}
                onError={handleAvatarError} // Referência direta ao handler estável
                className="!important object-cover"
                style={{ 
                  visibility: displayAvatarUrl ? 'visible' : 'hidden',
                  opacity: 1
                }} 
              />
              <AvatarFallback className="bg-black/20 text-white/80">
                {displayName.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-white/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="w-48 mt-1 bg-black/95 border border-white/10 shadow-xl backdrop-blur-lg rounded-lg"
        >
          <DropdownMenuLabel className="flex flex-col items-center gap-1 py-3">
            <Avatar className="h-16 w-16 ring-1 ring-white/10 mb-2">
              <AvatarImage 
                src={displayAvatarUrl || null} 
                alt={displayName}
                onError={handleAvatarError} // Referência direta ao handler estável
                className="!important object-cover"
                style={{ 
                  visibility: displayAvatarUrl ? 'visible' : 'hidden',
                  opacity: 1
                }}
              />
              <AvatarFallback className="bg-black/20 text-lg text-white/80">
                {displayName.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-white/90 font-medium text-center text-sm">{displayName}</span>
            <span className="text-xs text-white/50 font-normal text-center">
              {user?.email || "email@exemplo.com"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/5" />
          <DropdownMenuItem
            className="py-2 flex items-center justify-center gap-2 hover:bg-white/5 cursor-pointer text-white/80 hover:text-white text-xs"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            <User className="h-3.5 w-3.5 text-white/50" />
            <span>{texts.myProfile}</span>
          </DropdownMenuItem>
          
          {/* Mostrar botão de forçar re-login apenas quando há inconsistências */}
          {hasAuthInconsistencies && (
            <>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem
                className="py-2 flex items-center justify-center gap-2 hover:bg-yellow-500/10 cursor-pointer text-yellow-400 text-xs"
                onClick={handleForceRelogin}
              >
                <RefreshCw className="h-3.5 w-3.5 text-yellow-400/70" />
                <span>{texts.fixLogin}</span>
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator className="bg-white/5" />
          <DropdownMenuItem 
            className="py-2 flex items-center justify-center gap-2 hover:bg-red-500/10 cursor-pointer text-red-400 text-xs p-0"
            asChild
          >
            <a 
              href="/auth" 
              className="flex items-center justify-center gap-2 py-2 px-4 w-full text-red-400"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              <LogOut className="h-3.5 w-3.5 text-red-400/70" />
              <span>{texts.logout}</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}; 
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/stores/userStore";

export function Logo() {
  const { user } = useUserStore();
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Efeito para sincronizar o nome e avatar do usuário
  useEffect(() => {
    // Função para carregar dados do usuário
    const loadUserData = () => {
      // Verificar o localStorage primeiro (mais atualizado)
      const storedName = localStorage.getItem("user-name");
      const storedAvatar = localStorage.getItem("user-avatar");
      
      // Preferir dados do localStorage se disponíveis
      if (storedName) {
        setDisplayName(storedName);
      } else if (user?.name) {
        setDisplayName(user.name);
      }
      
      if (storedAvatar) {
        setAvatarUrl(storedAvatar);
      } else if (user?.avatar_url) {
        setAvatarUrl(user.avatar_url);
      }
    };
    
    // Carregar dados iniciais
    loadUserData();
    
    // Configurar listeners para atualizações
    const handleNameUpdated = (event: Event) => {
      const { userName } = (event as CustomEvent).detail;
      if (userName) {
        setDisplayName(userName);
      }
    };
    
    const handleAvatarUpdated = (event: Event) => {
      const { avatarUrl: newAvatarUrl } = (event as CustomEvent).detail;
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
      }
    };
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "user-name" && event.newValue) {
        setDisplayName(event.newValue);
      } else if (event.key === "user-avatar" && event.newValue) {
        setAvatarUrl(event.newValue);
      }
    };
    
    // Adicionar listeners para eventos
    window.addEventListener('username-updated', handleNameUpdated);
    window.addEventListener('avatar-updated', handleAvatarUpdated);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      // Remover listeners
      window.removeEventListener('username-updated', handleNameUpdated);
      window.removeEventListener('avatar-updated', handleAvatarUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex flex-col items-center">
        <span className="text-[8px] font-light text-muted-foreground/50 uppercase tracking-widest">exclusive</span>
        <div className="h-3 flex items-center justify-center">
          <img 
            src="/profeyes-logo-removebg-preview.png" 
            alt="Logo" 
            className="h-3 w-auto"
            style={{ 
              filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.2))"
            }}
          />
        </div>
      </div>
      <Avatar className="h-5 w-5 mt-0.5">
        <AvatarImage
          src={avatarUrl}
          alt="Foto de perfil"
          className="object-cover"
        />
        <AvatarFallback>
          {displayName.charAt(0) || user?.name?.charAt(0) || "U"}
        </AvatarFallback>
      </Avatar>
    </div>
  );
} 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/stores/userStore";

export function Logo() {
  const { user } = useUserStore();

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex flex-col items-center">
        <span className="text-[8px] font-light text-muted-foreground/50 uppercase tracking-widest">exclusive</span>
        <h1 
          className="text-sm font-semibold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent" 
          style={{ 
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
          }}
        >
          NP Exclusive Signals
        </h1>
      </div>
      <Avatar className="h-5 w-5 mt-0.5">
        <AvatarImage
          src={user?.avatar_url}
          alt="Foto de perfil"
          className="object-cover"
        />
        <AvatarFallback>
          {user?.name?.charAt(0) || "U"}
        </AvatarFallback>
      </Avatar>
    </div>
  );
} 
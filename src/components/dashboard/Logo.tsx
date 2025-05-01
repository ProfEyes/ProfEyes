import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/stores/userStore";

export function Logo() {
  const { user } = useUserStore();

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex flex-col items-center">
        <span className="text-[8px] font-light text-muted-foreground/50 uppercase tracking-widest">exclusive</span>
        <div className="h-5 flex items-center justify-center">
          <img 
            src="/profeyes-logo-removebg-preview.png" 
            alt="Logo" 
            className="h-5 w-auto"
            style={{ 
              filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.2))"
            }}
          />
        </div>
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
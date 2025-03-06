import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/stores/userStore";

export function Logo() {
  const { user } = useUserStore();

  return (
    <div className="flex flex-col items-center gap-2">
      <h1 className="text-2xl font-bold">ProfEyes</h1>
      <Avatar className="h-12 w-12">
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
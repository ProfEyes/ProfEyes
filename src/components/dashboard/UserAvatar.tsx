import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/stores/userStore";
import { Camera, Loader2 } from "lucide-react";
import { updateUserProfile } from "@/services/userService";
import { toast } from "sonner";

export function UserAvatar() {
  const { user, updateUser } = useUserStore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const avatarUrl = await updateUserProfile(file);
      updateUser({ ...user, avatar_url: avatarUrl });
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar a foto de perfil');
      console.error('Error updating avatar:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative group">
      <Avatar 
        className="h-8 w-8 cursor-pointer transition-opacity group-hover:opacity-75" 
        onClick={handleImageClick}
      >
        <AvatarImage 
          src={user?.avatar_url || user?.photoURL} 
          alt={user?.name || "User avatar"} 
        />
        <AvatarFallback>
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            user?.name?.charAt(0) || "U"
          )}
        </AvatarFallback>
        
        {/* Overlay para hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Camera className="h-4 w-4 text-white" />
        </div>
      </Avatar>

      {/* Input file oculto */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageChange}
      />
    </div>
  );
} 
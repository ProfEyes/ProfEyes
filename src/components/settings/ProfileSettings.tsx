import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStore } from "@/stores/userStore";
import { Camera, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { updateUserProfile } from "@/services/userService";

export function ProfileSettings() {
  const { user, updateUser } = useUserStore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida (JPG, PNG)');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
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
    <Card>
      <CardHeader>
        <CardTitle>Foto de Perfil</CardTitle>
        <CardDescription>
          Escolha uma foto para seu perfil. Recomendamos uma imagem quadrada de até 2MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="relative group">
          <Avatar className="h-24 w-24 cursor-pointer">
            <AvatarImage
              src={user?.avatar_url}
              alt="Foto de perfil"
              className="object-cover"
            />
            <AvatarFallback>
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                user?.name?.charAt(0) || "U"
              )}
            </AvatarFallback>
          </Avatar>
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-8 w-8 text-white" />
          </div>
        </div>

        <Button 
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Alterar foto'
          )}
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg,image/png"
          onChange={handleImageChange}
        />
      </CardContent>
    </Card>
  );
} 
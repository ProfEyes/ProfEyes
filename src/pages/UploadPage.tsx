import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useVideo } from "@/contexts/VideoContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload,
  FileVideo,
  Film,
  X,
  Video,
  Clock,
  Shield,
  Lock,
  Globe,
  Users,
  UploadCloud,
  Check,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

// Lista de categorias disponíveis
const CATEGORIES = [
  "Criptomoedas",
  "Trading",
  "Educação",
  "Notícias",
  "Análises",
  "Tutoriais",
  "Entrevistas"
];

// Configurações de privacidade
const PRIVACY_OPTIONS = [
  { value: "public", label: "Público", icon: <Globe className="h-4 w-4 mr-2" /> },
  { value: "unlisted", label: "Não listado", icon: <Users className="h-4 w-4 mr-2" /> },
  { value: "private", label: "Privado", icon: <Lock className="h-4 w-4 mr-2" /> }
];

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { 
    isUserVerified, 
    isUploading, 
    uploadProgress, 
    handleVideoUpload, 
    handleShortUpload 
  } = useVideo();
  
  // Estado da seleção de arquivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"video" | "short">(
    searchParams.get("type") === "short" ? "short" : "video"
  );
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<
    "select" | "details" | "uploading" | "complete" | "error"
  >("select");
  
  // Estados dos detalhes do vídeo
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [privacy, setPrivacy] = useState("public");
  const [tags, setTags] = useState("");
  const [currentTag, setCurrentTag] = useState("");
  const [tagsList, setTagsList] = useState<string[]>([]);
  
  // Refs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  // Verificar se usuário está autenticado e verificado
  useEffect(() => {
    if (!user) {
      toast.error("Você precisa fazer login para fazer upload de vídeos");
      navigate("/auth");
      return;
    }
    
    if (!isUserVerified) {
      toast.error("Apenas usuários verificados podem fazer upload de vídeos");
      navigate("/");
    }
  }, [user, isUserVerified]);
  
  // Limpar URL de objeto quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, []);
  
  // Verificar se o arquivo é um vídeo válido
  const isValidVideoFile = (file: File): boolean => {
    // Tipos de vídeo aceitos
    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
    ];
    return validTypes.includes(file.type);
  };
  
  // Verificar se o arquivo é uma imagem válida
  const isValidImageFile = (file: File): boolean => {
    // Tipos de imagem aceitos
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    return validTypes.includes(file.type);
  };
  
  // Verificar tamanho do arquivo
  const isValidFileSize = (file: File): boolean => {
    // Limite de 500MB
    const maxSize = 500 * 1024 * 1024;
    return file.size <= maxSize;
  };
  
  // Selecionar arquivo de vídeo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validar tipo de arquivo
    if (!isValidVideoFile(file)) {
      toast.error("Formato de arquivo inválido. Use MP4, WebM ou outros formatos de vídeo comuns.");
      return;
    }
    
    // Validar tamanho de arquivo
    if (!isValidFileSize(file)) {
      toast.error("Arquivo muito grande. O tamanho máximo é de 500MB.");
      return;
    }
    
    setSelectedFile(file);
    
    // Criar URL para preview
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    
    // Obter duração do vídeo
    const video = document.createElement('video');
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      setVideoDuration(video.duration);
      
      // Definir tipo com base na duração/orientação
      if (uploadType === "short" && video.duration > 60) {
        toast.warning("Este vídeo é longo demais para um short. A duração máxima é de 60 segundos.");
      }
      if (uploadType === "video" && video.duration < 15) {
        toast.info("Este vídeo é curto. Deseja enviá-lo como um short?", {
          action: {
            label: "Sim",
            onClick: () => setUploadType("short"),
          },
        });
      }
    });
    
    setUploadStage("details");
  };
  
  // Selecionar thumbnail
  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validar tipo de arquivo
    if (!isValidImageFile(file)) {
      toast.error("Formato de imagem inválido. Use JPEG, PNG ou WebP.");
      return;
    }
    
    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. O tamanho máximo é de 5MB.");
      return;
    }
    
    setThumbnailFile(file);
    
    // Criar URL para preview
    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  };
  
  // Gerar thumbnail do vídeo
  const generateThumbnail = () => {
    if (!videoPreviewRef.current || !videoPreviewUrl) return;
    
    const video = videoPreviewRef.current;
    
    // Pegar um frame do meio do vídeo
    video.currentTime = video.duration / 2;
    
    // Quando o vídeo buscar o tempo desejado
    video.onseeked = () => {
      // Criar um canvas do tamanho do vídeo
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Desenhar o frame atual no canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Converter para blob e depois para File
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const thumbnailFile = new File([blob], "thumbnail.jpg", {
          type: "image/jpeg",
        });
        
        setThumbnailFile(thumbnailFile);
        
        // Criar URL para preview
        const url = URL.createObjectURL(thumbnailFile);
        setThumbnailPreview(url);
        
        toast.success("Thumbnail gerada com sucesso!");
      }, "image/jpeg", 0.95);
    };
  };
  
  // Adicionar tag
  const addTag = () => {
    if (!currentTag.trim()) return;
    
    if (tagsList.length >= 10) {
      toast.error("Máximo de 10 tags permitido");
      return;
    }
    
    if (tagsList.includes(currentTag.trim())) {
      toast.error("Esta tag já foi adicionada");
      return;
    }
    
    setTagsList([...tagsList, currentTag.trim()]);
    setCurrentTag("");
  };
  
  // Remover tag
  const removeTag = (tag: string) => {
    setTagsList(tagsList.filter((t) => t !== tag));
  };
  
  // Manipular tecla Enter para adicionar tag
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };
  
  // Iniciar upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }
    
    if (!title.trim()) {
      toast.error("Digite um título para o vídeo");
      return;
    }
    
    if (!category) {
      toast.error("Selecione uma categoria");
      return;
    }
    
    setUploadStage("uploading");
    
    // Metadata para o vídeo
    const metadata = {
      title,
      description,
      category,
      tags: tagsList,
      language: "pt", // Padrão, poderia ser obtido do contexto de idioma
      thumbnail: thumbnailFile,
      privacy,
    };
    
    try {
      let success = false;
      
      if (uploadType === "short") {
        success = await handleShortUpload(selectedFile, metadata);
      } else {
        success = await handleVideoUpload(selectedFile, metadata);
      }
      
      if (success) {
        setUploadStage("complete");
      } else {
        setUploadStage("error");
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      setUploadStage("error");
    }
  };
  
  // Reset do formulário
  const resetForm = () => {
    setSelectedFile(null);
    setThumbnailFile(null);
    
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
    
    setTitle("");
    setDescription("");
    setCategory(CATEGORIES[0]);
    setPrivacy("public");
    setTagsList([]);
    setCurrentTag("");
    setUploadStage("select");
  };
  
  // Formatação da duração do vídeo
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6" />
            {t("Enviar vídeo")}
          </h1>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {uploadStage === "select" && "Selecione seu arquivo"}
                  {uploadStage === "details" && "Detalhes do vídeo"}
                  {uploadStage === "uploading" && "Enviando..."}
                  {uploadStage === "complete" && "Upload concluído!"}
                  {uploadStage === "error" && "Erro no upload"}
                </CardTitle>
                <CardDescription>
                  {uploadStage === "select" && "Arraste e solte um arquivo ou clique para selecionar"}
                  {uploadStage === "details" && "Preencha as informações sobre o vídeo"}
                  {uploadStage === "uploading" && "Seu vídeo está sendo processado"}
                  {uploadStage === "complete" && "Seu vídeo foi enviado com sucesso"}
                  {uploadStage === "error" && "Houve um erro durante o upload. Por favor, tente novamente."}
                </CardDescription>
              </div>
              
              <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as "video" | "short")} className="w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="video" className="flex items-center gap-2" disabled={uploadStage !== "select"}>
                    <FileVideo className="h-4 w-4" />
                    {t("Vídeo")}
                  </TabsTrigger>
                  <TabsTrigger value="short" className="flex items-center gap-2" disabled={uploadStage !== "select"}>
                    <Film className="h-4 w-4" />
                    {t("Short")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Etapa 1: Seleção de arquivo */}
            {uploadStage === "select" && (
              <div className="flex flex-col items-center">
                <div
                  className="border-dashed border-2 border-gray-300 rounded-lg p-12 w-full max-w-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <FileVideo className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="font-medium mb-2">
                    {uploadType === "video" ? "Selecione um vídeo para enviar" : "Selecione um short para enviar"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    {uploadType === "video"
                      ? "MP4, WebM ou outros formatos de vídeo (máximo 500MB)"
                      : "Vídeo curto vertical com até 60 segundos (máximo 500MB)"}
                  </p>
                  <Button>Selecionar arquivo</Button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Selecionar arquivo de vídeo"
                    title="Selecionar arquivo de vídeo"
                  />
                </div>
                
                <div className="mt-8">
                  <h3 className="font-medium mb-2">Limites de upload:</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>Duração: {uploadType === "video" ? "Sem limite" : "Até 60 segundos"}</li>
                    <li>Tamanho: Até 500MB</li>
                    <li>Formatos: MP4, WebM, MOV e outros</li>
                  </ul>
                </div>
              </div>
            )}
            
            {/* Etapa 2: Detalhes do vídeo */}
            {uploadStage === "details" && selectedFile && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
                {/* Coluna esquerda - Formulário */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título <span className="text-red-500">*</span></Label>
                    <Input
                      id="title"
                      placeholder="Adicione um título que descreva o vídeo"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                    />
                    <div className="text-xs text-right text-muted-foreground">
                      {title.length}/100
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Conte aos espectadores sobre o vídeo"
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={5000}
                    />
                    <div className="text-xs text-right text-muted-foreground">
                      {description.length}/5000
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria <span className="text-red-500">*</span></Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="privacy">Privacidade</Label>
                      <Select value={privacy} onValueChange={setPrivacy}>
                        <SelectTrigger id="privacy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIVACY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center">
                                {option.icon}
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tags"
                        placeholder="Adicione palavras-chave separadas por Enter"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                      />
                      <Button onClick={addTag} type="button" disabled={!currentTag.trim()}>
                        Adicionar
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Máximo de 10 tags
                    </div>
                    
                    {/* Tags adicionadas */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tagsList.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer">
                          {tag}
                          <X
                            className="h-3 w-3 ml-1"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">Thumbnail</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        Selecionar imagem
                      </Button>
                      <Button
                        variant="outline"
                        onClick={generateThumbnail}
                        disabled={!videoPreviewUrl}
                      >
                        Gerar do vídeo
                      </Button>
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                        aria-label="Selecionar imagem de miniatura"
                        title="Selecionar imagem de miniatura"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dimensões recomendadas: {uploadType === "short" ? "1080x1920" : "1280x720"} pixels. Formatos: JPG, PNG, WebP.
                    </p>
                  </div>
                </div>
                
                {/* Coluna direita - Preview */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Preview</h3>
                    
                    {/* Preview do vídeo */}
                    <div className="rounded-lg overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoPreviewRef}
                        src={videoPreviewUrl || undefined}
                        className="w-full h-full object-contain"
                        controls
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Nome do arquivo: {selectedFile.name}</span>
                      <span>{formatDuration(videoDuration)}</span>
                    </div>
                    
                    {/* Preview da thumbnail */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Thumbnail</h4>
                      {thumbnailPreview ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden">
                          <img
                            src={thumbnailPreview}
                            alt="Preview da thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-2 right-2 rounded-full"
                            onClick={() => {
                              if (thumbnailPreview) {
                                URL.revokeObjectURL(thumbnailPreview);
                              }
                              setThumbnailFile(null);
                              setThumbnailPreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center aspect-video bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Sem thumbnail selecionada
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Aviso de visibilidade */}
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
                    <div className="flex items-start gap-2">
                      <Shield className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">Visibilidade e verificação</h4>
                        <p className="text-sm text-muted-foreground">
                          {privacy === "public" 
                            ? "Este vídeo será visível para todos os usuários após o processamento." 
                            : privacy === "unlisted"
                            ? "Este vídeo só será visível para pessoas com o link."
                            : "Este vídeo será visível apenas para você."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Etapa 3: Upload em progresso */}
            {uploadStage === "uploading" && (
              <div className="flex flex-col items-center text-center py-8">
                <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      className="stroke-muted stroke-[4]"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                    />
                    <circle
                      className="stroke-primary stroke-[4]"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (1 - uploadProgress / 100)}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                
                <h3 className="text-lg font-medium mb-2">
                  {uploadProgress < 100 
                    ? "Enviando seu vídeo..." 
                    : "Processando seu vídeo..."}
                </h3>
                
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  {uploadProgress < 100
                    ? "Não feche esta janela até que o upload seja concluído."
                    : "Seu vídeo está sendo processado. Isso pode levar alguns minutos."}
                </p>
                
                <div className="flex gap-2">
                  <Button variant="outline" disabled={uploadProgress < 100}>
                    <Clock className="h-4 w-4 mr-2" /> Status do processamento
                  </Button>
                </div>
              </div>
            )}
            
            {/* Etapa 4: Upload concluído */}
            {uploadStage === "complete" && (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-10 w-10 text-green-600" />
                </div>
                
                <h3 className="text-lg font-medium mb-2">Upload concluído com sucesso!</h3>
                
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Seu {uploadType === "video" ? "vídeo" : "short"} foi enviado e ficará disponível assim que o processamento for concluído.
                </p>
                
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button onClick={() => navigate(uploadType === "video" ? "/videos" : "/shorts")}>
                    Ver meus {uploadType === "video" ? "vídeos" : "shorts"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Enviar outro
                  </Button>
                </div>
              </div>
            )}
            
            {/* Etapa 5: Erro no upload */}
            {uploadStage === "error" && (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>
                
                <h3 className="text-lg font-medium mb-2">Erro no upload</h3>
                
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Ocorreu um erro durante o upload do seu vídeo. Por favor, tente novamente.
                </p>
                
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetForm}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          
          {uploadStage === "details" && (
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setUploadStage("select")}>
                  Voltar
                </Button>
                <Button onClick={handleUpload} disabled={!title.trim() || !category}>
                  <UploadCloud className="h-4 w-4 mr-2" /> Enviar
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
        
        {/* Seção inferior: Requisitos e diretrizes */}
        {uploadStage === "select" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dicas para o upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dicas para o upload</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Video className="h-4 w-4 mt-1 text-blue-500" />
                    <span>Use vídeos de alta qualidade (720p ou 1080p)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-1 text-blue-500" />
                    <span>Mantenha shorts com duração entre 15 e 60 segundos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-1 text-blue-500" />
                    <span>Evite conteúdo protegido por direitos autorais</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Requisitos de hardware */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Requisitos técnicos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-1 text-green-500" />
                    <span>Formatos recomendados: MP4 (H.264)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-1 text-green-500" />
                    <span>Resolução: 1280x720 (HD) ou superior</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-1 text-green-500" />
                    <span>Taxa de quadros: 24, 30 ou 60 FPS</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Política de conteúdo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diretrizes de conteúdo</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-1 text-red-500" />
                    <span>Não é permitido conteúdo violento ou adulto explícito</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-1 text-red-500" />
                    <span>Evite conteúdo enganoso ou esquemas fraudulentos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-1 text-red-500" />
                    <span>Respeite as leis de direitos autorais e marcas registradas</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
} 
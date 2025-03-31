import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Eye, EyeOff, Volume1, Plus, Minus, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Estilos para animações
const animationStyles = `
  @keyframes fadeIn {
    from { 
      opacity: 0;
      transform: translateY(10px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeOut {
    from { 
      opacity: 1;
      transform: translateY(0);
    }
    to { 
      opacity: 0;
      transform: translateY(10px);
    }
  }
  
  @keyframes glowPulse {
    0% {
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    }
    50% {
      box-shadow: 0 0 25px rgba(255, 255, 255, 0.4);
    }
    100% {
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }

  .animate-fadeOut {
    animation: fadeOut 0.3s ease-out forwards;
  }

  .animate-glow {
    animation: glowPulse 2s infinite;
  }

  .animate-slideIn {
    animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .animate-slideOut {
    animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  /* Prefixos para compatibilidade cross-browser */
  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* Ordem correta para prefixos de fornecedor */
  .backdrop-blur {
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
`;

interface VideoPlayerProps {
  videoKey: "video.main" | "video.instructions";
  posterKey?: "video.poster.main" | "video.poster.instructions";
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  size?: "small" | "normal";
  canHide?: boolean;
  allowDetails?: boolean;
}

export function VideoPlayer({
  videoKey,
  posterKey,
  className = "",
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  size = "normal",
  canHide = false,
  allowDetails = false,
}: VideoPlayerProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState(50);
  const [lastVolume, setLastVolume] = useState(50); // Guardar último volume usado
  const [isHidden, setIsHidden] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [showVolumeBar, setShowVolumeBar] = useState(false); // Controlar visibilidade da barra
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const volumeTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer para ocultar barra de volume
  const volumeButtonRef = useRef<HTMLButtonElement>(null);

  // Obtém o caminho do vídeo e do poster baseado no idioma atual
  const src = t(videoKey);
  // Só usa poster se for fornecido e não for o vídeo do dashboard
  const poster = posterKey && videoKey !== "video.main" ? t(posterKey) : undefined;

  // Verificar se é o vídeo do dashboard para usar layout diferente
  const isDashboardVideo = videoKey === "video.main";

  // Função para tentar reproduzir o vídeo com várias tentativas
  const attemptPlayVideo = async (video: HTMLVideoElement, maxAttempts = 5) => {
    let attempts = 0;
    
    const tryPlay = async () => {
      try {
        setHasError(false);
        await video.play();
        console.log(`Vídeo ${videoKey} iniciado com sucesso após ${attempts + 1} tentativas`);
        setIsPlaying(true);
        return true;
      } catch (err) {
        attempts++;
        console.error(`Tentativa ${attempts} - Erro ao reproduzir vídeo ${videoKey}:`, err);
        
        if (attempts < maxAttempts) {
          console.log(`Tentando novamente em ${attempts * 500}ms...`);
          return new Promise<boolean>(resolve => {
            setTimeout(async () => {
              const result = await tryPlay();
              resolve(result);
            }, attempts * 500);
          });
        } else {
          console.error(`Falha após ${maxAttempts} tentativas para reproduzir o vídeo ${videoKey}`);
          setHasError(true);
          return false;
        }
      }
    };
    
    return tryPlay();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      setDuration(video.duration);
      console.log(`Duração do vídeo ${videoKey} carregada:`, video.duration);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadStart = () => {
      console.log(`Iniciando carregamento do vídeo ${videoKey}`);
      setIsLoading(true);
    };
    const handleCanPlay = () => {
      console.log(`Vídeo ${videoKey} pode ser reproduzido agora`);
      setIsLoading(false);
      
      // Iniciar a reprodução automática apenas na montagem inicial
      // e não quando o volume é alterado
      if (autoPlay && videoKey === "video.main" && !video.hasAttribute("data-autoplay-handled")) {
        video.setAttribute("data-autoplay-handled", "true");
        attemptPlayVideo(video);
      }
    };
    const handleError = (e: Event) => {
      console.error(`Erro ao carregar o vídeo ${videoKey}:`, video.error);
      setHasError(true);
      setIsLoading(false);
    };
    const handleFullscreenChange = () => {
      const isNowFullScreen = document.fullscreenElement === playerRef.current;
      setIsFullScreen(isNowFullScreen);
      
      // Se saiu da tela cheia (detecta quando o usuário pressiona ESC)
      if (!isNowFullScreen && videoRef.current) {
        console.log('Saindo da tela cheia via evento (possivelmente tecla ESC)');
        
        // Restaurar para o formato original
        if (videoRef.current) {
          // Limpar todos os estilos inline
          videoRef.current.style.objectFit = '';
          videoRef.current.style.width = '';
          videoRef.current.style.height = '';
          
          // Remover classes adicionadas
          videoRef.current.classList.remove('absolute', 'inset-0');
          
          // Para vídeos do dashboard, garantir as classes corretas
          if (isDashboardVideo) {
            videoRef.current.className = 'w-full h-96 object-cover';
          } else {
            videoRef.current.className = 'w-full h-full object-contain';
          }
          
          console.log('Restaurando para o formato original do aplicativo');
        }
        
        // Restaurar o estilo do container
        if (playerRef.current) {
          playerRef.current.style.backgroundColor = '';
        }
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [videoKey, autoPlay]);

  // Reset do vídeo quando o src muda (idioma mudou)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Redefine o tempo atual
    setCurrentTime(0);
    video.currentTime = 0;
    setIsLoading(true);
    setHasError(false);
    
    // Quando src muda, queremos ter certeza que o vídeo será carregado novamente
    video.load();
    
    // Se estava reproduzindo, continua reproduzindo após a mudança de src
    if (isPlaying) {
      attemptPlayVideo(video);
    }
  }, [src, isPlaying]);

  // Efeito para controlar o comportamento de reprodução e volume do vídeo
  useEffect(() => {
    // Define o volume inicial e aplica ao vídeo
    const video = videoRef.current;
    if (!video) return;
    
    // Aplicar volume sem alterar o estado de reprodução
    video.volume = volume / 100;
    
    // Inicia o vídeo automaticamente em loop silencioso se for o vídeo principal
    // Apenas na primeira vez (montagem do componente)
    if (videoKey === "video.main" && autoPlay && !video.hasAttribute("data-initialized")) {
      video.loop = true;
      video.muted = true;
      video.setAttribute("data-initialized", "true");
      
      // Tentar reproduzir imediatamente e garantir que comece a reproduzir
      if (video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
        attemptPlayVideo(video);
      }
    }
  }, [videoKey, autoPlay]); // Removido volume da dependência para evitar reprodução ao alterar volume

  // Efeito separado para controlar apenas o volume
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Aplicar apenas o volume sem alterar reprodução
    video.volume = volume / 100;
  }, [volume]);

  // Adicionar manipulador para carregar o vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoKey !== "video.main") return;
    
    const handleLoadedData = () => {
      setIsLoading(false);
      console.log(`Vídeo ${videoKey} carregado completamente`);
      
      // Só inicia a reprodução automática se não estiver pausado e for a primeira vez
      if (autoPlay && !video.paused && !video.hasAttribute("data-autoplay-handled")) {
        video.setAttribute("data-autoplay-handled", "true");
        attemptPlayVideo(video);
      }
    };
    
    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [autoPlay, videoKey]);

  // Controle de volume inspirado no YouTube/Spotify
  const handleVolumeChange = (e: React.MouseEvent | MouseEvent) => {
    if (!volumeBarRef.current || !videoRef.current) return;
    
    // Impedir que o evento propague e cause comportamentos indesejados
    e.preventDefault();
    e.stopPropagation();
    
    // Obter posição relativa do clique na barra
    const rect = volumeBarRef.current.getBoundingClientRect();
    // Posição invertida (0 é embaixo, 100 é em cima)
    const clickPosition = (rect.bottom - e.clientY) / rect.height;
    // Limitar entre 0 e 1
    const volumeRatio = Math.max(0, Math.min(1, clickPosition));
    // Converter para porcentagem
    const newVolume = Math.round(volumeRatio * 100);
    
    console.log(`Ajustando volume para: ${newVolume}%`);
    
    // Atualizar o volume do vídeo diretamente sem afetar a reprodução
    if (videoRef.current) {
      // Salvar o estado de reprodução atual
      const wasPlaying = !videoRef.current.paused;
      
      // Ajustar volume sem afetar a reprodução
      videoRef.current.volume = volumeRatio;
      
      // Gerenciar o estado mudo sem afetar a reprodução
      if (newVolume === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else if (isMuted && newVolume > 0) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
      
      // Garantir que o estado de reprodução seja mantido
      if (wasPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {
          // Ignorar erros de reprodução aqui para não interromper o ajuste de volume
          console.log("Não foi possível manter a reprodução durante o ajuste de volume");
        });
      }
    }
    
    // Atualizar o estado para refletir a UI
    setVolume(newVolume);
    
    // Guardar o último volume não-zero
    if (newVolume > 0) {
      setLastVolume(newVolume);
    }
  };
  
  // Iniciar o arrasto do controle de volume
  const startVolumeSliderDrag = (e: React.MouseEvent) => {
    if (!volumeBarRef.current || !videoRef.current) return;
    
    // Impedir que o evento propague e pause o vídeo
    e.preventDefault();
    e.stopPropagation();
    
    // Aplicar o volume no clique inicial
    handleVolumeChange(e);
    setIsDraggingVolume(true);
    
    // Limpar qualquer timer existente durante o arrasto
    if (volumeTimerRef.current) {
      clearTimeout(volumeTimerRef.current);
      volumeTimerRef.current = null;
    }
    
    // Função para lidar com movimento do mouse durante o arrasto
    const handleDragMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      handleVolumeChange(moveEvent);
      
      // Limpar qualquer timer durante o movimento
      if (volumeTimerRef.current) {
        clearTimeout(volumeTimerRef.current);
        volumeTimerRef.current = null;
      }
    };
    
    // Função para finalizar o arrasto
    const handleDragEnd = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      upEvent.stopPropagation();
      setIsDraggingVolume(false);
      
      // Remover os listeners
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      
      // Iniciar o timer apenas após soltar o mouse
      volumeTimerRef.current = setTimeout(() => {
        setShowVolumeBar(false);
      }, 2000);
    };
    
    // Adicionar os listeners ao documento
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  // Toggle play/pause sem afetar o volume
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const video = videoRef.current;
    if (!video) return;

    console.log(`Tentando ${isPlaying ? 'pausar' : 'reproduzir'} o vídeo`);

    if (isPlaying) {
      // Pausar o vídeo e garantir que o estado seja atualizado
      video.pause();
      video.loop = false; // Desativa o loop quando pausado
      setIsPlaying(false);
      console.log('Vídeo pausado manualmente');
    } else {
      // Reproduzir o vídeo a partir do ponto atual
      video.loop = true; // Reativa o loop quando reproduzindo
      video.play().then(() => {
        setIsPlaying(true);
        console.log('Vídeo reproduzido com sucesso');
      }).catch(err => {
        console.error("Erro ao reproduzir o vídeo:", err);
        attemptPlayVideo(video);
      });
    }
  };

  // Mostrar a barra de volume ao passar o mouse sobre o botão de volume
  const handleVolumeHover = () => {
    if (!isMuted) {
      setShowVolumeBar(true);
      // Limpar qualquer timer existente ao passar o mouse
      if (volumeTimerRef.current) {
        clearTimeout(volumeTimerRef.current);
        volumeTimerRef.current = null;
      }
    }
  };
  
  // Iniciar o timer para esconder a barra quando o mouse sair
  const handleVolumeLeave = () => {
    // Só iniciar o timer se não estiver arrastando
    if (!isDraggingVolume) {
      volumeTimerRef.current = setTimeout(() => {
        setShowVolumeBar(false);
      }, 2000);
    }
  };
  
  // Limpar o timer quando o usuário interage com a barra de volume
  const handleVolumeInteraction = () => {
    // Limpar qualquer timer existente
    if (volumeTimerRef.current) {
      clearTimeout(volumeTimerRef.current);
      volumeTimerRef.current = null;
    }
  };

  const changeVolume = (amount: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newVolume = Math.max(0, Math.min(100, volume + amount));
    setVolume(newVolume);
    video.volume = newVolume / 100;
    
    // Se o volume estiver em 0, mute o vídeo
    if (newVolume === 0 && !isMuted) {
      setIsMuted(true);
      video.muted = true;
    } 
    // Se o volume estiver acima de 0 e estiver mutado, desmute
    else if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      video.muted = false;
    }
  };

  // Toggle Mute com preservação de volume e do estado de reprodução
  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const video = videoRef.current;
    if (!video) return;
    
    // Salvar o estado de reprodução
    const wasPlaying = !video.paused;

    if (isMuted) {
      // Ativar o som com o último volume usado (garantir valor mínimo)
      const volumeToSet = Math.max(lastVolume, 10);
      video.muted = false;
      video.volume = volumeToSet / 100;
      setVolume(volumeToSet);
      setIsMuted(false);
      setShowVolumeBar(true); // Mostrar a barra de volume ao ativar o som
    } else {
      // Guardar o volume atual antes de mutar
      if (volume > 0) {
        setLastVolume(volume);
      }
      video.muted = true;
      setIsMuted(true);
      setShowVolumeBar(false); // Esconder a barra de volume ao mutar
    }
    
    // Restaurar o estado de reprodução se necessário
    if (wasPlaying && video.paused) {
      video.play().catch(() => {
        console.log("Não foi possível restaurar a reprodução após mutar/desmutar");
      });
    }
  };

  // Alternar a visibilidade da barra de volume
  const toggleVolumeBar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isMuted) {
      // Se estiver mudo, ativar o som ao clicar no ícone
      toggleMute();
    } else {
      // Se tiver som, mutar ao clicar no ícone
      toggleMute();
    }
  };

  // Alternar para o modo de tela cheia com estilo de exibição adaptado
  const toggleFullScreen = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!playerRef.current) return;

    console.log(`Tentando ${isFullScreen ? 'sair de' : 'entrar em'} tela cheia`);

    if (!isFullScreen) {
      if (playerRef.current.requestFullscreen) {
        playerRef.current.requestFullscreen()
          .then(() => {
            // Quando entra em tela cheia, ajusta para exibição completa
            if (videoRef.current) {
              // Alterar para conter (não cortar) em tela cheia
              videoRef.current.style.objectFit = 'contain';
              videoRef.current.style.width = '100%';
              videoRef.current.style.height = '100%';
              videoRef.current.classList.add('absolute', 'inset-0');
              
              console.log('Entrando em tela cheia com objectFit: contain e dimensões 100%');
            }
            
            // Ajustar o container também
            if (playerRef.current) {
              playerRef.current.style.backgroundColor = 'black';
            }
            
            // Adicionar o botão de saída da tela cheia no canto inferior direito
            const exitButton = document.createElement('button');
            exitButton.id = 'exit-fullscreen-button';
            exitButton.className = 'absolute bottom-6 right-6 p-2 rounded-md bg-black/60 hover:bg-black/80 transition-colors transform hover:scale-110 transition-transform duration-200 z-50';
            exitButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path></svg>';
            exitButton.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              document.exitFullscreen();
            };
            
            // Remover se já existir
            const existingButton = document.getElementById('exit-fullscreen-button');
            if (existingButton) {
              existingButton.remove();
            }
            
            playerRef.current.appendChild(exitButton);
          })
          .catch(err => {
            console.error("Erro ao entrar em tela cheia:", err);
          });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => {
            // Ao sair de tela cheia, restaura o formato original
            if (videoRef.current) {
              // Limpar todos os estilos inline
              videoRef.current.style.objectFit = '';
              videoRef.current.style.width = '';
              videoRef.current.style.height = '';
              
              // Remover classes adicionadas
              videoRef.current.classList.remove('absolute', 'inset-0');
              
              // Para vídeos do dashboard, garantir as classes corretas
              if (isDashboardVideo) {
                videoRef.current.className = 'w-full h-96 object-cover';
              } else {
                videoRef.current.className = 'w-full h-full object-contain';
              }
              
              console.log('Saindo de tela cheia e restaurando para o formato original do aplicativo');
            }
            
            // Restaurar o estilo do container
            if (playerRef.current) {
              playerRef.current.style.backgroundColor = '';
            }
            
            // Remover o botão de saída
            const exitButton = document.getElementById('exit-fullscreen-button');
            if (exitButton) {
              exitButton.remove();
            }
          })
          .catch(err => {
            console.error("Erro ao sair de tela cheia:", err);
          });
      }
    }
  };

  // Adicionar um ouvinte para o evento fullscreenchange para garantir que o botão seja removido
  useEffect(() => {
    const handleFullScreenChange = () => {
      // Se saiu da tela cheia, remover o botão
      if (!document.fullscreenElement) {
        const exitButton = document.getElementById('exit-fullscreen-button');
        if (exitButton) {
          exitButton.remove();
        }
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  const toggleHideVideo = () => {
    setIsHidden(!isHidden);
    
    // Quando mostrar o vídeo novamente, não deve mostrar o indicador de carregamento
    if (isHidden) {
      setIsLoading(false);
      
      // Se o vídeo já estava carregado anteriormente, manter seu estado
      const video = videoRef.current;
      if (video && isPlaying && video.paused) {
        // Tentar reproduzir o vídeo se estava reproduzindo antes
        video.play().catch(() => {
          console.log("Não foi possível reproduzir o vídeo ao mostrar novamente");
        });
      }
    }
  };

  const handleVideoClick = () => {
    if (allowDetails) {
      setShowDialog(true);
    }
  };

  const goToInstructions = () => {
    setShowDialog(false);
    navigate('/instructions');
  };
  
  const reloadVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Não mostrar o indicador de carregamento
    setIsLoading(false);
    setHasError(false);
    
    // Recarregar o vídeo
    video.load();
    
    // Tentar reproduzir novamente
    if (autoPlay || isPlaying) {
      attemptPlayVideo(video);
    }
  };

  // Se o vídeo estiver oculto, mostrar apenas um botão para revelar
  if (isHidden && canHide) {
    return (
      <div className="flex justify-end w-full">
        <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleHideVideo}
          className="border-white/10 bg-black/40 backdrop-blur-md hover:bg-white/10 flex items-center gap-2 transform hover:scale-105 transition duration-200"
        >
          <Eye className="h-3.5 w-3.5 opacity-80" /> Mostrar Vídeo
        </Button>
      </div>
    );
  }

  // Layout especial para o vídeo do dashboard
  if (isDashboardVideo && controls) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
        <div className="flex items-start gap-3">
          {/* Controles laterais à esquerda */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePlay(e);
              }}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors transform hover:scale-110 transition-transform duration-200"
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
            
            <button
              ref={volumeButtonRef}
              onClick={toggleVolumeBar}
              onMouseEnter={handleVolumeHover}
              onMouseLeave={handleVolumeLeave}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors transform hover:scale-110 transition-transform duration-200 relative"
              aria-label={isMuted ? "Ativar som" : "Desativar som"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white animate-pulse" />
              ) : volume < 50 ? (
                <Volume1 className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
              
              {/* A barra de volume aparece abaixo do botão apenas quando não está mudo */}
              {showVolumeBar && !isMuted && (
                <div 
                  className="absolute inset-x-0 top-full mt-2 flex flex-col items-center bg-black/60 backdrop-blur-md p-3 rounded-xl animate-slideIn z-50 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5"
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={handleVolumeInteraction}
                  onMouseLeave={handleVolumeLeave}
                >
                  <div 
                    ref={volumeBarRef}
                    className="h-24 w-2 bg-zinc-900/20 rounded-full mb-2 relative cursor-pointer group"
                    onClick={(e) => {
                      handleVolumeChange(e);
                      handleVolumeInteraction();
                    }}
                    onMouseDown={(e) => {
                      startVolumeSliderDrag(e);
                      handleVolumeInteraction();
                    }}
                  >
                    {/* Barra de volume com gradiente suave */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        height: `${volume}%`,
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.2))',
                        boxShadow: '0 0 10px rgba(255,255,255,0.1)'
                      }}
                    ></div>
                    
                    {/* Controle deslizante minimalista */}
                    <div 
                      className="absolute w-4 h-4 left-1/2 -translate-x-1/2 bg-white rounded-full transform -translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-300 ease-out group-hover:scale-110"
                      style={{ bottom: `${volume}%` }}
                    >
                      <div className="absolute inset-0 rounded-full border border-white/40"></div>
                    </div>
                  </div>
                  
                  {/* Indicador de volume minimalista */}
                  <div 
                    className="text-xs font-medium tracking-wider transition-all duration-300 ease-out"
                    style={{
                      color: 'rgba(255,255,255,0.8)',
                      textShadow: '0 0 5px rgba(255,255,255,0.2)'
                    }}
                  >
                    {volume}%
                  </div>
                </div>
              )}
            </button>
          </div>
          
          {/* Player de vídeo */}
          <div 
            ref={playerRef}
            className="relative w-full overflow-hidden bg-black/90 rounded-lg flex-1"
          >
            <div 
              className="relative w-full h-full cursor-pointer" 
              onClick={handleVideoClick}
            >
              {isLoading && !videoRef.current?.hasAttribute("data-reloading") && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="flex flex-col items-center">
                    <RefreshCw className="h-8 w-8 text-white animate-spin mb-2" />
                    <span className="text-white text-sm">Carregando vídeo...</span>
                  </div>
                </div>
              )}
              
              {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                  <div className="flex flex-col items-center">
                    <Button 
                      variant="outline" 
                      onClick={reloadVideo}
                      className="border-white/20 bg-black/50 text-white hover:bg-white/10 flex items-center gap-2 mb-2"
                    >
                      <RefreshCw className="h-4 w-4" /> Tentar Novamente
                    </Button>
                    <span className="text-white/70 text-sm text-center max-w-xs">
                      Não foi possível carregar o vídeo. Verifique se o arquivo existe no caminho correto.
                    </span>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                src={src}
                poster={poster}
                autoPlay={autoPlay}
                muted={muted}
                loop={loop}
                className="w-full h-96 object-cover"
                playsInline
                onClick={(e) => e.stopPropagation()}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          </div>
          
          {/* Controles laterais à direita */}
          <div className="flex flex-col gap-2 pt-2">
            {canHide && (
              <button
                onClick={toggleHideVideo}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors transform hover:scale-110 transition-transform duration-200"
                aria-label="Ocultar vídeo"
              >
                <EyeOff className="w-5 h-5 text-white" />
              </button>
            )}
            
            <button
              onClick={toggleFullScreen}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors transform hover:scale-110 transition-transform duration-200"
              aria-label={isFullScreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
            >
              {isFullScreen ? (
                <Minimize className="w-5 h-5 text-white" />
              ) : (
                <Maximize className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
        
        {/* Diálogo para confirmação de ir para página de instruções */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-black/90 border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Ver vídeo em detalhes?</DialogTitle>
              <DialogDescription className="text-white/70">
                Gostaria de ver o vídeo com mais detalhes na seção de instruções?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDialog(false)}
                className="border-white/10 bg-black/40 hover:bg-white/10"
              >
                Não
              </Button>
              <Button 
                onClick={goToInstructions}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                Sim, ver detalhes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Layout padrão para outros vídeos
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div 
        ref={playerRef}
        className={`relative ${size === "small" ? "w-full max-w-md mx-auto h-40" : "w-full"} overflow-hidden bg-black/90 rounded-lg ${className}`}
      >
        <div 
          className="relative w-full h-full cursor-pointer" 
          onClick={handleVideoClick}
        >
          {isLoading && !videoRef.current?.hasAttribute("data-reloading") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 text-white animate-spin mb-2" />
                <span className="text-white text-sm">Carregando vídeo...</span>
              </div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
              <div className="flex flex-col items-center">
                <Button 
                  variant="outline" 
                  onClick={reloadVideo}
                  className="border-white/20 bg-black/50 text-white hover:bg-white/10 flex items-center gap-2 mb-2"
                >
                  <RefreshCw className="h-4 w-4" /> Tentar Novamente
                </Button>
                <span className="text-white/70 text-sm text-center max-w-xs">
                  Não foi possível carregar o vídeo. Verifique se o arquivo existe no caminho correto.
                </span>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            autoPlay={autoPlay}
            muted={muted}
            loop={loop}
            className="w-full h-full object-contain"
            playsInline
            onClick={(e) => e.stopPropagation()}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
        
        {controls && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent z-20">
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/20 rounded-full outline-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay(e);
                    }}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 text-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white" />
                    )}
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVolumeBar(e);
                      }}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label={isMuted ? "Ativar som" : "Ajustar volume"}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : volume < 50 ? (
                        <Volume1 className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                    
                    {!isMuted && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            changeVolume(-10);
                          }}
                          className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            changeVolume(10);
                          }}
                          className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  <span className="text-xs text-white/70">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={reloadVideo}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Recarregar vídeo"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                  </button>
                  
                  {canHide && (
                    <button
                      onClick={toggleHideVideo}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Ocultar vídeo"
                    >
                      <EyeOff className="w-4 h-4 text-white" />
                    </button>
                  )}
                  
                  <button
                    onClick={toggleFullScreen}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label={isFullScreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
                  >
                    {isFullScreen ? (
                      <Minimize className="w-4 h-4 text-white" />
                    ) : (
                      <Maximize className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Diálogo para confirmação de ir para página de instruções */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-black/90 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Ver vídeo em detalhes?</DialogTitle>
            <DialogDescription className="text-white/70">
              Gostaria de ver o vídeo com mais detalhes na seção de instruções?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              className="border-white/10 bg-black/40 hover:bg-white/10"
            >
              Não
            </Button>
            <Button 
              onClick={goToInstructions}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              Sim, ver detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 
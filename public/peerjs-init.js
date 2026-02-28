// Script para inicializar corretamente a transmissão WebRTC
(function() {
  // Verificar status da transmissão a cada 2 segundos
  window.checkStreamStatus = function(streamId) {
    console.log('Verificando status da transmissão:', streamId);
    
    // Se estivermos na página de transmissão
    if (window.location.pathname.includes('/live/') || 
        window.location.pathname.includes('/stream/')) {
      
      const videoElement = document.querySelector('video');
      if (!videoElement) {
        console.warn('Elemento de vídeo não encontrado');
        return;
      }
      
      // Se o modo streamer estiver ativado
      if (window.location.search.includes('mode=streamer')) {
        console.log('Modo streamer detectado, iniciando transmissão');
        
        // Tentar conectar ao servidor PeerJS diretamente
        if (!window.publisherPeer) {
          const peerId = `publisher-${streamId}`;
          
          try {
            window.publisherPeer = new Peer(peerId, {
              host: '0.peerjs.com',
              secure: true,
              port: 443,
              debug: 3,
              config: {
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:stun2.l.google.com:19302' },
                  { urls: 'turn:0.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' }
                ]
              }
            });
            
            console.log('Peer criado:', peerId);
            
            window.publisherPeer.on('open', async (id) => {
              console.log('Conexão PeerJS aberta com ID:', id);
              
              // Obter mídia local
              try {
                const stream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                  },
                  audio: true
                });
                
                console.log('Mídia local obtida:', stream.id);
                window.localStream = stream;
                
                if (videoElement) {
                  videoElement.srcObject = stream;
                  videoElement.play().catch(e => console.error('Erro ao reproduzir vídeo:', e));
                }
                
                // Configurar evento para responder chamadas
                window.publisherPeer.on('call', (call) => {
                  console.log('Recebendo chamada de:', call.peer);
                  call.answer(stream);
                });
                
              } catch (err) {
                console.error('Erro ao obter mídia:', err);
              }
            });
            
            window.publisherPeer.on('error', (err) => {
              console.error('Erro no PeerJS:', err);
            });
          } catch (err) {
            console.error('Erro ao criar Peer:', err);
          }
        }
      } else {
        // Modo espectador
        console.log('Modo espectador detectado, tentando conectar');
        
        if (!window.viewerPeer) {
          const viewerId = `viewer-${Date.now()}`;
          const publisherId = `publisher-${streamId}`;
          
          try {
            window.viewerPeer = new Peer(viewerId, {
              host: '0.peerjs.com',
              secure: true,
              port: 443,
              debug: 3,
              config: {
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:stun2.l.google.com:19302' },
                  { urls: 'turn:0.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' }
                ]
              }
            });
            
            window.viewerPeer.on('open', (id) => {
              console.log('Conexão PeerJS do espectador aberta com ID:', id);
              console.log('Tentando conectar ao streamer:', publisherId);
              
              // Chamar o publisher
              const call = window.viewerPeer.call(publisherId, null);
              
              call.on('stream', (remoteStream) => {
                console.log('Stream remota recebida:', remoteStream.id);
                
                if (videoElement) {
                  videoElement.srcObject = remoteStream;
                  videoElement.play().catch(e => console.error('Erro ao reproduzir vídeo:', e));
                }
              });
              
              call.on('error', (err) => {
                console.error('Erro na chamada:', err);
              });
            });
            
            window.viewerPeer.on('error', (err) => {
              console.error('Erro no PeerJS do espectador:', err);
            });
          } catch (err) {
            console.error('Erro ao criar Peer do espectador:', err);
          }
        }
      }
    }
  };
  
  // Iniciar verificação automática
  setInterval(() => {
    const path = window.location.pathname;
    const streamId = path.split('/').pop();
    
    if (streamId && (path.includes('/live/') || path.includes('/stream/'))) {
      window.checkStreamStatus(streamId);
    }
  }, 2000);
})(); 
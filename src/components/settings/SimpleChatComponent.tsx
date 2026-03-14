import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from "framer-motion";
import { ArrowUp, MessageSquare, ArrowDownCircle, Send, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Interface para mensagem do chat
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'support';
  timestamp: Date;
}

// Interface para a referência exposta
export interface ChatComponentRef {
  processPresetQuestion: (question: string) => void;
}

// Componente SimpleChatComponent
const SimpleChatComponent = forwardRef<ChatComponentRef, { darkTheme?: boolean }>((props, ref) => {
  const auth = useAuth();
  const { language, t, tObj } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Referências para elementos DOM
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Textos traduzidos para as mensagens de boas-vindas
  const welcomeMessages = {
    pt: (name: string) => `Olá${name ? `, ${name}` : ''}, seja bem-vindo ao suporte da Trending. Como posso ajudar você hoje?`,
    en: (name: string) => `Hello${name ? `, ${name}` : ''}, welcome to Trending support. How can I help you today?`,
    es: (name: string) => `Hola${name ? `, ${name}` : ''}, bienvenido al soporte de Trending. ¿Cómo puedo ayudarte hoy?`
  };

  // Textos traduzidos para os elementos da interface
  const chatTexts = {
    pt: {
      header: 'Suporte',
      subtitle: 'Assistente virtual pronto para esclarecer suas dúvidas',
      inputPlaceholder: 'Digite sua mensagem...',
      scrollTooltip: 'Rolar para novas mensagens'
    },
    en: {
      header: 'Support',
      subtitle: 'Virtual assistant ready to help with your questions',
      inputPlaceholder: 'Type your message...',
      scrollTooltip: 'Scroll to new messages'
    },
    es: {
      header: 'Soporte',
      subtitle: 'Asistente virtual listo para aclarar tus dudas',
      inputPlaceholder: 'Escribe tu mensaje...',
      scrollTooltip: 'Desplazarse a nuevos mensajes'
    }
  };

  // Obter textos para o idioma atual
  const currentTexts = chatTexts[language as keyof typeof chatTexts] || chatTexts.pt;

  // Callback para obter o elemento viewport do ScrollArea
  const setScrollViewportRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      scrollViewportRef.current = node.querySelector('div[data-radix-scroll-area-viewport]') as HTMLDivElement;
    }
  }, []);

  // Mensagem de boas-vindas ao iniciar o chat
  useEffect(() => {
    // Verificar primeiro no localStorage que é a fonte mais confiável
    const localStorageName = localStorage.getItem("user-name");
    
    // Usar o nome do localStorage se estiver disponível, caso contrário, usar o nome dos metadados
    const userName = localStorageName || 
                     (auth.user?.user_metadata?.display_name as string) || 
                     (auth.user?.user_metadata?.full_name as string) || 
                     auth.user?.email?.split('@')[0] || 
                     '';
    
    // Log para depuração - verificar o valor exato que está sendo usado
    console.log("SimpleChatComponent - Nome exibido:", userName);
    console.log("SimpleChatComponent - Tamanho do nome:", userName.length);
    console.log("SimpleChatComponent - Nome como JSON:", JSON.stringify(userName));
    console.log("SimpleChatComponent - user_metadata:", auth.user?.user_metadata);
    
    // Selecionar a mensagem de boas-vindas no idioma correto
    const welcomeMessageFn = welcomeMessages[language as keyof typeof welcomeMessages] || welcomeMessages.pt;
    
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      content: welcomeMessageFn(userName),
      sender: 'support',
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    
    // Garantir scroll inicial após renderização completa
    setTimeout(scrollToBottom, 300);
  }, [auth.user, language]);

  // Efeito para escutar mudanças no nome do usuário
  useEffect(() => {
    // Função para atualizar a mensagem de boas-vindas quando o nome do usuário é alterado
    const handleUsernameUpdated = (event: Event) => {
      const { userName, originalLength } = (event as CustomEvent).detail;
      console.log("SimpleChatComponent - Nome atualizado recebido:", userName);
      console.log("SimpleChatComponent - Tamanho original:", originalLength);
      console.log("SimpleChatComponent - Tamanho recebido:", userName?.length);
      
      if (userName && messages.length > 0) {
        // Verificar se o nome recebido não perdeu caracteres
        if (originalLength && userName.length !== originalLength) {
          console.warn(`SimpleChatComponent - ALERTA: Possível truncamento! Original: ${originalLength}, Recebido: ${userName.length}`);
          
          // Tentar recuperar do localStorage que deve ter o valor correto
          const fallbackName = localStorage.getItem("user-name");
          if (fallbackName && fallbackName.length === originalLength) {
            console.log("SimpleChatComponent - Usando nome do localStorage como fallback:", fallbackName);
            
            // Selecionar a mensagem de boas-vindas no idioma correto
            const welcomeMessageFn = welcomeMessages[language as keyof typeof welcomeMessages] || welcomeMessages.pt;
            
            // Atualizar apenas a primeira mensagem (boas-vindas)
            const updatedWelcomeMessage: ChatMessage = {
              ...messages[0],
              content: welcomeMessageFn(fallbackName),
              timestamp: new Date()
            };
            
            setMessages(prev => [updatedWelcomeMessage, ...prev.slice(1)]);
            return;
          }
        }
        
        // Forçar a atualização do auth.user para garantir que temos os dados mais recentes
        auth.refreshUserProfile?.();
        
        // Selecionar a mensagem de boas-vindas no idioma correto
        const welcomeMessageFn = welcomeMessages[language as keyof typeof welcomeMessages] || welcomeMessages.pt;
        
        // Atualizar apenas a primeira mensagem (boas-vindas)
        const updatedWelcomeMessage: ChatMessage = {
          ...messages[0],
          content: welcomeMessageFn(userName),
          timestamp: new Date()
        };
        
        setMessages(prev => [updatedWelcomeMessage, ...prev.slice(1)]);
      }
    };
    
    // Adicionar listener para o evento de atualização de nome
    window.addEventListener('username-updated', handleUsernameUpdated);
    
    // Limpar o listener ao desmontar
    return () => {
      window.removeEventListener('username-updated', handleUsernameUpdated);
    };
  }, [messages, auth, language]);

  // Função para verificar posição do scroll
  const checkScrollPosition = () => {
    if (!scrollViewportRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Mostrar botão apenas quando não estiver próximo do final
    setShowScrollButton(distanceFromBottom > 80);
  };

  // Função para rolar para o final do chat
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      
      // Fallback direto para o scrollTop
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
      }
      
      setShowScrollButton(false);
    }
  };

  // Monitorar scroll do usuário
  useEffect(() => {
    const container = scrollViewportRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, []);

  // Reagir a novas mensagens
  useEffect(() => {
    if (messages.length > 0) {
      // Se o botão de scroll não estiver visível, rolar automaticamente
      if (!showScrollButton) {
        scrollToBottom();
      }
    }
  }, [messages, showScrollButton]);

  // Ajustar altura do input ao redimensionar janela
  useEffect(() => {
    const handleResize = () => {
      if (inputRef.current) {
        // Ajustar altura dinamicamente se necessário
        inputRef.current.style.height = 'auto';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Expor função para perguntas pré-definidas
  useImperativeHandle(ref, () => ({
    processPresetQuestion: (question: string) => {
      processPresetQuestion(question);
    }
  }));

  // Enviar mensagem do usuário
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simular resposta do suporte após breve delay
    setTimeout(() => {
      // Simular resposta do suporte
      const supportMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Obrigado por sua mensagem! Nosso time está analisando sua pergunta sobre "${newMessage}" e responderá em breve.`,
        sender: 'support',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, supportMessage]);
      setIsTyping(false);
    }, 1500);
  };

  // Tecla Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Processar pergunta pré-definida
  const processPresetQuestion = (question: string) => {
    if (!question.trim()) return;
    
    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: question,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simular resposta do suporte após breve delay
    setTimeout(() => {
      // Simular resposta do suporte
      const supportMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Esta é uma resposta automática para sua pergunta: "${question}". Nossa equipe está trabalhando para fornecer informações precisas sobre este tema e responderá em breve.`,
        sender: 'support',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, supportMessage]);
      setIsTyping(false);
    }, 1000);
  };

  // Formatar a hora da mensagem
  const formatMessageTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es' : 'en', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Área de mensagens */}
      <ScrollArea 
        className="flex-1" 
        ref={setScrollViewportRef}
      >
        <div 
          className="flex flex-col p-4 gap-4" 
          ref={chatContainerRef}
        >
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`flex gap-2 max-w-[80%] items-end ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {message.sender === 'support' && (
                  <Avatar className="h-8 w-8 border-2 border-cyan-500/30">
                    <AvatarImage src="/support-avatar.png" alt="Suporte" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-700 to-blue-800 text-white text-xs">
                      SUP
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div 
                  className={`py-2 px-3 rounded-lg ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-tr-none' 
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words text-sm">
                    {message.content}
                  </div>
                  <div 
                    className={`text-[10px] mt-1 ${
                      message.sender === 'user' ? 'text-blue-200/80 text-right' : 'text-zinc-400'
                    }`}
                  >
                    {formatMessageTime(message.timestamp)}
                  </div>
                </div>
                
                {message.sender === 'user' && (
                  <Avatar className="h-8 w-8 border-2 border-cyan-500/30">
                    <AvatarImage src={(auth.user?.user_metadata?.avatar_url as string) || undefined} alt="Usuário" />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-700 to-blue-800 text-white text-xs">
                      {auth.user?.email?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </motion.div>
          ))}
          
          {/* Indicador de digitação */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-2 ml-12"
            >
              <Avatar className="h-8 w-8 border-2 border-cyan-500/30">
                <AvatarImage src="/support-avatar.png" alt="Suporte" />
                <AvatarFallback className="bg-gradient-to-br from-purple-700 to-blue-800 text-white text-xs">
                  SUP
                </AvatarFallback>
              </Avatar>
              <div className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700">
                <motion.div
                  className="flex space-x-1"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0 }}
                    className="w-2 h-2 bg-cyan-500 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.15 }}
                    className="w-2 h-2 bg-cyan-500 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.3 }}
                    className="w-2 h-2 bg-cyan-500 rounded-full"
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
          
          {/* Elemento para referência de scroll */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Botão para scroll para baixo */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          variant="secondary"
          className="absolute bottom-24 right-6 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-none p-2"
        >
          <ArrowDownCircle className="h-5 w-5" />
        </Button>
      )}
      
      {/* Área de input */}
      <div className="border-t border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={currentTexts.inputPlaceholder}
            className="flex-1 py-3 px-4 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-cyan-600 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-600 transition-all"
          />
          <Button
            onClick={handleSendMessage}
            className="h-11 w-11 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 hover:brightness-110 text-white border-none flex-shrink-0"
            disabled={!newMessage.trim() || isTyping}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

export default SimpleChatComponent; 
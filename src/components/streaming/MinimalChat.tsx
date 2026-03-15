import React, { useState, useRef, useEffect } from 'react';
import { Send, Users, MessageCircle, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  isHost: boolean;
}

interface MinimalChatProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
  viewerCount: number;
  isStreamer?: boolean;
}

export const MinimalChat: React.FC<MinimalChatProps> = ({
  messages,
  onSendMessage,
  currentUserId,
  viewerCount,
  isStreamer = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-black/98 to-black/95 backdrop-blur-2xl">
      {/* Header ultra minimalista */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-white/[0.03] rounded-lg">
            <MessageCircle className="h-3.5 w-3.5 text-white/80" strokeWidth={1.5} />
          </div>
          <span className="text-[13px] font-light text-white/80 tracking-wide">Chat</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-full border border-white/[0.05]">
          <Users className="h-3 w-3 text-white/50" strokeWidth={1.5} />
          <span className="text-xs font-light text-white/70 tabular-nums">{viewerCount}</span>
        </div>
      </div>

      <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mx-6" />

      {/* Área de mensagens com scrollbar customizada */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-5 minimal-scrollbar"
      >
        <div className="space-y-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className="group flex gap-3.5 hover:bg-white/[0.01] -mx-3 px-3 py-2.5 rounded-2xl transition-all duration-300"
            >
              {/* Avatar ultra clean */}
              <div className="relative flex-shrink-0">
                <Avatar className="h-8 w-8 ring-[0.5px] ring-white/[0.08]">
                  <AvatarImage src={message.userAvatar} />
                  <AvatarFallback className="bg-white/[0.03] text-white/50 text-xs font-extralight">
                    {message.userName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {message.isHost && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full p-[3px] ring-1 ring-black/20">
                    <Crown className="h-2 w-2 text-black" strokeWidth={2.5} fill="currentColor" />
                  </div>
                )}
              </div>

              {/* Conteúdo da mensagem */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-normal text-white/90 truncate">
                    {message.userName}
                  </span>
                  <span className="text-[10px] font-extralight text-white/25 tabular-nums">
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-[13px] text-white/65 break-words leading-relaxed font-light">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mx-6" />

      {/* Input ultra minimalista */}
      <form onSubmit={handleSubmit} className="p-6">
        <div className="relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enviar mensagem"
            className="w-full h-12 bg-white/[0.03] border border-white/[0.05] rounded-2xl pl-5 pr-14 text-[13px] font-light text-white/90 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.06] focus:border-white/[0.12] transition-all duration-300"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            aria-label="Enviar mensagem"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-white/95 text-black disabled:opacity-15 disabled:cursor-not-allowed hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </form>
    </div>
  );
};

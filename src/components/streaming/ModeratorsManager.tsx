import React, { useState, useEffect, useRef } from 'react';
import { Shield, Mail, Trash2, Plus, Loader2, X, User, Search } from 'lucide-react';
import { streamModeratorsService, StreamModerator } from '@/services/streamModeratorsService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface ModeratorsManagerProps {
  streamerId: string;
}

interface UserSuggestion {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

export const ModeratorsManager: React.FC<ModeratorsManagerProps> = ({ streamerId }) => {
  const [moderators, setModerators] = useState<StreamModerator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newModeratorEmail, setNewModeratorEmail] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  
  // Estados para autocompletar
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModerators();
  }, [streamerId]);

  useEffect(() => {
    // Buscar usuários conforme digita
    const searchUsers = async () => {
      console.log('🔍 [ModeratorsManager] useEffect disparado. Email:', newModeratorEmail);
      
      if (newModeratorEmail.length < 2) {
        console.log('⚠️ [ModeratorsManager] Email muito curto, limpando sugestões');
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      console.log('🔍 [ModeratorsManager] Iniciando busca...');
      setIsSearching(true);
      
      try {
        console.log('📡 [ModeratorsManager] Chamando streamModeratorsService.searchUsers...');
        const results = await streamModeratorsService.searchUsers(newModeratorEmail);
        console.log('✅ [ModeratorsManager] Resultados recebidos:', results);
        
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
        
        console.log('✅ [ModeratorsManager] Estado atualizado. ShowSuggestions:', results.length > 0);
      } catch (error) {
        console.error('❌ [ModeratorsManager] Erro ao buscar:', error);
      } finally {
        setIsSearching(false);
        console.log('✅ [ModeratorsManager] Busca finalizada');
      }
    };

    console.log('⏱️ [ModeratorsManager] Agendando debounce de 300ms...');
    const debounceTimer = setTimeout(searchUsers, 300);
    return () => {
      console.log('🧹 [ModeratorsManager] Limpando timer anterior');
      clearTimeout(debounceTimer);
    };
  }, [newModeratorEmail]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadModerators = async () => {
    setIsLoading(true);
    try {
      const mods = await streamModeratorsService.getModerators(streamerId);
      setModerators(mods);
    } finally {
      setIsLoading(false);
    }
  };

  const selectSuggestion = (user: UserSuggestion) => {
    setNewModeratorEmail(user.email);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        handleAddModerator();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        } else {
          handleAddModerator();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleAddModerator = async () => {
    if (!newModeratorEmail.trim()) {
      toast.error('Digite um email válido');
      return;
    }

    setIsAdding(true);
    try {
      const result = await streamModeratorsService.addModerator(
        streamerId,
        newModeratorEmail.trim()
      );

      if (result.success && result.moderator) {
        setModerators(prev => [result.moderator!, ...prev]);
        setNewModeratorEmail('');
        setSuggestions([]);
        setShowSuggestions(false);
        toast.success('Moderador adicionado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao adicionar moderador');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveModerator = async (moderatorId: string, name: string) => {
    setRemovingId(moderatorId);
    try {
      const result = await streamModeratorsService.removeModerator(streamerId, moderatorId);

      if (result.success) {
        setModerators(prev => prev.filter(m => m.moderator_id !== moderatorId));
        toast.success(`${name} removido dos moderadores`);
      } else {
        toast.error(result.error || 'Erro ao remover moderador');
      }
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Adicionar Moderador */}
      <div className="space-y-3">
        <label className="text-[11px] text-white/40 font-extralight tracking-widest uppercase">
          Adicionar Moderador
        </label>
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 z-10" strokeWidth={1.5} />
              <input
                ref={inputRef}
                type="text"
                value={newModeratorEmail}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('⌨️ [Input] Usuário digitou:', value);
                  setNewModeratorEmail(value);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  console.log('👁️ [Input] Campo ganhou foco. Sugestões:', suggestions.length);
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Digite email ou nome do usuário"
                className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-2xl pl-10 pr-4 text-[13px] font-light text-white/90 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.04] focus:border-white/[0.12] transition-all duration-300"
                disabled={isAdding}
                autoComplete="off"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-3.5 w-3.5 text-white/30 animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={handleAddModerator}
              disabled={isAdding || !newModeratorEmail.trim()}
              className="h-11 px-5 bg-white/95 hover:bg-white active:scale-95 rounded-2xl text-black text-[13px] font-light disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2} />
              )}
              <span>Adicionar</span>
            </button>
          </div>

          {/* Dropdown de sugestões */}
          {(() => {
            console.log('🎨 [Render] Verificando dropdown. showSuggestions:', showSuggestions, 'suggestions.length:', suggestions.length);
            return showSuggestions && suggestions.length > 0 ? (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-[100px] mt-2 bg-black/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {suggestions.map((user, index) => {
                  console.log('🎨 [Render] Renderizando sugestão:', user.name, user.email);
                  return (
                    <button
                      key={user.id}
                      onClick={() => selectSuggestion(user)}
                      className={`w-full flex items-center gap-3 p-3 transition-all duration-150 ${
                        index === selectedIndex
                          ? 'bg-white/[0.08]'
                          : 'hover:bg-white/[0.04]'
                      } ${index !== suggestions.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                    >
                      <Avatar className="h-9 w-9 ring-1 ring-white/[0.08] flex-shrink-0">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback className="bg-white/[0.05] text-white/60 text-xs">
                          {user.name[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-[13px] font-light text-white/90 truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-white/40 font-extralight truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null;
          })()}
        </div>
        <p className="text-[10px] text-white/30 font-extralight">
          Comece a digitar para ver sugestões de usuários
        </p>
      </div>

      {/* Lista de Moderadores */}
      <div className="space-y-3">
        <label className="text-[11px] text-white/40 font-extralight tracking-widest uppercase">
          Moderadores ({moderators.length})
        </label>

        {moderators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 bg-white/[0.01] border border-white/[0.05] rounded-2xl">
            <Shield className="h-8 w-8 text-white/20 mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-white/40 font-light">Nenhum moderador adicionado</p>
            <p className="text-[11px] text-white/20 font-extralight mt-1">
              Adicione moderadores para ajudar a gerenciar o chat
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto minimal-scrollbar">
            {moderators.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.03] transition-all duration-200 group"
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 ring-1 ring-white/[0.08]">
                  <AvatarImage src={mod.moderator_avatar || undefined} />
                  <AvatarFallback className="bg-white/[0.05] text-white/60 text-sm">
                    {mod.moderator_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-light text-white/90 truncate">
                      {mod.moderator_name}
                    </p>
                    <Shield className="h-3 w-3 text-blue-400/60" strokeWidth={1.5} />
                  </div>
                  <p className="text-[11px] text-white/40 font-extralight truncate">
                    {mod.moderator_email}
                  </p>
                </div>

                {/* Remover */}
                <button
                  onClick={() => handleRemoveModerator(mod.moderator_id, mod.moderator_name || 'Moderador')}
                  disabled={removingId === mod.moderator_id}
                  className="h-9 w-9 rounded-xl bg-white/[0.02] hover:bg-red-500/10 border border-white/[0.05] hover:border-red-500/20 text-white/40 hover:text-red-400 transition-all duration-200 flex items-center justify-center disabled:opacity-30 group-hover:opacity-100 opacity-0"
                  title="Remover moderador"
                >
                  {removingId === mod.moderator_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

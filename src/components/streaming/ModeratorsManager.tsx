import React, { useState, useEffect, useRef } from 'react';
import { Shield, Mail, Trash2, Plus, Loader2, X, User, Search, Edit, BarChart3, MessageSquare, Users as UsersIcon, Megaphone, Settings } from 'lucide-react';
import { streamModeratorsService, StreamModerator, ModeratorPermissions } from '@/services/streamModeratorsService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ModeratorsManagerProps {
  streamerId: string; // Mantido para compatibilidade, mas usaremos o user.id
}

interface UserSuggestion {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

export const ModeratorsManager: React.FC<ModeratorsManagerProps> = ({ streamerId }) => {
  const { user } = useAuth(); // Pegar o usuário autenticado
  const [moderators, setModerators] = useState<StreamModerator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newModeratorEmail, setNewModeratorEmail] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [pendingModerator, setPendingModerator] = useState<string>('');
  const [editingModeratorId, setEditingModeratorId] = useState<string | null>(null);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<ModeratorPermissions>({
    manage_chat: true,
    edit_stream_info: false,
    manage_moderators: false,
    view_analytics: false,
    send_announcements: false
  });
  
  // Estados para autocompletar
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      loadModerators();
    }
  }, [user?.id]);

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
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const mods = await streamModeratorsService.getModerators(user.id);
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
    if (!user?.id) {
      toast.error('Você precisa estar autenticado');
      return;
    }
    
    if (!newModeratorEmail.trim()) {
      toast.error('Digite um email válido');
      return;
    }

    // Abrir modal de permissões ao invés de adicionar diretamente
    setPendingModerator(newModeratorEmail.trim());
    setShowPermissionsModal(true);
  };

  const handleConfirmAdd = async () => {
    if (!user?.id) {
      toast.error('Você precisa estar autenticado');
      return;
    }

    setIsAdding(true);
    try {
      const result = await streamModeratorsService.addModerator(
        user.id,
        pendingModerator,
        selectedPermissions
      );

      if (result.success && result.moderator) {
        setModerators(prev => [result.moderator!, ...prev]);
        setNewModeratorEmail('');
        setSuggestions([]);
        setShowSuggestions(false);
        setShowPermissionsModal(false);
        setPendingModerator('');
        // Resetar permissões para o padrão
        setSelectedPermissions({
          manage_chat: true,
          edit_stream_info: false,
          manage_moderators: false,
          view_analytics: false,
          send_announcements: false
        });
        toast.success('Moderador adicionado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao adicionar moderador');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditPermissions = (moderator: StreamModerator) => {
    setEditingModeratorId(moderator.id);
    setPendingModerator(moderator.moderator_email || '');
    setSelectedPermissions(moderator.permissions || {
      manage_chat: true,
      edit_stream_info: false,
      manage_moderators: false,
      view_analytics: false,
      send_announcements: false
    });
    setShowPermissionsModal(true);
  };

  const handleUpdatePermissions = async () => {
    if (!user?.id || !editingModeratorId) {
      toast.error('Erro ao atualizar permissões');
      return;
    }

    setIsUpdatingPermissions(true);
    try {
      const result = await streamModeratorsService.updateModeratorPermissions(
        user.id,
        editingModeratorId,
        selectedPermissions
      );

      if (result.success) {
        // Atualizar lista de moderadores
        setModerators(prev => prev.map(mod => 
          mod.id === editingModeratorId 
            ? { ...mod, permissions: selectedPermissions }
            : mod
        ));
        setShowPermissionsModal(false);
        setEditingModeratorId(null);
        setPendingModerator('');
        setSelectedPermissions({
          manage_chat: true,
          edit_stream_info: false,
          manage_moderators: false,
          view_analytics: false,
          send_announcements: false
        });
        toast.success('Permissões atualizadas com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao atualizar permissões');
      }
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const handleRemoveModerator = async (moderatorId: string, name: string) => {
    if (!user?.id) {
      toast.error('Você precisa estar autenticado');
      return;
    }
    
    setRemovingId(moderatorId);
    try {
      const result = await streamModeratorsService.removeModerator(user.id, moderatorId);

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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Shield className="h-8 w-8 text-white/20 mb-3" strokeWidth={1.5} />
        <p className="text-[13px] text-white/60 font-light">Você precisa estar autenticado</p>
      </div>
    );
  }

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
                className="absolute top-full left-0 right-[100px] mt-2 bg-black/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[280px]"
              >
                <div className="overflow-y-auto max-h-[280px] custom-scrollbar">
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
          <div className="relative bg-white/[0.01] border border-white/[0.05] rounded-2xl p-3">
            {/* Indicador de scroll no topo */}
            {moderators.length > 3 && (
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/30 to-transparent pointer-events-none rounded-t-2xl z-10" />
            )}
            
            {/* Container com scroll */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1 relative">
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
                  <p className="text-[11px] text-white/40 font-extralight truncate mb-1.5">
                    {mod.moderator_email}
                  </p>
                  
                  {/* Badges de Permissões */}
                  <div className="flex flex-wrap gap-1">
                    {mod.permissions?.manage_chat && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] text-green-400/80 font-light">
                        <MessageSquare className="h-2.5 w-2.5" strokeWidth={1.5} />
                        Chat
                      </span>
                    )}
                    {mod.permissions?.edit_stream_info && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-400/80 font-light">
                        <Edit className="h-2.5 w-2.5" strokeWidth={1.5} />
                        Editar
                      </span>
                    )}
                    {mod.permissions?.manage_moderators && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] text-purple-400/80 font-light">
                        <UsersIcon className="h-2.5 w-2.5" strokeWidth={1.5} />
                        Mods
                      </span>
                    )}
                    {mod.permissions?.view_analytics && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] text-yellow-400/80 font-light">
                        <BarChart3 className="h-2.5 w-2.5" strokeWidth={1.5} />
                        Stats
                      </span>
                    )}
                    {mod.permissions?.send_announcements && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-500/10 border border-pink-500/20 rounded-lg text-[10px] text-pink-400/80 font-light">
                        <Megaphone className="h-2.5 w-2.5" strokeWidth={1.5} />
                        Anúncios
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex items-center gap-2">
                  {/* Editar Permissões */}
                  <button
                    onClick={() => handleEditPermissions(mod)}
                    className="h-9 w-9 rounded-xl bg-white/[0.02] hover:bg-blue-500/10 border border-white/[0.05] hover:border-blue-500/20 text-white/40 hover:text-blue-400 transition-all duration-200 flex items-center justify-center group-hover:opacity-100 opacity-0"
                    title="Editar permissões"
                    aria-label="Editar permissões do moderador"
                  >
                    <Settings className="h-4 w-4" strokeWidth={1.5} />
                  </button>

                  {/* Remover */}
                  <button
                    onClick={() => handleRemoveModerator(mod.moderator_id, mod.moderator_name || 'Moderador')}
                    disabled={removingId === mod.moderator_id}
                    className="h-9 w-9 rounded-xl bg-white/[0.02] hover:bg-red-500/10 border border-white/[0.05] hover:border-red-500/20 text-white/40 hover:text-red-400 transition-all duration-200 flex items-center justify-center disabled:opacity-30 group-hover:opacity-100 opacity-0"
                    title="Remover moderador"
                    aria-label="Remover moderador"
                  >
                    {removingId === mod.moderator_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>
            ))}
            </div>
            
            {/* Indicador de scroll no fundo */}
            {moderators.length > 3 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/30 to-transparent pointer-events-none rounded-b-2xl z-10" />
            )}
          </div>
        )}
      </div>

      {/* Modal de Permissões */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-black/95 border border-white/[0.12] rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/[0.05] rounded-xl border border-white/[0.08]">
                  <Shield className="h-5 w-5 text-blue-400/80" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-light text-white/95">
                    {editingModeratorId ? 'Editar Permissões' : 'Permissões do Moderador'}
                  </h3>
                  <p className="text-[12px] text-white/50 font-light mt-0.5">
                    {editingModeratorId ? 'Atualize as permissões para' : 'Selecione as permissões para'} {pendingModerator}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setPendingModerator('');
                  setEditingModeratorId(null);
                }}
                className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
                aria-label="Fechar modal de permissões"
              >
                <X className="h-4 w-4 text-white/60" strokeWidth={1.5} />
              </button>
            </div>

            {/* Permissões */}
            <div className="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto minimal-scrollbar">
              {/* Gerenciar Chat */}
              <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <MessageSquare className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                  <div>
                    <Label className="text-[14px] font-light text-white/90 cursor-pointer">Moderação de Chat</Label>
                    <p className="text-[12px] text-white/40 font-extralight leading-relaxed mt-1">
                      Permite <span className="text-white/60">deletar mensagens inapropriadas</span>, aplicar <span className="text-white/60">banimentos permanentes</span>, <span className="text-white/60">silenciar usuários</span> (mute) e dar <span className="text-white/60">timeouts temporários</span>. Acesso total ao painel de moderação.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={selectedPermissions.manage_chat}
                  onCheckedChange={(checked) => setSelectedPermissions({ ...selectedPermissions, manage_chat: checked })}
                />
              </div>

              {/* Editar Informações da Live */}
              <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <Edit className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                  <div>
                    <Label className="text-[14px] font-light text-white/90 cursor-pointer">Editar Informações da Live</Label>
                    <p className="text-[12px] text-white/40 font-extralight leading-relaxed mt-1">
                      Permite modificar <span className="text-white/60">título</span>, <span className="text-white/60">descrição</span>, <span className="text-white/60">categoria</span> e <span className="text-white/60">configurações gerais</span> da transmissão (delay do chat, modo apenas inscritos, permissões de links).
                    </p>
                  </div>
                </div>
                <Switch
                  checked={selectedPermissions.edit_stream_info}
                  onCheckedChange={(checked) => setSelectedPermissions({ ...selectedPermissions, edit_stream_info: checked })}
                />
              </div>

              {/* Gerenciar Moderadores */}
              <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <UsersIcon className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                  <div>
                    <Label className="text-[14px] font-light text-white/90 cursor-pointer">Gerenciar Moderadores</Label>
                    <p className="text-[12px] text-white/40 font-extralight leading-relaxed mt-1">
                      Permite <span className="text-white/60">adicionar novos moderadores</span>, <span className="text-white/60">remover moderadores existentes</span> e <span className="text-white/60">editar suas permissões</span>. ⚠️ Poder significativo - use com cuidado.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={selectedPermissions.manage_moderators}
                  onCheckedChange={(checked) => setSelectedPermissions({ ...selectedPermissions, manage_moderators: checked })}
                />
              </div>

              {/* Ver Estatísticas */}
              <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <BarChart3 className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                  <div>
                    <Label className="text-[14px] font-light text-white/90 cursor-pointer">Visualizar Analytics</Label>
                    <p className="text-[12px] text-white/40 font-extralight leading-relaxed mt-1">
                      Acesso ao painel de <span className="text-white/60">estatísticas da live</span>: número de espectadores, tempo médio de visualização, novos inscritos, receita, gráficos de audiência e métricas de engajamento.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={selectedPermissions.view_analytics}
                  onCheckedChange={(checked) => setSelectedPermissions({ ...selectedPermissions, view_analytics: checked })}
                />
              </div>

              {/* Enviar Anúncios */}
              <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <Megaphone className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                  <div>
                    <Label className="text-[14px] font-light text-white/90 cursor-pointer">Enviar Anúncios</Label>
                    <p className="text-[12px] text-white/40 font-extralight leading-relaxed mt-1">
                      Permite criar e enviar <span className="text-white/60">mensagens destacadas</span> no chat para toda a audiência. Útil para comunicados importantes, avisos sobre novos conteúdos ou eventos especiais.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={selectedPermissions.send_announcements}
                  onCheckedChange={(checked) => setSelectedPermissions({ ...selectedPermissions, send_announcements: checked })}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-white/[0.08]">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setPendingModerator('');
                  setEditingModeratorId(null);
                }}
                disabled={isAdding || isUpdatingPermissions}
                className="h-11 px-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-2xl text-[14px] font-light text-white/80 transition-all duration-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={editingModeratorId ? handleUpdatePermissions : handleConfirmAdd}
                disabled={isAdding || isUpdatingPermissions}
                className="h-11 px-8 bg-white/95 hover:bg-white text-black rounded-2xl text-[14px] font-medium transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                {isAdding || isUpdatingPermissions ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingModeratorId ? 'Atualizando...' : 'Adicionando...'}
                  </>
                ) : (
                  <>
                    {editingModeratorId ? (
                      <>
                        <Settings className="h-4 w-4" strokeWidth={2} />
                        Atualizar Permissões
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" strokeWidth={2} />
                        Adicionar Moderador
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

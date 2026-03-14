import React, { useState } from 'react';
import { X, Circle, Users, MessageCircle, Clock, Eye, TrendingUp, AlertCircle, Check, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { BlockedUsersManager } from '@/components/settings/BlockedUsersManager';
import { ViewersControlPanel } from '@/components/streaming/ViewersControlPanel';
import { ModeratorsManager } from '@/components/streaming/ModeratorsManager';

interface StreamSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  streamId?: string;
  
  // Informações básicas
  streamTitle: string;
  setStreamTitle: (value: string) => void;
  streamDescription: string;
  setStreamDescription: (value: string) => void;
  streamLanguage: string;
  setStreamLanguage: (value: string) => void;
  streamTags: string;
  setStreamTags: (value: string) => void;
  
  // Controles do chat
  chatEnabled: boolean;
  setChatEnabled: (value: boolean) => void;
  chatDelaySeconds: number;
  setChatDelaySeconds: (value: number) => void;
  subscribersOnly: boolean;
  setSubscribersOnly: (value: boolean) => void;
  linksAllowed: boolean;
  setLinksAllowed: (value: boolean) => void;
  linksModeratorOnly: boolean;
  setLinksModeratorOnly: (value: boolean) => void;
  
  // Estatísticas
  viewerCount: number;
  peakViewers: number;
  duration: number;
  totalMessages: number;
  
  // Viewers adicionados
  realViewers: number;
  onViewersUpdate?: (total: number, added: number) => void;
  
  // Ação de salvar
  onSave: () => void;
  isSaving?: boolean;
}

const availableLanguages = [
  { id: 'pt', name: 'Português' },
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
];

export const StreamSettingsPanel: React.FC<StreamSettingsPanelProps> = ({
  isOpen,
  onClose,
  streamId,
  streamTitle,
  setStreamTitle,
  streamDescription,
  setStreamDescription,
  streamLanguage,
  setStreamLanguage,
  streamTags,
  setStreamTags,
  chatEnabled,
  setChatEnabled,
  chatDelaySeconds,
  setChatDelaySeconds,
  subscribersOnly,
  setSubscribersOnly,
  linksAllowed,
  setLinksAllowed,
  linksModeratorOnly,
  setLinksModeratorOnly,
  viewerCount,
  peakViewers,
  duration,
  totalMessages,
  realViewers,
  onViewersUpdate,
  onSave,
  isSaving = false
}) => {
  if (!isOpen) return null;
  
  // Calcular viewers adicionados
  const addedViewers = viewerCount - realViewers;
  
  // Estado local para controlar expansão de opções de links
  const [showLinkOptions, setShowLinkOptions] = useState(linksAllowed);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] overflow-y-auto minimal-scrollbar">
      {/* Header minimalista */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-black via-black/98 to-transparent backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/[0.03] rounded-xl border border-white/[0.05]">
              <Circle className="h-4 w-4 text-white/80" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-light text-white/95 tracking-wide">Configurações</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl transition-all duration-200 active:scale-95"
          >
            <X className="h-4 w-4 text-white/80" strokeWidth={1.5} />
          </button>
        </div>
        <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda */}
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-7 space-y-6">
              <div className="flex items-center gap-2.5">
                <Circle className="h-3.5 w-3.5 text-white/60" strokeWidth={1.5} />
                <h3 className="text-sm font-light text-white/80 tracking-wide">Informações</h3>
              </div>

              <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

              <div className="space-y-5">
                <div>
                  <label className="text-[11px] text-white/40 font-extralight tracking-widest uppercase mb-2 block">
                    Título
                  </label>
                  <input
                    type="text"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="Nome da transmissão"
                    className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 text-[13px] font-light text-white/90 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.04] focus:border-white/[0.12] transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-white/40 font-extralight tracking-widest uppercase mb-2 block">
                    Descrição
                  </label>
                  <textarea
                    value={streamDescription}
                    onChange={(e) => setStreamDescription(e.target.value)}
                    placeholder="Descreva sua transmissão"
                    rows={3}
                    className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 py-3 text-[13px] font-light text-white/90 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.04] focus:border-white/[0.12] transition-all duration-300 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-white/40 font-extralight tracking-widest uppercase mb-2 block">
                      Idioma
                    </label>
                    <select
                      value={streamLanguage}
                      onChange={(e) => setStreamLanguage(e.target.value)}
                      className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 text-[13px] font-light text-white/90 focus:outline-none focus:bg-white/[0.04] focus:border-white/[0.12] transition-all duration-300 appearance-none cursor-pointer"
                    >
                      {availableLanguages.map(lang => (
                        <option key={lang.id} value={lang.id} className="bg-black text-white">
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-white/40 font-extralight tracking-widest uppercase mb-2 block">
                      Espectadores
                    </label>
                    <div className="h-11 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
                      <span className="text-[13px] font-light text-white/90 tabular-nums">{viewerCount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-white/40 font-extralight tracking-widest uppercase mb-2 block">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={streamTags}
                    onChange={(e) => setStreamTags(e.target.value)}
                    placeholder="bitcoin, trading, análise"
                    className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 text-[13px] font-light text-white/90 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.04] focus:border-white/[0.12] transition-all duration-300"
                  />
                  <p className="text-[10px] text-white/30 font-extralight mt-2">Separe com vírgulas</p>
                </div>
              </div>
            </div>

            {/* Controles do Chat */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-7 space-y-6">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="h-3.5 w-3.5 text-white/60" strokeWidth={1.5} />
                <h3 className="text-sm font-light text-white/80 tracking-wide">Chat</h3>
              </div>

              <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

              <div className="space-y-4">
                {/* Chat Ativado */}
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.03] transition-all duration-200">
                  <div>
                    <p className="text-[13px] font-light text-white/90">Chat da Transmissão</p>
                    <p className="text-[10px] text-white/30 font-extralight mt-0.5">Permitir comentários</p>
                  </div>
                  <Switch
                    checked={chatEnabled}
                    onCheckedChange={setChatEnabled}
                    className="data-[state=checked]:bg-white/90"
                  />
                </div>

                {/* Modo Lento */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-white/40 font-extralight tracking-widest uppercase">
                      Modo Lento
                    </label>
                    <span className="text-[10px] text-white/60 font-light tabular-nums px-2.5 py-1 bg-white/[0.03] rounded-full">
                      {chatDelaySeconds > 0 ? `${chatDelaySeconds}s` : 'Desativado'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={chatDelaySeconds}
                    onChange={(e) => setChatDelaySeconds(Number(e.target.value))}
                    className="w-full h-1 bg-white/[0.05] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/90 [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <p className="text-[10px] text-white/30 font-extralight">Intervalo entre mensagens</p>
                </div>

                {/* Apenas Seguidores */}
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.03] transition-all duration-200">
                  <div>
                    <p className="text-[13px] font-light text-white/90">Apenas Seguidores</p>
                    <p className="text-[10px] text-white/30 font-extralight mt-0.5">Restringir comentários</p>
                  </div>
                  <Switch
                    checked={subscribersOnly}
                    onCheckedChange={setSubscribersOnly}
                    className="data-[state=checked]:bg-white/90"
                  />
                </div>

                {/* Permitir Links */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.03] transition-all duration-200">
                    <div>
                      <p className="text-[13px] font-light text-white/90">Permitir Links</p>
                      <p className="text-[10px] text-white/30 font-extralight mt-0.5">URLs no chat</p>
                    </div>
                    <Switch
                      checked={linksAllowed}
                      onCheckedChange={(checked) => {
                        setLinksAllowed(checked);
                        setShowLinkOptions(checked);
                        if (!checked) {
                          setLinksModeratorOnly(false);
                        }
                      }}
                      className="data-[state=checked]:bg-white/90"
                    />
                  </div>

                  {/* Opção: Apenas Moderadores */}
                  {linksAllowed && (
                    <div className="ml-4 pl-4 border-l border-white/[0.05] animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/[0.05] rounded-xl hover:bg-white/[0.02] transition-all duration-200">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3 text-white/40" strokeWidth={1.5} />
                          <div>
                            <p className="text-[12px] font-light text-white/80">Apenas Moderadores</p>
                            <p className="text-[10px] text-white/25 font-extralight mt-0.5">
                              Restringir envio de links aos moderadores
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={linksModeratorOnly}
                          onCheckedChange={setLinksModeratorOnly}
                          className="data-[state=checked]:bg-white/90 scale-90"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita */}
          <div className="space-y-6">
            {/* Controle de Audiência (Viewers Adicionados) */}
            {streamId && (
              <ViewersControlPanel
                streamId={streamId}
                realViewers={realViewers}
                onViewersUpdate={onViewersUpdate}
              />
            )}

            {/* Moderadores */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-7 space-y-6">
              <div className="flex items-center gap-2.5">
                <Shield className="h-3.5 w-3.5 text-white/60" strokeWidth={1.5} />
                <h3 className="text-sm font-light text-white/80 tracking-wide">Moderadores</h3>
              </div>

              <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

              <div className="max-h-[400px] overflow-y-auto minimal-scrollbar">
                {streamId && <ModeratorsManager streamerId={streamId} />}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-7 space-y-6">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-3.5 w-3.5 text-white/60" strokeWidth={1.5} />
                <h3 className="text-sm font-light text-white/80 tracking-wide">Estatísticas</h3>
              </div>

              <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:bg-white/[0.03] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-3 w-3 text-white/40" strokeWidth={1.5} />
                    <span className="text-[10px] text-white/40 font-extralight tracking-widest uppercase">Atuais</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-extralight text-white/95 tabular-nums">{viewerCount}</p>
                    {onViewersUpdate && addedViewers > 0 && (
                      <span className="text-sm font-extralight text-white/40 tabular-nums">
                        (+{addedViewers})
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:bg-white/[0.03] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-3 w-3 text-white/40" strokeWidth={1.5} />
                    <span className="text-[10px] text-white/40 font-extralight tracking-widest uppercase">Pico</span>
                  </div>
                  <p className="text-3xl font-extralight text-white/95 tabular-nums">{peakViewers}</p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:bg-white/[0.03] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-3 w-3 text-white/40" strokeWidth={1.5} />
                    <span className="text-[10px] text-white/40 font-extralight tracking-widest uppercase">Duração</span>
                  </div>
                  <p className="text-3xl font-extralight text-white/95 tabular-nums">{formatDuration(duration)}</p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:bg-white/[0.03] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="h-3 w-3 text-white/40" strokeWidth={1.5} />
                    <span className="text-[10px] text-white/40 font-extralight tracking-widest uppercase">Mensagens</span>
                  </div>
                  <p className="text-3xl font-extralight text-white/95 tabular-nums">{totalMessages}</p>
                </div>
              </div>
            </div>

            {/* Usuários Bloqueados */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-7 space-y-6">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-400/80" strokeWidth={1.5} />
                <h3 className="text-sm font-light text-white/80 tracking-wide">Bloqueados</h3>
              </div>

              <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

              <div className="max-h-[300px] overflow-y-auto minimal-scrollbar">
                {streamId && <BlockedUsersManager streamId={streamId} />}
              </div>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="sticky bottom-0 mt-8 pt-6 pb-6 bg-gradient-to-t from-black via-black/98 to-transparent">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="h-12 px-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-2xl text-[13px] font-light text-white/80 tracking-wide transition-all duration-200 active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="h-12 px-8 bg-white/95 hover:bg-white active:scale-95 rounded-2xl text-black text-[13px] font-light tracking-wide transition-all duration-200 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" strokeWidth={2} />
                  <span>Salvar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

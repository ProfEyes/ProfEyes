import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, RefreshCw, Trash, Plus, Eye, Search,
  ShieldAlert, Users, Video, UserCheck, Mail, Calendar,
  Shield, Activity,
} from "lucide-react";
import { checkAdminPermission, createUser, deleteUser, listUsers } from '@/lib/admin-api';
import type { UserData } from '@/lib/admin-api';

export default function Admin() {
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Users state
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Dialogs
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newUserData, setNewUserData] = useState({ email: '', password: '', name: '' });
  const [saving, setSaving] = useState(false);

  // Streamers state
  const [streamers, setStreamers] = useState<Array<{
    user_id: string; can_stream: boolean; created_at: string;
    display_name?: string; email?: string;
  }>>([]);
  const [loadingStreamers, setLoadingStreamers] = useState(false);
  const [selectedForStream, setSelectedForStream] = useState<string[]>([]);
  const [isGranting, setIsGranting] = useState(false);

  // Check admin
  useEffect(() => {
    if (!user) { setIsAuthorized(false); return; }
    checkAdminPermission(user.id).then(setIsAuthorized);
  }, [user]);

  // Load users
  const fetchUsers = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers(currentPage, itemsPerPage);
      if (result.error) throw new Error(result.error);
      setUsers(result.users);
      setTotalPages(Math.max(1, Math.ceil(result.total / itemsPerPage)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar usuários';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, currentPage]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Load streamers
  const loadStreamers = async () => {
    setLoadingStreamers(true);
    try {
      const { data } = await (supabase as SupabaseClient<Database>)
        .from('user_profiles')
        .select('user_id, display_name, email');
      setStreamers(
        (data || []).map(d => ({
          user_id: d.user_id,
          can_stream: false,
          created_at: new Date().toISOString(),
          display_name: d.display_name || undefined,
          email: d.email || undefined,
        }))
      );
    } catch { /* ignorar */ }
    setLoadingStreamers(false);
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.user_metadata?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.password) {
      toast.error('Preencha email e senha');
      return;
    }
    setSaving(true);
    try {
      const result = await createUser(newUserData.email, newUserData.password, { name: newUserData.name });
      if (result.error) throw new Error(result.error);
      toast.success('Usuário criado com sucesso');
      if (result.user) setUsers(prev => [result.user as UserData, ...prev]);
      setNewUserData({ email: '', password: '', name: '' });
      setIsAddUserOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Excluir este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      const result = await deleteUser(userId);
      if (result.error) throw new Error(result.error);
      toast.success('Usuário excluído');
      setUsers(prev => prev.filter(u => u.id !== userId));
      setIsDetailsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await (supabase as SupabaseClient<Database>).auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success(`Email enviado para ${email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar email');
    }
  };

  const grantStreamPermission = async () => {
    if (selectedForStream.length === 0) { toast.warning('Selecione ao menos um usuário'); return; }
    setIsGranting(true);
    try {
      const { error } = await (supabase as SupabaseClient<Database>)
        .from('stream_permissions' as never)
        .upsert(selectedForStream.map(uid => ({ user_id: uid, can_stream: true })), { onConflict: 'user_id' });
      if (error) throw error;
      toast.success(`Permissão concedida para ${selectedForStream.length} usuário(s)`);
      setSelectedForStream([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao conceder permissão');
    } finally {
      setIsGranting(false);
    }
  };

  // Loading state
  if (isAuthorized === null) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      </Layout>
    );
  }

  // Unauthorized
  if (!isAuthorized) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <ShieldAlert className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Acesso Restrito</h1>
          <p className="text-white/50 text-sm text-center max-w-xs">
            Esta área é exclusiva para administradores do sistema.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-white flex items-center gap-2">
              <Shield className="h-6 w-6 text-indigo-400" />
              Painel Admin
            </h1>
            <p className="text-white/50 text-sm mt-1">Gerencie membros e configurações do sistema</p>
          </div>
          <Button
            onClick={() => setIsAddUserOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Membro
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { icon: Users, label: 'Total de Membros', value: users.length, color: 'text-blue-400' },
            { icon: UserCheck, label: 'Verificados', value: users.filter(u => u.email_confirmed_at).length, color: 'text-green-400' },
            { icon: Activity, label: 'Ativos (7d)', value: users.filter(u => u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() < 7 * 86400000).length, color: 'text-indigo-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-white/50 text-xs">{label}</span>
              </div>
              <p className="text-2xl font-semibold text-white">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="users">
          <TabsList className="bg-black/30 border border-white/5 p-1 rounded-xl mb-4">
            <TabsTrigger value="users" className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white rounded-lg">
              <Users className="h-3.5 w-3.5 mr-2" />
              Membros
            </TabsTrigger>
            <TabsTrigger value="streamers" className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white rounded-lg" onClick={loadStreamers}>
              <Video className="h-3.5 w-3.5 mr-2" />
              Transmissões
            </TabsTrigger>
          </TabsList>

          {/* TAB: Membros */}
          <TabsContent value="users" className="space-y-4">
            {/* Search bar */}
            <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/5 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    placeholder="Buscar por email ou nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50"
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={fetchUsers}
                  className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-white/30" />
                </div>
              ) : error ? (
                <div className="py-12 text-center">
                  <p className="text-red-400 text-sm">{error}</p>
                  <Button variant="ghost" onClick={fetchUsers} className="mt-3 text-white/50">
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-white/50 font-medium">Email</TableHead>
                      <TableHead className="text-white/50 font-medium hidden sm:table-cell">Nome</TableHead>
                      <TableHead className="text-white/50 font-medium hidden md:table-cell">Cadastro</TableHead>
                      <TableHead className="text-white/50 font-medium">Status</TableHead>
                      <TableHead className="text-white/50 font-medium text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow className="border-white/5">
                        <TableCell colSpan={5} className="text-center py-12 text-white/30">
                          {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum membro cadastrado'}
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.map(u => (
                      <TableRow key={u.id} className="border-white/5 hover:bg-white/3">
                        <TableCell className="text-white/80 text-sm">{u.email}</TableCell>
                        <TableCell className="text-white/60 text-sm hidden sm:table-cell">
                          {u.user_metadata?.name || <span className="text-white/20">—</span>}
                        </TableCell>
                        <TableCell className="text-white/50 text-xs hidden md:table-cell">
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {u.email_confirmed_at ? (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 border text-xs">Verificado</Badge>
                          ) : (
                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 border text-xs">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => { setSelectedUser(u); setIsDetailsOpen(true); }}
                              className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => handleDeleteUser(u.id)}
                              className="h-8 w-8 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="ghost"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >Anterior</Button>
                  <Button
                    size="sm" variant="ghost"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >Próximo</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB: Transmissões */}
          <TabsContent value="streamers">
            <Card className="bg-black/20 backdrop-blur-xl border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Video className="h-4 w-4 text-indigo-400" />
                  Permissões de Transmissão
                </CardTitle>
                <CardDescription className="text-white/40">
                  Conceda ou revogue permissão para membros iniciarem lives.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Grant section */}
                <div className="bg-white/3 rounded-xl border border-white/5 p-4 space-y-3">
                  <h3 className="text-white/80 text-sm font-medium">Conceder Permissão</h3>
                  {loadingStreamers ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                    </div>
                  ) : (
                    <>
                      <select
                        multiple
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white/80 text-sm min-h-[120px] focus:outline-none focus:border-indigo-500/50"
                        onChange={e => setSelectedForStream(Array.from(e.target.selectedOptions, o => o.value))}
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id} className="bg-neutral-900 py-1">
                            {u.email}{u.user_metadata?.name ? ` — ${u.user_metadata.name}` : ''}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={grantStreamPermission}
                        disabled={isGranting || selectedForStream.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        {isGranting
                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : <Video className="mr-2 h-4 w-4" />}
                        Conceder para {selectedForStream.length} selecionado(s)
                      </Button>
                    </>
                  )}
                </div>

                {/* Streamers list */}
                <div className="space-y-2">
                  <h3 className="text-white/80 text-sm font-medium">Membros com Permissão</h3>
                  {streamers.filter(s => s.can_stream).length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-6">Nenhum membro com permissão de transmissão</p>
                  ) : streamers.filter(s => s.can_stream).map(s => (
                    <div key={s.user_id} className="flex items-center justify-between bg-white/3 rounded-lg px-4 py-3 border border-white/5">
                      <div>
                        <p className="text-white/80 text-sm">{s.display_name || s.email || s.user_id}</p>
                        <p className="text-white/40 text-xs">{s.email}</p>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 text-xs"
                      >
                        Revogar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Adicionar membro */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="bg-[#0c0c10] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Adicionar Novo Membro</DialogTitle>
            <DialogDescription className="text-white/40">
              Crie uma conta diretamente no sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="email" required
                  value={newUserData.email}
                  onChange={e => setNewUserData(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Senha *</Label>
              <Input
                type="password" required minLength={6}
                value={newUserData.password}
                onChange={e => setNewUserData(p => ({ ...p, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Nome (opcional)</Label>
              <Input
                type="text"
                value={newUserData.name}
                onChange={e => setNewUserData(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome do membro"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            <DialogFooter className="gap-2 mt-2">
              <Button
                type="button" variant="ghost"
                onClick={() => setIsAddUserOpen(false)}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit" disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Membro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do usuário */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-[#0c0c10] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes do Membro</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Mail, label: 'Email', value: selectedUser.email },
                  { icon: Users, label: 'Nome', value: selectedUser.user_metadata?.name || '—' },
                  { icon: Calendar, label: 'Cadastro', value: new Date(selectedUser.created_at).toLocaleDateString('pt-BR') },
                  { icon: Activity, label: 'Último login', value: selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleDateString('pt-BR') : 'Nunca' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/3 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="h-3.5 w-3.5 text-white/30" />
                      <span className="text-white/40 text-xs">{label}</span>
                    </div>
                    <p className="text-white/80 text-sm break-all">{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/3 rounded-lg p-3 border border-white/5">
                <p className="text-white/40 text-xs mb-1">ID</p>
                <p className="text-white/50 text-xs font-mono break-all">{selectedUser.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">Status:</span>
                {selectedUser.email_confirmed_at
                  ? <Badge className="bg-green-500/10 text-green-400 border-green-500/20 border text-xs">Verificado</Badge>
                  : <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 border text-xs">Não verificado</Badge>
                }
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 mt-2 flex-wrap">
            <Button
              variant="ghost" size="sm"
              onClick={() => selectedUser && handleResetPassword(selectedUser.email)}
              className="text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 text-xs"
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Redefinir Senha
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}
              className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 text-xs"
            >
              <Trash className="mr-1.5 h-3.5 w-3.5" />
              Excluir
            </Button>
            <Button
              size="sm"
              onClick={() => setIsDetailsOpen(false)}
              className="bg-white/10 hover:bg-white/15 text-white text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  RefreshCw, 
  Trash, 
  Plus, 
  Eye, 
  Search, 
  Filter, 
  Clock, 
  Video
} from "lucide-react";
import { UserData, checkAdminPermission, createUser, deleteUser, listUsers, getAdminLogs } from '@/lib/admin-api';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interface para logs administrativos
interface AdminLog {
  id: string;
  created_at: string;
  action: 'create' | 'update' | 'delete' | 'reset_password';
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  admin: { email: string } | null;
  admin_id: string;
}

// Interface para streamers/usuários com permissão de stream
interface StreamerData {
  id: string;
  user_id: string;
  can_stream: boolean;
  created_at: string;
  user_profiles?: {
    display_name: string;
    email: string;
  } | null;
  profiles?: {
    display_name: string;
    email: string;
  } | null;
}

export default function Admin() {
  const { user, session } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    name: '',
    birthdate: ''
  });
  const [activeTab, setActiveTab] = useState("users");
  const [streamers, setStreamers] = useState<StreamerData[]>([]);
  const [loadingStreamers, setLoadingStreamers] = useState<boolean>(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGranting, setIsGranting] = useState<boolean>(false);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  const itemsPerPage = 10;

  // Verificar se o usuário atual é um administrador
  useEffect(() => {
    const verifyAdminAccess = async () => {
      if (!user) {
        setIsAuthorized(false);
        return;
      }

      const isAdmin = await checkAdminPermission(user.id);
      setIsAuthorized(isAdmin);
    };

    verifyAdminAccess();
  }, [user]);

  // Carregar lista de usuários
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await listUsers(currentPage, itemsPerPage);
        
        if (result.error) {
          throw new Error(result.error);
        }

        setUsers(result.users);
        setTotalPages(Math.ceil(result.total / itemsPerPage));
      } catch (err: unknown) {
        console.error('Erro ao buscar usuários:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar usuários';
        setError(errorMessage);
        toast.error('Erro ao carregar lista de usuários', {
          description: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthorized, currentPage]);

  // Filtrar usuários com base no termo de pesquisa
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.user_metadata?.name && user.user_metadata.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Adicionar novo usuário
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserData.email || !newUserData.password) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    
    try {
      const result = await createUser(
        newUserData.email, 
        newUserData.password, 
        {
          name: newUserData.name,
          birthdate: newUserData.birthdate
        }
      );

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.user) {
        toast.success('Usuário criado com sucesso', {
          description: `${newUserData.email} foi adicionado ao sistema`
        });

        // Atualizar lista de usuários
        setUsers(prev => [...prev, result.user as UserData]);
        
        // Limpar formulário e fechar diálogo
        setNewUserData({
          email: '',
          password: '',
          name: '',
          birthdate: ''
        });
        setIsAddUserDialogOpen(false);
      }
    } catch (err: unknown) {
      console.error('Erro ao criar usuário:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar usuário';
      toast.error('Erro ao adicionar usuário', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Excluir usuário
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLoading(true);
    
    try {
      const result = await deleteUser(userId);

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('Usuário excluído com sucesso');
      
      // Atualizar lista de usuários
      setUsers(users.filter(user => user.id !== userId));
    } catch (err: unknown) {
      console.error('Erro ao excluir usuário:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir usuário';
      toast.error('Erro ao excluir usuário', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Exibir detalhes do usuário
  const handleViewDetails = (user: UserData) => {
    setSelectedUser(user);
    setIsDetailsDialogOpen(true);
  };

  // Redefinir senha do usuário
  const handleResetPassword = async (email: string) => {
    try {
      // URL padrão para todas as operações de redefinição de senha
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      console.log("URL de redirecionamento para redefinição:", redirectUrl);
      
      const { error } = await (supabase as SupabaseClient<Database>).auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw new Error(error.message);

      toast.success('Email de redefinição de senha enviado', {
        description: `Um email foi enviado para ${email} com instruções para redefinir a senha.`
      });
    } catch (err: unknown) {
      console.error('Erro ao enviar email de redefinição:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar email de redefinição';
      toast.error('Erro ao enviar email de redefinição', {
        description: errorMessage
      });
    }
  };

  // Carregar logs de atividade administrativa
  const handleViewLogs = async () => {
    setLogsLoading(true);
    setIsLogsDialogOpen(true);
    
    try {
      const logs = await getAdminLogs(50);
      setAdminLogs(logs as unknown as AdminLog[]);
    } catch (err: unknown) {
      console.error('Erro ao carregar logs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar logs';
      toast.error('Erro ao carregar logs de atividade', {
        description: errorMessage
      });
    } finally {
      setLogsLoading(false);
    }
  };

  // Traduzir a ação do log para português
  const translateAction = (action: string) => {
    const actions: Record<string, string> = {
      create: 'Criação',
      update: 'Atualização',
      delete: 'Exclusão',
      reset_password: 'Redefinição de senha'
    };
    return actions[action] || action;
  };

  // Carregar usuários com permissão para transmissão
  const loadStreamers = async () => {
    setLoadingStreamers(true);
    try {
      const { data, error } = await (supabase as SupabaseClient<Database>)
        .from('stream_permissions')
        .select('*, profiles:user_id(*)')
        .eq('can_stream', true);
      
      if (error) {
        console.error('Erro ao carregar streamers:', error);
        toast.error('Erro ao carregar streamers');
        return;
      }
      
      setStreamers(data || []);
    } catch (error) {
      console.error('Erro ao carregar streamers:', error);
      toast.error('Erro ao carregar streamers');
    } finally {
      setLoadingStreamers(false);
    }
  };
  
  // Conceder permissão para usuários selecionados
  const grantStreamPermission = async () => {
    if (selectedUsers.length === 0) {
      toast.warning('Selecione pelo menos um usuário');
      return;
    }
    
    setIsGranting(true);
    
    try {
      // Preparar dados para inserção
      const permissionsData = selectedUsers.map(userId => ({
        user_id: userId,
        can_stream: true
      }));
      
      // Inserir permissões
      const { error } = await (supabase as SupabaseClient<Database>)
        .from('stream_permissions')
        .upsert(permissionsData, { onConflict: 'user_id' });
      
      if (error) {
        console.error('Erro ao conceder permissões:', error);
        toast.error('Erro ao conceder permissões');
        return;
      }
      
      toast.success(`Permissão concedida para ${selectedUsers.length} usuário(s)`);
      
      // Recarregar streamers
      loadStreamers();
      
      // Limpar seleção
      setSelectedUsers([]);
    } catch (error) {
      console.error('Erro ao conceder permissões:', error);
      toast.error('Erro ao conceder permissões');
    } finally {
      setIsGranting(false);
    }
  };
  
  // Revogar permissão de transmissão
  const revokeStreamPermission = async (userId: string) => {
    setIsRevoking(true);
    
    try {
      const { error } = await (supabase as SupabaseClient<Database>)
        .from('stream_permissions')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('Erro ao revogar permissão:', error);
        toast.error('Erro ao revogar permissão');
        return;
      }
      
      toast.success('Permissão revogada com sucesso');
      
      // Atualizar lista de streamers
      setStreamers(streamers.filter(s => s.user_id !== userId));
    } catch (error) {
      console.error('Erro ao revogar permissão:', error);
      toast.error('Erro ao revogar permissão');
    } finally {
      setIsRevoking(false);
    }
  };
  
  // Carregar streamers quando a aba for selecionada
  useEffect(() => {
    if (activeTab === 'streamers') {
      loadStreamers();
    }
  }, [activeTab]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-neutral-300">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="mb-6 text-center max-w-md">
          Você não tem permissão para acessar esta área. Esta página é restrita a administradores do sistema.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Voltar para a página inicial
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-black text-neutral-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
            Painel de Administração
          </h1>
          <p className="text-neutral-400 mt-1">Gerencie usuários e acesso ao sistema</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={handleViewLogs}
            className="border-neutral-700"
          >
            <Clock className="mr-2 h-4 w-4" />
            Logs de Atividade
          </Button>
          <Button 
            onClick={() => setIsAddUserDialogOpen(true)}
            className="bg-gradient-to-r from-green-800 to-green-700 hover:from-green-700 hover:to-green-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Button>
        </div>
      </div>

      <Card className="bg-neutral-900/60 border-neutral-800 mb-6 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
              <Input
                type="search"
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-neutral-800 border-neutral-700 text-neutral-200 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-neutral-700" onClick={() => setCurrentPage(1)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button variant="outline" className="border-neutral-700" disabled>
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center my-12">
          <RefreshCw className="h-10 w-10 animate-spin text-green-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-200 rounded-md p-4 mb-6">
          <p className="font-medium">Erro ao carregar dados</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-800/50 hover:bg-neutral-800/70 border-neutral-700">
                  <TableHead className="text-neutral-300 font-medium">Email</TableHead>
                  <TableHead className="text-neutral-300 font-medium">Nome</TableHead>
                  <TableHead className="text-neutral-300 font-medium">Data de Registro</TableHead>
                  <TableHead className="text-neutral-300 font-medium">Status</TableHead>
                  <TableHead className="text-neutral-300 font-medium text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow className="hover:bg-neutral-800/40 border-neutral-800">
                    <TableCell colSpan={5} className="text-center py-8 text-neutral-400">
                      {searchTerm 
                        ? 'Nenhum usuário encontrado com os critérios de busca'
                        : 'Nenhum usuário cadastrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-neutral-800/40 border-neutral-800">
                      <TableCell className="font-medium text-neutral-300">{user.email}</TableCell>
                      <TableCell>{user.user_metadata?.name || '-'}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        {user.email_confirmed_at ? (
                          <Badge className="bg-green-900/60 hover:bg-green-900/80 text-green-200">
                            Verificado
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-900/60 hover:bg-orange-900/80 text-orange-200">
                            Não verificado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(user)}
                            className="h-8 px-2 text-neutral-400 hover:text-neutral-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-neutral-400">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="border-neutral-700"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className="border-neutral-700"
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Diálogo para adicionar usuário */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Adicionar Novo Usuário</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Adicione um novo usuário ao sistema
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddUser} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                className="bg-neutral-800 border-neutral-700 text-neutral-300"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                className="bg-neutral-800 border-neutral-700 text-neutral-300"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                type="text"
                value={newUserData.name}
                onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do usuário"
                className="bg-neutral-800 border-neutral-700 text-neutral-300"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthdate">Data de Nascimento (opcional)</Label>
              <Input
                id="birthdate"
                type="date"
                value={newUserData.birthdate}
                onChange={(e) => setNewUserData(prev => ({ ...prev, birthdate: e.target.value }))}
                className="bg-neutral-800 border-neutral-700 text-neutral-300"
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserDialogOpen(false)}
                className="border-neutral-700 text-neutral-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-green-800 hover:bg-green-700 text-white"
                disabled={loading}
              >
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para detalhes do usuário */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 mt-2">
              <div className="border-t border-neutral-800 pt-4">
                <h3 className="text-sm font-medium text-neutral-400">Email</h3>
                <p className="text-lg font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-400">Nome</h3>
                <p className="text-lg font-medium">{selectedUser.user_metadata?.name || '-'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-400">ID do Usuário</h3>
                <p className="text-xs font-mono text-neutral-400">{selectedUser.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-400">Data de Registro</h3>
                <p>{new Date(selectedUser.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-400">Último login</h3>
                <p>{selectedUser.last_sign_in_at ? 
                  new Date(selectedUser.last_sign_in_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Nunca'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-400">Status da Conta</h3>
                {selectedUser.email_confirmed_at ? (
                  <div className="flex items-center mt-1">
                    <Badge className="bg-green-900/60 text-green-200">Verificado</Badge>
                    <span className="text-xs text-neutral-500 ml-2">
                      {new Date(selectedUser.email_confirmed_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ) : (
                  <Badge className="bg-orange-900/60 text-orange-200 mt-1">Não verificado</Badge>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              className="border-red-800 text-red-300 hover:bg-red-950/30 hover:text-red-200"
              onClick={() => {
                if (selectedUser) {
                  handleDeleteUser(selectedUser.id);
                  setIsDetailsDialogOpen(false);
                }
              }}
            >
              <Trash className="mr-2 h-4 w-4" />
              Excluir Usuário
            </Button>
            <Button
              variant="outline"
              className="border-blue-800 text-blue-300 hover:bg-blue-950/30 hover:text-blue-200"
              onClick={() => {
                if (selectedUser) {
                  handleResetPassword(selectedUser.email);
                }
              }}
            >
              Redefinir Senha
            </Button>
            <Button 
              className="bg-neutral-800 hover:bg-neutral-700"
              onClick={() => setIsDetailsDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para logs de atividade */}
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-300 sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Logs de Atividade Administrativa</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Histórico de ações realizadas pelos administradores do sistema
            </DialogDescription>
          </DialogHeader>
          
          {logsLoading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : (
            <div className="mt-4">
              {adminLogs.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  Nenhum registro de atividade encontrado
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-neutral-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-800/50 hover:bg-neutral-800/70 border-neutral-700">
                        <TableHead className="text-neutral-300 font-medium">Data</TableHead>
                        <TableHead className="text-neutral-300 font-medium">Admin</TableHead>
                        <TableHead className="text-neutral-300 font-medium">Ação</TableHead>
                        <TableHead className="text-neutral-300 font-medium">Usuário Alvo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-neutral-800/40 border-neutral-800">
                          <TableCell>
                            {new Date(log.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>{log.admin?.email || log.admin_id}</TableCell>
                          <TableCell>
                            <Badge className={
                              log.action === 'create' ? 'bg-green-900/60 text-green-200' :
                              log.action === 'delete' ? 'bg-red-900/60 text-red-200' :
                              'bg-blue-900/60 text-blue-200'
                            }>
                              {translateAction(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-neutral-400">
                            {log.target_user_id || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              onClick={() => setIsLogsDialogOpen(false)}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="streamers">Transmissões</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          {/* Conteúdo existente da aba de usuários */}
        </TabsContent>
        <TabsContent value="logs">
          {/* Conteúdo existente da aba de logs */}
        </TabsContent>
        <TabsContent value="streamers">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Transmissões ao Vivo</CardTitle>
              <CardDescription>
                Gerencie quais usuários têm permissão para iniciar transmissões ao vivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Seleção de usuários para conceder permissão */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-4">
                    Conceder Permissão
                  </h3>
                  
                  <div className="mb-4">
                    <Label htmlFor="user-selection-list" className="block mb-2">
                      Selecione os usuários
                    </Label>
                    <select
                      id="user-selection-list"
                      multiple
                      title="Selecione usuários para conceder permissão de transmissão"
                      aria-label="Selecione usuários para conceder permissão de transmissão"
                      className="w-full p-2 border rounded-md bg-neutral-800 border-neutral-700 text-neutral-200"
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setSelectedUsers(selected);
                      }}
                    >
                      {users
                        .filter(user => !streamers.some(s => s.user_id === user.id))
                        .map(user => (
                          <option key={user.id} value={user.id}>
                            {user.email} ({user.user_metadata?.name || 'Sem nome'})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  <Button 
                    onClick={grantStreamPermission} 
                    disabled={isGranting || selectedUsers.length === 0}
                    className="w-full"
                  >
                    {isGranting ? 
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                      <Video className="mr-2 h-4 w-4" />
                    }
                    Conceder Permissão de Transmissão
                  </Button>
                </div>
                
                {/* Lista de usuários com permissão */}
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Usuários com Permissão
                  </h3>
                  
                  {loadingStreamers ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : streamers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum usuário com permissão para transmissão.
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {streamers.map((streamer) => (
                            <TableRow key={streamer.user_id}>
                              <TableCell className="font-medium">
                                {streamer.profiles?.display_name || streamer.user_profiles?.display_name || "Sem nome"}
                              </TableCell>
                              <TableCell>{streamer.profiles?.email || streamer.user_profiles?.email}</TableCell>
                              <TableCell>
                                {new Date(streamer.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => revokeStreamPermission(streamer.user_id)}
                                  disabled={isRevoking}
                                >
                                  {isRevoking ? 
                                    <Loader2 className="h-4 w-4 animate-spin" /> : 
                                    "Revogar"
                                  }
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
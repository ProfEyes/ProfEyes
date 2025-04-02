import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
import { ReloadIcon, TrashIcon, PlusIcon, EyeIcon, SearchIcon, FilterIcon, ClockIcon } from "@radix-ui/react-icons";
import { UserData, checkAdminPermission, createUser, deleteUser, listUsers, getAdminLogs } from '@/lib/admin-api';

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
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    name: '',
    birthdate: ''
  });

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
      } catch (err: any) {
        console.error('Erro ao buscar usuários:', err);
        setError(err.message || 'Erro ao carregar usuários');
        toast.error('Erro ao carregar lista de usuários', {
          description: err.message
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
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      toast.error('Erro ao adicionar usuário', {
        description: err.message
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
    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err);
      toast.error('Erro ao excluir usuário', {
        description: err.message
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw new Error(error.message);

      toast.success('Email de redefinição de senha enviado', {
        description: `Um email foi enviado para ${email} com instruções para redefinir a senha.`
      });
    } catch (err: any) {
      console.error('Erro ao enviar email de redefinição:', err);
      toast.error('Erro ao enviar email de redefinição', {
        description: err.message
      });
    }
  };

  // Carregar logs de atividade administrativa
  const handleViewLogs = async () => {
    setLogsLoading(true);
    setIsLogsDialogOpen(true);
    
    try {
      const logs = await getAdminLogs(50);
      setAdminLogs(logs);
    } catch (err: any) {
      console.error('Erro ao carregar logs:', err);
      toast.error('Erro ao carregar logs de atividade', {
        description: err.message
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
            <ClockIcon className="mr-2 h-4 w-4" />
            Logs de Atividade
          </Button>
          <Button 
            onClick={() => setIsAddUserDialogOpen(true)}
            className="bg-gradient-to-r from-green-800 to-green-700 hover:from-green-700 hover:to-green-600 text-white"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Button>
        </div>
      </div>

      <Card className="bg-neutral-900/60 border-neutral-800 mb-6 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
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
                <ReloadIcon className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button variant="outline" className="border-neutral-700" disabled>
                <FilterIcon className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center my-12">
          <ReloadIcon className="h-10 w-10 animate-spin text-green-500" />
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
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                          >
                            <TrashIcon className="h-4 w-4" />
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
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-300 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Adicionar Novo Usuário</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Crie uma nova conta de usuário no sistema
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddUser} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="email@exemplo.com"
                value={newUserData.email}
                onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                className="bg-neutral-800 border-neutral-700"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Senha forte"
                value={newUserData.password}
                onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                className="bg-neutral-800 border-neutral-700"
              />
              <p className="text-neutral-500 text-xs">
                A senha deve ter pelo menos 6 caracteres e incluir letras maiúsculas, minúsculas, números e caracteres especiais.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nome completo"
                value={newUserData.name}
                onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                className="bg-neutral-800 border-neutral-700"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthdate">Data de Nascimento</Label>
              <Input
                id="birthdate"
                type="date"
                placeholder="DD/MM/AAAA"
                value={newUserData.birthdate}
                onChange={(e) => setNewUserData({...newUserData, birthdate: e.target.value})}
                className="bg-neutral-800 border-neutral-700"
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserDialogOpen(false)}
                className="border-neutral-700"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-green-800 to-green-700 hover:from-green-700 hover:to-green-600 text-white"
                disabled={loading}
              >
                {loading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para detalhes do usuário */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-300 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Detalhes do Usuário</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Informações completas e opções de gerenciamento
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Email</h3>
                  <p className="mt-1 text-neutral-200">{selectedUser.email}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">ID</h3>
                  <p className="mt-1 text-xs text-neutral-400 font-mono truncate">{selectedUser.id}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Nome</h3>
                  <p className="mt-1 text-neutral-200">{selectedUser.user_metadata?.name || '-'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Data de Nascimento</h3>
                  <p className="mt-1 text-neutral-200">
                    {selectedUser.user_metadata?.birthdate
                      ? new Date(selectedUser.user_metadata.birthdate).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Data de Registro</h3>
                  <p className="mt-1 text-neutral-200">
                    {new Date(selectedUser.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Último Login</h3>
                  <p className="mt-1 text-neutral-200">
                    {selectedUser.last_sign_in_at
                      ? new Date(selectedUser.last_sign_in_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Nunca'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Status</h3>
                  <div className="mt-1">
                    {selectedUser.email_confirmed_at ? (
                      <Badge className="bg-green-900/60 text-green-200">Email Verificado</Badge>
                    ) : (
                      <Badge className="bg-orange-900/60 text-orange-200">Email Não Verificado</Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Provedor</h3>
                  <p className="mt-1 text-neutral-200 capitalize">
                    {selectedUser.app_metadata?.provider || 'email'}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-500 mb-3">Ações</h3>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleResetPassword(selectedUser.email)}
                    className="border-neutral-700 text-neutral-300"
                  >
                    Redefinir Senha
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      handleDeleteUser(selectedUser.id);
                    }}
                    className="border-red-900/40 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                  >
                    Excluir Conta
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              onClick={() => setIsDetailsDialogOpen(false)}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
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
              <ReloadIcon className="h-8 w-8 animate-spin text-green-500" />
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
    </div>
  );
} 
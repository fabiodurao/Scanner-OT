import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Shield, Clock, UserCheck, UserX, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role_in_company: string;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar usuários');
      console.error(error);
    } else {
      setUsers(data || []);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', userId);

    if (error) {
      toast.error('Erro ao aprovar usuário');
    } else {
      toast.success('Usuário aprovado com sucesso!');
      fetchUsers();
    }
  };

  const handleRevoke = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: false })
      .eq('id', userId);

    if (error) {
      toast.error('Erro ao revogar acesso');
    } else {
      toast.success('Acesso revogado');
      fetchUsers();
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentStatus })
      .eq('id', userId);

    if (error) {
      toast.error('Erro ao alterar permissões');
    } else {
      toast.success(currentStatus ? 'Permissão de admin removida' : 'Usuário promovido a admin');
      fetchUsers();
    }
  };

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Aprove solicitações e gerencie permissões de acesso
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{approvedUsers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        {pendingUsers.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Solicitações Pendentes ({pendingUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Data da Solicitação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role_in_company}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(user.id)}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <UserX className="h-4 w-4 mr-1" />
                                  Recusar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Recusar solicitação?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação irá manter o usuário sem acesso ao sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRevoke(user.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Recusar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Usuários Aprovados ({approvedUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role_in_company}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovado
                          </Badge>
                          {user.is_admin && (
                            <Badge className="bg-purple-100 text-purple-700">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <XCircle className="h-4 w-4 mr-1" />
                                Revogar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O usuário {user.full_name} perderá acesso ao sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevoke(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Revogar Acesso
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {approvedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário aprovado ainda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default UserManagement;
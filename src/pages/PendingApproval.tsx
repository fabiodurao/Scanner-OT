import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Clock, LogOut } from 'lucide-react';

const PendingApproval = () => {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
          <CardDescription>
            Sua solicitação de acesso está sendo analisada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 text-left">
            <div className="text-sm text-muted-foreground mb-1">Nome</div>
            <div className="font-medium">{profile?.full_name}</div>
            <div className="text-sm text-muted-foreground mb-1 mt-3">E-mail</div>
            <div className="font-medium">{profile?.email}</div>
            <div className="text-sm text-muted-foreground mb-1 mt-3">Função</div>
            <div className="font-medium">{profile?.role_in_company}</div>
          </div>
          <p className="text-sm text-muted-foreground">
            O administrador do sistema irá revisar sua solicitação em breve. 
            Você receberá acesso assim que for aprovado.
          </p>
          <Button variant="outline" onClick={signOut} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleInCompany, setRoleInCompany] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        console.error('Login error:', error);
        if (error.message.includes('Invalid login credentials')) {
          toast.error('E-mail ou senha incorretos. Verifique suas credenciais ou crie uma conta.');
        } else {
          toast.error('Erro ao fazer login: ' + error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if user is approved
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_approved')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          toast.error('Erro ao verificar perfil. Tente novamente.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (profile && !profile.is_approved) {
          toast.info('Sua conta ainda não foi aprovada. Aguarde a aprovação do administrador.');
          navigate('/pending-approval');
          setLoading(false);
          return;
        }

        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Erro inesperado ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupPassword !== signupConfirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (signupPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (!fullName.trim() || !roleInCompany.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      console.log('Starting signup for:', signupEmail);
      
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: fullName,
            role_in_company: roleInCompany,
          },
        },
      });

      console.log('Signup response:', { data, error });

      if (error) {
        console.error('Signup error:', error);
        if (error.message.includes('already registered')) {
          toast.error('Este e-mail já está cadastrado. Tente fazer login.');
        } else {
          toast.error('Erro ao criar conta: ' + error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log('User created:', data.user.id);
        const isAdminEmail = signupEmail === 'f.durao@cyberenergia.com';
        
        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: signupEmail,
          full_name: fullName,
          role_in_company: roleInCompany,
          is_approved: isAdminEmail,
          is_admin: isAdminEmail,
        });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Profile might already exist due to trigger, that's ok
          // Check if it's a duplicate key error
          if (!profileError.message.includes('duplicate')) {
            toast.error('Erro ao criar perfil: ' + profileError.message);
          }
        }

        // Sign out after signup so user can login fresh
        await supabase.auth.signOut();
        
        if (isAdminEmail) {
          toast.success('Conta de administrador criada! Faça login para continuar.');
        } else {
          toast.success('Solicitação enviada! Aguarde a aprovação do administrador.');
        }
        
        // Clear form
        setSignupEmail('');
        setSignupPassword('');
        setSignupConfirmPassword('');
        setFullName('');
        setRoleInCompany('');
      } else {
        // User is null but no error - might need email confirmation
        toast.success('Verifique seu e-mail para confirmar o cadastro.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Erro inesperado ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-emerald-100 rounded-full">
              <Zap className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">CyberEnergia</CardTitle>
          <CardDescription>Middleware OT - Sistema de Gestão</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Solicitar Acesso</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Não tem conta? Clique em "Solicitar Acesso" acima.
                </p>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail corporativo *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@empresa.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full-name">Nome completo *</Label>
                  <Input
                    id="full-name"
                    type="text"
                    placeholder="João da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Função na empresa *</Label>
                  <Input
                    id="role"
                    type="text"
                    placeholder="Ex: Engenheiro de Automação"
                    value={roleInCompany}
                    onChange={(e) => setRoleInCompany(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  * Sua solicitação será analisada pelo administrador antes da aprovação.
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Solicitar Acesso'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
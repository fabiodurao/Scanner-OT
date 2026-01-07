import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Loader2, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  
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
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('E-mail não confirmado. Verifique sua caixa de entrada.');
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
          // Profile might not exist yet - create it
          if (profileError.code === 'PGRST116') {
            const { error: createError } = await supabase.from('profiles').insert({
              id: data.user.id,
              email: data.user.email || loginEmail,
              full_name: data.user.user_metadata?.full_name || 'Usuário',
              role_in_company: data.user.user_metadata?.role_in_company || 'Não informado',
              is_approved: data.user.email === 'f.durao@cyberenergia.com',
              is_admin: data.user.email === 'f.durao@cyberenergia.com',
            });
            
            if (createError) {
              console.error('Error creating profile:', createError);
            }
            
            if (data.user.email === 'f.durao@cyberenergia.com') {
              toast.success('Login realizado com sucesso!');
              navigate('/');
            } else {
              toast.info('Sua conta ainda não foi aprovada. Aguarde a aprovação do administrador.');
              navigate('/pending-approval');
            }
            setLoading(false);
            return;
          }
          
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

      // Check if email confirmation is required
      // When confirmation is required, user exists but identities array is empty
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        // User already exists
        toast.error('Este e-mail já está cadastrado. Tente fazer login.');
        setLoading(false);
        return;
      }

      if (data.user) {
        // Sign out immediately to prevent auto-login before email confirmation
        await supabase.auth.signOut();
        
        // Show email confirmation message
        setConfirmationEmail(signupEmail);
        setShowEmailConfirmation(true);
        
        // Clear form
        setSignupEmail('');
        setSignupPassword('');
        setSignupConfirmPassword('');
        setFullName('');
        setRoleInCompany('');
      }
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Erro inesperado ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Show email confirmation screen
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Confirme seu e-mail</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-100 rounded-lg p-4 text-center">
              <p className="font-medium text-slate-900">{confirmationEmail}</p>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Clique no link enviado para seu e-mail para ativar sua conta. 
                Após confirmar, volte aqui e faça login.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground text-center">
              <p>Não recebeu o e-mail?</p>
              <p>Verifique sua pasta de spam ou lixo eletrônico.</p>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowEmailConfirmation(false)}
            >
              Voltar para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  * Você receberá um e-mail de confirmação. Após confirmar, sua solicitação será analisada pelo administrador.
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
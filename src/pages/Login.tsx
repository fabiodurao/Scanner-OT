import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
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
          toast.error('E-mail ou senha incorretos.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('E-mail não confirmado. Verifique sua caixa de entrada.');
        } else {
          toast.error('Erro ao fazer login: ' + error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log('Login successful, checking profile...');
        
        // Fetch profile directly
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_approved, is_admin')
          .eq('id', data.user.id)
          .single();

        console.log('Profile result:', profile, profileError);

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          
          // Profile doesn't exist - create it
          if (profileError.code === 'PGRST116') {
            const isAdmin = data.user.email === 'f.durao@cyberenergia.com';
            
            const { error: createError } = await supabase.from('profiles').insert({
              id: data.user.id,
              email: data.user.email || loginEmail,
              full_name: data.user.user_metadata?.full_name || 'Usuário',
              role_in_company: data.user.user_metadata?.role_in_company || 'Não informado',
              is_approved: isAdmin,
              is_admin: isAdmin,
            });
            
            if (createError) {
              console.error('Error creating profile:', createError);
              toast.error('Erro ao criar perfil. Tente novamente.');
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
            
            // Refresh the auth context
            await refreshProfile();
            
            if (isAdmin) {
              toast.success('Login realizado com sucesso!');
              navigate('/', { replace: true });
            } else {
              toast.info('Aguardando aprovação do administrador.');
              navigate('/pending-approval', { replace: true });
            }
            setLoading(false);
            return;
          }
          
          toast.error('Erro ao verificar perfil. Tente novamente.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Refresh the auth context
        await refreshProfile();

        if (!profile.is_approved) {
          toast.info('Sua conta ainda não foi aprovada.');
          navigate('/pending-approval', { replace: true });
          setLoading(false);
          return;
        }

        toast.success('Login realizado com sucesso!');
        navigate('/', { replace: true });
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Erro ao fazer login.');
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

      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        toast.error('Este e-mail já está cadastrado. Tente fazer login.');
        setLoading(false);
        return;
      }

      setConfirmationEmail(signupEmail);
      setShowEmailConfirmation(true);
      setLoading(false);
      
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setFullName('');
      setRoleInCompany('');
      
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Erro inesperado ao criar conta.');
      setLoading(false);
    }
  };

  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2744] to-[#0f172a] p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Mail className="h-8 w-8 text-[#2563EB]" />
              </div>
            </div>
            <CardTitle className="text-2xl">Confirme seu e-mail</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
              <p className="font-medium text-[#1a2744]">{confirmationEmail}</p>
            </div>
            
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-[#2563EB]" />
              <AlertDescription>
                <strong>Passo 1:</strong> Clique no link enviado para seu e-mail para confirmar sua conta.
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Passo 2:</strong> Após confirmar o e-mail, um administrador precisará aprovar seu acesso. 
                Entre em contato com o administrador do sistema para agilizar a liberação.
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2744] to-[#0f172a] p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo-standard.png" 
              alt="Cyber Energia" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <CardDescription className="text-base">
            Scanner OT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Solicitar Acesso</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
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
                    className="h-11"
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
                    className="h-11"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Não tem conta? Clique em "Solicitar Acesso" acima.
                </p>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
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
                    className="h-11"
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
                    className="h-11"
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
                    className="h-11"
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
                    className="h-11"
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
                    className="h-11"
                  />
                </div>
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-[#2563EB]" />
                  <AlertDescription className="text-[#1a2744] text-xs">
                    Após o cadastro, você receberá um e-mail de confirmação. 
                    Depois de confirmar, um administrador precisará aprovar seu acesso ao sistema.
                  </AlertDescription>
                </Alert>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium"
                  disabled={loading}
                >
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
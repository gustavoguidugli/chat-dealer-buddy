import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import logoEcoIce from '@/assets/logo-ecoice.png';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isSuperAdmin, empresaId, semEmpresa, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      // Check for redirect param (e.g. from invite acceptance)
      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect, { replace: true });
        return;
      }

      if (semEmpresa) {
        navigate('/sem-empresa', { replace: true });
      } else if (isSuperAdmin && !empresaId) {
        navigate('/selecionar-empresa', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [user, isSuperAdmin, empresaId, semEmpresa, loading, navigate, searchParams]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-brand">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : error.message,
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email enviado', description: 'Verifique sua caixa de entrada.' });
      setResetMode(false);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-brand p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="items-center pb-2">
          <img src={logoEcoIce} alt="Eco Ice" className="h-16 w-16 rounded-2xl object-contain mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Eco Ice</h1>
          <p className="text-sm text-muted-foreground">
            {resetMode ? 'Recuperar senha' : 'Acesse sua conta'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!resetMode && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resetMode ? 'Enviar email de recuperação' : 'Entrar'}
            </Button>
            <button
              type="button"
              onClick={() => setResetMode(!resetMode)}
              className="w-full text-sm text-primary hover:underline"
            >
              {resetMode ? 'Voltar ao login' : 'Esqueci minha senha'}
            </button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">Acesso apenas por convite</p>
        </CardContent>
      </Card>
    </div>
  );
}

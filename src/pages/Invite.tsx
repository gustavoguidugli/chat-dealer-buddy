import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Snowflake, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface InviteValidation {
  valido: boolean;
  empresa_id: number;
  convite_id: string;
  erro: string;
  email_destino: string;
}

export default function Invite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [validating, setValidating] = useState(true);
  const [validation, setValidation] = useState<InviteValidation | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setValidation({ valido: false, empresa_id: 0, convite_id: '', erro: 'Nenhum token de convite fornecido.', email_destino: '' });
      return;
    }

    const validate = async () => {
      try {
        const { data, error } = await supabase.rpc('validar_convite', { p_token: token });
        if (error || !data || data.length === 0) {
          setValidation({ valido: false, empresa_id: 0, convite_id: '', erro: 'Não foi possível validar o convite.', email_destino: '' });
        } else {
          setValidation(data[0] as unknown as InviteValidation);
        }
      } catch {
        setValidation({ valido: false, empresa_id: 0, convite_id: '', erro: 'Erro ao validar convite.', email_destino: '' });
      } finally {
        setValidating(false);
      }
    };

    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (password.length < 8) {
      setErrors({ password: 'Senha deve ter no mínimo 8 caracteres' });
      return;
    }
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'As senhas não coincidem' });
      return;
    }

    if (!validation?.valido || !validation.empresa_id || !validation.convite_id || !validation.email_destino) return;

    setSubmitting(true);
    try {
      // 1. Create user with email from invite (no email confirmation needed)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validation.email_destino,
        password,
        options: {
          data: { full_name: validation.email_destino.split('@')[0] },
          emailRedirectTo: undefined,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast({ title: 'Erro', description: 'Este email já está cadastrado. Faça login.', variant: 'destructive' });
        } else {
          toast({ title: 'Erro', description: authError.message, variant: 'destructive' });
        }
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        toast({ title: 'Erro', description: 'Não foi possível criar sua conta.', variant: 'destructive' });
        return;
      }

      // 2. Link user to company
      const { error: linkError } = await supabase
        .from('user_empresa')
        .insert({
          user_id: userId,
          empresa_id: validation.empresa_id,
          convite_id: validation.convite_id,
          role: 'member',
        });

      if (linkError) console.error('Error linking user_empresa:', linkError);

      // 3. Link user_empresa_geral
      const { error: linkGeralError } = await supabase
        .from('user_empresa_geral')
        .insert({
          user_id: userId,
          empresa_id: validation.empresa_id,
        });

      if (linkGeralError) console.error('Error linking user_empresa_geral:', linkGeralError);

      // 4. Increment invite usage
      await supabase.rpc('usar_convite', {
        p_convite_id: validation.convite_id,
        p_user_id: userId,
      });

      // 5. Sign out and redirect to login
      await supabase.auth.signOut();

      toast({ title: 'Conta criada!', description: 'Faça login para continuar.' });
      navigate('/login', { replace: true });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível criar sua conta.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-brand p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="items-center pb-2">
            <Skeleton className="h-16 w-16 rounded-2xl mb-4" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validation?.valido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-brand p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="items-center pb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive mb-4">
              <AlertCircle className="h-9 w-9 text-destructive-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Convite Inválido</h1>
            <p className="text-sm text-muted-foreground text-center mt-2">
              {validation?.erro || 'Este link de convite não é válido ou já foi utilizado.'}
            </p>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-brand p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="items-center pb-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
            <Snowflake className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">EcoIce</h1>
          <p className="text-sm text-muted-foreground">Criar sua conta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={validation.email_destino}
                readOnly
                className="bg-muted"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">Email vinculado ao convite (não editável)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta
            </Button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full text-sm text-primary hover:underline"
            >
              Já tem conta? Entrar
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

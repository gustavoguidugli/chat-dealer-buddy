import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Snowflake, Eye, EyeOff, Check, X, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConviteData {
  valido: boolean;
  empresa_id: number;
  convite_id: string;
  erro: string | null;
  email_destino: string;
  role?: string;
}

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [conviteData, setConviteData] = useState<ConviteData | null>(null);
  const [conviteRole, setConviteRole] = useState('user');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Step 2
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const nameRegex = /^[a-zA-ZÀ-ÿ\s]{1,50}$/;
  const criteria = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*]/.test(password),
  };
  const allCriteriaMet = Object.values(criteria).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    if (!token) { navigate('/onboarding/invalid', { replace: true }); return; }

    (async () => {
      const { data, error } = await supabase.rpc('validar_convite', { p_token: token });
      if (error || !data || data.length === 0) {
        navigate('/onboarding/invalid', { replace: true });
        return;
      }
      const result = data[0] as unknown as ConviteData;
      if (!result.valido) {
        if (result.erro === 'Convite expirado') {
          // Mark as expired
          if (result.convite_id) {
            await supabase.from('convites').update({ status_convite: 'expired' }).eq('id', result.convite_id);
          }
          navigate('/onboarding/expired', { replace: true });
        } else if (result.erro === 'Convite já foi utilizado') {
          navigate('/onboarding/used', { replace: true });
        } else {
          navigate('/onboarding/invalid', { replace: true });
        }
        return;
      }

      // Fetch the convite role
      const { data: conviteRow } = await supabase
        .from('convites')
        .select('role')
        .eq('id', result.convite_id)
        .single();
      setConviteRole(conviteRow?.role ?? 'user');
      setConviteData(result);
      setLoading(false);
    })();
  }, [token, navigate]);

  const handleFinish = async () => {
    if (!conviteData) return;
    setSubmitting(true);

    try {
      // 1. Sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: conviteData.email_destino,
        password,
      });
      if (signUpError) throw signUpError;
      const newUserId = signUpData.user?.id;
      if (!newUserId) throw new Error('Não foi possível criar a conta');

      // 2. Upsert usuarios
      await supabase.from('usuarios').upsert({
        uuid: newUserId,
        email: conviteData.email_destino,
        primeiro_nome: firstName.trim(),
        sobrenome: lastName.trim(),
        nome: `${firstName.trim()} ${lastName.trim()}`,
        id_empresa: conviteData.empresa_id,
        nivel_acesso: conviteRole,
        onboarding_completed: true,
      }, { onConflict: 'uuid' });

      // 3. Insert usuario_time
      await supabase.from('usuario_time').insert({
        id_usuario: newUserId,
        id_empresa: conviteData.empresa_id,
        role: conviteRole,
        status_membro: 'active',
      });

      // 4. Accept invite via RPC
      await supabase.rpc('aceitar_convite', {
        p_convite_id: conviteData.convite_id,
        p_user_id: newUserId,
      });

      // 5. Update convite status
      await supabase.from('convites').update({
        status_convite: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: newUserId,
      }).eq('id', conviteData.convite_id);

      // 6. Audit log
      await supabase.from('audit_logs').insert({
        actor_user_id: newUserId,
        action: 'onboarding_completed',
        entity_type: 'convites',
        entity_id: conviteData.convite_id,
      });

      // 7. Auto-login
      await supabase.auth.signInWithPassword({
        email: conviteData.email_destino,
        password,
      });

      toast({ title: 'Conta criada com sucesso!' });
      navigate('/home', { replace: true });
    } catch (err: any) {
      toast({ title: 'Erro ao criar conta', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const CriteriaItem = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? <Check className="h-4 w-4 text-accent" /> : <X className="h-4 w-4 text-muted-foreground" />}
      <span className={met ? 'text-accent' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Snowflake className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold text-foreground">Eco Ice</span>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-2 w-16 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>

      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm p-8">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Bem-vindo ao Ecoice</h2>
              <p className="text-sm text-muted-foreground mt-1">Vamos configurar sua conta</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={50} placeholder="Seu primeiro nome" />
                {firstName && !nameRegex.test(firstName) && <p className="text-xs text-destructive mt-1">Apenas letras e espaços</p>}
              </div>
              <div>
                <Label>Sobrenome</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} maxLength={50} placeholder="Seu sobrenome" />
                {lastName && !nameRegex.test(lastName) && <p className="text-xs text-destructive mt-1">Apenas letras e espaços</p>}
              </div>
            </div>
            <Button className="w-full" disabled={!firstName.trim() || !lastName.trim() || !nameRegex.test(firstName) || !nameRegex.test(lastName)} onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Crie sua senha</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Nova senha</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirmar senha</Label>
                <div className="relative">
                  <Input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>}
              </div>
              <div className="space-y-1.5 p-3 bg-muted rounded-lg">
                <CriteriaItem met={criteria.length} label="Mínimo 8 caracteres" />
                <CriteriaItem met={criteria.upper} label="Uma letra maiúscula" />
                <CriteriaItem met={criteria.lower} label="Uma letra minúscula" />
                <CriteriaItem met={criteria.number} label="Um número" />
                <CriteriaItem met={criteria.special} label="Um caractere especial (!@#$%^&*)" />
              </div>
            </div>
            <Button className="w-full" disabled={!allCriteriaMet || !passwordsMatch} onClick={() => setStep(3)}>
              Continuar
            </Button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground">Proteja sua conta</h2>
              <p className="text-sm text-muted-foreground mt-2">
                A autenticação em dois fatores impede acessos não autorizados mesmo que sua senha seja comprometida. Leva menos de 1 minuto para configurar.
              </p>
            </div>

            {conviteRole === 'admin' && (
              <p className="text-xs text-muted-foreground text-center">Administradores precisam configurar o 2FA</p>
            )}

            <Button className="w-full" onClick={handleFinish} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {conviteRole === 'admin' ? 'Configurar agora' : 'Configurar agora'}
            </Button>

            {conviteRole !== 'admin' && (
              <button
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleFinish}
                disabled={submitting}
              >
                Configurar mais tarde
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConviteData {
  valido: boolean;
  empresa_id: number;
  id: string;
  erro: string | null;
  email_destino: string;
  role: string;
}

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [conviteData, setConviteData] = useState<ConviteData | null>(null);
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
          navigate('/onboarding/expired', { replace: true });
        } else if (result.erro === 'Convite já foi utilizado') {
          navigate('/onboarding/used', { replace: true });
        } else if (result.erro === 'Convite desativado') {
          navigate('/onboarding/used', { replace: true });
        } else {
          navigate('/onboarding/invalid', { replace: true });
        }
        return;
      }
      setConviteData(result);
      setLoading(false);
    })();
  }, [token, navigate]);

  const handleFinish = async () => {
    if (!conviteData) return;
    setSubmitting(true);

    try {
      // 1. Sign up (or sign in if user already exists)
      let newUserId: string | undefined;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: conviteData.email_destino,
        password,
      });
      if (signUpError) {
        if (signUpError.message?.includes('User already registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: conviteData.email_destino,
            password,
          });
          if (signInError) throw signInError;
          newUserId = signInData.user?.id;
        } else {
          throw signUpError;
        }
      } else {
        newUserId = signUpData.user?.id;
      }
      if (!newUserId) throw new Error('Não foi possível criar a conta');

      // 2. Accept invite + setup via Edge Function (runs with service role, bypasses RLS)
      const { data: efResult, error: efError } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'complete_onboarding',
          user_id: newUserId,
          convite_id: conviteData.id,
          primeiro_nome: firstName.trim(),
          sobrenome: lastName.trim(),
          email: conviteData.email_destino,
          empresa_id: conviteData.empresa_id,
          role: conviteData.role,
        },
      });
      if (efError) throw new Error('Erro ao vincular conta à empresa');
      const efData = efResult as { success?: boolean; error?: string };
      if (!efData?.success) throw new Error(efData?.error || 'Erro ao completar onboarding');

      // 7. Re-login to refresh session
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
      <div className="min-h-screen bg-gradient-to-br from-[hsl(240,30%,12%)] via-[hsl(260,40%,18%)] to-[hsl(230,35%,10%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  const CriteriaItem = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-400" />}
      <span className={met ? 'text-green-600' : 'text-gray-400'}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(240,30%,12%)] via-[hsl(260,40%,18%)] to-[hsl(230,35%,10%)] flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsla(260,60%,30%,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsla(230,60%,25%,0.2) 0%, transparent 40%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-10">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Bem-vindo à Eco Ice</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-900">Nome</Label>
                <Input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  maxLength={50}
                  placeholder="Escreva aqui..."
                  className="h-12 text-base border-gray-300 rounded-xl"
                />
                {firstName && !nameRegex.test(firstName) && <p className="text-xs text-red-500">Apenas letras e espaços</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-900">Sobrenome</Label>
                <Input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  maxLength={50}
                  placeholder="Escreva aqui..."
                  className="h-12 text-base border-gray-300 rounded-xl"
                />
                {lastName && !nameRegex.test(lastName) && <p className="text-xs text-red-500">Apenas letras e espaços</p>}
              </div>
            </div>
            <Button
              className="w-full h-12 text-base rounded-xl"
              disabled={!firstName.trim() || !lastName.trim() || !nameRegex.test(firstName) || !nameRegex.test(lastName)}
              onClick={() => setStep(2)}
            >
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Bem-vindo à Eco Ice</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-900">Nova senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Escreva aqui..."
                    className="h-12 text-base border-gray-300 rounded-xl pr-12"
                  />
                  <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-900">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Escreva aqui..."
                    className="h-12 text-base border-gray-300 rounded-xl pr-12"
                  />
                  <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && <p className="text-xs text-red-500">As senhas não coincidem</p>}
              </div>
              <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl">
                <CriteriaItem met={criteria.length} label="Mínimo 8 caracteres" />
                <CriteriaItem met={criteria.upper} label="Uma letra maiúscula" />
                <CriteriaItem met={criteria.lower} label="Uma letra minúscula" />
                <CriteriaItem met={criteria.number} label="Um número" />
                <CriteriaItem met={criteria.special} label="Um caractere especial (!@#$%^&*)" />
              </div>
            </div>
            <Button
              className="w-full h-12 text-base rounded-xl"
              disabled={!allCriteriaMet || !passwordsMatch || submitting}
              onClick={handleFinish}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Acessar Eco Ice
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import logoEcoIce from '@/assets/logo-ecoice.png';
import { useToast } from '@/hooks/use-toast';

export default function AceitarConvite() {
  const [searchParams] = useSearchParams();
  const conviteId = searchParams.get('convite_id');
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (authLoading || done) return;

    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=${encodeURIComponent(`/aceitar-convite?convite_id=${conviteId}`)}`, { replace: true });
      return;
    }

    if (!conviteId) {
      setError('Nenhum convite especificado.');
      return;
    }

    const acceptInvite = async () => {
      setProcessing(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'aceitar_convite_pos_login',
            convite_id: conviteId,
          },
        });

        if (fnError || data?.error) {
          setError(data?.error || fnError?.message || 'Erro ao aceitar convite');
          return;
        }

        setDone(true);

        // Refresh auth context so empresaId/semEmpresa update
        await refreshUserData();

        toast({ title: 'Bem-vindo à empresa! 🎉' });
        navigate('/home', { replace: true });
      } catch (err: any) {
        setError(err.message || 'Erro inesperado');
      } finally {
        setProcessing(false);
      }
    };

    acceptInvite();
  }, [user, authLoading, conviteId, navigate, toast, done, refreshUserData]);

  if (authLoading || processing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-brand p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="items-center pb-2">
            <img src={logoEcoIce} alt="Eco Ice" className="h-16 w-16 rounded-2xl object-contain mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Aceitando convite...</h1>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-brand p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="items-center pb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive mb-4">
              <AlertCircle className="h-9 w-9 text-destructive-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Erro no convite</h1>
            <p className="text-sm text-muted-foreground text-center mt-2">{error}</p>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Ir para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

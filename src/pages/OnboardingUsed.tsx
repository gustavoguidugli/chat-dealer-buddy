import { CheckCircle, Snowflake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function OnboardingUsed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Snowflake className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold text-foreground">Eco Ice</span>
      </div>
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm p-8 text-center">
        <CheckCircle className="h-12 w-12 text-accent mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Convite já utilizado</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Este convite já foi aceito anteriormente. Se você já tem uma conta, acesse o sistema normalmente.
        </p>
        <Button onClick={() => navigate('/login')}>Ir para o login</Button>
      </div>
    </div>
  );
}

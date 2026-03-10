import { AlertTriangle } from 'lucide-react';
import { Snowflake } from 'lucide-react';

export default function OnboardingInvalid() {
  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Snowflake className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold text-foreground">Eco Ice</span>
      </div>
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Link inválido</h1>
        <p className="text-sm text-muted-foreground">
          Este link de convite não é válido. Verifique o e-mail recebido ou solicite um novo convite ao administrador do time.
        </p>
      </div>
    </div>
  );
}

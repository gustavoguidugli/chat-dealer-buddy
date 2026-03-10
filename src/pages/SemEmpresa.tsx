import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Snowflake, LogOut } from 'lucide-react';

export default function SemEmpresa() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-brand p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="items-center pb-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
            <Snowflake className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sem empresa vinculada</h1>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Sua conta ainda não está vinculada a nenhuma empresa. Verifique se recebeu um convite por email ou entre em contato com o administrador.
          </p>
          <p className="text-xs text-muted-foreground">
            Se você acabou de aceitar um convite, tente fazer login novamente.
          </p>
          <Button onClick={signOut} variant="outline" className="w-full gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

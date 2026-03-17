import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function Home() {
  const { empresaNome } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Bem-vindo, {empresaNome || 'EcoIce'}!
        </h1>
        <p className="text-muted-foreground mb-6">O que você gostaria de fazer hoje?</p>

        <div className="grid gap-6 sm:grid-cols-2 max-w-2xl">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
            onClick={() => navigate('/triagem')}
          >
            <CardContent className="p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-muted text-primary mb-4">
                <Bot className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Triagem do agente</h2>
              <p className="text-sm text-muted-foreground">Configure os interesses e mensagens automáticas do chatbot</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

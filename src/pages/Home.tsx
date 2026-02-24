import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, BookOpen } from 'lucide-react';

const cards = [
  {
    to: '/triagem',
    icon: Bot,
    title: 'Triagem do agente',
    description: 'Configure os interesses e mensagens automáticas do chatbot',
    colorClass: 'bg-primary-muted text-primary',
  },
  {
    to: '/base-conhecimento',
    icon: BookOpen,
    title: 'Base de conhecimento',
    description: 'Gerencie FAQs, horários e configurações do chatbot',
    colorClass: 'bg-accent-muted text-accent',
  },
];

export default function Home() {
  const { empresaNome } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Bem-vindo, {empresaNome || 'EcoIce'}!
        </h1>
        <p className="text-muted-foreground mb-8">O que você gostaria de fazer hoje?</p>

        <div className="grid gap-6 sm:grid-cols-2 max-w-2xl">
          {cards.map((card) => (
            <Card
              key={card.to}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              onClick={() => navigate(card.to)}
            >
              <CardContent className="p-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${card.colorClass} mb-4`}>
                  <card.icon className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{card.title}</h2>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

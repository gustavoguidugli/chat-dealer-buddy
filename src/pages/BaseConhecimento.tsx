import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, Timer } from 'lucide-react';

const sections = [
  {
    icon: MessageSquare,
    title: 'FAQs - Perguntas Frequentes',
    description: 'Aqui você poderá gerenciar as perguntas frequentes do chatbot',
  },
  {
    icon: Clock,
    title: 'Horário de Atendimento',
    description: 'Configure quando o chatbot deve responder automaticamente',
  },
  {
    icon: Timer,
    title: 'Tempo de Espera',
    description: 'Defina quanto tempo o bot aguarda antes de responder',
  },
];

export default function BaseConhecimento() {
  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Base de Conhecimento</h1>
        <p className="text-muted-foreground text-sm mb-8">Gerencie as configurações do chatbot</p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Card key={section.title} className="opacity-60">
              <CardHeader>
                <Badge variant="outline" className="w-fit text-xs mb-3">🚧 Em breve</Badge>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-2">
                  <section.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

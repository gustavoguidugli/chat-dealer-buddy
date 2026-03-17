import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, ShieldCheck } from 'lucide-react';

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

        <Tabs defaultValue="inicio">
          <TabsList>
            <TabsTrigger value="inicio">Início</TabsTrigger>
            <TabsTrigger value="privacidade">Política de Privacidade</TabsTrigger>
          </TabsList>

          <TabsContent value="inicio">
            <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mt-4">
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
          </TabsContent>

          <TabsContent value="privacidade">
            <article className="max-w-3xl mt-6 space-y-8 text-foreground leading-relaxed">
              <header>
                <h2 className="text-2xl font-bold mb-1">Política de Privacidade</h2>
                <p className="text-sm text-muted-foreground">Última atualização: 16 de março de 2026</p>
              </header>

              <p>
                A Eco Ice - Comércio de Equipamentos Ltda valoriza a privacidade dos seus usuários. Esta Política descreve como coletamos, usamos, armazenamos, compartilhamos e excluímos dados pessoais, incluindo integrações com a Meta e o WhatsApp Business Platform.
              </p>

              <section>
                <h3 className="text-lg font-semibold mb-2">1. Quem somos</h3>
                <ul className="space-y-1 text-sm">
                  <li><strong>Empresa:</strong> Eco Ice - Comércio de Equipamentos Ltda</li>
                  <li><strong>CNPJ:</strong> 52.691.034/0001-73</li>
                  <li><strong>Endereço:</strong> R. Edwy Taques de Araújo, 1000, BRCAO B2-A, Gleba Fazenda Palhano, Londrina - PR, CEP 86.047-790</li>
                  <li><strong>E-mail:</strong> guidugli.gustavo@gmail.com</li>
                  <li><strong>Telefone:</strong> (43) 99697-1234</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">2. Dados que coletamos</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Nome completo</li>
                  <li>Número de telefone (WhatsApp)</li>
                  <li>Mensagens enviadas via WhatsApp Business Platform</li>
                  <li>Dados fornecidos em formulários de atendimento</li>
                  <li>Informações sobre pedidos, orçamentos e negociações</li>
                  <li>Dados técnicos mínimos: endereço IP, tipo de dispositivo, logs de acesso</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">3. Como usamos os dados</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Prestar atendimento ao usuário</li>
                  <li>Responder mensagens e solicitações</li>
                  <li>Operar, manter e melhorar a plataforma</li>
                  <li>Realizar comunicações relacionadas ao serviço</li>
                  <li>Automatizar processos de vendas com consentimento do usuário</li>
                  <li>Garantir segurança, prevenir fraudes e cumprir obrigações legais</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">4. Compartilhamento de dados</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Meta / WhatsApp — quando a comunicação ocorrer por esses canais</li>
                  <li>Provedores de infraestrutura e hospedagem</li>
                  <li>Ferramentas de CRM e automação</li>
                  <li>Autoridades públicas, quando exigido por lei</li>
                </ul>
                <p className="text-sm mt-2">Não vendemos dados pessoais dos usuários.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">5. Armazenamento e retenção</h3>
                <p className="text-sm">
                  Os dados são mantidos pelo tempo necessário para cumprir as finalidades descritas nesta Política, ou por exigência legal. Após esse prazo, são eliminados de forma segura ou anonimizados.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">6. Direitos do usuário (LGPD — Lei nº 13.709/2018)</h3>
                <p className="text-sm mb-2">O usuário pode solicitar a qualquer momento:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Confirmação do tratamento de dados</li>
                  <li>Acesso aos seus dados</li>
                  <li>Correção de dados incompletos ou desatualizados</li>
                  <li>Exclusão dos dados, quando aplicável</li>
                  <li>Portabilidade para outro fornecedor</li>
                  <li>Revogação de consentimento</li>
                </ul>
              </section>

              <section id="exclusao">
                <h3 className="text-lg font-semibold mb-2">7. Exclusão de dados</h3>
                <p className="text-sm">
                  Para solicitar a exclusão dos seus dados, envie um e-mail para guidugli.gustavo@gmail.com com o assunto "Exclusão de Dados", informando seu nome completo e número de telefone. Responderemos em até 15 dias úteis.
                </p>
                <p className="text-sm mt-2">
                  Parte das informações pode ser retida por exigência legal ou regulatória.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">8. Segurança</h3>
                <p className="text-sm">
                  Adotamos medidas técnicas adequadas para proteger os dados contra acesso não autorizado, perda ou alteração, incluindo comunicação criptografada via HTTPS, controle de acesso por perfis e monitoramento de acessos.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">9. Alterações desta política</h3>
                <p className="text-sm">
                  Esta Política pode ser atualizada periodicamente. Recomendamos consulta regular desta página. A data de "última atualização" indica sempre a versão vigente.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">10. Contato</h3>
                <ul className="space-y-1 text-sm">
                  <li><strong>E-mail:</strong> guidugli.gustavo@gmail.com</li>
                  <li><strong>Assunto:</strong> Privacidade / Proteção de Dados</li>
                  <li><strong>Prazo de resposta:</strong> até 15 dias úteis</li>
                </ul>
              </section>
            </article>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

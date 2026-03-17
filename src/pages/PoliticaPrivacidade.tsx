export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 16 de março de 2026</p>

        <p className="mb-8 text-muted-foreground">
          A Eco Ice respeita e protege a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos, compartilhamos e excluímos dados pessoais no contexto do uso da nossa plataforma e dos canais de atendimento, incluindo integrações com a Meta e o WhatsApp Business Platform. Ao utilizar nossos serviços, você concorda com as práticas descritas neste documento.
        </p>

        {/* 01 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Quem somos</h2>
          <p className="text-muted-foreground mb-3">
            Somos a Eco Ice, uma empresa que desenvolve agentes conversacionais com inteligência artificial para automação de vendas via WhatsApp, atendendo empresas que operam na rede de distribuição da Everest.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><strong>Empresa:</strong> Eco Ice</li>
            <li><strong>CNPJ:</strong> 52.691.034/0001-73</li>
            <li><strong>E-mail:</strong> guidugli.gustavo@gmail.com</li>
          </ul>
        </section>

        {/* 02 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Dados que coletamos</h2>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            <li>Nome completo</li>
            <li>Número de telefone (WhatsApp)</li>
            <li>Mensagens trocadas via WhatsApp Business Platform</li>
            <li>Dados fornecidos em formulários de cadastro ou atendimento</li>
            <li>Informações relacionadas a pedidos, orçamentos e negociações</li>
            <li>Dados técnicos mínimos: endereço IP, tipo de dispositivo, logs de acesso</li>
          </ul>
          <p className="text-muted-foreground mt-3">Coletamos apenas os dados estritamente necessários para a prestação dos serviços.</p>
        </section>

        {/* 03 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Como usamos os dados</h2>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            <li>Prestar atendimento e suporte ao usuário</li>
            <li>Responder mensagens, solicitações e orçamentos</li>
            <li>Operar, manter e aprimorar a plataforma</li>
            <li>Realizar comunicações relacionadas ao serviço contratado</li>
            <li>Automatizar processos de vendas com consentimento do usuário</li>
            <li>Garantir segurança, prevenir fraudes e cumprir obrigações legais</li>
            <li>Gerar relatórios internos de desempenho do atendimento</li>
          </ul>
        </section>

        {/* 04 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de dados</h2>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            <li>Meta / WhatsApp — nos termos das políticas da Meta Platforms, Inc.</li>
            <li>Provedores de infraestrutura e hospedagem</li>
            <li>Ferramentas de CRM e automação</li>
            <li>Autoridades públicas — quando exigido por lei</li>
          </ul>
          <p className="text-muted-foreground mt-3 font-medium">Não vendemos, alugamos ou comercializamos dados pessoais dos usuários.</p>
        </section>

        {/* 05 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Armazenamento e retenção</h2>
          <p className="text-muted-foreground mb-2">Dados mantidos pelo tempo necessário para cumprir as finalidades descritas. O prazo pode ser estendido por:</p>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            <li>Obrigação legal ou regulatória</li>
            <li>Exercício de direitos em processos</li>
            <li>Legítimo interesse reconhecido em lei</li>
          </ul>
          <p className="text-muted-foreground mt-3">Após o prazo, dados são eliminados de forma segura ou anonimizados.</p>
        </section>

        {/* 06 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Direitos do usuário (LGPD — Lei nº 13.709/2018)</h2>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            <li>Confirmação da existência do tratamento de dados</li>
            <li>Acesso aos dados pessoais que possuímos</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
            <li>Portabilidade dos dados para outro fornecedor</li>
            <li>Exclusão dos dados tratados com base em consentimento</li>
            <li>Informação sobre compartilhamento com terceiros</li>
            <li>Revogação de consentimento, quando aplicável</li>
          </ul>
        </section>

        {/* 07 — exclusao anchor for Meta */}
        <section id="exclusao" className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Exclusão de dados</h2>
          <div className="bg-muted/50 border border-border rounded-md p-4">
            <p className="text-muted-foreground mb-3">
              <strong>Como solicitar a exclusão:</strong> envie e-mail para{' '}
              <a href="mailto:guidugli.gustavo@gmail.com" className="text-primary underline">guidugli.gustavo@gmail.com</a>{' '}
              com assunto <em>"Exclusão de Dados"</em>, informando seu nome e telefone.
            </p>
            <ul className="text-muted-foreground space-y-1 list-disc pl-5">
              <li>Resposta em até <strong>15 dias úteis</strong></li>
              <li>Parte das informações pode ser retida por exigência legal</li>
              <li>Usuários via WhatsApp também podem solicitar exclusão diretamente pelo canal de atendimento</li>
            </ul>
          </div>
        </section>

        {/* 08 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Segurança</h2>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            <li>Comunicação criptografada via HTTPS/TLS</li>
            <li>Controle de acesso baseado em perfis e funções</li>
            <li>Autenticação segura nos sistemas internos</li>
            <li>Monitoramento e auditoria de acessos</li>
            <li>Backups regulares com retenção controlada</li>
          </ul>
          <p className="text-muted-foreground mt-3">Em caso de incidente, notificaremos os titulares conforme a legislação vigente.</p>
        </section>

        {/* 09 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Alterações desta política</h2>
          <p className="text-muted-foreground">Esta Política pode ser atualizada periodicamente. Recomendamos consulta regular. A data de "última atualização" sempre indica a versão vigente.</p>
        </section>

        {/* 10 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><strong>E-mail:</strong> guidugli.gustavo@gmail.com</li>
            <li><strong>Assunto:</strong> Privacidade / Proteção de Dados</li>
            <li><strong>Resposta:</strong> Até 15 dias úteis</li>
          </ul>
        </section>

        <footer className="pt-6 border-t border-border text-xs text-muted-foreground">
          © 2026 Eco Ice. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
}
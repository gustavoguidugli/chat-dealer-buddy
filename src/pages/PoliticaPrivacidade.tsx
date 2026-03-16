import { useEffect } from 'react';
import { Calendar, Shield, Mail, Building2, Globe, FileText } from 'lucide-react';

const sections = [
  { id: 'quem-somos', num: '01', title: 'Quem somos', shortTitle: 'Quem somos' },
  { id: 'dados-coletados', num: '02', title: 'Dados que coletamos', shortTitle: 'Dados coletados' },
  { id: 'uso-dados', num: '03', title: 'Como usamos os dados', shortTitle: 'Uso dos dados' },
  { id: 'compartilhamento', num: '04', title: 'Compartilhamento de dados', shortTitle: 'Compartilhamento' },
  { id: 'armazenamento', num: '05', title: 'Armazenamento e retenção', shortTitle: 'Armazenamento' },
  { id: 'direitos', num: '06', title: 'Direitos do usuário', shortTitle: 'Direitos do usuário' },
  { id: 'exclusao', num: '07', title: 'Exclusão de dados', shortTitle: 'Exclusão de dados' },
  { id: 'seguranca', num: '08', title: 'Segurança', shortTitle: 'Segurança' },
  { id: 'alteracoes', num: '09', title: 'Alterações desta política', shortTitle: 'Alterações' },
  { id: 'contato', num: '10', title: 'Contato', shortTitle: 'Contato' },
];

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-r" style={{
      background: '#e8eef8',
      borderLeft: '3px solid #1e4d8c',
      borderRadius: '0 4px 4px 0',
      padding: '16px 20px',
      marginTop: '12px',
    }}>
      {children}
    </div>
  );
}

function HighlightBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff8ed',
      border: '1px solid #f0d9a8',
      borderRadius: '4px',
      padding: '16px 20px',
      marginTop: '12px',
    }}>
      {children}
    </div>
  );
}

function SectionBlock({ id, num, title, children, index }: {
  id: string; num: string; title: string; children: React.ReactNode; index: number;
}) {
  return (
    <section
      id={id}
      className="pp-fade-up"
      style={{ animationDelay: `${index * 80}ms`, borderBottom: '1px solid #e2e0d8', paddingBottom: '32px', marginBottom: '32px' }}
    >
      <p style={{ color: '#1e4d8c', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
        {num}
      </p>
      <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '28px', color: '#1a1915', letterSpacing: '-0.02em', marginBottom: '16px' }}>
        {title}
      </h2>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: '16px', lineHeight: 1.75, color: '#1a1915' }}>
        {children}
      </div>
    </section>
  );
}

export default function PoliticaPrivacidade() {
  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div style={{ background: '#f7f6f2', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      {/* CSS for animations */}
      <style>{`
        @keyframes ppFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pp-fade-up {
          animation: ppFadeUp 0.5s ease forwards;
          opacity: 0;
        }
        .pp-nav-link {
          transition: color 0.15s;
        }
        .pp-nav-link:hover {
          color: #1e4d8c !important;
        }
      `}</style>

      {/* Header sticky */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffff', borderBottom: '1px solid #e2e0d8',
        padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: '#1e4d8c', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'Instrument Serif, serif', fontSize: '16px', fontWeight: 400,
          }}>E</div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '16px', color: '#1a1915' }}>
            Eco Ice
          </span>
        </div>
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b6960',
        }}>
          Política de Privacidade
        </span>
      </header>

      {/* Hero banner */}
      <div style={{
        background: '#1e4d8c', color: '#fff',
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
          fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em',
          opacity: 0.65, marginBottom: '12px',
        }}>
          Documento legal
        </p>
        <h1 style={{
          fontFamily: 'Instrument Serif, serif', fontWeight: 400,
          fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '-0.02em',
          marginBottom: '16px',
        }}>
          Política de Privacidade
        </h1>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '16px', flexWrap: 'wrap',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: '14px', opacity: 0.85,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> 16 de março de 2026
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} /> WhatsApp Business &amp; Meta Cloud API
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: '960px', margin: '0 auto',
        padding: '40px 24px 64px',
        display: 'flex', gap: '48px',
      }}>
        {/* Sidebar nav */}
        <nav className="hidden md:block" style={{
          width: '220px', flexShrink: 0,
          position: 'sticky', top: '80px', alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
        }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sections.map((s) => (
              <li key={s.id} style={{ marginBottom: '8px' }}>
                <a
                  href={`#${s.id}`}
                  className="pp-nav-link"
                  style={{
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '13px',
                    color: '#6b6960', textDecoration: 'none',
                    display: 'flex', gap: '8px',
                  }}
                >
                  <span style={{ color: '#1e4d8c', fontVariantNumeric: 'tabular-nums', minWidth: '20px' }}>{s.num}</span>
                  {s.shortTitle}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Intro */}
          <div className="pp-fade-up" style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #e2e0d8', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: '16px', lineHeight: 1.75, color: '#1a1915' }}>
            <p>
              A Eco Ice respeita e protege a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos, compartilhamos e excluímos dados pessoais no contexto do uso da nossa plataforma e dos canais de atendimento, incluindo integrações com a Meta e o WhatsApp Business Platform. Ao utilizar nossos serviços, você concorda com as práticas descritas neste documento.
            </p>
          </div>

          {/* 01 */}
          <SectionBlock id="quem-somos" num="01" title="Quem somos" index={1}>
            <p>Somos a Eco Ice, uma empresa que desenvolve agentes conversacionais com inteligência artificial para automação de vendas via WhatsApp, atendendo empresas que operam na rede de distribuição da Everest.</p>
            <InfoCard>
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={14} style={{ color: '#1e4d8c' }} /> <strong>Empresa:</strong> Eco Ice</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={14} style={{ color: '#1e4d8c' }} /> <strong>CNPJ:</strong> [CNPJ DA EMPRESA]</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={14} style={{ color: '#1e4d8c' }} /> <strong>Site:</strong> [URL do site]</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} style={{ color: '#1e4d8c' }} /> <strong>E-mail:</strong> privacidade@ecoice.com.br</span>
              </div>
            </InfoCard>
          </SectionBlock>

          {/* 02 */}
          <SectionBlock id="dados-coletados" num="02" title="Dados que coletamos" index={2}>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Nome completo</li>
              <li>Número de telefone (WhatsApp)</li>
              <li>Mensagens trocadas via WhatsApp Business Platform</li>
              <li>Dados fornecidos em formulários de cadastro ou atendimento</li>
              <li>Informações relacionadas a pedidos, orçamentos e negociações</li>
              <li>Dados técnicos mínimos: endereço IP, tipo de dispositivo, logs de acesso</li>
            </ul>
            <p style={{ marginTop: '12px' }}>Coletamos apenas os dados estritamente necessários para a prestação dos serviços.</p>
          </SectionBlock>

          {/* 03 */}
          <SectionBlock id="uso-dados" num="03" title="Como usamos os dados" index={3}>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Prestar atendimento e suporte ao usuário</li>
              <li>Responder mensagens, solicitações e orçamentos</li>
              <li>Operar, manter e aprimorar a plataforma</li>
              <li>Realizar comunicações relacionadas ao serviço contratado</li>
              <li>Automatizar processos de vendas com consentimento do usuário</li>
              <li>Garantir segurança, prevenir fraudes e cumprir obrigações legais</li>
              <li>Gerar relatórios internos de desempenho do atendimento</li>
            </ul>
          </SectionBlock>

          {/* 04 */}
          <SectionBlock id="compartilhamento" num="04" title="Compartilhamento de dados" index={4}>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Meta / WhatsApp — nos termos das políticas da Meta Platforms, Inc.</li>
              <li>Provedores de infraestrutura e hospedagem</li>
              <li>Ferramentas de CRM e automação</li>
              <li>Autoridades públicas — quando exigido por lei</li>
            </ul>
            <p style={{ marginTop: '12px', fontWeight: 400 }}>Não vendemos, alugamos ou comercializamos dados pessoais dos usuários.</p>
          </SectionBlock>

          {/* 05 */}
          <SectionBlock id="armazenamento" num="05" title="Armazenamento e retenção" index={5}>
            <p>Dados mantidos pelo tempo necessário para cumprir as finalidades descritas. O prazo pode ser estendido por:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0 0' }}>
              <li>Obrigação legal ou regulatória</li>
              <li>Exercício de direitos em processos</li>
              <li>Legítimo interesse reconhecido em lei</li>
            </ul>
            <p style={{ marginTop: '12px' }}>Após o prazo, dados são eliminados de forma segura ou anonimizados.</p>
          </SectionBlock>

          {/* 06 */}
          <SectionBlock id="direitos" num="06" title="Direitos do usuário (LGPD — Lei nº 13.709/2018)" index={6}>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Confirmação da existência do tratamento de dados</li>
              <li>Acesso aos dados pessoais que possuímos</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados para outro fornecedor</li>
              <li>Exclusão dos dados tratados com base em consentimento</li>
              <li>Informação sobre compartilhamento com terceiros</li>
              <li>Revogação de consentimento, quando aplicável</li>
            </ul>
          </SectionBlock>

          {/* 07 — exclusao anchor for Meta */}
          <SectionBlock id="exclusao" num="07" title="Exclusão de dados" index={7}>
            <HighlightBox>
              <p style={{ margin: 0 }}>
                <strong>Como solicitar a exclusão:</strong> envie e-mail para{' '}
                <a href="mailto:privacidade@ecoice.com.br" style={{ color: '#1e4d8c', textDecoration: 'underline' }}>
                  privacidade@ecoice.com.br
                </a>{' '}
                com assunto <em>"Exclusão de Dados"</em>, informando seu nome e telefone.
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '12px', marginBottom: 0 }}>
                <li>Resposta em até <strong>15 dias úteis</strong></li>
                <li>Parte das informações pode ser retida por exigência legal</li>
                <li>Usuários via WhatsApp também podem solicitar exclusão diretamente pelo canal de atendimento</li>
              </ul>
            </HighlightBox>
          </SectionBlock>

          {/* 08 */}
          <SectionBlock id="seguranca" num="08" title="Segurança" index={8}>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Comunicação criptografada via HTTPS/TLS</li>
              <li>Controle de acesso baseado em perfis e funções</li>
              <li>Autenticação segura nos sistemas internos</li>
              <li>Monitoramento e auditoria de acessos</li>
              <li>Backups regulares com retenção controlada</li>
            </ul>
            <p style={{ marginTop: '12px' }}>Em caso de incidente, notificaremos os titulares conforme a legislação vigente.</p>
          </SectionBlock>

          {/* 09 */}
          <SectionBlock id="alteracoes" num="09" title="Alterações desta política" index={9}>
            <p>Esta Política pode ser atualizada periodicamente. Recomendamos consulta regular. A data de "última atualização" sempre indica a versão vigente.</p>
          </SectionBlock>

          {/* 10 */}
          <SectionBlock id="contato" num="10" title="Contato" index={10}>
            <InfoCard>
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} style={{ color: '#1e4d8c' }} /> <strong>E-mail:</strong> privacidade@ecoice.com.br</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={14} style={{ color: '#1e4d8c' }} /> <strong>Assunto:</strong> Privacidade / Proteção de Dados</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} style={{ color: '#1e4d8c' }} /> <strong>Resposta:</strong> Até 15 dias úteis</span>
              </div>
            </InfoCard>
          </SectionBlock>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        background: '#ffffff', borderTop: '1px solid #e2e0d8',
        padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: '13px', color: '#6b6960',
      }}>
        <span>© 2026 Eco Ice. Todos os direitos reservados.</span>
        <span>Última atualização: 16 de março de 2026</span>
      </footer>
    </div>
  );
}

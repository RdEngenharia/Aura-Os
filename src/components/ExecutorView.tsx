import React, { useState } from 'react';
import { OrdemServico } from '../types';
import { TicketCard } from './TicketCard';
import { Wrench, CheckCircle, Clock, Search, Download } from 'lucide-react';

interface ExecutorViewProps {
  ordens: OrdemServico[];
  currentUser: { name: string; role: string };
  onUpdateStatus: (id: string, newStatus: OrdemServico['status'], comment?: string) => void;
}

/**
 * Visualização do Executor Técnico.
 * Lista apenas as ordens de serviço delegadas a ele. Ele pode iniciar os trabalhos
 * (mudando de 'Atribuída' para 'Em execução') e fechar os atendimentos de forma estruturada.
 */
export const ExecutorView: React.FC<ExecutorViewProps> = ({
  ordens,
  currentUser,
  onUpdateStatus
}) => {
  // Filtros locais do Executor
  const [search, setSearch] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Filtra as ordens de serviço atribuídas ao executor logado
  const minhasOrdens = ordens
    .filter(o => o.executor === currentUser.name)
    .sort((a, b) => {
      // Ordenação prioritária: Ativas primeiro (Em execução -> Pendente -> Atribuída -> Concluída)
      const pesoStatus = {
        'Em execução': 1,
        'Pendente de Peça': 2,
        'Atribuída': 3,
        'Aberta': 4,
        'Concluída': 5
      };
      const pesoA = pesoStatus[a.status] || 9;
      const pesoB = pesoStatus[b.status] || 9;
      if (pesoA !== pesoB) return pesoA - pesoB;
      // Secundária: Mais recentes primeiro
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });

  // Separação de contadores para estatísticas rápidas do técnico (sempre baseada em todas as suas ordens atribuídas)
  const pendentesCount = minhasOrdens.filter(o => o.status === 'Atribuída').length;
  const ativasCount = minhasOrdens.filter(o => o.status === 'Em execução').length;
  const pecaCount = minhasOrdens.filter(o => o.status === 'Pendente de Peça').length;
  const concluidasCount = minhasOrdens.filter(o => o.status === 'Concluída').length;

  // Filtragem dinâmica por apartamento/local ou data
  const filteredOrdens = minhasOrdens.filter(o => {
    const matchDate = !filterDate || o.data === filterDate;

    const searchLower = search.toLowerCase();
    const matchSearch =
      search.trim() === '' ||
      o.id.toLowerCase().includes(searchLower) ||
      o.solicitante.toLowerCase().includes(searchLower) ||
      o.local.toLowerCase().includes(searchLower) ||
      o.detalhes.toLowerCase().includes(searchLower) ||
      o.tipoManutencao.toLowerCase().includes(searchLower);

    return matchDate && matchSearch;
  });

  // Lógica de exportação e impressão de PDF
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para gerar e salvar o PDF.');
      return;
    }

    const getStatusStyle = (status: OrdemServico['status']) => {
      switch (status) {
        case 'Aberta':
          return 'background-color: #FEF3C7; color: #92400E; border: 1px solid #F59E0B;';
        case 'Atribuída':
          return 'background-color: #DBEAFE; color: #1E40AF; border: 1px solid #3B82F6;';
        case 'Em execução':
          return 'background-color: #E0F2FE; color: #075985; border: 1px solid #0EA5E9;';
        case 'Pendente de Peça':
          return 'background-color: #FEE2E2; color: #991B1B; border: 1px solid #EF4444;';
        case 'Concluída':
          return 'background-color: #D1FAE5; color: #065F46; border: 1px solid #10B981; font-weight: bold;';
        default:
          return 'background-color: #F1F5F9; color: #334155; border: 1px solid #94A3B8;';
      }
    };

    const getStatusLabel = (status: OrdemServico['status']) => {
      switch (status) {
        case 'Aberta': return '🟡 ABERTA';
        case 'Atribuída': return '🔵 ATRIBUÍDA';
        case 'Em execução': return '⚡ EM EXECUÇÃO';
        case 'Pendente de Peça': return '🟠 PENDENTE PEÇA';
        case 'Concluída': return '🟢 RESOLVIDO / CONCLUÍDO';
        default: return status;
      }
    };

    const rowsHtml = filteredOrdens.map(o => `
      <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
        <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #0F172A;">${o.id}</td>
        <td style="padding: 10px;">${new Date(o.dataCriacao).toLocaleDateString('pt-BR')} ${new Date(o.dataCriacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</td>
        <td style="padding: 10px; font-weight: bold;">${o.local}</td>
        <td style="padding: 10px;">${o.setor}</td>
        <td style="padding: 10px;">${o.tipoManutencao}</td>
        <td style="padding: 10px;"><span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background-color: ${o.prioridade === 'URGENTE' ? '#FEE2E2' : o.prioridade === 'ALTA' ? '#FFEDD5' : '#F1F5F9'}; color: ${o.prioridade === 'URGENTE' ? '#991B1B' : o.prioridade === 'ALTA' ? '#9A3412' : '#334155'};">${o.prioridade}</span></td>
        <td style="padding: 10px;"><span style="padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; display: inline-block; white-space: nowrap; ${getStatusStyle(o.status)}">${getStatusLabel(o.status)}</span></td>
        <td style="padding: 10px; color: #334155; max-width: 250px; word-wrap: break-word;">${o.detalhes}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Aura OS - Minhas Atividades Técnicas</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1E293B; margin: 30px; line-height: 1.4; }
          .container { max-width: 1000px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1E3A8A; padding-bottom: 15px; margin-bottom: 25px; }
          .title-area h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area p { font-size: 11px; color: #64748B; margin: 4px 0 0 0; }
          .meta-area { text-align: right; font-size: 10px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left; }
          th { background-color: #1E3A8A; color: white; padding: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 10px; font-size: 11px; }
          .btn-print { background-color: #1E3A8A; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
          .btn-print:hover { opacity: 0.9; }
          .btn-close { background-color: white; color: #475569; border: 1px solid #D1D5DB; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; margin-left: 8px; }
          @media print {
            .no-print { display: none !important; }
            body { margin: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: #F0F4FF; padding: 12px; border-radius: 8px; border: 1px solid rgba(30, 58, 138, 0.15);">
            <div style="font-size: 12px; font-weight: 500; color: #1E3A8A;">💻 Relatório de Tarefas Técnicas • Pressione para Imprimir ou Salvar PDF:</div>
            <div>
              <button class="btn-print" onclick="window.print()">🖨️ Gerar PDF / Imprimir</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>

          <div class="header">
            <div class="title-area">
              <h1>Aura OS - Relatório Individual do Técnico</h1>
              <p>Histórico e Cronograma de Atividades do Profissional</p>
            </div>
            <div class="meta-area">
              <div><b>Colaborador Técnico:</b> ${currentUser.name}</div>
              <div><b>Data de Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0F172A; border-bottom: 1.5px solid #1E3A8A; padding-bottom: 6px; margin-bottom: 10px;">Atividades Selecionadas</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">OS Código</th>
                <th style="width: 100px;">Data Registro</th>
                <th style="width: 120px;">Apartamento/Local</th>
                <th style="width: 100px;">Setor</th>
                <th style="width: 110px;">Manutenção</th>
                <th style="width: 90px;">Prioridade</th>
                <th style="width: 95px;">Status</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748B; font-style: italic;">Nenhuma atividade localizada no período.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 50px; font-size: 9px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 10px;">
            Aura OS • Gestão de Manutenção de Hospitalidade e Engenharia de Atendimento
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Resumo de Atividades do Técnico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-cm-line p-3 md:p-4 rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-lg md:text-2xl font-display font-semibold text-cm-atribuida">{pendentesCount}</div>
            <div className="text-[10px] text-cm-text-mute font-medium uppercase tracking-wider mt-0.5">Pendentes</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-cm-atribuida/10 text-cm-atribuida flex items-center justify-center text-sm">📅</div>
        </div>
        <div className="bg-white border border-cm-line p-3 md:p-4 rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-lg md:text-2xl font-display font-semibold text-cm-execucao">{ativasCount}</div>
            <div className="text-[10px] text-cm-text-mute font-medium uppercase tracking-wider mt-0.5">Em Execução</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-cm-execucao/10 text-cm-execucao flex items-center justify-center text-sm">⚡</div>
        </div>
        <div className="bg-white border border-cm-line p-3 md:p-4 rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-lg md:text-2xl font-display font-semibold text-amber-600">{pecaCount}</div>
            <div className="text-[10px] text-cm-text-mute font-medium uppercase tracking-wider mt-0.5">Aguard. Peça</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-600/10 text-amber-600 flex items-center justify-center text-sm">⚠️</div>
        </div>
        <div className="bg-white border border-cm-line p-3 md:p-4 rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-lg md:text-2xl font-display font-semibold text-cm-concluida">{concluidasCount}</div>
            <div className="text-[10px] text-cm-text-mute font-medium uppercase tracking-wider mt-0.5">Concluídas</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-cm-concluida/10 text-cm-concluida flex items-center justify-center text-sm">✅</div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa Específica para o Técnico */}
      <div className="bg-white border border-cm-line rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-sm">
        {/* Filtro por Data */}
        <div className="flex-1 min-w-0 md:max-w-[200px] flex items-center gap-2">
          <span className="text-cm-text-mute text-xs font-semibold shrink-0">Data OS:</span>
          <div className="relative flex items-center w-full">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-cm-line rounded text-xs md:text-sm bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className="absolute right-2 text-xs text-red-500 hover:text-red-700 font-bold px-1"
                title="Limpar Data"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Campo de Pesquisa por Apartamento / Local */}
        <div className="flex-1 relative flex items-center">
          <div className="absolute left-3 text-gray-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por Apartamento/Quarto, código ou detalhes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-cm-line rounded text-xs md:text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-1 focus:ring-cm-ink"
          />
        </div>

        {/* Botão de Exportação para o Técnico */}
        <button
          onClick={handleExportPDF}
          className="px-3.5 py-1.5 bg-white border border-cm-line hover:border-cm-ink hover:text-cm-ink hover:bg-cm-paper/40 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-cm-text-mute shrink-0"
          title="Imprimir ordens de serviço atribuídas"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar PDF</span>
        </button>
      </div>

      {/* Listagem de Tarefas */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide flex items-center gap-2">
          <Wrench className="w-5 h-5 text-cm-ink" />
          <span>Fila de Ordens de Serviço Atribuídas</span>
          <span className="bg-cm-ink/10 text-cm-ink text-xs px-2 py-0.5 rounded-full font-sans font-semibold">
            {filteredOrdens.length}
          </span>
        </h3>

        {filteredOrdens.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white border border-cm-line rounded-xl text-cm-text-mute shadow-sm">
            <div className="text-4xl mb-3 opacity-50">🔍</div>
            <p className="text-base font-semibold text-cm-ink">Nenhum chamado localizado.</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              Nenhuma ordem de serviço atendeu aos filtros selecionados. Tente ajustar a data ou buscar outro termo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredOrdens.map(o => (
              <TicketCard
                key={o.id}
                ticket={o}
                role="executor"
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

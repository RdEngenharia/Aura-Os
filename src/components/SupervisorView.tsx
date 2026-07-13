import React, { useState } from 'react';
import { OrdemServico, Usuario } from '../types';
import { SETORES } from '../mockData';
import { TicketCard } from './TicketCard';
import { LayoutDashboard, Filter, Search, Download } from 'lucide-react';

interface SupervisorViewProps {
  ordens: OrdemServico[];
  executores?: Usuario[];
  onAssign: (id: string, executorName: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Visualização do Supervisor de Manutenção.
 * Permite filtrar por status, setor e pesquisar por texto livre nas ordens de serviço.
 * Permite delegar tarefas que estão com o status 'Aberta' para técnicos executores específicos.
 */
export const SupervisorView: React.FC<SupervisorViewProps> = ({
  ordens,
  executores = [],
  onAssign,
  onDelete
}) => {
  // Estados para Filtros e Modos de Visualização
  const [filterStatus, setFilterStatus] = useState<string>('todas');
  const [filterSetor, setFilterSetor] = useState<string>('todos');
  const [filterDate, setFilterDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'lista' | 'fila'>('lista');

  // Lógica de exportação para PDF
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
        <title>Relatório de Manutenção - Supervisor</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1E293B; margin: 30px; line-height: 1.4; }
          .container { max-width: 1000px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #FF5722; padding-bottom: 15px; margin-bottom: 25px; }
          .title-area h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area p { font-size: 11px; color: #64748B; margin: 4px 0 0 0; }
          .meta-area { text-align: right; font-size: 10px; color: #475569; }
          .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 25px; }
          .kpi-card { border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; text-align: center; background-color: #F8FAFC; }
          .kpi-num { font-size: 18px; font-weight: 800; color: #0F172A; }
          .kpi-lbl { font-size: 9px; color: #64748B; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left; }
          th { background-color: #FF5722; color: white; padding: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .btn-print { background-color: #FF5722; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
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
          <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: #FFF5F2; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 87, 34, 0.18);">
            <div style="font-size: 12px; font-weight: 500; color: #7A625A;">💻 Visualização de Impressão de Relatório • Pressione o botão para gerar o PDF ou Imprimir:</div>
            <div>
              <button class="btn-print" onclick="window.print()">🖨️ Gerar PDF / Imprimir</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>

          <div class="header">
            <div class="title-area">
              <h1>Aura OS - Relatório do Supervisor de Manutenção</h1>
              <p>Fila Filtrada de Ordens de Serviço • Status: ${filterStatus} | Setor: ${filterSetor}</p>
            </div>
            <div class="meta-area">
              <div><b>Gerado por:</b> Supervisor de Manutenção</div>
              <div><b>Data de Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card"><div class="kpi-num">${filteredOrdens.length}</div><div class="kpi-lbl">Filtrados</div></div>
            <div class="kpi-card"><div class="kpi-num">${filteredOrdens.filter(o => o.status === 'Aberta' || o.status === 'Atribuída').length}</div><div class="kpi-lbl">Aguardando Técnico</div></div>
            <div class="kpi-card"><div class="kpi-num">${filteredOrdens.filter(o => o.status === 'Em execução').length}</div><div class="kpi-lbl">Em Execução</div></div>
            <div class="kpi-card"><div class="kpi-num">${filteredOrdens.filter(o => o.status === 'Pendente de Peça').length}</div><div class="kpi-lbl">Pendente Peça</div></div>
            <div class="kpi-card"><div class="kpi-num">${filteredOrdens.filter(o => o.status === 'Concluída').length}</div><div class="kpi-lbl">Concluídos</div></div>
          </div>

          <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0F172A; border-bottom: 1.5px solid #FF5722; padding-bottom: 6px; margin-bottom: 10px;">Ordens de Serviço Selecionadas</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">OS Código</th>
                <th style="width: 100px;">Data Criação</th>
                <th style="width: 110px;">Apartamento/Local</th>
                <th style="width: 100px;">Setor</th>
                <th style="width: 100px;">Tipo Técnico</th>
                <th style="width: 90px;">Prioridade</th>
                <th style="width: 90px;">Status</th>
                <th>Detalhes do Problema</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748B; font-style: italic;">Nenhuma ordem encontrada para os critérios informados.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 50px; font-size: 9px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 10px;">
            Aura OS • Sistema Inteligente de Ordens de Serviço • Relatório de Operações de Supervisão
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Lógica de filtragem com priorização de URGENTE que não esteja Concluído
  const filteredOrdens = ordens
    .filter(o => {
      const matchStatus = filterStatus === 'todas' || o.status === filterStatus;
      const matchSetor = filterSetor === 'todos' || o.setor === filterSetor;
      const matchDate = !filterDate || o.data === filterDate;
      
      const searchLower = search.toLowerCase();
      const matchSearch = 
        search.trim() === '' ||
        o.id.toLowerCase().includes(searchLower) ||
        o.solicitante.toLowerCase().includes(searchLower) ||
        o.local.toLowerCase().includes(searchLower) ||
        o.detalhes.toLowerCase().includes(searchLower) ||
        o.tipoManutencao.toLowerCase().includes(searchLower) ||
        (o.executor && o.executor.toLowerCase().includes(searchLower));

      return matchStatus && matchSetor && matchDate && matchSearch;
    })
    .sort((a, b) => {
      // Prioridade máxima para URGENTE que não esteja concluído
      const aUrgente = a.prioridade === 'URGENTE' && a.status !== 'Concluída';
      const bUrgente = b.prioridade === 'URGENTE' && b.status !== 'Concluída';
      
      if (aUrgente && !bUrgente) return -1;
      if (!aUrgente && bUrgente) return 1;

      // Ordenação secundária por data de criação (mais recente primeiro)
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Título de Seção com Toggle de Visualização */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cm-line pb-3">
        <h3 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-cm-ink" />
          <span>Painel de Ordens de Serviço (Supervisor de Manutenção)</span>
        </h3>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Botão Exportar PDF */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-cm-line hover:border-cm-ink hover:bg-cm-paper/40 hover:text-cm-ink text-xs font-semibold rounded-lg transition-all cursor-pointer bg-white text-cm-text-mute shadow-xs"
            title="Exportar ordens de serviço filtradas para PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>

          {/* Seletor de Modo de Exibição */}
          <div className="bg-cm-paper/80 p-0.5 rounded-lg border border-cm-line flex items-center shadow-xs">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'lista'
                  ? 'bg-white text-cm-ink shadow-xs'
                  : 'text-cm-text-mute hover:text-cm-ink'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('fila')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'fila'
                  ? 'bg-white text-cm-ink shadow-xs'
                  : 'text-cm-text-mute hover:text-cm-ink'
              }`}
            >
              Fila (Colunas)
            </button>
          </div>
          <span className="bg-cm-ink text-white font-mono text-xs px-2.5 py-1 rounded-full font-semibold shrink-0">
            Exibindo {filteredOrdens.length} de {ordens.length}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white border border-cm-line rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-sm">
        {/* Filtro Status */}
        <div className="flex-1 min-w-0 md:max-w-[160px] flex items-center gap-2">
          <span className="text-gray-400 text-xs flex-shrink-0 font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            disabled={viewMode === 'fila'}
            className="w-full px-2 py-1.5 border border-cm-line rounded text-xs md:text-sm bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="todas">Todos status</option>
            <option value="Aberta">Aberta</option>
            <option value="Atribuída">Atribuída</option>
            <option value="Em execução">Em execução</option>
            <option value="Pendente de Peça">Pendente de Peça</option>
            <option value="Concluída">Concluída</option>
          </select>
        </div>

        {/* Filtro Setor */}
        <div className="flex-1 min-w-0 md:max-w-[160px] flex items-center gap-2">
          <span className="text-gray-400 text-xs flex-shrink-0 font-medium">Setor:</span>
          <select
            value={filterSetor}
            onChange={(e) => setFilterSetor(e.target.value)}
            className="w-full px-2 py-1.5 border border-cm-line rounded text-xs md:text-sm bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink"
          >
            <option value="todos">Todos setores</option>
            {SETORES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Filtro por Data */}
        <div className="flex-1 min-w-0 md:max-w-[200px] flex items-center gap-2">
          <span className="text-gray-400 text-xs flex-shrink-0 font-medium">Data OS:</span>
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

        {/* Campo de Pesquisa Textual */}
        <div className="flex-2 relative flex items-center">
          <div className="absolute left-3 text-gray-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por Apartamento, Código, Solicitante, Detalhes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-cm-line rounded text-xs md:text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-1 focus:ring-cm-ink"
          />
        </div>
      </div>

      {/* Exibição Condicional de Modos (Lista vs Fila em Colunas) */}
      {filteredOrdens.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-cm-line rounded-xl text-cm-text-mute shadow-sm">
          <div className="text-3xl mb-3 opacity-50">🔍</div>
          <p className="text-base font-semibold text-cm-ink">Nenhum resultado encontrado.</p>
          <p className="text-xs mt-1">
            Tente ajustar os filtros selecionados ou digite outro termo no campo de pesquisa acima.
          </p>
        </div>
      ) : viewMode === 'fila' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Coluna 1: Pendente */}
          <div className="bg-cm-paper/45 border border-cm-line rounded-xl p-3.5 space-y-3.5">
            <div className="flex justify-between items-center px-1 border-b border-cm-line pb-2 mb-1">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-cm-ink flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cm-atribuida"></span>
                ⏳ Pendente
              </span>
              <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-cm-line text-cm-ink">
                {filteredOrdens.filter(o => o.status === 'Aberta' || o.status === 'Atribuída').length}
              </span>
            </div>
            <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredOrdens.filter(o => o.status === 'Aberta' || o.status === 'Atribuída').length === 0 ? (
                <div className="text-center py-10 text-xs text-cm-text-mute italic bg-white/50 rounded-lg border border-cm-line/40">
                  Nenhuma ordem pendente
                </div>
              ) : (
                filteredOrdens
                  .filter(o => o.status === 'Aberta' || o.status === 'Atribuída')
                  .map(o => (
                    <TicketCard
                      key={o.id}
                      ticket={o}
                      role="supervisor"
                      executores={executores}
                      onAssign={onAssign}
                      onDelete={onDelete}
                      compact={true}
                    />
                  ))
              )}
            </div>
          </div>

          {/* Coluna 2: Em Execução / Pausado */}
          <div className="bg-cm-paper/45 border border-cm-line rounded-xl p-3.5 space-y-3.5">
            <div className="flex justify-between items-center px-1 border-b border-cm-line pb-2 mb-1">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-cm-execucao flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cm-execucao"></span>
                ⚡ Em Andamento
              </span>
              <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-cm-line text-cm-execucao">
                {filteredOrdens.filter(o => o.status === 'Em execução' || o.status === 'Pendente de Peça').length}
              </span>
            </div>
            <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredOrdens.filter(o => o.status === 'Em execução' || o.status === 'Pendente de Peça').length === 0 ? (
                <div className="text-center py-10 text-xs text-cm-text-mute italic bg-white/50 rounded-lg border border-cm-line/40">
                  Nenhuma ordem em andamento
                </div>
              ) : (
                filteredOrdens
                  .filter(o => o.status === 'Em execução' || o.status === 'Pendente de Peça')
                  .map(o => (
                    <TicketCard
                      key={o.id}
                      ticket={o}
                      role="supervisor"
                      executores={executores}
                      onAssign={onAssign}
                      onDelete={onDelete}
                      compact={true}
                    />
                  ))
              )}
            </div>
          </div>

          {/* Coluna 3: Concluído */}
          <div className="bg-cm-paper/45 border border-cm-line rounded-xl p-3.5 space-y-3.5">
            <div className="flex justify-between items-center px-1 border-b border-cm-line pb-2 mb-1">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-cm-concluida flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cm-concluida"></span>
                ✅ Concluído
              </span>
              <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-cm-line text-cm-concluida">
                {filteredOrdens.filter(o => o.status === 'Concluída').length}
              </span>
            </div>
            <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredOrdens.filter(o => o.status === 'Concluída').length === 0 ? (
                <div className="text-center py-10 text-xs text-cm-text-mute italic bg-white/50 rounded-lg border border-cm-line/40">
                  Nenhuma ordem concluída
                </div>
              ) : (
                filteredOrdens
                  .filter(o => o.status === 'Concluída')
                  .map(o => (
                    <TicketCard
                      key={o.id}
                      ticket={o}
                      role="supervisor"
                      executores={executores}
                      onAssign={onAssign}
                      onDelete={onDelete}
                      compact={true}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredOrdens.map(o => (
            <TicketCard
              key={o.id}
              ticket={o}
              role="supervisor"
              executores={executores}
              onAssign={onAssign}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { OrdemServico, Usuario } from '../types';
import { SETORES, TIPOS } from '../mockData';
import { TicketCard } from './TicketCard';
import { 
  FileText, 
  Search, 
  Download, 
  Plus, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Send,
  Building,
  HelpCircle
} from 'lucide-react';

interface SupervisorRecepcaoViewProps {
  ordens: OrdemServico[];
  currentUser: Usuario;
  onAddOrdem: (details: Omit<OrdemServico, 'id' | 'status' | 'executor' | 'dataCriacao' | 'dataAtribuicao' | 'dataConclusao' | 'comentarioConclusao'>) => void;
  onDelete: (id: string) => void;
}

export const SupervisorRecepcaoView: React.FC<SupervisorRecepcaoViewProps> = ({
  ordens,
  currentUser,
  onAddOrdem,
  onDelete
}) => {
  // Controle de Abas Internas da Recepção: 'acompanhamento' | 'abrir'
  const [internalTab, setInternalTab] = useState<'acompanhamento' | 'abrir'>('acompanhamento');

  // Estados dos filtros de pesquisa
  const [filterStatus, setFilterStatus] = useState<string>('todas');
  const [filterDate, setFilterDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Estados do formulário de abertura rápida de OS (Foco: Recepção)
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    tipoManutencao: '',
    local: '',
    prioridade: 'MÉDIA',
    detalhes: ''
  });

  // Estado para controlar se mostra todas as ordens do hotel ou apenas as geradas pela recepção
  const [filterOrigem, setFilterOrigem] = useState<'todos' | 'recepcao'>('todos');

  // Filtramos as ordens que pertencem ao setor de acordo com a seleção
  const ordensRecepcao = ordens.filter(o => {
    if (filterOrigem === 'recepcao') {
      return o.setor === 'RECEPÇÃO';
    }
    return true; // por padrão, mostra todas as ordens lançadas independente de quem as criou
  });

  // Cálculos de KPIs baseados na seleção
  const totalCriadas = ordensRecepcao.length;
  const abertasRecepcao = ordensRecepcao.filter(o => o.status !== 'Concluída');
  const concluidasRecepcao = ordensRecepcao.filter(o => o.status === 'Concluída');
  const pendentesPecas = ordensRecepcao.filter(o => o.status === 'Pendente de Peça');

  // Cálculo de tempo médio de atendimento da Recepção
  let avgResolutionTimeText = '—';
  if (concluidasRecepcao.length > 0) {
    let totalMinutes = 0;
    let count = 0;
    concluidasRecepcao.forEach(o => {
      if (o.dataConclusao && o.dataCriacao) {
        const diffMs = new Date(o.dataConclusao).getTime() - new Date(o.dataCriacao).getTime();
        const diffMins = diffMs / (1000 * 60);
        if (diffMins > 0) {
          totalMinutes += diffMins;
          count++;
        }
      }
    });
    if (count > 0) {
      const avg = totalMinutes / count;
      if (avg < 60) {
        avgResolutionTimeText = `${Math.round(avg)} min`;
      } else {
        const hours = Math.floor(avg / 60);
        const mins = Math.round(avg % 60);
        avgResolutionTimeText = `${hours}h ${mins}m`;
      }
    }
  }

  // Filtragem dinâmica de acordo com a seleção na tela de Acompanhamento
  const filteredOrdens = ordensRecepcao
    .filter(o => {
      const matchStatus = filterStatus === 'todas' || o.status === filterStatus;
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

      return matchStatus && matchDate && matchSearch;
    })
    .sort((a, b) => {
      // Prioridade máxima para URGENTE que não esteja concluído
      const aUrgente = a.prioridade === 'URGENTE' && a.status !== 'Concluída';
      const bUrgente = b.prioridade === 'URGENTE' && b.status !== 'Concluída';
      
      if (aUrgente && !bUrgente) return -1;
      if (!aUrgente && bUrgente) return 1;

      // Mais recentes primeiro
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });

  // Tratamento de envio do formulário rápido
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipoManutencao || !formData.local || !formData.detalhes) return;

    onAddOrdem({
      data: formData.data,
      solicitante: currentUser.name,
      setor: 'RECEPÇÃO',
      tipoManutencao: formData.tipoManutencao,
      local: formData.local,
      prioridade: formData.prioridade as any,
      detalhes: formData.detalhes
    });

    // Limpa o formulário e volta para o acompanhamento
    setFormData({
      data: new Date().toISOString().split('T')[0],
      tipoManutencao: '',
      local: '',
      prioridade: 'MÉDIA',
      detalhes: ''
    });
    setInternalTab('acompanhamento');
  };

  // Exportação PDF específica para a Recepção
  const handleExportRecepcaoPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para gerar o PDF.');
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
        <td style="padding: 10px;">${o.tipoManutencao}</td>
        <td style="padding: 10px;"><span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background-color: ${o.prioridade === 'URGENTE' ? '#FEE2E2' : o.prioridade === 'ALTA' ? '#FFEDD5' : '#F1F5F9'}; color: ${o.prioridade === 'URGENTE' ? '#991B1B' : o.prioridade === 'ALTA' ? '#9A3412' : '#334155'};">${o.prioridade}</span></td>
        <td style="padding: 10px;"><span style="padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; display: inline-block; white-space: nowrap; ${getStatusStyle(o.status)}">${getStatusLabel(o.status)}</span></td>
        <td style="padding: 10px; color: #334155;">${o.executor || '—'}</td>
        <td style="padding: 10px; color: #334155; max-width: 250px; word-wrap: break-word;">${o.detalhes}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Aura OS - Relatório da Recepção</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1E293B; margin: 30px; line-height: 1.4; }
          .container { max-width: 1000px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #FF5722; padding-bottom: 15px; margin-bottom: 25px; }
          .title-area h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area p { font-size: 11px; color: #64748B; margin: 4px 0 0 0; }
          .meta-area { text-align: right; font-size: 10px; color: #475569; }
          .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
          .kpi-card { border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; text-align: center; background-color: #F8FAFC; }
          .kpi-num { font-size: 18px; font-weight: 800; color: #FF5722; }
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
            <div style="font-size: 12px; font-weight: 500; color: #7A625A;">💻 Relatório da Recepção • Aura OS • Pressione o botão para Imprimir ou Salvar PDF:</div>
            <div>
              <button class="btn-print" onclick="window.print()">🖨️ Gerar PDF / Imprimir</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>

          <div class="header">
            <div class="title-area">
              <h1>Aura OS - Painel do Supervisor de Recepção</h1>
              <p>Relatório de Qualidade de Atendimento • Origem das OS: ${filterOrigem === 'recepcao' ? 'Apenas Recepção' : 'Todos os Setores (Geral)'}</p>
            </div>
            <div class="meta-area">
              <div><b>Responsável:</b> ${currentUser.name} (Supervisor de Recepção)</div>
              <div><b>Data de Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card"><div class="kpi-num">${totalCriadas}</div><div class="kpi-lbl">${filterOrigem === 'recepcao' ? 'Total Enviadas' : 'Total Monitorado'}</div></div>
            <div class="kpi-card"><div class="kpi-num">${abertasRecepcao.length}</div><div class="kpi-lbl">Em Aberto</div></div>
            <div class="kpi-card"><div class="kpi-num">${concluidasRecepcao.length}</div><div class="kpi-lbl">Finalizadas</div></div>
            <div class="kpi-card"><div class="kpi-num">${avgResolutionTimeText}</div><div class="kpi-lbl">T. Médio Resolução</div></div>
          </div>

          <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0F172A; border-bottom: 1.5px solid #FF5722; padding-bottom: 6px; margin-bottom: 10px;">Controle de Chamados Monitorados</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">OS Código</th>
                <th style="width: 100px;">Data Registro</th>
                <th style="width: 120px;">Local/Apartamento</th>
                <th style="width: 110px;">Manutenção</th>
                <th style="width: 90px;">Prioridade</th>
                <th style="width: 95px;">Status</th>
                <th style="width: 110px;">Técnico</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748B; font-style: italic;">Nenhuma ordem de recepção registrada.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 50px; font-size: 9px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 10px;">
            Aura OS • Gestão Inteligente de Hospitalidade e Manutenção • Setor Recepção
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
      
      {/* HEADER EXCLUSIVO DO SUPERVISOR DE RECEPÇÃO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cm-line pb-4">
        <div>
          <h3 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide flex items-center gap-2">
            <Building className="w-5 h-5 text-cm-ink" />
            <span>Supervisor de Recepção</span>
          </h3>
          <p className="text-xs text-cm-text-mute mt-1 font-mono uppercase">
            Acompanhamento Ágil e Controle de Atendimento ao Hóspede
          </p>
        </div>

        {/* Seleção de Abas Internas da Recepção */}
        <div className="flex bg-cm-paper/85 p-0.5 rounded-lg border border-cm-line">
          <button
            onClick={() => setInternalTab('acompanhamento')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              internalTab === 'acompanhamento'
                ? 'bg-white text-cm-ink shadow-xs'
                : 'text-cm-text-mute hover:text-cm-ink'
            }`}
          >
            🔍 Acompanhar OS
          </button>
          <button
            onClick={() => setInternalTab('abrir')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              internalTab === 'abrir'
                ? 'bg-white text-cm-ink shadow-xs'
                : 'text-cm-text-mute hover:text-cm-ink'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Abertura Rápida
          </button>
        </div>
      </div>

      {/* PAINEL DE METRICAS SIMPLIFICADAS DA RECEPÇÃO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Criadas */}
        <div className="bg-cm-paper/40 border border-cm-line rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold font-mono text-cm-text-mute uppercase tracking-wider">Total Enviadas</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-display text-cm-ink">{totalCriadas}</span>
            <span className="text-xs text-cm-text-mute">OS</span>
          </div>
        </div>

        {/* Card 2: Em Aberto */}
        <div className="bg-cm-paper/40 border border-cm-line rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold font-mono text-cm-text-mute uppercase tracking-wider">Aguardando/Em Andamento</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-display text-amber-600">{abertasRecepcao.length}</span>
            <span className="text-xs text-cm-text-mute">OS</span>
          </div>
        </div>

        {/* Card 3: Finalizadas */}
        <div className="bg-cm-paper/40 border border-cm-line rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold font-mono text-cm-text-mute uppercase tracking-wider">Finalizadas Recepção</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-display text-emerald-600">{concluidasRecepcao.length}</span>
            <span className="text-xs text-cm-text-mute">OS</span>
          </div>
        </div>

        {/* Card 4: Tempo Médio de Resolução */}
        <div className="bg-cm-paper/40 border border-cm-line rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold font-mono text-cm-text-mute uppercase tracking-wider">Resolução Média</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-display text-cm-ink">{avgResolutionTimeText}</span>
          </div>
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      {internalTab === 'acompanhamento' ? (
        <div className="space-y-4">
          
          {/* BARRA DE FILTRAGEM DA RECEPÇÃO */}
          <div className="bg-white border border-cm-line rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-sm">
            {/* Filtro Status */}
            <div className="flex items-center gap-2 md:max-w-[180px] flex-1">
              <span className="text-cm-text-mute text-xs font-semibold shrink-0">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2 py-1.5 border border-cm-line rounded text-xs md:text-sm bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink"
              >
                <option value="todas">Todos status</option>
                <option value="Aberta">Aberta</option>
                <option value="Atribuída">Atribuída</option>
                <option value="Em execução">Em execução</option>
                <option value="Pendente de Peça">Pendente de Peça</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>

            {/* Filtro Origem */}
            <div className="flex items-center gap-2 md:max-w-[160px] flex-1">
              <span className="text-cm-text-mute text-xs font-semibold shrink-0">Origem:</span>
              <select
                value={filterOrigem}
                onChange={(e) => setFilterOrigem(e.target.value as 'todos' | 'recepcao')}
                className="w-full px-2 py-1.5 border border-cm-line rounded text-xs md:text-sm bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink"
              >
                <option value="todos">Todos setores</option>
                <option value="recepcao">Apenas Recepção</option>
              </select>
            </div>

            {/* Filtro por Data */}
            <div className="flex items-center gap-2 md:max-w-[180px] flex-1">
              <span className="text-cm-text-mute text-xs font-semibold shrink-0">Data:</span>
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

            {/* Campo de Busca Livre */}
            <div className="flex-1 relative flex items-center">
              <div className="absolute left-3 text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por apartamento/local, código, detalhes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-cm-line rounded text-xs md:text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-1 focus:ring-cm-ink"
              />
            </div>

            {/* Exportar PDF Filtrado da Recepção */}
            <button
              onClick={handleExportRecepcaoPDF}
              className="px-3.5 py-1.5 bg-white border border-cm-line hover:border-cm-ink hover:text-cm-ink hover:bg-cm-paper/40 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-cm-text-mute shrink-0"
              title="Exportar ordens da recepção para PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </button>
          </div>

          {/* LISTA DE CHAMADOS FILTRADOS DA RECEPÇÃO */}
          {filteredOrdens.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white border border-cm-line rounded-xl text-cm-text-mute shadow-sm">
              <div className="text-3xl mb-3 opacity-50">🛎️</div>
              <p className="text-base font-semibold text-cm-ink">Nenhuma ordem de serviço encontrada.</p>
              <p className="text-xs mt-1">
                {filterOrigem === 'recepcao' 
                  ? 'Nenhuma OS criada pelo setor da Recepção foi localizada para os filtros selecionados.' 
                  : 'Nenhuma OS geral foi localizada para os critérios informados. Use a aba "Abertura Rápida" acima para registrar novos chamados.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredOrdens.map(o => (
                <TicketCard
                  key={o.id}
                  ticket={o}
                  role="supervisor_recepcao"
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* FORMULÁRIO DE ABERTURA RÁPIDA PRÉ-CONFIGURADO COM SETOR "RECEPÇÃO" */
        <div className="bg-white border border-cm-line rounded-xl shadow-sm overflow-hidden max-w-2xl mx-auto">
          <div className="h-2.5 bg-cm-ink w-full"></div>
          <div className="p-5 md:p-6">
            <h3 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide mb-6 flex items-center gap-2 border-b border-cm-line pb-3">
              <FileText className="w-5 h-5 text-cm-ink" />
              <span>Abertura de OS Rápida • Recepção</span>
            </h3>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campo Data */}
                <div>
                  <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                    Data de Registro
                  </label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all"
                  />
                </div>

                {/* Setor Fixo / Pre-Visualizado */}
                <div>
                  <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                    Setor Emissor (Fixo)
                  </label>
                  <input
                    type="text"
                    value="RECEPÇÃO"
                    disabled
                    className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-gray-100 text-cm-text-mute font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campo Tipo de Manutenção */}
                <div>
                  <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                    Tipo de Manutenção
                  </label>
                  <select
                    value={formData.tipoManutencao}
                    onChange={(e) => setFormData({ ...formData, tipoManutencao: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all"
                  >
                    <option value="">Selecione um tipo…</option>
                    {TIPOS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Localização / Quarto */}
                <div>
                  <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                    Apartamento / Localização
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Apto 304, Hall, Elevador..."
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all"
                  />
                </div>
              </div>

              {/* Campo Prioridade */}
              <div>
                <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                  Nível de Prioridade do Hóspede / Chamado
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['BAIXA', 'MÉDIA', 'ALTA', 'URGENTE'] as const).map(p => {
                    const isSelected = formData.prioridade === p;
                    const borderCls = isSelected 
                      ? p === 'URGENTE' ? 'border-red-600 bg-red-50 text-red-700' : p === 'ALTA' ? 'border-amber-500 bg-amber-50 text-amber-700' : p === 'MÉDIA' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-cm-line text-cm-text-mute bg-white hover:bg-cm-paper/40';

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, prioridade: p })}
                        className={`py-2 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${borderCls}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalhes do Problema */}
              <div>
                <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                  Descrição Detalhada do Problema (Reportado pelo Hóspede ou Staff)
                </label>
                <textarea
                  rows={4}
                  placeholder="Por favor, descreva com detalhes o que está acontecendo... (Ex: Ar condicionado vazando água no chão do quarto)"
                  value={formData.detalhes}
                  onChange={(e) => setFormData({ ...formData, detalhes: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all resize-none"
                />
              </div>

              {/* Botões do Formulário */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInternalTab('acompanhamento')}
                  className="px-4 py-2 border border-cm-line hover:bg-cm-paper/40 text-cm-text-mute text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cm-ink hover:bg-cm-ink-hover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Registrar OS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

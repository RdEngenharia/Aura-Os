import React, { useState } from 'react';
import { OrdemServico, PrioridadeOS } from '../types';
import { SETORES, TIPOS, PRIORIDADES_INFO } from '../mockData';
import { TicketCard } from './TicketCard';
import { AlertCircle, FileText, Send, ListCollapse, Search, Download } from 'lucide-react';

interface SolicitanteViewProps {
  ordens: OrdemServico[];
  currentUser: { name: string; role: string };
  onAddOrdem: (novaOS: Omit<OrdemServico, 'id' | 'status' | 'executor' | 'dataCriacao' | 'dataAtribuicao' | 'dataConclusao' | 'comentarioConclusao'>) => void;
}

/**
 * Visualização do Solicitante (Abertura de chamados).
 * Permite preencher um formulário detalhado de Ordem de Serviço com local, setor,
 * tipo de problema e seleção interativa de nível de prioridade, além de listar as ordens que ele próprio abriu.
 */
export const SolicitanteView: React.FC<SolicitanteViewProps> = ({
  ordens,
  currentUser,
  onAddOrdem
}) => {
  // Estados do formulário
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [setor, setSetor] = useState('');
  const [tipo, setTipo] = useState('');
  const [local, setLocal] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeOS | null>(null);
  const [detalhes, setDetalhes] = useState('');

  // Estados para busca e filtragem de solicitações passadas
  const [search, setSearch] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Filtra as ordens de serviço solicitadas pelo usuário logado
  const minhasOrdens = ordens
    .filter(o => o.solicitante === currentUser.name)
    .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());

  // Filtragem dinâmica por apartamento/local ou data
  const filteredOrdens = minhasOrdens.filter(o => {
    const matchDate = !filterDate || o.data === filterDate;

    const searchLower = search.toLowerCase();
    const matchSearch =
      search.trim() === '' ||
      o.id.toLowerCase().includes(searchLower) ||
      o.local.toLowerCase().includes(searchLower) ||
      o.detalhes.toLowerCase().includes(searchLower) ||
      o.tipoManutencao.toLowerCase().includes(searchLower);

    return matchDate && matchSearch;
  });

  // Exportação e impressão de PDF
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
        <title>Aura OS - Minhas Solicitações</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1E293B; margin: 30px; line-height: 1.4; }
          .container { max-width: 1000px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #10B981; padding-bottom: 15px; margin-bottom: 25px; }
          .title-area h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; }
          .title-area p { font-size: 11px; color: #64748B; margin: 4px 0 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #10B981; color: white; padding: 10px; font-size: 10px; text-transform: uppercase; font-weight: 700; }
          td { padding: 10px; font-size: 11px; }
          .btn-print { background-color: #10B981; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; }
          .btn-close { background-color: white; color: #475569; border: 1px solid #D1D5DB; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; margin-left: 8px; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: #ECFDF5; padding: 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.15);">
            <div style="font-size: 12px; font-weight: 500; color: #047857;">💻 Relatório de Solicitações • Pressione para Imprimir ou Salvar PDF:</div>
            <div>
              <button class="btn-print" onclick="window.print()">🖨️ Gerar PDF / Imprimir</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>
          <div class="header">
            <div class="title-area">
              <h1>Aura OS - Minhas Solicitações de Manutenção</h1>
              <p>Histórico de chamados criados pelo solicitante</p>
            </div>
            <div style="font-size: 10px; text-align: right; color: #475569;">
              <div><b>Solicitante:</b> ${currentUser.name}</div>
              <div><b>Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>
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
              ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748B;">Nenhum chamado localizado para os filtros atuais.</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Envio do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prioridade) return;

    onAddOrdem({
      data,
      solicitante: currentUser.name,
      setor,
      tipoManutencao: tipo,
      local,
      prioridade,
      detalhes
    });

    // Reseta o formulário mantendo as configurações padrão básicas
    setSetor('');
    setTipo('');
    setLocal('');
    setPrioridade(null);
    setDetalhes('');
  };

  const handleDetalhesChange = (val: string) => {
    setDetalhes(val);
    const lower = val.toLowerCase();
    const keywords = ['vazamento', 'curto-circuito', 'incendio', 'incêndio', 'fogo', 'inundacao', 'inundação', 'choque', 'vazando', 'estouro', 'explosao', 'explosão'];
    const containsKeyword = keywords.some(k => lower.includes(k));
    if (containsKeyword) {
      setPrioridade('URGENTE');
    }
  };

  const isCritical = detalhes && ['vazamento', 'curto-circuito', 'incendio', 'incêndio', 'fogo', 'inundacao', 'inundação', 'choque', 'vazando', 'estouro', 'explosao', 'explosão'].some(k => detalhes.toLowerCase().includes(k));

  return (
    <div className="space-y-10">
      {/* Formulário para Abrir Nova OS */}
      <div className="bg-white border border-cm-line rounded-xl shadow-sm overflow-hidden">
        {/* Faixa decorativa no estilo Google Forms */}
        <div className="h-2.5 bg-cm-ink w-full"></div>
        <div className="p-5 md:p-6">
          <h3 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide mb-6 flex items-center gap-2 border-b border-cm-line pb-3">
            <FileText className="w-5 h-5 text-cm-ink" />
            <span>Abrir Nova Ordem de Serviço</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo Data */}
            <div>
              <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                Data do Problema
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all"
              />
            </div>

            {/* Campo Setor */}
            <div>
              <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                Setor Afetado
              </label>
              <select
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all"
              >
                <option value="">Selecione um setor…</option>
                {SETORES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo Tipo de Manutenção */}
            <div>
              <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                Tipo de Manutenção
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all"
              >
                <option value="">Selecione um tipo…</option>
                {TIPOS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Campo Local ou Apartamento */}
            <div>
              <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
                Localização Específica
              </label>
              <input
                type="text"
                placeholder="Ex: Sala de Reunião B, Bloco II, Apartamento 104"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all"
              />
            </div>
          </div>

          {/* Campo Prioridade Interativa */}
          <div>
            <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
              Prioridade / Urgência do Chamado
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRIORIDADES_INFO.map(p => {
                const isSelected = prioridade === p.v;
                return (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => setPrioridade(p.v)}
                    className="px-3 py-2.5 text-center border-2 rounded-lg cursor-pointer font-display text-xs tracking-wider uppercase transition-all duration-150"
                    style={{
                      borderColor: isSelected ? p.color : 'rgba(27,42,74,0.12)',
                      color: isSelected ? p.color : 'var(--color-cm-text-mute)',
                      backgroundColor: isSelected ? p.bg : 'transparent',
                      fontWeight: isSelected ? '600' : 'normal',
                      boxShadow: isSelected ? `0 0 0 1px ${p.color} inset` : 'none'
                    }}
                  >
                    {p.v}
                  </button>
                );
              })}
            </div>
            {!prioridade && (
              <p className="text-[11px] text-cm-urgente mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                Selecione uma prioridade antes de prosseguir.
              </p>
            )}
          </div>

          {/* Campo Detalhes */}
          <div>
            <label className="block text-xs font-semibold text-cm-text-mute uppercase tracking-wider mb-1.5">
              Detalhes sobre o problema
            </label>
            <textarea
              placeholder="Descreva detalhadamente o problema técnico observado e o impacto do mesmo para facilitar o diagnóstico rápido pelo técnico..."
              value={detalhes}
              onChange={(e) => handleDetalhesChange(e.target.value)}
              required
              rows={4}
              className="w-full px-3.5 py-2.5 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all resize-y"
            ></textarea>
            {isCritical && (
              <p className="text-[11px] text-red-700 font-semibold mt-1.5 flex items-center gap-1.5 bg-red-50 p-2.5 rounded border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>Detectamos termos críticos no chamado. A prioridade foi atualizada automaticamente para <b className="text-red-900">URGENTE</b> para que receba atenção imediata!</span>
              </p>
            )}
          </div>

          {/* Botão Enviar */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!prioridade}
              className="bg-cm-ink hover:bg-cm-ink-hover text-white font-semibold py-2.5 px-6 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-all shadow hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Abrir Ordem de Serviço</span>
            </button>
          </div>
        </form>
        </div>
      </div>

      {/* Listagem de Solicitados pelo próprio Usuário */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cm-line pb-3">
          <h3 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide flex items-center gap-2">
            <ListCollapse className="w-5 h-5 text-cm-ink" />
            <span>Minhas Solicitações Recentes</span>
            <span className="bg-cm-ink/10 text-cm-ink text-xs px-2 py-0.5 rounded-full font-sans font-semibold">
              {filteredOrdens.length} de {minhasOrdens.length}
            </span>
          </h3>
        </div>

        {/* Barra de Filtros e Pesquisa do Solicitante */}
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

          {/* Botão de Exportação */}
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 bg-white border border-cm-line hover:border-cm-ink hover:text-cm-ink hover:bg-cm-paper/40 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-cm-text-mute shrink-0"
            title="Imprimir minhas solicitações"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>

        {filteredOrdens.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white border border-cm-line rounded-xl text-cm-text-mute">
            <div className="text-3xl mb-2.5 opacity-50">🔍</div>
            <p className="text-sm font-medium">Nenhuma solicitação localizada.</p>
            <p className="text-xs mt-1">Tente alterar a data ou digitar outro termo de pesquisa.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredOrdens.map(o => (
              <TicketCard
                key={o.id}
                ticket={o}
                role="solicitante"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

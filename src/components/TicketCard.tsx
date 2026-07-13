import React, { useState } from 'react';
import { OrdemServico, PrioridadeOS, Usuario } from '../types';
import { PRIORIDADES_INFO, STATUS_COLOR } from '../mockData';
import { Calendar, MapPin, User, CheckCircle2, Play, UserPlus, Info, AlertCircle, Trash2 } from 'lucide-react';

interface TicketCardProps {
  ticket: OrdemServico;
  role: 'solicitante' | 'executor' | 'supervisor' | 'gerente' | 'supervisor_recepcao';
  onAssign?: (id: string, executorName: string) => void;
  onUpdateStatus?: (id: string, newStatus: OrdemServico['status'], comment?: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
  executores?: Usuario[];
}

/**
 * Componente que renderiza um ticket (Ordem de Serviço) individual.
 * Contém o design visual característico do código original: a fita colorida no canto,
 * indicador pontilhado e os botões de ação dinâmicos de acordo com a permissão de cada papel.
 */
export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  role,
  onAssign,
  onUpdateStatus,
  onDelete,
  compact = false,
  executores = []
}) => {
  const [assignName, setAssignName] = useState('');
  const [conclusionComment, setConclusionComment] = useState('');
  const [showConclusionModal, setShowConclusionModal] = useState(false);
  const [showPendenteModal, setShowPendenteModal] = useState(false);
  const [pendenteComment, setPendenteComment] = useState('');

  // Encontra informações de estilo da prioridade correspondente
  const prioInfo = PRIORIDADES_INFO.find(p => p.v === ticket.prioridade) || PRIORIDADES_INFO[0];

  // Tradutor de datas
  const fmtDate = (isoString: string) => {
    if (!isoString) return '—';
    try {
      const dateObj = new Date(isoString);
      return dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Tratar a atribuição rápida de executor
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignName.trim() || !onAssign) return;
    onAssign(ticket.id, assignName.trim());
    setAssignName('');
  };

  // Tratar conclusão com comentário
  const handleConcludeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateStatus) return;
    onUpdateStatus(ticket.id, 'Concluída', conclusionComment.trim());
    setShowConclusionModal(false);
    setConclusionComment('');
  };

  // Tratar impedimento com comentário
  const handlePendenteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateStatus) return;
    onUpdateStatus(ticket.id, 'Pendente de Peça', pendenteComment.trim());
    setShowPendenteModal(false);
    setPendenteComment('');
  };

  const displayDetails = compact && ticket.detalhes.length > 85 ? ticket.detalhes.slice(0, 85) + '...' : ticket.detalhes;

  return (
    <div className={`relative bg-white border rounded-r-xl rounded-l-md flex transition-all duration-200 overflow-hidden ${
      compact 
        ? 'p-3.5 pl-7 flex-col gap-3.5 shadow-xs' 
        : 'p-5 pl-9 md:pl-10 flex-col md:flex-row items-start justify-between gap-5 shadow-sm hover:shadow-md'
    } ${
      ticket.prioridade === 'URGENTE' && ticket.status !== 'Concluída'
        ? 'border-red-500 bg-red-50/15 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
        : 'border-cm-line'
    }`}>
      
      {/* Marcador pontilhado vertical e círculo decorativo à esquerda */}
      <div 
        className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2 bg-white transition-colors ${
          compact ? 'left-2.5 w-2 h-2' : 'left-3.5 w-2.5 h-2.5'
        }`}
        style={{ borderColor: STATUS_COLOR[ticket.status] || '#999' }}
      ></div>
      <div className={`absolute top-4 bottom-4 border-l border-dashed border-cm-line ${
        compact ? 'left-5' : 'left-7'
      }`}></div>

      {/* Triângulo com cor da prioridade no canto superior direito */}
      <div 
        className={`absolute top-0 right-0 w-0 h-0 border-l-transparent transition-all ${
          compact ? 'border-t-[24px] border-l-[24px]' : 'border-t-[34px] border-l-[34px]'
        }`}
        style={{ borderTopColor: prioInfo.color }}
        title={`Prioridade: ${ticket.prioridade}`}
      ></div>

      {/* Conteúdo principal da OS */}
      <div className="flex-1 min-w-0 z-10 w-full">
        {ticket.prioridade === 'URGENTE' && ticket.status !== 'Concluída' && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600 text-white font-bold uppercase tracking-wider shadow-sm animate-pulse ${
            compact ? 'text-[9px] mb-1.5' : 'text-[10px] mb-2.5'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            🚨 ALERTA DE URGÊNCIA CRÍTICA
          </div>
        )}

        {/* Identificação e Datas */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-cm-text-mute mb-1.5">
          <span className="font-bold text-cm-ink">{ticket.id}</span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {fmtDate(ticket.dataCriacao)}
          </span>
          {ticket.dataAtribuicao && (
            <>
              <span className="text-gray-300">•</span>
              <span>Atribuída em: {fmtDate(ticket.dataAtribuicao)}</span>
            </>
          )}
          {ticket.dataConclusao && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-cm-baixa font-semibold">Concluída em: {fmtDate(ticket.dataConclusao)}</span>
            </>
          )}
        </div>

        {/* Título Principal */}
        <h4 className="font-semibold text-base text-gray-900 leading-snug mb-1">
          {ticket.tipoManutencao} <span className="text-cm-text-mute font-normal">no setor</span> {ticket.setor}
        </h4>

        {/* Metadados: Local e Solicitante */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cm-text-mute mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <b>Local:</b> {ticket.local}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <b>Solicitante:</b> {ticket.solicitante}
          </span>
          {ticket.executor && (
            <span className="flex items-center gap-1 bg-cm-paper/60 px-2 py-0.5 rounded text-cm-ink font-medium">
              🔧 <b>Executor:</b> {ticket.executor}
            </span>
          )}
        </div>

        {/* Detalhes descritivos do problema */}
        <div className="bg-cm-paper/40 border-l-2 border-cm-line p-3 rounded-r-md text-xs md:text-sm text-gray-700 leading-relaxed font-sans mb-2">
          {displayDetails}
        </div>

        {/* Se estiver concluída e houver observação do técnico */}
        {ticket.status === 'Concluída' && ticket.comentarioConclusao && (
          <div className="bg-emerald-50/60 border border-emerald-200/60 p-2.5 rounded-md text-xs text-emerald-800 flex items-start gap-1.5 mt-2.5">
            <Info className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="font-semibold">Relatório de conclusão:</strong> {ticket.comentarioConclusao}
            </div>
          </div>
        )}

        {/* Se estiver pendente de peça e houver feedback do técnico */}
        {ticket.status === 'Pendente de Peça' && ticket.comentarioPendente && (
          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-md text-xs text-amber-800 flex items-start gap-1.5 mt-2.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-amber-600 flex-shrink-0" />
            <div>
              <strong className="font-semibold text-amber-900">Aguardando peça/equipamento:</strong> {ticket.comentarioPendente}
            </div>
          </div>
        )}
      </div>

      {/* Lado Direito: Badges e Botões de Ação */}
      <div className="flex flex-col items-stretch md:items-end justify-between gap-3.5 min-w-[160px] w-full md:w-auto z-10">
        
        {/* Badges de Status e Prioridade */}
        <div className="flex items-center md:justify-end gap-2">
          {/* Badge Status */}
          <span 
            className="text-[10px] md:text-[11px] font-display font-medium text-white px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm"
            style={{ backgroundColor: STATUS_COLOR[ticket.status] }}
          >
            {ticket.status}
          </span>
          {/* Badge Prioridade */}
          <span 
            className="text-[10px] md:text-[11px] font-display font-medium text-white px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm"
            style={{ backgroundColor: prioInfo.color }}
          >
            {ticket.prioridade}
          </span>
        </div>

        {/* Ações dependendo do perfil logado */}
        <div className="flex flex-col gap-1.5 justify-end w-full">
          {/* AÇÕES DE SUPERVISOR */}
          {role === 'supervisor' && ticket.status === 'Aberta' && onAssign && (
            <form onSubmit={handleAssignSubmit} className="flex gap-1.5 w-full">
              {executores && executores.length > 0 ? (
                <select
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  required
                  className="px-2.5 py-1.5 text-xs border border-cm-line rounded bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink w-full md:w-40 cursor-pointer"
                >
                  <option value="">Selecione um técnico...</option>
                  {executores.map(u => (
                    <option key={u.id || u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nome do executor"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  required
                  className="px-2.5 py-1.5 text-xs border border-cm-line rounded bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-1 focus:ring-cm-ink w-full md:w-32"
                />
              )}
              <button 
                type="submit"
                disabled={executores && executores.length > 0 && !assignName}
                className="bg-cm-ink hover:bg-cm-ink-hover text-white text-[11px] font-medium px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <UserPlus className="w-3 h-3" />
                <span>Atribuir</span>
              </button>
            </form>
          )}

          {/* AÇÕES DE EXECUTOR */}
          {role === 'executor' && onUpdateStatus && (
            <div className="flex flex-col gap-1.5 w-full">
              {ticket.status === 'Atribuída' && (
                <button
                  onClick={() => onUpdateStatus(ticket.id, 'Em execução')}
                  className="bg-cm-ink hover:bg-cm-ink-hover text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all duration-150 w-full"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Iniciar execução</span>
                </button>
              )}

              {(ticket.status === 'Em execução' || ticket.status === 'Pendente de Peça') && (
                <div className="flex flex-col gap-1.5 w-full">
                  {ticket.status === 'Pendente de Peça' && (
                    <button
                      onClick={() => onUpdateStatus(ticket.id, 'Em execução')}
                      className="bg-cm-ink hover:bg-cm-ink-hover text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow transition-all duration-150 w-full"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Retomar Execução (Resolvido)</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowConclusionModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all duration-150 w-full"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Concluir Serviço</span>
                  </button>

                  {ticket.status === 'Em execução' && (
                    <button
                      onClick={() => setShowPendenteModal(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow transition-all duration-150 w-full"
                    >
                      ⚠️ Falta Peça / Reposição
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Se nenhuma ação estiver disponível */}

          {(role === 'solicitante' || role === 'supervisor_recepcao') && (
            <span className="text-[11px] text-cm-text-mute text-right italic font-sans">
              {ticket.status === 'Aberta' ? 'Aguardando técnico' : ticket.status === 'Concluída' ? 'Concluída pelo técnico' : 'Em atendimento'}
            </span>
          )}

          {role === 'gerente' && (
            <div className="flex flex-col items-stretch md:items-end gap-1.5 w-full">
              {onDelete && (
                <button
                  onClick={() => {
                    if (window.confirm(`Deseja realmente excluir permanentemente a ordem de serviço ${ticket.id}?`)) {
                      onDelete(ticket.id);
                    }
                  }}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs self-stretch md:self-auto"
                  title="Excluir esta ordem de serviço permanentemente"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                  <span>Excluir OS</span>
                </button>
              )}
              <span className="text-[11px] text-cm-text-mute text-right italic font-sans">
                Visualização gerencial
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal simples de conclusão para coletar comentário */}
      {showConclusionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-cm-line p-5 max-w-md w-full animate-in fade-in zoom-in-95 duration-150">
            <h5 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Concluir Ordem de Serviço
            </h5>
            <p className="text-xs text-cm-text-mute mb-4">
              Descreva brevemente o que foi realizado para resolver este problema na OS {ticket.id}.
            </p>
            <form onSubmit={handleConcludeSubmit}>
              <textarea
                placeholder="Ex: Trocado o disjuntor defeituoso e testado a tensão, tudo operando perfeitamente."
                value={conclusionComment}
                onChange={(e) => setConclusionComment(e.target.value)}
                required
                className="w-full p-2.5 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink min-h-[90px] mb-4 resize-y"
              ></textarea>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConclusionModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-cm-text-mute border border-cm-line bg-white rounded-lg hover:bg-cm-paper cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors shadow"
                >
                  Confirmar Conclusão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Impedimento / Falta Peça */}
      {showPendenteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-cm-line p-5 max-w-md w-full animate-in fade-in zoom-in-95 duration-150">
            <h5 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide mb-2 flex items-center gap-2">
              ⚠️ Reportar Impedimento / Compra
            </h5>
            <p className="text-xs text-cm-text-mute mb-4">
              Explique detalhadamente qual peça precisa ser comprada ou qual equipamento precisa ser substituído para resolver a OS {ticket.id}. Isso ficará visível para a gerência e recepção.
            </p>
            <form onSubmit={handlePendenteSubmit}>
              <textarea
                placeholder="Ex: Não é possível reparar. Necessário comprar contator trifásico de 24V ou trocar a fechadura inteira por uma nova de 40mm."
                value={pendenteComment}
                onChange={(e) => setPendenteComment(e.target.value)}
                required
                className="w-full p-2.5 border border-cm-line rounded-lg text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink min-h-[90px] mb-4 resize-y"
              ></textarea>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPendenteModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-cm-text-mute border border-cm-line bg-white rounded-lg hover:bg-cm-paper cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer transition-colors shadow"
                >
                  Confirmar Pendência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

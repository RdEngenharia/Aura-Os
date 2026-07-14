import React, { useState, useEffect, useRef } from 'react';
import { OrdemServico, Usuario } from '../types';
import { SETORES, PRIORIDADES_INFO } from '../mockData';
import { TicketCard } from './TicketCard';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CalendarClock, 
  ListTodo, 
  MapPin, 
  Clock, 
  Search, 
  Activity,
  Download,
  Calendar,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Trash2
} from 'lucide-react';

interface GerenteViewProps {
  ordens: OrdemServico[];
  currentUser?: Usuario;
  onClearAll?: () => void;
  onDelete?: (id: string) => void;
}

/**
 * Visualização do Gerente Geral (Painel Consolidado de KPIs).
 * Polido, limpo e otimizado para evitar poluição visual através de Abas Dedicadas:
 * 1. Painel de Hoje (Acompanhamento diário por data e pesquisa de apartamento/quarto)
 * 2. Dashboard (Gráficos consolidados e tempos médios)
 * 3. Recorrência por Local (Histórico isolado de reincidência e linha do tempo de problemas)
 */
/**
 * Função de busca inteligente (smart match) para apartamentos/quartos/locais.
 * Permite buscar por números de quartos de forma flexível e mapeia sinônimos comuns do hotel (ex: "apto", "quarto").
 */
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[.,\-\/\\#@!$%\^&\*;:{}=\-_`~()]/g, ' ') // substitui pontuação por espaço
    .replace(/\s+/g, ' ') // substitui múltiplos espaços por um único
    .trim();
};

const getSynonymNormalizedTokens = (normalizedText: string): string[] => {
  return normalizedText.split(' ').map(token => {
    // Normaliza sinônimos de "apartamento"
    if (/^(apto|apt|apartamento|ap|apto\.)$/.test(token)) {
      return 'apto';
    }
    // Normaliza sinônimos de "quarto"
    if (/^(quarto|qto|room|qt|quarto\.)$/.test(token)) {
      return 'quarto';
    }
    return token;
  }).filter(Boolean);
};

export const smartMatchesLocation = (location: string, query: string): boolean => {
  const cleanLoc = normalizeText(location);
  const cleanQuery = normalizeText(query);
  
  if (!cleanQuery) return true;
  if (!cleanLoc) return false;

  const locTokens = getSynonymNormalizedTokens(cleanLoc);
  const queryTokens = getSynonymNormalizedTokens(cleanQuery);

  // Verifica se todos os tokens da busca são encontrados no local
  return queryTokens.every(qToken => {
    // Se o token for um número, tenta fazer correspondência exata do número para evitar falsos parciais (ex: buscar "20" não deve trazer "202")
    if (/^\d+$/.test(qToken)) {
      return locTokens.some(lToken => {
        if (lToken === qToken) return true;
        // Permite "20a" ou "20-a" contendo "20" como parte do número
        const numPart = lToken.replace(/\D/g, '');
        return numPart === qToken;
      });
    }
    
    // Para tokens de texto normais, aceita busca parcial
    return locTokens.some(lToken => lToken.includes(qToken));
  });
};

export const GerenteView: React.FC<GerenteViewProps> = ({ ordens, currentUser, onClearAll, onDelete }) => {
  // Controle de Abas
  const [activeTab, setActiveTab] = useState<'hoje' | 'analise' | 'locais'>('hoje');
  
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filtros da aba de Hoje
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10)); // Data atual do sistema
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [filterStatusHoje, setFilterStatusHoje] = useState<string>('todas');

  // Filtros da aba de Recorrência
  const [selectedLocal, setSelectedLocal] = useState<string>('');
  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
  const [isLocalDropdownOpen, setIsLocalDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ---------------- LÓGICA DE ALERTA DE URGÊNCIA ----------------
  const uncompletedUrgentCount = ordens.filter(
    o => o.prioridade === 'URGENTE' && o.status !== 'Concluída'
  ).length;


  // ---------------- LÓGICA DE GERAÇÃO DE METRICAS E KPIs GERAIS ----------------
  const total = ordens.length;
  const abertas = ordens.filter(o => o.status === 'Aberta').length;
  const execucao = ordens.filter(o => o.status === 'Em execução').length;
  const pendentePeca = ordens.filter(o => o.status === 'Pendente de Peça').length;
  const concluidas = ordens.filter(o => o.status === 'Concluída').length;

  // Concluídas no mês corrente (Julho de 2026)
  const now = new Date();
  const concluidasMes = ordens.filter(o => {
    if (o.status !== 'Concluída' || !o.dataConclusao) return false;
    try {
      const dataConc = new Date(o.dataConclusao);
      return dataConc.getMonth() === now.getMonth() && dataConc.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
  }).length;

  // Tempo médio de conclusão geral
  const concluidasComTempo = ordens.filter(o => o.status === 'Concluída' && o.dataConclusao && o.dataCriacao);
  let tempoMedioStr = '—';
  if (concluidasComTempo.length > 0) {
    const somaTempoMs = concluidasComTempo.reduce((acc, o) => {
      const criacao = new Date(o.dataCriacao).getTime();
      const conclusao = new Date(o.dataConclusao!).getTime();
      return acc + (conclusao - criacao);
    }, 0);
    const mediaDias = somaTempoMs / concluidasComTempo.length / 86400000;
    
    if (mediaDias < 0.1) {
      tempoMedioStr = "Menos de 2 horas";
    } else if (mediaDias < 1) {
      const horas = Math.round(mediaDias * 24);
      tempoMedioStr = `~ ${horas} horas`;
    } else {
      tempoMedioStr = `${mediaDias.toFixed(1)} dias`;
    }
  }

  // Quantidade de ordens atrasadas (> 5 dias sem fechar)
  const getDiasDesdeCriacao = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    return Math.floor(diffMs / 86400000);
  };
  const atrasadas = ordens.filter(o => o.status !== 'Concluída' && getDiasDesdeCriacao(o.dataCriacao) > 5);

  // ---------------- ABA 1: PAINEL DE HOJE (ACOMPANHAMENTO DIÁRIO) ----------------
  // Filtragem estrita por Data e por Termo do Apartamento / Quarto
  const listagemHoje = ordens
    .filter(o => {
      // Filtro de data (ou todas)
      const matchDate = selectedDate === 'todas_datas' || o.data === selectedDate;
      
      // Filtro inteligente de termo de apartamento/quarto/local (mapeando sinônimos e números flexíveis)
      const matchRoom = !roomSearch.trim() || smartMatchesLocation(o.local, roomSearch);
      
      // Filtro de status rápido na aba hoje
      const matchStatus = filterStatusHoje === 'todas' || o.status === filterStatusHoje;

      return matchDate && matchRoom && matchStatus;
    })
    .sort((a, b) => {
      // Prioridade máxima para URGENTE ativo na listagem diária
      const aUrg = a.prioridade === 'URGENTE' && a.status !== 'Concluída';
      const bUrg = b.prioridade === 'URGENTE' && b.status !== 'Concluída';
      if (aUrg && !bUrg) return -1;
      if (!aUrg && bUrg) return 1;
      
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });

  // ---------------- ABA 2: SLA & ESTATÍSTICAS ----------------
  // Volume de Chamados por Setor
  const porSetor: Record<string, number> = {};
  SETORES.forEach(s => { porSetor[s] = 0; });
  ordens.forEach(o => {
    if (porSetor[o.setor] !== undefined) {
      porSetor[o.setor]++;
    } else {
      porSetor[o.setor] = 1;
    }
  });
  const dadosSetor = Object.entries(porSetor).filter(([, v]) => v > 0);
  const maxSetor = Math.max(1, ...Object.values(porSetor));

  // Chamados por Severidade
  const porPrioridade: Record<string, number> = {};
  PRIORIDADES_INFO.forEach(p => { porPrioridade[p.v] = 0; });
  ordens.forEach(o => {
    if (porPrioridade[o.prioridade] !== undefined) {
      porPrioridade[o.prioridade]++;
    }
  });
  const maxPrioridade = Math.max(1, ...Object.values(porPrioridade));

  // SLA por Tipo de Manutenção
  const temposPorTipoMap: Record<string, { somaMs: number; count: number }> = {};
  concluidasComTempo.forEach(o => {
    const tipo = o.tipoManutencao;
    const criacao = new Date(o.dataCriacao).getTime();
    const conclusao = new Date(o.dataConclusao!).getTime();
    const diff = conclusao - criacao;
    if (!temposPorTipoMap[tipo]) {
      temposPorTipoMap[tipo] = { somaMs: 0, count: 0 };
    }
    temposPorTipoMap[tipo].somaMs += diff;
    temposPorTipoMap[tipo].count++;
  });

  const dadosTempoTipo = Object.entries(temposPorTipoMap).map(([tipo, info]) => {
    const mediaHoras = info.somaMs / info.count / 3600000;
    return { tipo, mediaHoras, count: info.count };
  }).sort((a, b) => a.mediaHoras - b.mediaHoras);

  const maxMediaHoras = Math.max(1, ...dadosTempoTipo.map(d => d.mediaHoras));


  // ---------------- ABA 3: HISTÓRICO & DIAGNÓSTICO POR LOCAL ----------------
  const locaisUnicos = Array.from(new Set(ordens.map(o => o.local).filter(Boolean))).sort() as string[];
  
  const ocorrenciasPorLocal: Record<string, { 
    total: number; 
    tipos: Record<string, number>; 
    status: Record<string, number>; 
    itens: OrdemServico[] 
  }> = {};
  
  ordens.forEach(o => {
    const loc = o.local;
    if (!loc) return;
    if (!ocorrenciasPorLocal[loc]) {
      ocorrenciasPorLocal[loc] = { total: 0, tipos: {}, status: {}, itens: [] };
    }
    ocorrenciasPorLocal[loc].total++;
    ocorrenciasPorLocal[loc].itens.push(o);
    
    const t = o.tipoManutencao;
    ocorrenciasPorLocal[loc].tipos[t] = (ocorrenciasPorLocal[loc].tipos[t] || 0) + 1;
    
    const s = o.status;
    ocorrenciasPorLocal[loc].status[s] = (ocorrenciasPorLocal[loc].status[s] || 0) + 1;
  });

  // Top 5 locais com mais problemas registrados (reincidentes: com no mínimo 2 ocorrências)
  const topLocais = Object.entries(ocorrenciasPorLocal)
    .filter(([_, info]) => info.total >= 2)
    .map(([loc, info]) => ({ loc, total: info.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const localAtivo = selectedLocal || (topLocais[0]?.loc) || '';
  const infoLocalAtivo = localAtivo ? ocorrenciasPorLocal[localAtivo] : null;

  // Fechar dropdown de busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLocalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincroniza o termo de busca com o local ativo se o dropdown não estiver aberto
  useEffect(() => {
    if (!isLocalDropdownOpen) {
      setLocalSearchQuery(localAtivo);
    }
  }, [localAtivo, isLocalDropdownOpen]);


  // ---------------- LÓGICA DE EXPORTAÇÃO PARA PDF ----------------
  const handleExportHojePDF = () => {
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

    const rowsHtml = listagemHoje.map(o => `
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
        <title>Relatório de Manutenção - Hoje - ${selectedDate === 'todas_datas' ? 'Geral' : selectedDate}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1E293B; margin: 30px; line-height: 1.4; }
          .container { max-width: 1000px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0F172A; padding-bottom: 15px; margin-bottom: 25px; }
          .title-area h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area p { font-size: 11px; color: #64748B; margin: 4px 0 0 0; }
          .meta-area { text-align: right; font-size: 10px; color: #475569; }
          .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 25px; }
          .kpi-card { border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; text-align: center; background-color: #F8FAFC; }
          .kpi-num { font-size: 18px; font-weight: 800; color: #0F172A; }
          .kpi-lbl { font-size: 9px; color: #64748B; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left; }
          th { background-color: #0F172A; color: white; padding: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .btn-print { background-color: #0F172A; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
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
          <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: #F1F5F9; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <div style="font-size: 12px; font-weight: 500; color: #334155;">💻 Visualização de Impressão de Relatório • Pressione o botão para gerar o PDF ou Imprimir:</div>
            <div>
              <button class="btn-print" onclick="window.print()">🖨️ Gerar PDF / Imprimir</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>

          <div class="header">
            <div class="title-area">
              <h1>Relatório de Atendimento de Manutenção</h1>
              <p>Fila Consolidada de Chamados de Engenharia • Filtro de Período: ${selectedDate === 'todas_datas' ? 'Todas as Datas Ativas' : 'Dia ' + new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
            <div class="meta-area">
              <div><b>Gerado por:</b> ${currentUser?.name || 'Gerência Geral'} (${currentUser?.role || 'gerente'})</div>
              <div><b>Data de Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card"><div class="kpi-num">${listagemHoje.length}</div><div class="kpi-lbl">Filtrados</div></div>
            <div class="kpi-card"><div class="kpi-num">${listagemHoje.filter(o => o.status === 'Aberta' || o.status === 'Atribuída').length}</div><div class="kpi-lbl">Aguardando Técnico</div></div>
            <div class="kpi-card"><div class="kpi-num">${listagemHoje.filter(o => o.status === 'Em execução').length}</div><div class="kpi-lbl">Em Execução</div></div>
            <div class="kpi-card"><div class="kpi-num">${listagemHoje.filter(o => o.status === 'Pendente de Peça').length}</div><div class="kpi-lbl">Pendente Peça</div></div>
            <div class="kpi-card"><div class="kpi-num">${listagemHoje.filter(o => o.status === 'Concluída').length}</div><div class="kpi-lbl">Concluídos</div></div>
          </div>

          <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0F172A; border-bottom: 1.5px solid #0F172A; padding-bottom: 6px; margin-bottom: 10px;">Ordens de Serviço Selecionadas</h2>
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
            Aura OS • Sistema Inteligente de Ordens de Serviço • Relatório Oficial da Gerência Geral
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportSlaPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para gerar e salvar o PDF.');
      return;
    }

    const setoresHtml = dadosSetor.map(([s, v]) => `
      <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
        <td style="padding: 8px 10px; font-weight: bold;">${s}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${v} ${v === 1 ? 'OS' : 'OSs'}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${((v / total) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    const prioridadesHtml = PRIORIDADES_INFO.map(p => {
      const count = porPrioridade[p.v] || 0;
      return `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
          <td style="padding: 8px 10px; font-weight: bold; color: ${p.color};">${p.v}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${count}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${((count / (total || 1)) * 100).toFixed(1)}%</td>
        </tr>
      `;
    }).join('');

    const slaCategoriasHtml = dadosTempoTipo.map(d => {
      const emDias = d.mediaHoras >= 24;
      const valorExibicao = emDias 
        ? `${(d.mediaHoras / 24).toFixed(1)} dias`
        : `~ ${d.mediaHoras.toFixed(1)} horas`;
      return `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
          <td style="padding: 8px 10px; font-weight: bold;">${d.tipo}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${d.count} OSs</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; color: #0F172A;">${valorExibicao}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório de SLA & Estatísticas de Engenharia</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1E293B; margin: 30px; line-height: 1.4; }
          .container { max-width: 1000px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0F172A; padding-bottom: 15px; margin-bottom: 25px; }
          .title-area h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area p { font-size: 11px; color: #64748B; margin: 4px 0 0 0; }
          .meta-area { text-align: right; font-size: 10px; color: #475569; }
          .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 35px; }
          .kpi-card { border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; text-align: center; background-color: #F8FAFC; }
          .kpi-num { font-size: 18px; font-weight: 800; color: #0F172A; }
          .kpi-lbl { font-size: 9px; color: #64748B; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.5px; }
          .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0F172A; border-bottom: 1.5px solid #0F172A; padding-bottom: 6px; margin-bottom: 15px; margin-top: 30px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
          table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px; }
          th { background-color: #0F172A; color: white; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .btn-print { background-color: #0F172A; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
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
          <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: #F1F5F9; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <div style="font-size: 12px; font-weight: 500; color: #334155;">💻 Visualização de Impressão de SLA e Estatísticas • Pressione o botão para gerar o PDF ou Imprimir:</div>
            <div>
              <button class="btn-print" onclick="window.print()">🖨️ Gerar PDF / Imprimir</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>

          <div class="header">
            <div class="title-area">
              <h1>Relatório de SLA e Indicadores Consolidados</h1>
              <p>Métricas de Desempenho e Eficiência do Resort</p>
            </div>
            <div class="meta-area">
              <div><b>Gerado por:</b> ${currentUser?.name || 'Gerência Geral'} (${currentUser?.role || 'gerente'})</div>
              <div><b>Data de Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card"><div class="kpi-num">${total}</div><div class="kpi-lbl">Total Geral</div></div>
            <div class="kpi-card"><div class="kpi-num">${abertas}</div><div class="kpi-lbl">Sem Técnico</div></div>
            <div class="kpi-card"><div class="kpi-num">${execucao}</div><div class="kpi-lbl">Em Execução</div></div>
            <div class="kpi-card"><div class="kpi-num">${pendentePeca}</div><div class="kpi-lbl">Falta Peça</div></div>
            <div class="kpi-card"><div class="kpi-num">${concluidas}</div><div class="kpi-lbl">Concluídos</div></div>
          </div>

          <div class="grid-2">
            <div>
              <div class="section-title">Chamados por Setor Requisitante</div>
              <table>
                <thead>
                  <tr>
                    <th>Setor</th>
                    <th style="text-align: right;">Quantidade</th>
                    <th style="text-align: right;">Porcentagem</th>
                  </tr>
                </thead>
                <tbody>
                  ${setoresHtml || '<tr><td colspan="3" style="text-align: center; padding: 15px; color: #64748B;">Nenhum registro.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div>
              <div class="section-title">Chamados por Severidade / Prioridade</div>
              <table>
                <thead>
                  <tr>
                    <th>Prioridade</th>
                    <th style="text-align: right;">Quantidade</th>
                    <th style="text-align: right;">Porcentagem</th>
                  </tr>
                </thead>
                <tbody>
                  ${prioridadesHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-title">SLA / Tempo Médio de Solução por Categoria</div>
          <table>
            <thead>
              <tr>
                <th>Categoria Técnico</th>
                <th style="text-align: right;">Quantidade de Concluídos</th>
                <th style="text-align: right;">Tempo Médio de Resolução</th>
              </tr>
            </thead>
            <tbody>
              ${slaCategoriasHtml || '<tr><td colspan="3" style="text-align: center; padding: 15px; color: #64748B;">Nenhum registro de conclusão de SLA encontrado.</td></tr>'}
            </tbody>
          </table>

          <div style="background-color: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0; margin-top: 30px; font-size: 11px; display: flex; justify-content: space-between;">
            <div><b>Média Geral de Tempo de Solução:</b> ${tempoMedioStr}</div>
            <div><b>Chamados Críticos com Atraso (+5 dias):</b> ${atrasadas.length}</div>
          </div>

          <div style="margin-top: 50px; font-size: 9px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 10px;">
            Aura OS • Sistema Inteligente de Ordens de Serviço • Relatório Oficial da Gerência Geral
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportRecorrenciaPDF = () => {
    if (!localAtivo) {
      alert('Selecione um apartamento/local primeiro para exportar o diagnóstico de recorrência.');
      return;
    }

    const info = ocorrenciasPorLocal[localAtivo];
    if (!info) {
      alert('Nenhuma ocorrência registrada para o local selecionado.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para gerar e salvar o PDF.');
      return;
    }

    const tiposHtml = Object.entries(info.tipos).map(([tipo, count]) => `
      <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
        <td style="padding: 8px 10px; font-weight: bold;">${tipo}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${count}x</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${((count / info.total) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    const statusHtml = Object.entries(info.status).map(([status, count]) => `
      <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
        <td style="padding: 8px 10px; font-weight: bold;">${status}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${count}x</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${((count / info.total) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    const timelineHtml = info.itens
      .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime())
      .map(item => `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
          <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #0F172A;">${item.id}</td>
          <td style="padding: 10px;">${new Date(item.dataCriacao).toLocaleDateString('pt-BR')} ${new Date(item.dataCriacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</td>
          <td style="padding: 10px;">${item.solicitante}</td>
          <td style="padding: 10px;">${item.tipoManutencao}</td>
          <td style="padding: 10px;"><span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background-color: #F8FAFC; border: 1px solid #E2E8F0; color: #0F172A;">${item.status}</span></td>
          <td style="padding: 10px; color: #334155; max-width: 300px; word-wrap: break-word;">${item.detalhes}</td>
          <td style="padding: 10px;">${item.executor || 'Não atribuído'}</td>
        </tr>
      `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Diagnóstico de Recorrência - ${localAtivo}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1E293B; margin: 30px; line-height: 1.4; }
          .container { max-width: 1000px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0F172A; padding-bottom: 15px; margin-bottom: 25px; }
          .title-area h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area p { font-size: 11px; color: #64748B; margin: 4px 0 0 0; }
          .meta-area { text-align: right; font-size: 10px; color: #475569; }
          .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0F172A; border-bottom: 1.5px solid #0F172A; padding-bottom: 6px; margin-bottom: 15px; margin-top: 30px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px; }
          th { background-color: #0F172A; color: white; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .btn-print { background-color: #0F172A; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
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
          <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: #F1F5F9; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <div style="font-size: 12px; font-weight: 500; color: #334155;">💻 Visualização de Impressão de Diagnóstico por Local • Pressione o botão para gerar o PDF ou Imprimir:</div>
            <div>
              <button class="btn-print" onclick="window.print()">🖨️ Gerar PDF / Imprimir</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>

          <div class="header">
            <div class="title-area">
              <h1>Diagnóstico de Ocorrências e Recorrência</h1>
              <p>Histórico e Mapeamento Preventivo do Resort • <b>Local: ${localAtivo}</b></p>
            </div>
            <div class="meta-area">
              <div><b>Gerado por:</b> ${currentUser?.name || 'Gerência Geral'} (${currentUser?.role || 'gerente'})</div>
              <div><b>Total Ocorrências no Local:</b> ${info.total} chamados</div>
              <div><b>Data de Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div class="grid-2">
            <div>
              <div class="section-title">Distribuição por Tipos Técnicos</div>
              <table>
                <thead>
                  <tr>
                    <th>Especialidade</th>
                    <th style="text-align: right;">Quantidade</th>
                    <th style="text-align: right;">Porcentagem</th>
                  </tr>
                </thead>
                <tbody>
                  ${tiposHtml || '<tr><td colspan="3" style="text-align: center; padding: 15px; color: #64748B;">Nenhum registro de especialidade.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div>
              <div class="section-title">Situação de Atendimento</div>
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th style="text-align: right;">Quantidade</th>
                    <th style="text-align: right;">Porcentagem</th>
                  </tr>
                </thead>
                <tbody>
                  ${statusHtml || '<tr><td colspan="3" style="text-align: center; padding: 15px; color: #64748B;">Nenhum registro de status.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-title">Linha do Tempo Cronológica de Ocorrências</div>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">OS Código</th>
                <th style="width: 120px;">Data de Abertura</th>
                <th style="width: 100px;">Solicitante</th>
                <th style="width: 100px;">Categoria</th>
                <th style="width: 90px;">Status</th>
                <th>Detalhes do Problema</th>
                <th style="width: 100px;">Executor</th>
              </tr>
            </thead>
            <tbody>
              ${timelineHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748B;">Nenhuma ordem registrada neste local.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 50px; font-size: 9px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 10px;">
            Aura OS • Sistema Inteligente de Ordens de Serviço • Relatório Oficial da Gerência Geral
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportPDF = () => {
    if (activeTab === 'hoje') {
      handleExportHojePDF();
    } else if (activeTab === 'analise') {
      handleExportSlaPDF();
    } else if (activeTab === 'locais') {
      handleExportRecorrenciaPDF();
    }
  };

  // Helper de tradução de data curta
  const fmtShortDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO DA TELA DO GERENTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cm-line pb-4">
        <div>
          <h3 className="font-display font-semibold text-base text-cm-ink uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cm-ink" />
            <span>Painel da Gerência Geral</span>
          </h3>
          <p className="text-[11px] text-cm-text-mute mt-0.5">
            Controle consolidado de chamados, SLAs, indicadores estatísticos e rastreamento de problemas por apartamento.
          </p>
        </div>

        {/* CONTROLES RÁPIDOS GERAIS: EXPORT PDF */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Botão de Exportação para PDF */}
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 bg-cm-ink text-white hover:bg-cm-ink/90 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* BANNER DINÂMICO DE ATENÇÃO SE HOUVER URGÊNCIAS ATIVAS */}
      {uncompletedUrgentCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3.5 flex items-start gap-3.5 animate-pulse">
          <div className="bg-red-600 text-white p-2 rounded-lg flex-shrink-0 shadow-sm">
            <AlertOctagon className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <h5 className="font-display font-bold text-xs text-red-900 uppercase tracking-wide flex items-center gap-1.5">
              <span>🚨 Alerta de Urgência Ativo</span>
              <span className="bg-red-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {uncompletedUrgentCount} Pendente{uncompletedUrgentCount === 1 ? '' : 's'}
              </span>
            </h5>
            <p className="text-[11px] text-red-800 leading-relaxed mt-0.5 font-medium">
              Há problemas críticos pendentes de atendimento (ex: vazamentos nos quartos). Priorize o atendimento imediato destas ordens de serviço.
            </p>
          </div>
        </div>
      )}

      {/* SELEÇÃO DE ABAS DEDICADAS (EVITA POLUIÇÃO VISUAL) */}
      <div className="border-b border-cm-line flex items-center gap-1">
        <button
          onClick={() => setActiveTab('hoje')}
          className={`px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'hoje'
              ? 'border-cm-ink text-cm-ink bg-cm-ink/5 rounded-t-lg font-extrabold'
              : 'border-transparent text-cm-text-mute hover:text-cm-ink hover:bg-cm-paper/40 rounded-t-lg'
          }`}
        >
          🕒 Painel de Hoje
        </button>

        <button
          onClick={() => setActiveTab('analise')}
          className={`px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'analise'
              ? 'border-cm-ink text-cm-ink bg-cm-ink/5 rounded-t-lg font-extrabold'
              : 'border-transparent text-cm-text-mute hover:text-cm-ink hover:bg-cm-paper/40 rounded-t-lg'
          }`}
        >
          📊 Dashboard
        </button>

        <button
          onClick={() => setActiveTab('locais')}
          className={`px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'locais'
              ? 'border-cm-ink text-cm-ink bg-cm-ink/5 rounded-t-lg font-extrabold'
              : 'border-transparent text-cm-text-mute hover:text-cm-ink hover:bg-cm-paper/40 rounded-t-lg'
          }`}
        >
          🔍 Recorrência por Local
        </button>
      </div>


      {/* CONTEÚDO DA ABA 1: PAINEL DE HOJE */}
      {activeTab === 'hoje' && (
        <div className="space-y-5">
          {/* FILTROS E PESQUISAS DO DIA */}
          <div className="bg-cm-paper/45 border border-cm-line rounded-xl p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            
            {/* Esquerda: Escolha de Data e Buscador por Apartamento */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
              {/* Filtro de Data */}
              <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                <span className="text-[11px] font-bold text-cm-text uppercase tracking-wider whitespace-nowrap block sm:inline">
                  Data:
                </span>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate === 'todas_datas' ? '' : selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value || 'todas_datas')}
                    className="w-full sm:w-40 pl-8 pr-2 py-1.5 border border-cm-line rounded-lg text-xs md:text-sm bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink"
                  />
                  <Calendar className="w-4 h-4 text-cm-text-mute absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Filtro de Apartamento/Quarto/Local */}
              <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-2 flex-1">
                <span className="text-[11px] font-bold text-cm-text uppercase tracking-wider whitespace-nowrap block sm:inline">
                  Quarto/Local:
                </span>
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Pesquisar quarto (ex: Quarto 202, Recepção)..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-cm-line rounded-lg text-xs md:text-sm bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-1 focus:ring-cm-ink"
                  />
                  <Search className="w-4 h-4 text-cm-text-mute absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Direita: Quick-Selectors de Período e Status */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex bg-white border border-cm-line rounded-lg p-0.5 shadow-xs">
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    selectedDate === todayStr
                      ? 'bg-cm-ink text-white shadow-xs'
                      : 'text-cm-text-mute hover:text-cm-ink'
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => setSelectedDate('todas_datas')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    selectedDate === 'todas_datas'
                      ? 'bg-cm-ink text-white shadow-xs'
                      : 'text-cm-text-mute hover:text-cm-ink'
                  }`}
                >
                  Todas Datas
                </button>
              </div>

              {/* Filtro secundário de status */}
              <select
                value={filterStatusHoje}
                onChange={(e) => setFilterStatusHoje(e.target.value)}
                className="px-2.5 py-1.5 border border-cm-line rounded-lg text-xs md:text-sm bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink shadow-xs"
              >
                <option value="todas">Todos status</option>
                <option value="Aberta">Aberta</option>
                <option value="Atribuída">Atribuída</option>
                <option value="Em execução">Em execução</option>
                <option value="Pendente de Peça">Pendente de Peça</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>
          </div>

          {/* LISTA COMPATÍVEL DE HOJE */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 px-1">
              <span className="text-xs font-bold text-cm-text-mute uppercase tracking-wider font-mono">
                📅 {selectedDate === 'todas_datas' ? 'Todo o Período' : `Data Filtro: ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}`}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportHojePDF}
                  className="px-2.5 py-1 bg-white hover:bg-cm-paper text-cm-ink border border-cm-line rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Exportar esta lista de chamados de hoje para PDF"
                >
                  <Download className="w-3.5 h-3.5 text-cm-text-mute" />
                  <span>Exportar Lista (PDF)</span>
                </button>
                <span className="bg-cm-paper text-cm-ink font-mono text-xs px-2.5 py-0.5 rounded-full border border-cm-line font-bold">
                  {listagemHoje.length} {listagemHoje.length === 1 ? 'OS Encontrada' : 'OSs Encontradas'}
                </span>
              </div>
            </div>

            {listagemHoje.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white border border-cm-line border-dashed rounded-xl text-cm-text-mute shadow-xs">
                <div className="text-4xl mb-3 opacity-40">✨</div>
                <h5 className="font-semibold text-sm text-cm-ink">Tudo tranquilo!</h5>
                <p className="text-xs text-cm-text-mute mt-1 max-w-md mx-auto">
                  Nenhum chamado de manutenção registrado para este dia ou apartamento que atenda aos critérios informados.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {listagemHoje.map(o => (
                  <TicketCard
                    key={o.id}
                    ticket={o}
                    role="gerente"
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* CONTEÚDO DA ABA 2: DASHBOARD */}
      {activeTab === 'analise' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
            <h4 className="text-xs font-bold text-cm-text-mute uppercase tracking-wider font-mono">
              📊 Indicadores Consolidados (Dashboard)
            </h4>
            <button
              onClick={handleExportSlaPDF}
              className="px-3 py-1.5 bg-white hover:bg-cm-paper text-cm-ink border border-cm-line rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-stretch sm:self-auto"
              title="Exportar indicadores consolidados e dashboard para PDF"
            >
              <Download className="w-4 h-4 text-cm-text-mute" />
              <span>Exportar Dashboard (PDF)</span>
            </button>
          </div>

          {/* Grid de KPIs principais */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-cm-line rounded-xl p-4 shadow-sm text-center">
              <div className="font-display text-2xl font-bold text-cm-ink">{total}</div>
              <div className="text-[10px] font-bold text-cm-text-mute uppercase tracking-wider mt-1">Total Geral</div>
            </div>
            <div className="bg-white border border-cm-line rounded-xl p-4 shadow-sm text-center">
              <div className="font-display text-2xl font-bold text-[#8B6E30]">{abertas}</div>
              <div className="text-[10px] font-bold text-cm-text-mute uppercase tracking-wider mt-1">Sem Técnico</div>
            </div>
            <div className="bg-white border border-cm-line rounded-xl p-4 shadow-sm text-center">
              <div className="font-display text-2xl font-bold text-cm-execucao">{execucao}</div>
              <div className="text-[10px] font-bold text-cm-text-mute uppercase tracking-wider mt-1">Em Atendimento</div>
            </div>
            <div className="bg-white border border-cm-line rounded-xl p-4 shadow-sm text-center">
              <div className="font-display text-2xl font-bold text-amber-600">{pendentePeca}</div>
              <div className="text-[10px] font-bold text-cm-text-mute uppercase tracking-wider mt-1">Falta Peça</div>
            </div>
            <div className="bg-white border border-cm-line rounded-xl p-4 shadow-sm text-center">
              <div className="font-display text-2xl font-bold text-cm-baixa">{concluidas}</div>
              <div className="text-[10px] font-bold text-cm-text-mute uppercase tracking-wider mt-1">Total Concluído</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Distribuição por Setor */}
            <div className="bg-white border border-cm-line rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-display font-semibold text-xs text-cm-ink uppercase tracking-wider flex items-center gap-1.5 border-b border-cm-line pb-2">
                <TrendingUp className="w-4 h-4 text-cm-ink" />
                <span>Chamados por Setor Requisitante</span>
              </h4>

              {dadosSetor.length === 0 ? (
                <p className="text-xs text-cm-text-mute italic py-8 text-center">Nenhum chamado aberto nos setores até agora.</p>
              ) : (
                <div className="space-y-3.5">
                  {dadosSetor.map(([s, v]) => (
                    <div key={s} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-gray-700">{s}</span>
                        <span className="font-mono text-cm-text-mute font-semibold">{v} {v === 1 ? 'OS' : 'OSs'}</span>
                      </div>
                      <div className="w-full bg-cm-paper rounded-full h-3 overflow-hidden flex">
                        <div 
                          className="bg-cm-ink h-full rounded-full transition-all duration-500"
                          style={{ width: `${(v / maxSetor) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Severidade */}
            <div className="bg-white border border-cm-line rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-display font-semibold text-xs text-cm-ink uppercase tracking-wider flex items-center gap-1.5 border-b border-cm-line pb-2">
                <AlertTriangle className="w-4 h-4 text-cm-ink" />
                <span>Chamados por Severidade / Prioridade</span>
              </h4>

              <div className="space-y-3.5">
                {PRIORIDADES_INFO.map(p => {
                  const count = porPrioridade[p.v] || 0;
                  return (
                    <div key={p.v} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-gray-700">{p.v}</span>
                        <span className="font-mono text-cm-text-mute font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-cm-paper rounded-full h-3 overflow-hidden flex">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(count / maxPrioridade) * 100}%`,
                            backgroundColor: p.color
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Seção SLA / Tempo de Solução */}
          <div className="bg-white border border-cm-line rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-cm-line pb-2">
              <h4 className="font-display font-semibold text-xs text-cm-ink uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cm-ink" />
                <span>SLA / Tempo Médio de Solução por Categoria</span>
              </h4>
              <p className="text-[10px] text-cm-text-mute mt-0.5">
                Tempo decorrido entre a criação do chamado e a sua respectiva conclusão pelo técnico.
              </p>
            </div>

            {dadosTempoTipo.length === 0 ? (
              <div className="text-center py-10 text-xs text-cm-text-mute italic">
                Sem dados de conclusão suficientes para cálculo das médias de SLA por tipo.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dadosTempoTipo.map(d => {
                    const emDias = d.mediaHoras >= 24;
                    const valorExibicao = emDias 
                      ? `${(d.mediaHoras / 24).toFixed(1)} dias`
                      : `~ ${d.mediaHoras.toFixed(1)} horas`;

                    return (
                      <div key={d.tipo} className="space-y-1 bg-cm-paper/30 border border-cm-line/40 p-3 rounded-lg">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cm-ink"></span>
                            {d.tipo}
                          </span>
                          <span className="font-mono text-cm-ink font-bold">
                            {valorExibicao} <span className="text-[10px] text-cm-text-mute font-normal">({d.count} OSs)</span>
                          </span>
                        </div>
                        <div className="w-full bg-white border border-cm-line rounded-full h-2 overflow-hidden flex mt-1.5">
                          <div 
                            className="bg-cm-ink h-full rounded-full transition-all duration-500"
                            style={{ width: `${(d.mediaHoras / maxMediaHoras) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-cm-paper/40 rounded-lg p-3.5 border border-cm-line/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm">
                  <div className="flex items-center gap-2 text-cm-text-mute">
                    <CalendarClock className="w-4 h-4 text-cm-ink shrink-0" />
                    <span>Média geral de tempo de solução: <strong className="text-cm-ink font-bold">{tempoMedioStr}</strong></span>
                  </div>
                  {atrasadas.length > 0 && (
                    <div className="flex items-center gap-2 text-cm-urgente font-semibold">
                      <AlertTriangle className="w-4 h-4 text-cm-urgente animate-bounce" />
                      <span>{atrasadas.length} chamados ativos com atraso crítico (+ de 5 dias).</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* CONTEÚDO DA ABA 3: HISTÓRICO & DIAGNÓSTICO POR LOCAL */}
      {activeTab === 'locais' && (
        <div className="space-y-6">
          <div className="bg-white border border-cm-line rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-cm-line pb-2">
              <h4 className="font-display font-semibold text-xs text-cm-ink uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cm-ink" />
                <span>Diagnóstico de Recorrência e Frequência por Local</span>
              </h4>
              <p className="text-[10px] text-cm-text-mute mt-0.5">
                Rastreamento inteligente de problemas reincidentes no hotel para auxiliar na manutenção preventiva de equipamentos.
              </p>
            </div>

            {/* SELETOR DO LOCAL E QUICK SELECTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start bg-cm-paper/45 p-4 rounded-xl border border-cm-line">
              <div className="space-y-1 relative" ref={dropdownRef}>
                <label className="text-[11px] font-bold text-cm-text uppercase tracking-wider block">
                  Pesquise o Apartamento/Local:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite o número ou nome do local..."
                    value={localSearchQuery}
                    onFocus={() => setIsLocalDropdownOpen(true)}
                    onChange={(e) => {
                      setLocalSearchQuery(e.target.value);
                      setIsLocalDropdownOpen(true);
                    }}
                    className="w-full pl-8 pr-8 py-1.5 border border-cm-line rounded-lg text-xs md:text-sm bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink shadow-xs"
                  />
                  <Search className="w-4 h-4 text-cm-text-mute absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {localSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSearchQuery('');
                        setSelectedLocal('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cm-text-mute hover:text-cm-ink text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown de sugestão de locais */}
                {isLocalDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-cm-line rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-cm-line/50">
                    {locaisUnicos.filter(loc => 
                      smartMatchesLocation(loc, localSearchQuery)
                    ).length === 0 ? (
                      <div className="p-3 text-xs text-cm-text-mute italic text-center">
                        Nenhum local correspondente encontrado
                      </div>
                    ) : (
                      locaisUnicos
                        .filter(loc => smartMatchesLocation(loc, localSearchQuery))
                        .map(loc => {
                          const numOcorrencias = ocorrenciasPorLocal[loc]?.total || 0;
                          return (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                setSelectedLocal(loc);
                                setLocalSearchQuery(loc);
                                setIsLocalDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between hover:bg-cm-paper cursor-pointer ${
                                localAtivo === loc ? 'bg-cm-ink/5 font-bold text-cm-ink' : 'text-cm-text'
                              }`}
                            >
                              <span>🏢 {loc}</span>
                              <span className="font-mono text-[10px] text-cm-text-mute bg-cm-paper px-1.5 py-0.5 rounded">
                                {numOcorrencias} chamados
                              </span>
                            </button>
                          );
                        })
                    )}
                  </div>
                )}
              </div>

              {/* Quick selectors reincidentes */}
              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-bold text-cm-text-mute uppercase tracking-wider">
                  🚨 Locais com Maior Ocorrência (Reincidentes):
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {topLocais.map(tl => (
                    <button
                      key={tl.loc}
                      onClick={() => setSelectedLocal(tl.loc)}
                      className={`px-3 py-1 rounded-lg border transition-all text-xs font-semibold cursor-pointer ${
                        localAtivo === tl.loc
                          ? 'bg-red-50 text-red-700 border-red-300 shadow-xs'
                          : 'bg-white border-cm-line hover:border-gray-400 text-gray-600'
                      }`}
                    >
                      🔥 {tl.loc} ({tl.total} chamados)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DIAGNÓSTICO INTEGRAL E LINHA DO TEMPO */}
            {!infoLocalAtivo ? (
              <div className="text-center py-14 text-xs text-cm-text-mute italic bg-cm-paper/20 rounded-xl border border-cm-line border-dashed">
                Selecione um apartamento ou local de interesse no filtro acima para obter o diagnóstico e a linha do tempo histórica.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Cabeçalho do local ativo */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-cm-line pb-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-cm-text-mute uppercase tracking-wider font-mono">Análise de Localização</span>
                    <h5 className="font-display font-bold text-sm text-cm-ink">{localAtivo}</h5>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={handleExportRecorrenciaPDF}
                      className="px-3 py-1.5 bg-white hover:bg-cm-paper text-cm-ink border border-cm-line rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Exportar histórico e diagnóstico de recorrência deste local para PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-cm-text-mute" />
                      <span>Exportar Recorrência (PDF)</span>
                    </button>
                    <div className="bg-red-50 text-red-800 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                      <span>{infoLocalAtivo.total} Ocorrência{infoLocalAtivo.total === 1 ? '' : 's'} Registrada{infoLocalAtivo.total === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                </div>

                {/* Grid estatístico do local */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tipos de problemas */}
                  <div className="bg-cm-paper/30 border border-cm-line/60 rounded-xl p-3.5 space-y-2">
                    <h6 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Distribuição por Tipos Técnicos</h6>
                    <div className="space-y-1.5">
                      {Object.entries(infoLocalAtivo.tipos).map(([tipo, count]) => (
                        <div key={tipo} className="flex justify-between items-center text-xs bg-white px-2.5 py-1.5 rounded-md border border-cm-line/40">
                          <span className="text-gray-600 font-medium">{tipo}</span>
                          <span className="font-bold font-mono text-cm-ink">{count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Situação dos chamados */}
                  <div className="bg-cm-paper/30 border border-cm-line/60 rounded-xl p-3.5 space-y-2">
                    <h6 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Situação dos Chamados no Local</h6>
                    <div className="space-y-1.5">
                      {Object.entries(infoLocalAtivo.status).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center text-xs bg-white px-2.5 py-1.5 rounded-md border border-cm-line/40">
                          <span className="text-gray-600 font-medium">{status}</span>
                          <span className="font-bold font-mono text-cm-ink">{count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* LINHA DO TEMPO CHRONOLOGICA (ISOLADA DA TELA PRINCIPAL) */}
                <div className="space-y-3 pt-2">
                  <h6 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-cm-text-mute" />
                    <span>Linha do Tempo de Ocorrências no Local</span>
                  </h6>

                  <div className="relative border-l border-cm-line pl-5 space-y-4 max-h-[340px] overflow-y-auto pr-1">
                    {infoLocalAtivo.itens
                      .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime())
                      .map((item, idx) => {
                        const statusColors: Record<string, string> = {
                          'Aberta': 'bg-gray-400',
                          'Atribuída': 'bg-blue-400',
                          'Em execução': 'bg-amber-400',
                          'Pendente de Peça': 'bg-orange-500',
                          'Concluída': 'bg-emerald-500'
                        };

                        return (
                          <div key={item.id} className="relative group">
                            {/* Pontinho na Linha do tempo */}
                            <span className={`absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full border border-white shadow-xs ${statusColors[item.status] || 'bg-gray-400'}`}></span>
                            
                            {/* Card do Item na Linha do tempo */}
                            <div className="bg-white p-3.5 rounded-lg border border-cm-line shadow-xs space-y-1.5 hover:shadow-sm transition-all">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-cm-ink">{item.id}</span>
                                  <span className="bg-cm-paper text-cm-text-mute text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">{item.tipoManutencao}</span>
                                </div>
                                <span className="text-[10px] text-cm-text-mute font-mono">{fmtShortDate(item.dataCriacao)} - Solicitante: {item.solicitante}</span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed font-sans">{item.detalhes}</p>
                              
                              <div className="pt-2 border-t border-cm-line/45 flex items-center justify-between text-[10px]">
                                <span className="text-cm-text-mute font-medium">Técnico: {item.executor || 'Não atribuído'}</span>
                                <span className="font-bold uppercase tracking-wider" style={{ color: item.status === 'Concluída' ? '#10B981' : '#F59E0B' }}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

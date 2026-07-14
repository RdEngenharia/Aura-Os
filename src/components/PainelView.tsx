import React, { useState, useEffect, useRef } from 'react';
import { OrdemServico } from '../types';
import { 
  Volume2, 
  VolumeX, 
  Clock, 
  Maximize2, 
  Minimize2, 
  ArrowLeft, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Activity,
  Zap,
  Hammer,
  HelpCircle,
  AlertCircle,
  Tv,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface PainelViewProps {
  ordens?: OrdemServico[];
  onBack?: () => void;
  isStandalone?: boolean;
}

/**
 * Função para gerar um sinal sonoro (chime) agradável de aeroporto
 * utilizando a API de Áudio do próprio navegador (sem arquivos externos).
 */
const playAirportChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Nota 1 (F5 - 698.46 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, audioCtx.currentTime);
    gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
    
    // Nota 2 (A5 - 880.00 Hz) tocada um pouco depois
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.35);
    gain2.gain.setValueAtTime(0.15, audioCtx.currentTime + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.55);
    
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    
    osc1.start();
    osc1.stop(audioCtx.currentTime + 1.5);
    
    osc2.start(audioCtx.currentTime + 0.35);
    osc2.stop(audioCtx.currentTime + 1.8);
  } catch (error) {
    console.warn("Browser audio context blocked or unsupported:", error);
  }
};

/**
 * Função para gerar o bip de alerta urgente (idêntico ao usado no supervisor)
 */
const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playPulse = (startTime: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Envelope suave
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.setValueAtTime(0.15, startTime + duration - 0.04);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const startSound = () => {
      const now = ctx.currentTime;
      playPulse(now, 880, 0.15); // Nota Lá (A5)
      playPulse(now + 0.25, 880, 0.15);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        startSound();
      }).catch(err => {
        console.warn('Erro ao tentar retomar AudioContext:', err);
      });
    } else {
      startSound();
    }
  } catch (e) {
    console.warn('Bloqueado pela política de interação do navegador.', e);
  }
};

export const PainelView: React.FC<PainelViewProps> = ({ 
  ordens: propOrdens, 
  onBack, 
  isStandalone = false 
}) => {
  const [localOrdens, setLocalOrdens] = useState<OrdemServico[]>(propOrdens || []);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const prevPendingCountRef = useRef<number>(0);
  const isFirstRender = useRef(true);

  // Data atual de hoje do sistema no formato YYYY-MM-DD
  const todayStr = currentTime.toISOString().slice(0, 10);

  // Carrega do localStorage de forma robusta, priorizando o window.opener para contornar sandbox de iframes
  const loadFromLocalStorage = () => {
    try {
      let stored = null;
      try {
        if (window.opener && !window.opener.closed) {
          stored = window.opener.localStorage.getItem('ordens_servico_central');
        }
      } catch (openerErr) {
        // Ignora erros de permissão de origem cruzada se houver
      }

      if (!stored) {
        stored = localStorage.getItem('ordens_servico_central');
      }

      if (stored) {
        const parsed = JSON.parse(stored) as OrdemServico[];
        setLocalOrdens(parsed);
      }
    } catch (err) {
      console.error("Erro ao carregar localStorage no Painel:", err);
    }
  };

  useEffect(() => {
    if (propOrdens && propOrdens.length > 0) {
      setLocalOrdens(propOrdens);
    } else {
      loadFromLocalStorage();
    }
  }, [propOrdens]);

  // Sincroniza em tempo real com eventos de storage e pooling rápido (TV/Segunda tela sempre ativas)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ordens_servico_central' && e.newValue) {
        try {
          setLocalOrdens(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Pooling de alta velocidade (2 segundos) para garantir que a TV reflita alterações instantâneas
    const interval = setInterval(loadFromLocalStorage, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Relógio do painel atualizado a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // FILTRAGEM CRUCIAL: Ordens pendentes do dia de hoje apenas (conforme pedido do usuário)
  const pendingToday = localOrdens.filter(o => 
    o.status !== 'Concluída' && 
    o.data === todayStr
  );
  
  const pendingCount = pendingToday.length;

  // Monitora novas ordens de serviço pendentes de hoje para disparar o sino sonoro (chime)
  useEffect(() => {
    if (isFirstRender.current) {
      prevPendingCountRef.current = pendingCount;
      isFirstRender.current = false;
      return;
    }

    if (soundEnabled && pendingCount > prevPendingCountRef.current) {
      playAirportChime();
    }
    prevPendingCountRef.current = pendingCount;
  }, [pendingCount, soundEnabled]);

  const lastAlertTimePainel = useRef<number>(0);

  // Filtra as ordens urgentes não concluídas gerais para bipar
  const uncompletedUrgentCount = localOrdens.filter(
    o => o.prioridade === 'URGENTE' && o.status !== 'Concluída'
  ).length;

  // Efeito de monitoramento de chamados urgentes para alertar sonoramente na TV
  useEffect(() => {
    if (!soundEnabled || uncompletedUrgentCount === 0) return;

    // Dispara som na primeira carga ou nova urgência
    playBeep();

    // Loop periódico a cada 15 segundos se houver urgências não resolvidas
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastAlertTimePainel.current > 12000) {
        playBeep();
        lastAlertTimePainel.current = now;
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [uncompletedUrgentCount, soundEnabled]);

  // Configuração de tamanhos dinâmicos baseados na quantidade de itens para caber tudo na tela da TV sem rolar
  const totalItems = pendingToday.length;

  // Distribuição inteligente de colunas de acordo com a quantidade
  let gridColsClass = 'grid-cols-1';
  if (totalItems === 2) {
    gridColsClass = 'grid-cols-2';
  } else if (totalItems >= 3 && totalItems <= 4) {
    gridColsClass = 'grid-cols-2';
  } else if (totalItems >= 5 && totalItems <= 6) {
    gridColsClass = 'grid-cols-3';
  } else if (totalItems >= 7 && totalItems <= 9) {
    gridColsClass = 'grid-cols-3';
  } else if (totalItems >= 10 && totalItems <= 12) {
    gridColsClass = 'grid-cols-4';
  } else if (totalItems > 12) {
    gridColsClass = 'grid-cols-4';
  }

  // Estilização dinâmica para se moldar perfeitamente a alturas variadas da TV sem scrollbars
  let cardPaddingClass = 'p-4';
  let localTextSizeClass = 'text-xl lg:text-2xl xl:text-3xl';
  let detailsTextSizeClass = 'text-xs md:text-sm';
  let detailsClampClass = 'line-clamp-2';
  let footerGapClass = 'mt-3 pt-3';
  let iconScaleClass = 'w-4 h-4';
  let gridGapClass = 'gap-4';

  if (totalItems >= 5 && totalItems <= 8) {
    cardPaddingClass = 'p-3';
    localTextSizeClass = 'text-lg lg:text-xl';
    detailsTextSizeClass = 'text-xs';
    detailsClampClass = 'line-clamp-2';
    footerGapClass = 'mt-2.5 pt-2';
    iconScaleClass = 'w-3.5 h-3.5';
    gridGapClass = 'gap-3';
  } else if (totalItems > 8) {
    cardPaddingClass = 'p-2 md:p-2.5';
    localTextSizeClass = 'text-sm lg:text-base';
    detailsTextSizeClass = 'text-[11px] lg:text-xs';
    detailsClampClass = 'line-clamp-1';
    footerGapClass = 'mt-1.5 pt-1.5';
    iconScaleClass = 'w-3 h-3';
    gridGapClass = 'gap-2';
  }

  // Alterna o modo tela cheia do navegador
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Erro ao ativar tela cheia: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Lógica de tempo decorrido amigável
  const formatTimeElapsed = (isoString: string) => {
    const created = new Date(isoString).getTime();
    const now = currentTime.getTime();
    const diffMs = now - created;
    if (diffMs < 0) return 'Agora';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min`;
    
    const remMins = diffMins % 60;
    return `${diffHours}h ${remMins > 0 ? `${remMins}m` : ''}`;
  };

  // Formata hora de conclusão
  const formatCompletionHour = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Separa as ordens ativas de hoje por status para os mini-painéis informativos
  const novasOrdensHoje = pendingToday.filter(o => o.status === 'Aberta');
  const emAndamentoHoje = pendingToday.filter(o => o.status === 'Atribuída' || o.status === 'Em execução' || o.status === 'Pendente de Peça');
  
  // Resolvidas HOJE apenas
  const resolvidasHoje = localOrdens.filter(o => 
    o.status === 'Concluída' && 
    o.data === todayStr
  ).sort((a, b) => {
    const dateA = a.dataConclusao ? new Date(a.dataConclusao).getTime() : 0;
    const dateB = b.dataConclusao ? new Date(b.dataConclusao).getTime() : 0;
    return dateB - dateA;
  });

  // Estilo visual da prioridade
  const getPriorityStyle = (prioridade: OrdemServico['prioridade']) => {
    switch (prioridade) {
      case 'URGENTE':
        return {
          bg: 'bg-red-950/90 border-2 border-red-500 animate-pulse-subtle',
          text: 'text-red-400',
          badge: 'bg-red-600 text-white font-black shadow-lg shadow-red-500/20 text-xs px-2.5 py-1'
        };
      case 'ALTA':
        return {
          bg: 'bg-amber-950/70 border border-amber-500/60',
          text: 'text-amber-400',
          badge: 'bg-amber-500 text-black font-extrabold text-xs px-2.5 py-1'
        };
      default:
        return {
          bg: 'bg-slate-900/90 border border-slate-800',
          text: 'text-slate-300',
          badge: 'bg-slate-800 text-slate-400 font-bold text-xs px-2.5 py-1'
        };
    }
  };

  // Ícone ou cor do status
  const getStatusIndicator = (status: OrdemServico['status']) => {
    switch (status) {
      case 'Aberta':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider animate-pulse">Aguardando Técnico</span>;
      case 'Atribuída':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">Técnico Escalado</span>;
      case 'Em execução':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-400/30 text-[10px] font-black uppercase tracking-wider"><Zap className="w-3 h-3 animate-bounce text-sky-400" /> Em Execução</span>;
      case 'Pendente de Peça':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider">Pendente Peça</span>;
      default:
        return null;
    }
  };



  return (
    <div id="painel_hdmi_root" className="h-screen max-h-screen bg-[#060a12] text-slate-100 font-sans select-none overflow-hidden flex flex-col p-4 md:p-5">
      
      {/* HEADER DO PAINEL (ESTILO AEROPORTO - ALTURA CONTROLADA) */}
      <header className="flex flex-row justify-between items-center bg-[#0b1222] border border-slate-800/80 rounded-xl px-5 py-3 shadow-2xl relative overflow-hidden shrink-0 mb-4">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />
        
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shadow-md flex items-center justify-center"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h1 className="text-base md:text-lg font-black tracking-widest text-amber-400 uppercase font-mono">
                VÉRTICE • FILA DE HOJE
              </h1>
            </div>
            <p className="text-slate-400 text-[10px] tracking-wider uppercase font-semibold mt-0.5 flex items-center gap-1.5">
              <span>Painel de Transmissão HDMI</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 flex items-center gap-1 font-bold">● TV TRANSMISSÃO ATIVA</span>
            </p>
          </div>
        </div>

        {/* RELÓGIO E STATUS */}
        <div className="flex items-center gap-3">
          {/* Caixa de Som de Aeroporto */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) setTimeout(playAirportChime, 100);
              }}
              className={`px-2 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                soundEnabled 
                  ? 'bg-amber-500/10 text-amber-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Aviso Ativo' : 'Mudo'}</span>
            </button>
            <button
              onClick={playAirportChime}
              className="px-2 py-1 text-[9px] uppercase font-bold text-slate-500 hover:text-white rounded transition-colors cursor-pointer"
            >
              Som
            </button>
          </div>

          {/* Botão Tela Cheia */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Relógio Digital */}
          <div className="flex items-center gap-2 bg-black border border-slate-800 rounded-lg px-3.5 py-1.5 text-amber-400 font-mono">
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-base md:text-lg font-black tracking-widest">
              {currentTime.toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>
      </header>

      {/* STATS RÁPIDOS DE HOJE (MUITO COMPACTO) */}
      <div className="grid grid-cols-4 gap-3 shrink-0 mb-4">
        <div className="bg-[#080e1a] border border-slate-800/80 rounded-lg px-4 py-2.5 flex items-center justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PENDENTES HOJE</span>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">{pendingCount}</div>
          </div>
          <span className="text-xl">⏳</span>
        </div>

        <div className="bg-[#080e1a] border border-slate-800/80 rounded-lg px-4 py-2.5 flex items-center justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[3px] h-full bg-red-500" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">🚨 CRÍTICOS HOJE</span>
            <div className="text-xl font-black text-red-500 font-mono mt-0.5">
              {pendingToday.filter(o => o.prioridade === 'URGENTE').length}
            </div>
          </div>
          <span className="text-xl">⚠️</span>
        </div>

        <div className="bg-[#080e1a] border border-slate-800/80 rounded-lg px-4 py-2.5 flex items-center justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">⏳ AGUARDANDO HOJE</span>
            <div className="text-xl font-black text-blue-400 font-mono mt-0.5">{novasOrdensHoje.length}</div>
          </div>
          <span className="text-xl">⚙️</span>
        </div>

        <div className="bg-[#080e1a] border border-slate-800/80 rounded-lg px-4 py-2.5 flex items-center justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">✓ RESOLVIDOS HOJE</span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{resolvidasHoje.length}</div>
          </div>
          <span className="text-xl">✓</span>
        </div>
      </div>

      {/* CORE DO PAINEL DE TRANSMISSÃO (OCUPA TODO O ESPAÇO RESTANTE SEM EXCEDER) */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 overflow-hidden items-stretch">
        
        {/* COLUNA ESQUERDA (9/12): FILA ATIVA PAGINADA */}
        <section className="col-span-9 flex flex-col min-h-0 overflow-hidden bg-[#080d19] border border-slate-800/70 rounded-xl p-4 shadow-xl">
          
          {/* BARRA DE TÍTULO DA FILA */}
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Tv className="w-4.5 h-4.5 text-amber-500" />
              <h2 className="text-xs md:text-sm font-black tracking-wider text-amber-400 uppercase font-mono">
                PAINEL DE ORDENS DO DIA ({pendingToday.length})
              </h2>
            </div>

            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Encaixe Automático Único
            </span>
          </div>

          {/* FILA DE ATENDIMENTOS DE HOJE */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center py-2.5">
            {pendingToday.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#04070e]/50 border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="w-14 h-14 text-emerald-500/80 mb-3 animate-pulse" />
                <h3 className="text-base font-black text-slate-200">SEM ORDENS ATIVAS PARA HOJE</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">
                  Toda a fila de manutenção de hoje foi concluída ou nenhuma solicitação foi aberta até o momento.
                </p>
              </div>
            ) : (
              /* GRID DINÂMICO QUE SE ADAPTA PARA COUBER TODOS NA TELA SEM ROLAR */
              <div className={`grid ${gridColsClass} ${gridGapClass} h-full max-h-full items-stretch`}>
                {pendingToday.map(o => {
                  const style = getPriorityStyle(o.prioridade);
                  return (
                    <div 
                      key={o.id}
                      className={`rounded-xl ${cardPaddingClass} ${style.bg} border flex flex-col justify-between transition-all duration-300 relative shadow-md group overflow-hidden`}
                    >
                      <span className="absolute top-2.5 right-3 font-mono font-black text-[10px] text-slate-600 tracking-wider">
                        #{o.id}
                      </span>

                      <div className="min-h-0 overflow-hidden flex-1 flex flex-col justify-between">
                        <div>
                          {/* BADGES */}
                          <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                            <span className={`rounded font-black uppercase text-[8px] ${style.badge}`}>
                              {o.prioridade}
                            </span>
                            <span className="text-[8px] font-mono font-bold text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {o.setor}
                            </span>
                          </div>

                          {/* LOCAL / QUARTO */}
                          <div className={`font-mono font-black ${localTextSizeClass} text-slate-100 tracking-tight leading-none group-hover:text-amber-400 transition-colors`}>
                            {o.local}
                          </div>

                          {/* DETALHES DO PROBLEMA */}
                          <p className={`${detailsTextSizeClass} text-slate-300 mt-1.5 font-medium ${detailsClampClass} leading-relaxed break-words`}>
                            {o.detalhes}
                          </p>
                        </div>
                      </div>

                      {/* RODAPÉ DO CHAMADO */}
                      <div className={`${footerGapClass} border-t border-slate-800/40 flex items-center justify-between gap-1 text-[9px] shrink-0`}>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider">TÉCNICO / STATUS</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {o.executor ? (
                              <span className="font-bold text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/30 font-mono text-[8px]">
                                🧑‍🔧 {o.executor}
                              </span>
                            ) : (
                              getStatusIndicator(o.status)
                            )}
                          </div>
                        </div>

                        <div className="text-right flex flex-col gap-0.5">
                          <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">AGUARDANDO</span>
                          <span className="font-mono text-amber-500 font-bold flex items-center gap-1 mt-0.5 justify-end">
                            {formatTimeElapsed(o.dataCriacao)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* COLUNA DIREITA (3/12): HISTÓRICO RÁPIDO RESOLVIDO DE HOJE (OCUPAÇÃO VERTICAL EXATA) */}
        <aside className="col-span-3 flex flex-col min-h-0 overflow-hidden bg-[#080d19] border border-slate-800/70 rounded-xl p-4 shadow-xl">
          
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-2.5 shrink-0 mb-3">
            <h2 className="text-[10px] md:text-xs font-black tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>RESOLVIDOS HOJE</span>
            </h2>
            <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
              OK
            </span>
          </div>

          <div className="flex-1 min-h-0 space-y-2.5 overflow-hidden flex flex-col justify-start">
            {resolvidasHoje.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-[#04070e]/30 border border-dashed border-slate-800 rounded-lg">
                <HelpCircle className="w-8 h-8 text-slate-700 mb-1.5" />
                <span className="text-slate-500 text-[10px] italic">Nenhuma OS concluída hoje ainda</span>
              </div>
            ) : (
              // Mostra no máximo as 4 últimas concluídas para garantir que não role a página de forma alguma
              <div className="space-y-2 flex-1 overflow-hidden">
                {resolvidasHoje.slice(0, 4).map(o => (
                  <div 
                    key={o.id}
                    className="bg-[#0a1120] border border-emerald-500/15 rounded-lg p-2.5 relative overflow-hidden group shadow-sm"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                    
                    <div className="flex justify-between items-start gap-1.5 mb-1">
                      <span className="font-mono font-bold text-slate-200 text-xs truncate">
                        {o.local}
                      </span>
                      <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-950 px-1 py-0.2 rounded">
                        #{o.id}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 truncate mb-1.5">
                      {o.detalhes}
                    </p>

                    <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between text-[8px]">
                      <span className="text-emerald-400 font-bold uppercase bg-emerald-950/20 px-1.5 py-0.2 rounded">
                        RESOLVIDO
                      </span>
                      <span className="text-slate-500 font-mono">
                        {o.dataConclusao ? formatCompletionHour(o.dataConclusao) : '---'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

      </div>
      
    </div>
  );
};


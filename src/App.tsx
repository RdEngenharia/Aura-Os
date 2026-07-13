/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { SolicitanteView } from './components/SolicitanteView';
import { ExecutorView } from './components/ExecutorView';
import { SupervisorView } from './components/SupervisorView';
import { SupervisorRecepcaoView } from './components/SupervisorRecepcaoView';
import { GerenteView } from './components/GerenteView';
import { AdminView } from './components/AdminView';
import { MatrixRain } from './components/MatrixRain';
import { OrdemServico, Usuario, PerfilUsuario } from './types';
import { ORDENS_INICIAIS } from './mockData';

// Chave utilizada para persistência durável em localStorage
const LOCAL_STORAGE_KEY = 'ordens_servico_central';

const USUARIOS_PADRAO: Usuario[] = [
  { id: 'usr-1', name: 'Abrir OS', username: 'abrir_os', password: '', role: 'solicitante' },
  { id: 'usr-5', name: 'Marcos Gerente', username: 'marcos', password: '123', role: 'gerente' },
  { id: 'usr-3', name: 'Julia Supervisora', username: 'julia', password: '123', role: 'supervisor' },
  { id: 'usr-4', name: 'Aline Recepção', username: 'aline', password: '123', role: 'supervisor_recepcao' },
  { id: 'usr-2', name: 'Carlos Técnico', username: 'carlos', password: '123', role: 'executor' },
  { id: 'usr-6', name: 'Administrador Geral', username: 'admin', password: 'admin', role: 'admin' },
];

export default function App() {
  // Estado principal do usuário logado
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  
  // Estado para controlar a aba/tela ativa do painel principal
  const [activeTab, setActiveTab] = useState<string>('');

  // Lista global de Ordens de Serviço
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);

  // Lista global de Usuários (com senhas e logins)
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Estado para controlar o modo Matrix Rain
  const [showMatrix, setShowMatrix] = useState(false);

  // Estado de carregamento inicial
  const [loading, setLoading] = useState(true);

  // Sistema de Toasts (Notificações Flutuantes Temporárias)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /**
   * Dispara um Toast de aviso temporário em tela.
   */
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Limpa o toast automaticamente após 2.2 segundos (conforme o código original)
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  /**
   * Carrega as ordens do LocalStorage de forma segura.
   * Se for a primeira vez e o localStorage estiver vazio, preenche com os dados fictícios iniciais.
   */
  const loadOrdens = (isBackgroundReload = false) => {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedData) {
        setOrdens(JSON.parse(storedData));
      } else {
        // Primeira inicialização: persistimos os dados iniciais realistas
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ORDENS_INICIAIS));
        setOrdens(ORDENS_INICIAIS);
      }
    } catch (e) {
      console.error("Erro ao carregar dados do localStorage:", e);
      // Fallback seguro em caso de erro de cota de armazenamento ou restrição no navegador
      if (!isBackgroundReload) {
        setOrdens(ORDENS_INICIAIS);
      }
    } finally {
      if (!isBackgroundReload) {
        setLoading(false);
      }
    }
  };

  // Carrega os usuários do LocalStorage de forma robusta
  const loadUsuarios = () => {
    try {
      const stored = localStorage.getItem('usuarios_central');
      if (stored) {
        let parsed = JSON.parse(stored) as Usuario[];
        // Migração: se ainda tem Maria Silva, substitui por Abrir OS
        let migrated = false;
        parsed = parsed.map(u => {
          if (u.id === 'usr-1' && (u.name === 'Maria Silva' || u.username === 'maria')) {
            migrated = true;
            return { id: 'usr-1', name: 'Abrir OS', username: 'abrir_os', password: '', role: 'solicitante' };
          }
          return u;
        });
        if (migrated) {
          localStorage.setItem('usuarios_central', JSON.stringify(parsed));
        }
        setUsuarios(parsed);
      } else {
        localStorage.setItem('usuarios_central', JSON.stringify(USUARIOS_PADRAO));
        setUsuarios(USUARIOS_PADRAO);
      }
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
      setUsuarios(USUARIOS_PADRAO);
    }
  };

  const handleAddUsuario = (user: Omit<Usuario, 'id'>) => {
    const newUser: Usuario = {
      ...user,
      id: `usr-${Date.now()}`
    };
    const updated = [...usuarios, newUser];
    setUsuarios(updated);
    localStorage.setItem('usuarios_central', JSON.stringify(updated));
  };

  const handleEditUsuario = (id: string, updatedUser: Partial<Usuario>) => {
    const updated = usuarios.map(u => u.id === id ? { ...u, ...updatedUser } : u);
    setUsuarios(updated);
    localStorage.setItem('usuarios_central', JSON.stringify(updated));
  };

  const handleDeleteUsuario = (id: string) => {
    const updated = usuarios.filter(u => u.id !== id);
    setUsuarios(updated);
    localStorage.setItem('usuarios_central', JSON.stringify(updated));
  };

  // Executado apenas na montagem inicial do componente
  useEffect(() => {
    loadOrdens(false);
    loadUsuarios();

    // Configura o pooling periódico em background de 10 segundos (para simular atualizações externas do backend)
    const interval = setInterval(() => {
      loadOrdens(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Salva as ordens recebidas no localStorage de forma persistente.
   */
  const saveAndSyncOrdens = (newOrdensList: OrdemServico[]) => {
    setOrdens(newOrdensList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newOrdensList));
    } catch (error) {
      console.error("Erro ao salvar dados de manutenção:", error);
      triggerToast("Erro de cota de armazenamento local.");
    }
  };

  /**
   * Calcula o próximo ID de ordem de serviço sequencial no formato OS-XXXX.
   */
  const getNextSequentialId = (currentOrdens: OrdemServico[]): string => {
    const nums = currentOrdens
      .map(o => {
        const parsed = parseInt(o.id.replace('OS-', ''), 10);
        return isNaN(parsed) ? 0 : parsed;
      })
      .filter(n => n > 0);
    
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const nextNum = maxNum + 1;
    return `OS-${String(nextNum).padStart(4, '0')}`;
  };

  // ---------------- OPERAÇÕES E AÇÕES DO SISTEMA ----------------

  /**
   * Insere uma nova Ordem de Serviço aberta por um Solicitante.
   */
  const handleAddOrdem = (details: Omit<OrdemServico, 'id' | 'status' | 'executor' | 'dataCriacao' | 'dataAtribuicao' | 'dataConclusao' | 'comentarioConclusao'>) => {
    const nextId = getNextSequentialId(ordens);
    const novaOS: OrdemServico = {
      ...details,
      id: nextId,
      status: 'Aberta',
      executor: null,
      dataCriacao: new Date().toISOString(),
      dataAtribuicao: null,
      dataConclusao: null,
      comentarioConclusao: ''
    };

    const updated = [...ordens, novaOS];
    saveAndSyncOrdens(updated);
    triggerToast(`${nextId} aberta com sucesso no setor ${novaOS.setor}!`);
  };

  /**
   * Atribui um executor técnico a uma ordem de serviço, alterando seu status para "Atribuída".
   */
  const handleAssignExecutor = (id: string, executorName: string) => {
    const updated = ordens.map(o => {
      if (o.id === id) {
        return {
          ...o,
          executor: executorName,
          status: 'Atribuída' as const,
          dataAtribuicao: new Date().toISOString()
        };
      }
      return o;
    });

    saveAndSyncOrdens(updated);
    triggerToast(`${id} delegada com sucesso ao técnico ${executorName}!`);
  };

  /**
   * Atualiza o progresso (Status) de uma OS pelo Executor Técnico.
   */
  const handleUpdateStatus = (id: string, newStatus: OrdemServico['status'], comment = '') => {
    const updated = ordens.map(o => {
      if (o.id === id) {
        const updatedOS = { ...o, status: newStatus };
        if (newStatus === 'Concluída') {
          updatedOS.dataConclusao = new Date().toISOString();
          updatedOS.comentarioConclusao = comment;
        } else if (newStatus === 'Pendente de Peça') {
          updatedOS.comentarioPendente = comment;
        }
        return updatedOS;
      }
      return o;
    });

    saveAndSyncOrdens(updated);
    triggerToast(`${id} atualizada com sucesso para '${newStatus}'!`);
  };

  /**
   * Remove uma Ordem de Serviço permanentemente da fila.
   */
  const handleDeleteOrdem = (id: string) => {
    const updated = ordens.filter(o => o.id !== id);
    saveAndSyncOrdens(updated);
    triggerToast(`Ordem ${id} excluída permanentemente!`);
  };

  // ---------------- CONTROLE DE LOGOUT E SELEÇÃO DE PERFIL ----------------

  const handleLogin = (user: Usuario) => {
    setCurrentUser(user);
    // Configura a aba padrão correta correspondente ao nível de privilégio do usuário
    if (user.role === 'solicitante') {
      setActiveTab('solicitante');
    } else if (user.role === 'executor') {
      setActiveTab('executor');
    } else if (user.role === 'supervisor') {
      setActiveTab('supervisor');
    } else if (user.role === 'supervisor_recepcao') {
      setActiveTab('supervisor_recepcao');
    } else if (user.role === 'gerente') {
      setActiveTab('gerente');
    } else if (user.role === 'admin') {
      setActiveTab('admin');
    }
    triggerToast(`Boas-vindas, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('');
    triggerToast("Logout realizado com sucesso.");
  };

  // ---------------- LÓGICA DE ABAS RECOMENDADAS POR PAPEL ----------------

  const getNavigationTabs = (role: PerfilUsuario) => {
    const tabs = [];
    if (role === 'admin') {
      tabs.push({ id: 'admin', label: 'Painel Administrativo' });
      tabs.push({ id: 'gerente', label: 'Dashboard Geral' });
    } else if (role === 'solicitante') {
      tabs.push({ id: 'solicitante', label: 'Abrir OS / Solicitar' });
    } else if (role === 'executor') {
      tabs.push({ id: 'executor', label: 'Minhas Atribuições' });
    } else if (role === 'supervisor') {
      tabs.push({ id: 'supervisor', label: 'Painel Geral de OS' });
      tabs.push({ id: 'solicitante', label: 'Abrir Nova OS' });
    } else if (role === 'supervisor_recepcao') {
      tabs.push({ id: 'supervisor_recepcao', label: 'Painel de Recepção' });
    } else if (role === 'gerente') {
      tabs.push({ id: 'gerente', label: 'Dashboard / Painel Gerencial' });
      tabs.push({ id: 'solicitante', label: 'Abrir Nova OS' });
    }
    return tabs;
  };

  // Renderização do Estado Carregando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cm-paper text-cm-text-mute font-sans text-sm">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-cm-ink animate-spin mx-auto"></div>
          <p className="font-medium animate-pulse">Sincronizando dados de manutenção…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cm-paper text-cm-text font-sans antialiased pb-20">
      <div className="max-w-6xl mx-auto px-0 sm:px-4">
        
        {/* Se o usuário não estiver autenticado na sessão, exibe a tela de login/perfil */}
        {!currentUser ? (
          <div className="pt-10 md:pt-16">
            <LoginView usuarios={usuarios} onLogin={handleLogin} onOpenMatrix={() => setShowMatrix(true)} />
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Cabeçalho de Navegação e Usuário */}
            <Header currentUser={currentUser} onLogout={handleLogout} />

            {/* Barra de Seleção de Abas do Menu de Navegação */}
            <div className="flex border-b border-cm-line px-4 md:px-7 pt-4 overflow-x-auto gap-1">
              {getNavigationTabs(currentUser.role).map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`font-display text-xs md:text-sm font-semibold uppercase tracking-wider px-5 py-3.5 border-t border-x rounded-t-lg transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-cm-ink border-cm-line border-b-white translate-y-[1px] shadow-sm'
                        : 'bg-transparent text-cm-text-mute hover:text-cm-ink border-transparent hover:bg-white/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Painel Interno Principal Dinâmico */}
            <main className="bg-white border border-cm-line rounded-b-xl rounded-tr-xl p-5 md:p-7 min-h-[460px] shadow-sm">
              {activeTab === 'solicitante' && (
                <SolicitanteView 
                  ordens={ordens} 
                  currentUser={currentUser} 
                  onAddOrdem={handleAddOrdem} 
                />
              )}

              {activeTab === 'admin' && (
                <AdminView 
                  usuarios={usuarios}
                  onAddUsuario={handleAddUsuario}
                  onEditUsuario={handleEditUsuario}
                  onDeleteUsuario={handleDeleteUsuario}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'executor' && (
                <ExecutorView 
                  ordens={ordens} 
                  currentUser={currentUser} 
                  onUpdateStatus={handleUpdateStatus} 
                />
              )}

              {activeTab === 'supervisor' && (
                <SupervisorView 
                  ordens={ordens} 
                  executores={usuarios.filter(u => u.role === 'executor')}
                  onAssign={handleAssignExecutor} 
                  onDelete={handleDeleteOrdem}
                />
              )}

              {activeTab === 'supervisor_recepcao' && (
                <SupervisorRecepcaoView 
                  ordens={ordens} 
                  currentUser={currentUser} 
                  onAddOrdem={handleAddOrdem} 
                  onDelete={handleDeleteOrdem}
                />
              )}

              {activeTab === 'gerente' && (
                <GerenteView 
                  ordens={ordens} 
                  currentUser={currentUser}
                  onClearAll={() => {
                    saveAndSyncOrdens([]);
                    triggerToast("Toda a fila de ordens de serviço foi limpa.");
                  }}
                  onDelete={handleDeleteOrdem}
                />
              )}
            </main>
          </div>
        )}
      </div>

      {/* Notificação Flutuante Toast (Conectado via CSS de Transição) */}
      <div 
        id="toast" 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-cm-ink text-white px-5 py-2.5 rounded-lg text-xs md:text-sm shadow-xl border border-white/10 flex items-center gap-2 transition-all duration-300 z-50 pointer-events-none ${
          toastMessage ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        <span className="text-emerald-400">🔧</span>
        <span className="font-medium tracking-wide">{toastMessage}</span>
      </div>

      {/* Tela de visualização Matrix Rain */}
      {showMatrix && (
        <MatrixRain onClose={() => setShowMatrix(false)} />
      )}
    </div>
  );
}


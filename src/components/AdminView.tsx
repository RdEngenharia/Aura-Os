import React, { useState } from 'react';
import { Usuario, PerfilUsuario, LogErro } from '../types';
import { 
  UserPlus, 
  Trash2, 
  Edit2, 
  ShieldAlert, 
  Key, 
  Users, 
  Check, 
  AlertCircle,
  Bug,
  Terminal,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Database,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { getErrorLogs, addErrorLog, clearAllLogs } from '../utils/logger';

interface AdminViewProps {
  usuarios: Usuario[];
  onAddUsuario: (user: Omit<Usuario, 'id'>) => void;
  onEditUsuario: (id: string, updatedUser: Partial<Usuario>) => void;
  onDeleteUsuario: (id: string) => void;
  currentUser: Usuario;
}

export const AdminView: React.FC<AdminViewProps> = ({
  usuarios,
  onAddUsuario,
  onEditUsuario,
  onDeleteUsuario,
  currentUser
}) => {
  // Navigation Tab
  const [activeTab, setActiveTab] = useState<'usuarios' | 'logs'>('usuarios');

  // Logs state
  const [logs, setLogs] = useState<LogErro[]>(() => getErrorLogs());
  const [searchLog, setSearchLog] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'ERROR' | 'WARNING' | 'INFO'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<PerfilUsuario>('solicitante');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getRoleLabel = (role: PerfilUsuario) => {
    switch (role) {
      case 'solicitante': return 'Solicitante';
      case 'executor': return 'Executor Técnico';
      case 'supervisor': return 'Supervisor de Manutenção';
      case 'supervisor_recepcao': return 'Sup. de Recepção';
      case 'gerente': return 'Gerente Geral';
      case 'admin': return 'Administrador do Sistema';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: PerfilUsuario) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'gerente':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'supervisor':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'supervisor_recepcao':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'executor':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('solicitante');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanUsername || !cleanPassword) {
      setErrorMsg('Todos os campos são obrigatórios.');
      return;
    }

    // Check if username is already taken (excluding current being edited)
    const exists = usuarios.some(
      u => u.username?.toLowerCase() === cleanUsername && u.id !== editingId
    );
    if (exists) {
      setErrorMsg('Este nome de usuário já está sendo utilizado por outro cadastro.');
      return;
    }

    if (editingId) {
      onEditUsuario(editingId, {
        name: cleanName,
        username: cleanUsername,
        password: cleanPassword,
        role
      });
      setSuccessMsg(`Usuário "${cleanName}" atualizado com sucesso!`);
    } else {
      onAddUsuario({
        name: cleanName,
        username: cleanUsername,
        password: cleanPassword,
        role
      });
      setSuccessMsg(`Usuário "${cleanName}" cadastrado com sucesso!`);
    }

    clearForm();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleEdit = (user: Usuario) => {
    setEditingId(user.id || null);
    setName(user.name);
    setUsername(user.username || '');
    setPassword(user.password || '');
    setRole(user.role);
    setErrorMsg(null);
  };

  const handleDelete = (id: string, userName: string) => {
    if (id === currentUser.id) {
      setErrorMsg('Você não pode remover a si mesmo da administração.');
      return;
    }
    if (window.confirm(`Deseja realmente remover permanentemente o usuário "${userName}"? Ele perderá acesso ao sistema.`)) {
      onDeleteUsuario(id);
      setSuccessMsg(`Usuário "${userName}" removido.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleRefreshLogs = () => {
    setLogs(getErrorLogs());
  };

  const handleClearLogs = () => {
    if (window.confirm('Deseja realmente limpar permanentemente todos os logs de erro armazenados?')) {
      clearAllLogs();
      setLogs([]);
      setSuccessMsg('Todos os logs de erro foram excluídos.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSimulateError = (type: 'db' | 'api' | 'auth_lock' | 'quota') => {
    let log;
    if (type === 'db') {
      log = addErrorLog(
        'ERROR',
        'DatabaseEngine',
        'Inconsistência de esquema: coluna "executor_id" não encontrada na tabela "ordens_servico"',
        `DrizzleSchemaError: columns in database do not match local model \n  at updateSchema (src/db/migrate.ts:182)\n  at processUpdate (src/server.ts:41)\n  Query: ALTER TABLE ordens_servico ADD COLUMN executor_id text;`
      );
    } else if (type === 'api') {
      log = addErrorLog(
        'ERROR',
        'IntegracaoAPIs',
        'Falha crítica de comunicação com microsserviço de notificações por SMS/Whatsapp',
        `SMSGatewayTimeout: api.comunicacao.aura.io failed to respond within 8000ms.\n  HTTP/1.1 POST /v2/send-notification\n  Payload: { to: "+5511999999999", body: "Nova OS-1049 aberta" }`
      );
    } else if (type === 'auth_lock') {
      log = addErrorLog(
        'WARNING',
        'SecurityModule',
        'Múltiplas tentativas de login com credenciais incorretas bloqueadas por IP',
        `BruteForceProtectionTriggered: 5 failed logins within 60s from host 189.122.34.205\n  Target username: admin\n  Action: temporary cooldown applied (120s)`
      );
    } else {
      log = addErrorLog(
        'WARNING',
        'LocalStorage',
        'Espaço de cota para o domínio esgotando no armazenamento interno do navegador',
        `QuotaExceededWarning: localStorage utilized space has exceeded 4.5MB of 5.0MB safety threshold.\n  Recommend archiving completed service orders or purging inactive logs.`
      );
    }
    setLogs(getErrorLogs());
    setSuccessMsg(`Log de simulação do tipo "${type.toUpperCase()}" criado!`);
    setExpandedLogId(log.id); // Auto-expand to show details
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDownloadLogs = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `aura_os_logs_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSuccessMsg('Arquivo de logs (JSON) baixado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setErrorMsg('Falha ao exportar arquivo de logs.');
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const searchLower = searchLog.toLowerCase();
    const matchesSearch = 
      log.mensagem.toLowerCase().includes(searchLower) || 
      log.origem.toLowerCase().includes(searchLower) ||
      (log.detalhes && log.detalhes.toLowerCase().includes(searchLower));
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Title and Description */}
      <div className="border-b border-cm-line pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg text-cm-ink uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cm-ink" />
            <span>Painel de Controle do Administrador</span>
          </h2>
          <p className="text-xs text-cm-text-mute mt-1">
            Gerencie credenciais de usuários, visualize relatórios de logs internos e simule cenários de erro do Aura OS.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-cm-paper p-1 rounded-xl border border-cm-line gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'usuarios'
                ? 'bg-cm-ink text-white shadow-sm font-semibold'
                : 'text-cm-text-mute hover:text-cm-text'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuários</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-red-600 text-white shadow-sm font-semibold'
                : 'text-cm-text-mute hover:text-red-600'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Logs de Erro ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === 'usuarios' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Column */}
          <div className="lg:col-span-5 bg-cm-paper border border-cm-line rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-display font-semibold text-sm text-cm-ink tracking-wide uppercase flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-cm-ink" />
              <span>{editingId ? 'Editar Cadastro' : 'Cadastrar Novo Usuário'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-cm-text uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ana Souza"
                  required
                  className="w-full px-3 py-2 border border-cm-line rounded-lg text-xs bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink focus:border-cm-ink"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cm-text uppercase tracking-wider mb-1">
                    Usuário (Login)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: anasouza"
                    required
                    className="w-full px-3 py-2 border border-cm-line rounded-lg text-xs bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink focus:border-cm-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cm-text uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" />
                    <span>Senha</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Defina a senha"
                    required
                    className="w-full px-3 py-2 border border-cm-line rounded-lg text-xs bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink focus:border-cm-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cm-text uppercase tracking-wider mb-1">
                  Nível de Permissão (Perfil)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as PerfilUsuario)}
                  className="w-full px-3 py-2 border border-cm-line bg-white rounded-lg text-xs text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink focus:border-cm-ink cursor-pointer"
                >
                  <option value="solicitante">Solicitante (Abre chamados)</option>
                  <option value="executor">Executor Técnico (Recebe chamados)</option>
                  <option value="supervisor">Supervisor de Manutenção (Delega & Monitora)</option>
                  <option value="supervisor_recepcao">Sup. de Recepção (Gerencia chamados da recepção)</option>
                  <option value="gerente">Gerente Geral (Dashboard de Indicadores)</option>
                  <option value="admin">Administrador do Sistema (Gestão completa)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-cm-ink hover:bg-cm-ink-hover text-white font-semibold py-2.5 px-4 rounded-lg text-xs cursor-pointer transition-all shadow-sm active:scale-95"
                >
                  {editingId ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="bg-white hover:bg-cm-paper text-cm-text border border-cm-line font-medium py-2 px-3 rounded-lg text-xs cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* User List Column */}
          <div className="lg:col-span-7 bg-white border border-cm-line rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-cm-line bg-cm-paper flex justify-between items-center">
              <h3 className="font-display font-semibold text-xs text-cm-ink uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cm-ink" />
                <span>Usuários Cadastrados ({usuarios.length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-cm-paper/40 border-b border-cm-line text-[10px] font-bold text-cm-text uppercase tracking-wider">
                    <th className="p-3">Nome</th>
                    <th className="p-3">Login</th>
                    <th className="p-3">Senha</th>
                    <th className="p-3">Perfil</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cm-line text-xs">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-cm-paper/20 transition-colors">
                      <td className="p-3 font-medium text-cm-ink">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-cm-ink/5 text-cm-ink flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-cm-text-mute">{u.username || '—'}</td>
                      <td className="p-3 font-mono text-[11px] text-cm-text-mute">{u.password || '—'}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 border text-[10px] font-semibold rounded-full tracking-wide ${getRoleBadgeStyle(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-1 text-cm-text-mute hover:text-cm-ink hover:bg-cm-paper rounded transition-all cursor-pointer"
                            title="Editar dados"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id || '', u.name)}
                            className="p-1 text-cm-text-mute hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-cm-paper/40 p-3.5 border-t border-cm-line text-[10px] text-cm-text-mute flex items-start gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-cm-ink flex-shrink-0 mt-0.5" />
              <span>
                <strong>Dica de Segurança:</strong> As senhas estão visíveis aqui para fins de depuração e demonstração. Na integração final de produção com Firebase Authentication, as senhas serão criptografadas em nuvem de forma privada e segura.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Error logs tab view */
        <div className="space-y-6">
          {/* Stats boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
            <div className="bg-white border border-cm-line rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cm-text-mute">Total de Logs</span>
              <span className="text-xl font-bold text-cm-ink font-mono mt-1">{logs.length}</span>
            </div>
            <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Erros Graves (ERROR)</span>
              <span className="text-xl font-bold text-red-600 font-mono mt-1">
                {logs.filter(l => l.level === 'ERROR').length}
              </span>
            </div>
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Avisos (WARNING)</span>
              <span className="text-xl font-bold text-amber-700 font-mono mt-1">
                {logs.filter(l => l.level === 'WARNING').length}
              </span>
            </div>
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 font-medium">Informações (INFO)</span>
              <span className="text-xl font-bold text-blue-700 font-mono mt-1">
                {logs.filter(l => l.level === 'INFO').length}
              </span>
            </div>
          </div>

          {/* Filters card */}
          <div className="bg-white border border-cm-line rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search input & Filter level */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-cm-text-mute" />
                  <input
                    type="text"
                    value={searchLog}
                    onChange={(e) => setSearchLog(e.target.value)}
                    placeholder="Pesquisar log por mensagem, origem ou stack..."
                    className="w-full pl-9 pr-3 py-2 border border-cm-line rounded-lg text-xs bg-white text-cm-text focus:outline-none focus:ring-1 focus:ring-cm-ink"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs text-cm-text-mute font-medium mr-1">Filtrar:</span>
                  {(['ALL', 'ERROR', 'WARNING', 'INFO'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevelFilter(lvl)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide border cursor-pointer transition-all ${
                        levelFilter === lvl
                          ? lvl === 'ERROR'
                            ? 'bg-red-600 border-red-600 text-white shadow-sm'
                            : lvl === 'WARNING'
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : lvl === 'INFO'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-cm-ink border-cm-ink text-white shadow-sm'
                          : 'bg-white border-cm-line text-cm-text-mute hover:text-cm-text hover:bg-cm-paper'
                      }`}
                    >
                      {lvl === 'ALL' ? 'Todos' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* General Control Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleRefreshLogs}
                  className="p-2 border border-cm-line rounded-lg text-cm-text hover:bg-cm-paper transition-all cursor-pointer flex items-center gap-1 text-xs"
                  title="Atualizar Logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadLogs}
                  className="p-2 border border-cm-line rounded-lg text-cm-text hover:bg-cm-paper transition-all cursor-pointer flex items-center gap-1 text-xs"
                  title="Exportar como JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exportar JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="p-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all cursor-pointer flex items-center gap-1 text-xs"
                  title="Limpar todos os logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpar Tudo</span>
                </button>
              </div>
            </div>

            {/* Simulation controls */}
            <div className="p-3.5 bg-cm-paper border border-cm-line rounded-lg space-y-2">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cm-ink" />
                <span className="text-xs font-semibold text-cm-ink uppercase tracking-wider">
                  ⚙️ Painel de Simulação de Falhas do Sistema (Demonstração Técnica)
                </span>
              </div>
              <p className="text-[11px] text-cm-text-mute leading-relaxed">
                Utilize os botões de simulação para testar a captura de dados e verificação de rastreamento do sistema. Em reuniões com diretores ou engenheiros, demonstre como as falhas são mapeadas e organizadas com diagnósticos completos (stack trace) e payloads em tempo real.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSimulateError('db')}
                  className="bg-zinc-900 hover:bg-black text-red-400 border border-red-500/30 px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all hover:shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5 text-red-500" />
                  <span>Simular Erro Banco</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateError('api')}
                  className="bg-zinc-900 hover:bg-black text-red-400 border border-red-500/30 px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all hover:shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-red-500 animate-spin-slow" />
                  <span>Simular Falha API</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateError('auth_lock')}
                  className="bg-zinc-900 hover:bg-black text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all hover:shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simular Bloqueio IP</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateError('quota')}
                  className="bg-zinc-900 hover:bg-black text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all hover:shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simular Limite Disco</span>
                </button>
              </div>
            </div>
          </div>

          {/* Logs table list */}
          <div className="bg-white border border-cm-line rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-cm-paper border-b border-cm-line text-[10px] font-bold text-cm-text uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">Ver</th>
                    <th className="p-3 w-24">Nível</th>
                    <th className="p-3 w-36">Horário</th>
                    <th className="p-3 w-44">Módulo/Origem</th>
                    <th className="p-3">Mensagem do Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cm-line text-xs font-mono">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-cm-text-mute font-sans">
                        Nenhum log encontrado correspondendo aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr 
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="hover:bg-cm-paper/30 transition-colors cursor-pointer select-none"
                          >
                            <td className="p-3 text-center">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-cm-text-mute mx-auto" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-cm-text-mute mx-auto" />
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 border text-[9px] font-bold rounded tracking-wide ${
                                log.level === 'ERROR'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : log.level === 'WARNING'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {log.level}
                              </span>
                            </td>
                            <td className="p-3 text-cm-text-mute text-[11px]">
                              {new Date(log.timestamp).toLocaleTimeString('pt-BR')} (
                              {new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
                            </td>
                            <td className="p-3 font-semibold text-cm-ink text-[11px]">{log.origem}</td>
                            <td className="p-3 text-cm-text text-[11px] font-sans pr-4">{log.mensagem}</td>
                          </tr>

                          {/* Expanded traceback view */}
                          {isExpanded && (
                            <tr className="bg-zinc-950 text-zinc-300">
                              <td colSpan={5} className="p-4 border-t border-b border-zinc-800">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800 pb-2">
                                    <span className="flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5 text-green-500" />
                                      <strong>Detalhes do Diagnóstico:</strong> ID {log.id}
                                    </span>
                                    <span>Nível: {log.level} | Componente: {log.origem}</span>
                                  </div>
                                  <div className="font-mono text-[11px] bg-zinc-900 p-3 rounded border border-zinc-800 text-green-400 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                                    {log.detalhes}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 italic font-sans">
                                    Dica: Dê um clique duplo para selecionar e copiar os dados técnicos de diagnóstico para o seu clipboard.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Usuario, PerfilUsuario } from '../types';
import { UserPlus, Trash2, Edit2, ShieldAlert, Key, Users, Check, AlertCircle } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      {/* Top Title and Description */}
      <div className="border-b border-cm-line pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg text-cm-ink uppercase tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-cm-ink" />
            <span>Painel Administrativo - Gestão de Usuários</span>
          </h2>
          <p className="text-xs text-cm-text-mute mt-1">
            Cadastre novos perfis de acesso, defina credenciais e gerencie senhas de todos os usuários do sistema.
          </p>
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
    </div>
  );
};

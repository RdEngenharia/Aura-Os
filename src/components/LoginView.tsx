import React, { useState } from 'react';
import { Usuario } from '../types';
import { Key, User, ShieldAlert, AlertCircle, HelpCircle, Lock, Eye, EyeOff, Terminal } from 'lucide-react';
import { addErrorLog } from '../utils/logger';

interface LoginViewProps {
  usuarios: Usuario[];
  onLogin: (user: Usuario) => void;
  onOpenMatrix: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ usuarios, onLogin, onOpenMatrix }) => {
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedUser) {
      setErrorMsg('Por favor, selecione um usuário para acessar.');
      return;
    }

    if (selectedUser.role !== 'solicitante') {
      if (!password) {
        setErrorMsg('Por favor, insira a senha do usuário.');
        return;
      }

      if (selectedUser.password !== password) {
        const errorText = 'Senha incorreta para o usuário selecionado.';
        setErrorMsg(errorText);
        addErrorLog(
          'WARNING',
          'LoginView',
          `Falha de autenticação: senha incorreta para o usuário "${selectedUser.name}"`,
          `Usuário: ${selectedUser.username} | Role: ${selectedUser.role} | IP: 192.168.1.102`
        );
        return;
      }
    }

    onLogin(selectedUser);
  };

  const handleSelectUser = (user: Usuario) => {
    setSelectedUser(user);
    setPassword('');
    setErrorMsg(null);
    if (user.role === 'solicitante') {
      onLogin(user);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'solicitante': return 'Abrir OS';
      case 'executor': return 'Executor Técnico';
      case 'supervisor': return 'Supervisor de Manutenção';
      case 'supervisor_recepcao': return 'Sup. de Recepção';
      case 'gerente': return 'Gerente Geral';
      case 'admin': return 'Administrador';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'solicitante': return '📋';
      case 'executor': return '🔧';
      case 'supervisor': return '🗂️';
      case 'supervisor_recepcao': return '🛎️';
      case 'gerente': return '📊';
      case 'admin': return '🛡️';
      default: return '👤';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 md:py-12 px-4 max-w-4xl mx-auto">
      {/* Título de Entrada */}
      <div className="text-center mb-8 max-w-md flex flex-col items-center">
        <h2 className="font-display text-3xl md:text-4xl font-semibold uppercase tracking-wider text-cm-ink mb-2">
          Aura OS
        </h2>
        <p className="text-cm-text-mute text-sm md:text-base leading-relaxed">
          Selecione seu perfil, digite sua senha de acesso e inicie o gerenciamento de chamados.
        </p>
      </div>

      {errorMsg && (
        <div className="w-full max-w-sm bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-lg text-xs flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid de Seleção de Usuários Cadastrados */}
      <div className="w-full mb-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-cm-ink-hover mb-4 text-center">
          Selecione seu Usuário
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 w-full">
          {(() => {
            const ROLE_ORDER: Record<string, number> = {
              solicitante: 1,
              gerente: 2,
              supervisor: 3,
              supervisor_recepcao: 4,
              executor: 5,
              admin: 6,
            };
            const sortedUsuarios = [...usuarios].sort((a, b) => {
              return (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99);
            });

            return sortedUsuarios.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  className={`border rounded-xl p-4 text-center flex flex-col items-center justify-center transition-all duration-200 cursor-pointer h-full ${
                    isSelected
                      ? 'border-cm-ink bg-white ring-2 ring-cm-ink/15 shadow-md scale-[1.02]'
                      : 'border-cm-line bg-cm-paper hover:bg-white hover:border-cm-ink-hover hover:shadow-sm'
                  }`}
                >
                  <span className="text-2xl mb-2 block" role="img" aria-label={u.name}>
                    {getRoleIcon(u.role)}
                  </span>
                  <span className="font-semibold text-xs text-cm-ink tracking-wide line-clamp-1 mb-1">
                    {u.name}
                  </span>
                  <span className="text-[10px] text-cm-text-mute font-medium uppercase tracking-wide">
                    {getRoleLabel(u.role)}
                  </span>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Formulário de Senha */}
      {selectedUser && selectedUser.role !== 'solicitante' && (
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4 bg-white border border-cm-line p-5 rounded-xl shadow-sm">
          <div className="text-center pb-2 border-b border-cm-line">
            <p className="text-[10px] uppercase font-bold text-cm-text-mute tracking-wider">Acessando como</p>
            <p className="font-semibold text-cm-ink text-sm mt-0.5">{selectedUser.name}</p>
            <span className="inline-block px-2 py-0.5 border text-[9px] font-semibold rounded-full mt-1.5 bg-cm-paper text-cm-text-mute">
              {getRoleLabel(selectedUser.role)}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cm-text uppercase tracking-wider">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cm-text-mute">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Insira sua senha"
                required
                className="w-full pl-10 pr-10 py-2.5 border border-cm-line rounded-lg text-xs bg-white text-cm-text placeholder-cm-text-mute focus:outline-none focus:ring-2 focus:ring-cm-ink/20 focus:border-cm-ink transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cm-text-mute hover:text-cm-ink cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-cm-ink hover:bg-cm-ink-hover text-white font-semibold py-2.5 px-4 rounded-lg text-xs cursor-pointer transition-all shadow-sm active:scale-[0.98]"
          >
            Acessar Sistema
          </button>
        </form>
      )}

      {/* Accordion de Auxílio de Testes */}
      {showDemoCredentials && (
        <div className="mt-10 w-full max-w-lg bg-cm-paper/40 border border-cm-line rounded-xl p-4">
          <div className="flex justify-between items-center border-b border-cm-line pb-2 mb-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-cm-ink flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Dicas de Credenciais (Controle de Testes)</span>
            </h4>
            <button
              onClick={() => setShowDemoCredentials(false)}
              className="text-[10px] text-cm-text-mute hover:text-cm-ink cursor-pointer"
            >
              [ Ocultar ]
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px] text-cm-text">
            {usuarios.map(u => (
              <div key={u.id} className="bg-white p-2 rounded-lg border border-cm-line/50 font-mono">
                <div className="font-bold text-cm-ink text-xs mb-0.5 truncate">{u.name}</div>
                <div>Login: <span className="font-semibold">{u.username}</span></div>
                <div>Senha: <span className="font-semibold text-blue-600">{u.password}</span></div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-cm-text-mute mt-3 leading-relaxed">
            * Para criar novos usuários ou alterar senhas, acesse como o usuário <strong>admin</strong> (senha: <strong>admin</strong>) para acessar o novo <strong>Painel Administrativo</strong>.
          </p>
        </div>
      )}

      {/* Botão Matrix Discreto no Canto Inferior */}
      <div className="mt-8 flex justify-center w-full">
        <button
          type="button"
          onClick={onOpenMatrix}
          className="text-[10px] font-mono text-cm-text-mute hover:text-green-600 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer opacity-75 hover:opacity-100 py-1.5 px-3 border border-cm-line hover:border-green-500/30 rounded-lg bg-cm-paper/40 hover:bg-green-950/5 shadow-sm"
          id="btn-matrix-enter"
        >
          <Terminal className="w-3.5 h-3.5 text-green-600/70" />
          <span>[Ver Matrix de Código]</span>
        </button>
      </div>
    </div>
  );
};

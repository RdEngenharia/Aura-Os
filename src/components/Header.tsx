import React from 'react';
import { Usuario } from '../types';
import { LogOut, Wrench, User } from 'lucide-react';

interface HeaderProps {
  currentUser: Usuario;
  onLogout: () => void;
}

/**
 * Componente do Cabeçalho principal do sistema.
 * Exibe a marca, o nome do usuário logado, o seu perfil, e a opção de sair.
 */
export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  // Tradução do perfil de inglês/sistema para português amigável
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'solicitante': return 'Solicitante';
      case 'executor': return 'Executor Técnico';
      case 'supervisor': return 'Supervisor de Manutenção';
      case 'supervisor_recepcao': return 'Sup. de Recepção';
      case 'gerente': return 'Gerente Geral';
      case 'admin': return 'Administrador';
      default: return role;
    }
  };

  // Ícone correspondente ao perfil
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
    <header className="bg-cm-ink text-white relative px-4 md:px-7 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-xl border-b-2 border-cm-line shadow-md overflow-hidden">
      {/* Detalhe de fundo técnico sutil para aprimorar o design */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

      {/* Marca / Logo */}
      <div className="flex items-center gap-3.5 z-10">
        <div className="w-10 h-10 border-2 border-white rounded-lg flex items-center justify-center font-mono font-bold text-sm tracking-wider bg-white/10 hover:bg-white/20 transition-colors">
          Aura
        </div>
        <div>
          <h1 className="font-display font-semibold text-lg md:text-xl tracking-wide uppercase leading-none">
            Aura OS
          </h1>
          <p className="mt-1 text-xs text-[#F1E4E1] font-mono tracking-tight uppercase">
            Gestão Inteligente de Ordens de Serviço
          </p>
        </div>
      </div>

      {/* Informações do usuário logado */}
      <div className="flex items-center gap-4 z-10 w-full sm:w-auto justify-end">
        <div className="bg-white/10 border border-white/20 px-3.5 py-1.5 rounded-full text-xs md:text-sm flex items-center gap-2 shadow-inner">
          <span className="text-sm">{getRoleIcon(currentUser.role)}</span>
          <span className="font-medium text-white/95">{currentUser.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[#B9C3D6] border-l border-white/20 pl-2 text-xs">
            {getRoleLabel(currentUser.role)}
          </span>
        </div>

        {/* Botão de Troca de Perfil (Sair/Logout) */}
        <button
          onClick={onLogout}
          className="bg-transparent border border-white/30 text-white/90 hover:text-white hover:bg-white/10 hover:border-white px-3 py-1.5 rounded-lg text-xs md:text-sm cursor-pointer font-sans transition-all flex items-center gap-1.5 font-medium"
          title="Sair do perfil atual"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
};

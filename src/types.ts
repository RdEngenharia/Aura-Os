/**
 * Definições de Tipos para a Central de Manutenção (Ordem de Serviço)
 * Todos os tipos são exportados para garantir a consistência no aplicativo.
 */

export type PrioridadeOS = 'BAIXA' | 'MÉDIA' | 'ALTA' | 'URGENTE';

export type StatusOS = 'Aberta' | 'Atribuída' | 'Em execução' | 'Pendente de Peça' | 'Concluída';

export interface OrdemServico {
  id: string; // Ex: OS-0001
  data: string; // Data do problema (formato YYYY-MM-DD)
  solicitante: string; // Nome de quem abriu a ordem
  setor: string; // Setor correspondente
  tipoManutencao: string; // Tipo da manutenção (Elétrica, Hidráulica, etc.)
  local: string; // Detalhe do local (sala, apartamento, etc.)
  prioridade: PrioridadeOS; // Urgência do atendimento
  detalhes: string; // Descrição textual do problema
  status: StatusOS; // Status atual do fluxo
  executor: string | null; // Nome do técnico responsável
  dataCriacao: string; // Timestamp ISO de criação
  dataAtribuicao: string | null; // Timestamp ISO de atribuição de técnico
  dataConclusao: string | null; // Timestamp ISO de conclusão do serviço
  comentarioConclusao: string; // Observações de fechamento do técnico
  comentarioPendente?: string; // Feedback de por que não dá para resolver (ex: comprar peça, trocar equipamento)
}

export type PerfilUsuario = 'solicitante' | 'executor' | 'supervisor' | 'gerente' | 'supervisor_recepcao' | 'admin';

export interface Usuario {
  id?: string;
  name: string;
  username?: string;
  password?: string;
  role: PerfilUsuario;
}

export interface LogErro {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARNING' | 'INFO';
  origem: string;
  mensagem: string;
  detalhes?: string;
}


import { OrdemServico } from './types';

// Setores padrão definidos no código original
export const SETORES = [
  "APARTAMENTO",
  "ADMINISTRATIVO",
  "ALMOXARIFADO",
  "AVENTURA",
  "BOUTIQUE",
  "COMERCIAL",
  "COMPRAS",
  "CONTABILIDADE",
  "CONTROLADORIA",
  "DIRETORIA",
  "DP",
  "FINANCEIRO",
  "GERÊNCIA GERAL",
  "GERÊNCIA HOSPEDAGEM",
  "GERÊNCIA OPERACIONAL",
  "GOVERNANÇA",
  "LAZER",
  "MANUTENÇÃO",
  "MARKETING",
  "RECEPÇÃO",
  "RESERVAS",
  "RH",
  "SECRETÁRIA DIRETORIA",
  "SEGURANÇA",
  "TI"
];

// Tipos de manutenção definidos no código original
export const TIPOS = [
  "MARCENARIA",
  "ELÉTRICA",
  "HIDRÁULICA",
  "ESTRUTURAL",
  "PINTURA",
  "REFRIGERAÇÃO",
  "SERRALHERIA"
];

// Mapeamento de cores e classes para prioridades
export const PRIORIDADES_INFO = [
  { v: "BAIXA", cls: "baixa", color: "#4C8C5B", bg: "rgba(76,140,91,0.08)" },
  { v: "MÉDIA", cls: "media", color: "#B98A22", bg: "rgba(185,138,34,0.08)" },
  { v: "ALTA", cls: "alta", color: "#C9722E", bg: "rgba(201,114,46,0.08)" },
  { v: "URGENTE", cls: "urgente", color: "#C23B3B", bg: "rgba(194,59,59,0.08)" }
] as const;

// Mapeamento de cores de status
export const STATUS_COLOR: Record<string, string> = {
  "Aberta": "#6B7280",      // Cinza neutro
  "Atribuída": "#3B6EA5",   // Azul técnico
  "Em execução": "#B98A22", // Amarelo/Dourado ativo
  "Pendente de Peça": "#D97706", // Laranja/Amber (comprar peça ou trocar equipamento)
  "Concluída": "#4C8C5B"    // Verde resolvido
};

// Dados fictícios iniciais para preencher o painel e simular o fluxo de trabalho real
export const ORDENS_INICIAIS: OrdemServico[] = [];

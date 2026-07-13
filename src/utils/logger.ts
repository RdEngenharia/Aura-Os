import { LogErro } from '../types';

const STORAGE_KEY = 'ordens_servico_error_logs';

const MOCK_INITIAL_LOGS: LogErro[] = [
  {
    id: 'log-initial-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    level: 'ERROR',
    origem: 'IntegracaoFirebase',
    mensagem: 'Falha na conexão com o Firestore: Timeout na handshake SSL',
    detalhes: 'Error: Connection timed out at TLSConnection.onHandshakeTimeout (node:internal/tls:124) \n  at checkConnectivity (src/firebase/config.ts:45)'
  },
  {
    id: 'log-initial-2',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), // 1.5 hours ago
    level: 'WARNING',
    origem: 'LocalStorageSync',
    mensagem: 'Armazenamento local atingiu 82% do limite recomendado',
    detalhes: 'QuotaWarning: localStorage capacity high (4.1MB used out of 5MB recommended allocation).'
  },
  {
    id: 'log-initial-3',
    timestamp: new Date(Date.now() - 3600000 * 0.8).toISOString(), // 48 mins ago
    level: 'INFO',
    origem: 'SistemaAura',
    mensagem: 'Check de integridade estrutural concluído com sucesso. 0 inconsistências.',
    detalhes: 'DatabaseIntegrityCheck: schema v2.4 initialized. All collections successfully verified. 0 broken relations.'
  },
  {
    id: 'log-initial-4',
    timestamp: new Date(Date.now() - 3600000 * 0.2).toISOString(), // 12 mins ago
    level: 'ERROR',
    origem: 'SupervisorView',
    mensagem: 'Erro ao despachar Ordem OS-1034: Executor indisponível para atribuição imediata',
    detalhes: 'DispatchError: executor_id "usr-2" is currently marked as inactive or maximum concurrent limit reached.'
  }
];

export const getErrorLogs = (): LogErro[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as LogErro[];
    }
    // Seed default logs if none exist
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_INITIAL_LOGS));
    return MOCK_INITIAL_LOGS;
  } catch (e) {
    console.error('Falha ao ler logs do localStorage', e);
    return [];
  }
};

export const saveErrorLogs = (logs: LogErro[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 200)));
  } catch (e) {
    console.error('Falha ao gravar logs no localStorage', e);
  }
};

export const addErrorLog = (
  level: 'ERROR' | 'WARNING' | 'INFO',
  origem: string,
  mensagem: string,
  detalhes?: string
): LogErro => {
  const newLog: LogErro = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date().toISOString(),
    level,
    origem,
    mensagem,
    detalhes: detalhes || 'Nenhum detalhe adicional fornecido pelo módulo.'
  };

  try {
    const logs = getErrorLogs();
    logs.unshift(newLog);
    saveErrorLogs(logs);
  } catch (e) {
    console.error('Falha ao adicionar log', e);
  }

  return newLog;
};

export const clearAllLogs = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Falha ao limpar logs', e);
  }
};

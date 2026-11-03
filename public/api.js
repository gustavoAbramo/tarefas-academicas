// Cliente da API REST. Toda comunicação com o back-end passa por aqui.

const BASE = '/api';

export class ErroApi extends Error {
  constructor(status, corpo) {
    super(corpo?.erro || `Erro ${status}`);
    this.status = status;
    this.detalhes = corpo?.detalhes || [];
  }
}

// Callback opcional para a interface exibir a última resposta (útil na apresentação).
let aoResponder = () => {};
export function observarRespostas(callback) {
  aoResponder = callback;
}

async function requisitar(metodo, caminho, corpo) {
  const opcoes = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  }

  const resposta = await fetch(BASE + caminho, opcoes);
  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  aoResponder({ metodo, url: BASE + caminho, enviado: corpo, status: resposta.status, recebido: dados });

  if (!resposta.ok) throw new ErroApi(resposta.status, dados);
  return dados;
}

export const api = {
  saude: () => requisitar('GET', '/health'),
  listar: (filtros = {}) => {
    const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
    const query = params.toString();
    return requisitar('GET', `/tarefas${query ? `?${query}` : ''}`);
  },
  resumo: () => requisitar('GET', '/tarefas/resumo'),
  criar: (tarefa) => requisitar('POST', '/tarefas', tarefa),
  substituir: (id, tarefa) => requisitar('PUT', `/tarefas/${id}`, tarefa),
  atualizar: (id, campos) => requisitar('PATCH', `/tarefas/${id}`, campos),
  excluir: (id) => requisitar('DELETE', `/tarefas/${id}`),
};

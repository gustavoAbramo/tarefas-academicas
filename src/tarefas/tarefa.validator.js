// Regras de negócio de uma tarefa acadêmica.
// Cada validador de campo recebe o valor bruto e devolve { valor } ou { erro }.

export const PRIORIDADES = ['baixa', 'media', 'alta'];
export const STATUS = ['pendente', 'em_andamento', 'concluida'];
const CAMPOS_EDITAVEIS = ['titulo', 'descricao', 'disciplina', 'prazo', 'prioridade', 'status'];
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function textoOpcional(valor) {
  return { valor: typeof valor === 'string' ? valor.trim() : '' };
}

const validadores = {
  titulo(valor) {
    const titulo = typeof valor === 'string' ? valor.trim() : '';
    if (!titulo) return { erro: 'O título é obrigatório.' };
    if (titulo.length < 3 || titulo.length > 120) {
      return { erro: 'O título deve ter entre 3 e 120 caracteres.' };
    }
    return { valor: titulo };
  },

  descricao: textoOpcional,
  disciplina: textoOpcional,

  prazo(valor) {
    if (!valor) return { erro: 'O prazo é obrigatório.' };
    if (typeof valor !== 'string' || !DATA_ISO.test(valor)) {
      return { erro: 'O prazo deve estar no formato AAAA-MM-DD.' };
    }
    const data = new Date(`${valor}T00:00:00Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
      return { erro: 'O prazo não é uma data válida.' };
    }
    return { valor };
  },

  prioridade(valor = 'media') {
    if (!PRIORIDADES.includes(valor)) return { erro: `A prioridade deve ser ${PRIORIDADES.join(', ')}.` };
    return { valor };
  },

  status(valor = 'pendente') {
    if (!STATUS.includes(valor)) return { erro: `O status deve ser ${STATUS.join(', ')}.` };
    return { valor };
  },
};

function ehObjeto(corpo) {
  return corpo !== null && typeof corpo === 'object' && !Array.isArray(corpo);
}

function falhaCorpo(mensagem) {
  return { valido: false, erros: [{ campo: 'corpo', mensagem }], dados: null };
}

function validarCampos(corpo, campos) {
  const erros = [];
  const dados = {};
  for (const campo of campos) {
    const { valor, erro } = validadores[campo](corpo[campo]);
    if (erro) erros.push({ campo, mensagem: erro });
    else dados[campo] = valor;
  }
  return { erros, dados };
}

/**
 * Valida uma tarefa completa (cadastro ou PUT): todos os campos, com padrões.
 * No cadastro o prazo não pode estar no passado; no PUT use permitirPrazoPassado.
 */
export function validarNovaTarefa(corpo, { hoje = hojeISO(), permitirPrazoPassado = false } = {}) {
  if (!ehObjeto(corpo)) return falhaCorpo('O corpo da requisição deve ser um objeto JSON.');

  const { erros, dados } = validarCampos(corpo, CAMPOS_EDITAVEIS);
  if (!permitirPrazoPassado && dados.prazo && dados.prazo < hoje) {
    erros.push({ campo: 'prazo', mensagem: 'O prazo não pode estar no passado.' });
  }
  return { valido: erros.length === 0, erros, dados };
}

/** Valida uma atualização parcial: só os campos enviados. Prazo passado é permitido (tarefa atrasada). */
export function validarAtualizacaoTarefa(corpo) {
  if (!ehObjeto(corpo)) return falhaCorpo('O corpo da requisição deve ser um objeto JSON.');

  const enviados = CAMPOS_EDITAVEIS.filter((campo) => campo in corpo);
  if (enviados.length === 0) return falhaCorpo('Envie ao menos um campo para atualizar.');

  const { erros, dados } = validarCampos(corpo, enviados);
  return { valido: erros.length === 0, erros, dados };
}

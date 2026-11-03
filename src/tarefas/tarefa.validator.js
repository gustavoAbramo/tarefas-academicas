export function validarNovaTarefa(corpo, { hoje } = {}) {
  const erros = [];
  if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { valido: false, erros: [{ campo: 'corpo', mensagem: 'O corpo da requisição deve ser um objeto JSON.' }], dados: null };
  }

  const titulo = typeof corpo.titulo === 'string' ? corpo.titulo.trim() : '';
  if (!titulo) {
    erros.push({ campo: 'titulo', mensagem: 'O título é obrigatório.' });
  } else if (titulo.length < 3 || titulo.length > 120) {
    erros.push({ campo: 'titulo', mensagem: 'O título deve ter entre 3 e 120 caracteres.' });
  }

  const prazo = corpo.prazo;
  if (!prazo) {
    erros.push({ campo: 'prazo', mensagem: 'O prazo é obrigatório.' });
  } else if (typeof prazo !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) {
    erros.push({ campo: 'prazo', mensagem: 'O prazo deve estar no formato AAAA-MM-DD.' });
  } else {
    const d = new Date(prazo + 'T00:00:00Z');
    if (isNaN(d) || d.toISOString().slice(0, 10) !== prazo) {
      erros.push({ campo: 'prazo', mensagem: 'O prazo não é uma data válida.' });
    } else if (prazo < (hoje ?? new Date().toISOString().slice(0, 10))) {
      erros.push({ campo: 'prazo', mensagem: 'O prazo não pode estar no passado.' });
    }
  }

  const prioridade = corpo.prioridade ?? 'media';
  if (!['baixa', 'media', 'alta'].includes(prioridade)) {
    erros.push({ campo: 'prioridade', mensagem: 'A prioridade deve ser baixa, media ou alta.' });
  }

  const status = corpo.status ?? 'pendente';
  if (!['pendente', 'em_andamento', 'concluida'].includes(status)) {
    erros.push({ campo: 'status', mensagem: 'O status deve ser pendente, em_andamento ou concluida.' });
  }

  return {
    valido: erros.length === 0,
    erros,
    dados: {
      titulo,
      descricao: typeof corpo.descricao === 'string' ? corpo.descricao.trim() : '',
      disciplina: typeof corpo.disciplina === 'string' ? corpo.disciplina.trim() : '',
      prazo,
      prioridade,
      status,
    },
  };
}

export function validarAtualizacaoTarefa(corpo) {
  if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { valido: false, erros: [{ campo: 'corpo', mensagem: 'O corpo da requisição deve ser um objeto JSON.' }], dados: null };
  }
  const campos = ['titulo', 'descricao', 'disciplina', 'prazo', 'prioridade', 'status'];
  const enviados = Object.keys(corpo).filter((k) => campos.includes(k));
  if (enviados.length === 0) {
    return { valido: false, erros: [{ campo: 'corpo', mensagem: 'Envie ao menos um campo para atualizar.' }], dados: null };
  }

  const completo = validarNovaTarefa(
    { titulo: 'xxx', prazo: '2000-01-01', ...corpo },
    { hoje: '0000-01-01' },
  );
  const erros = completo.erros.filter((e) => enviados.includes(e.campo));
  const dados = {};
  for (const k of enviados) dados[k] = completo.dados[k];
  return { valido: erros.length === 0, erros, dados };
}

// Regras de negócio das tarefas: validação, datas de criação/conclusão e atraso.

import { validarNovaTarefa, validarAtualizacaoTarefa, PRIORIDADES, STATUS } from './tarefa.validator.js';
import { ErroValidacao, ErroNaoEncontrado } from '../http/erros.js';

/** Uma tarefa está atrasada quando o prazo já passou e ela ainda não foi concluída. */
export function estaAtrasada(tarefa, hoje) {
  return tarefa.status !== 'concluida' && tarefa.prazo < hoje;
}

export function criarTarefaService({ repository, hoje, agora = () => new Date().toISOString() }) {
  // "atrasada" é calculada na leitura (depende do dia de hoje), não fica salva no banco.
  const comAtraso = (tarefa) => ({ ...tarefa, atrasada: estaAtrasada(tarefa, hoje()) });

  function buscar(id) {
    const tarefa = repository.buscarPorId(id);
    if (!tarefa) throw new ErroNaoEncontrado('Tarefa não encontrada.');
    return tarefa;
  }

  // Mantém a data de conclusão original se já estava concluída; limpa ao reabrir.
  function dataConclusao(statusNovo, tarefaAtual) {
    if (statusNovo !== 'concluida') return null;
    return tarefaAtual?.concluidaEm ?? agora();
  }

  function salvar(id, atual, dados) {
    const tarefa = { ...atual, ...dados };
    const salva = repository.atualizar(id, {
      ...tarefa,
      atualizadaEm: agora(),
      concluidaEm: dataConclusao(tarefa.status, atual),
    });
    return comAtraso(salva);
  }

  return {
    listar({ status, prioridade, atrasadas } = {}) {
      if (status && !STATUS.includes(status)) {
        throw new ErroValidacao('Filtro de status inválido.');
      }
      if (prioridade && !PRIORIDADES.includes(prioridade)) {
        throw new ErroValidacao('Filtro de prioridade inválido.');
      }
      const tarefas = repository.listar({ status, prioridade }).map(comAtraso);
      return atrasadas ? tarefas.filter((t) => t.atrasada) : tarefas;
    },

    resumo() {
      const tarefas = repository.listar().map(comAtraso);
      const resumo = { total: tarefas.length, pendente: 0, em_andamento: 0, concluida: 0, atrasadas: 0 };
      for (const tarefa of tarefas) {
        resumo[tarefa.status] += 1;
        if (tarefa.atrasada) resumo.atrasadas += 1;
      }
      return resumo;
    },

    obter(id) {
      return comAtraso(buscar(id));
    },

    criar(corpo) {
      const { valido, erros, dados } = validarNovaTarefa(corpo, { hoje: hoje() });
      if (!valido) throw new ErroValidacao('Dados inválidos.', erros);
      const instante = agora();
      const criada = repository.inserir({
        ...dados,
        criadaEm: instante,
        atualizadaEm: instante,
        concluidaEm: dataConclusao(dados.status),
      });
      return comAtraso(criada);
    },

    substituir(id, corpo) {
      const atual = buscar(id);
      const { valido, erros, dados } = validarNovaTarefa(corpo, { permitirPrazoPassado: true });
      if (!valido) throw new ErroValidacao('Dados inválidos.', erros);
      return salvar(id, atual, dados);
    },

    atualizarParcial(id, corpo) {
      const atual = buscar(id);
      const { valido, erros, dados } = validarAtualizacaoTarefa(corpo);
      if (!valido) throw new ErroValidacao('Dados inválidos.', erros);
      return salvar(id, atual, dados);
    },

    excluir(id) {
      if (!repository.excluir(id)) throw new ErroNaoEncontrado('Tarefa não encontrada.');
    },
  };
}

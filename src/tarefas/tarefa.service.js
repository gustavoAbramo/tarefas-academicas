// Regras de negócio das tarefas: validação, datas de criação/conclusão.

import { validarNovaTarefa, validarAtualizacaoTarefa, PRIORIDADES, STATUS } from './tarefa.validator.js';
import { ErroValidacao, ErroNaoEncontrado } from '../http/erros.js';

export function criarTarefaService({ repository, hoje, agora = () => new Date().toISOString() }) {
  function obter(id) {
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
    return repository.atualizar(id, {
      ...tarefa,
      atualizadaEm: agora(),
      concluidaEm: dataConclusao(tarefa.status, atual),
    });
  }

  return {
    listar(filtros = {}) {
      if (filtros.status && !STATUS.includes(filtros.status)) {
        throw new ErroValidacao('Filtro de status inválido.');
      }
      if (filtros.prioridade && !PRIORIDADES.includes(filtros.prioridade)) {
        throw new ErroValidacao('Filtro de prioridade inválido.');
      }
      return repository.listar(filtros);
    },

    obter,

    criar(corpo) {
      const { valido, erros, dados } = validarNovaTarefa(corpo, { hoje: hoje() });
      if (!valido) throw new ErroValidacao('Dados inválidos.', erros);
      const instante = agora();
      return repository.inserir({
        ...dados,
        criadaEm: instante,
        atualizadaEm: instante,
        concluidaEm: dataConclusao(dados.status),
      });
    },

    substituir(id, corpo) {
      const atual = obter(id);
      const { valido, erros, dados } = validarNovaTarefa(corpo, { permitirPrazoPassado: true });
      if (!valido) throw new ErroValidacao('Dados inválidos.', erros);
      return salvar(id, atual, dados);
    },

    atualizarParcial(id, corpo) {
      const atual = obter(id);
      const { valido, erros, dados } = validarAtualizacaoTarefa(corpo);
      if (!valido) throw new ErroValidacao('Dados inválidos.', erros);
      return salvar(id, atual, dados);
    },

    excluir(id) {
      if (!repository.excluir(id)) throw new ErroNaoEncontrado('Tarefa não encontrada.');
    },
  };
}

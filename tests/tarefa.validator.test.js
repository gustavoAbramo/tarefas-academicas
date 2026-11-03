import { describe, it, expect } from 'vitest';
import { validarNovaTarefa, validarAtualizacaoTarefa } from '../src/tarefas/tarefa.validator.js';

const HOJE = '2026-11-02';

const tarefaValida = {
  titulo: 'Entregar relatório de TAP',
  disciplina: 'Técnicas Avançadas de Programação',
  prazo: '2026-11-11',
  prioridade: 'alta',
};

describe('validarNovaTarefa', () => {
  it('aceita uma tarefa válida e aplica valores padrão', () => {
    const { valido, erros, dados } = validarNovaTarefa(tarefaValida, { hoje: HOJE });

    expect(valido).toBe(true);
    expect(erros).toEqual([]);
    expect(dados).toEqual({
      titulo: 'Entregar relatório de TAP',
      descricao: '',
      disciplina: 'Técnicas Avançadas de Programação',
      prazo: '2026-11-11',
      prioridade: 'alta',
      status: 'pendente',
    });
  });

  it('rejeita tarefa sem título', () => {
    const { valido, erros } = validarNovaTarefa({ ...tarefaValida, titulo: undefined }, { hoje: HOJE });

    expect(valido).toBe(false);
    expect(erros).toContainEqual({ campo: 'titulo', mensagem: 'O título é obrigatório.' });
  });

  it('rejeita título só com espaços', () => {
    const { valido, erros } = validarNovaTarefa({ ...tarefaValida, titulo: '   ' }, { hoje: HOJE });

    expect(valido).toBe(false);
    expect(erros.map((e) => e.campo)).toContain('titulo');
  });

  it('remove espaços extras do título', () => {
    const { dados } = validarNovaTarefa({ ...tarefaValida, titulo: '  Estudar  ' }, { hoje: HOJE });

    expect(dados.titulo).toBe('Estudar');
  });

  it('rejeita título com menos de 3 ou mais de 120 caracteres', () => {
    const curto = validarNovaTarefa({ ...tarefaValida, titulo: 'ab' }, { hoje: HOJE });
    const longo = validarNovaTarefa({ ...tarefaValida, titulo: 'a'.repeat(121) }, { hoje: HOJE });

    expect(curto.valido).toBe(false);
    expect(longo.valido).toBe(false);
  });

  it('exige prazo em formato AAAA-MM-DD e data real', () => {
    const semPrazo = validarNovaTarefa({ ...tarefaValida, prazo: undefined }, { hoje: HOJE });
    const formato = validarNovaTarefa({ ...tarefaValida, prazo: '11/11/2026' }, { hoje: HOJE });
    const inexistente = validarNovaTarefa({ ...tarefaValida, prazo: '2026-02-30' }, { hoje: HOJE });

    expect(semPrazo.erros.map((e) => e.campo)).toContain('prazo');
    expect(formato.erros.map((e) => e.campo)).toContain('prazo');
    expect(inexistente.erros.map((e) => e.campo)).toContain('prazo');
  });

  it('rejeita prazo no passado ao cadastrar', () => {
    const { valido, erros } = validarNovaTarefa({ ...tarefaValida, prazo: '2026-11-01' }, { hoje: HOJE });

    expect(valido).toBe(false);
    expect(erros).toContainEqual({ campo: 'prazo', mensagem: 'O prazo não pode estar no passado.' });
  });

  it('aceita prazo igual a hoje', () => {
    const { valido } = validarNovaTarefa({ ...tarefaValida, prazo: HOJE }, { hoje: HOJE });

    expect(valido).toBe(true);
  });

  it('usa prioridade "media" quando não informada', () => {
    const { dados } = validarNovaTarefa({ ...tarefaValida, prioridade: undefined }, { hoje: HOJE });

    expect(dados.prioridade).toBe('media');
  });

  it('rejeita prioridade e status desconhecidos', () => {
    const { erros } = validarNovaTarefa(
      { ...tarefaValida, prioridade: 'urgente', status: 'arquivada' },
      { hoje: HOJE },
    );

    expect(erros.map((e) => e.campo)).toEqual(expect.arrayContaining(['prioridade', 'status']));
  });

  it('rejeita corpo que não é objeto', () => {
    const { valido, erros } = validarNovaTarefa(null, { hoje: HOJE });

    expect(valido).toBe(false);
    expect(erros[0].campo).toBe('corpo');
  });
});

describe('validarAtualizacaoTarefa', () => {
  it('aceita atualização parcial só com os campos enviados', () => {
    const { valido, dados } = validarAtualizacaoTarefa({ status: 'concluida' });

    expect(valido).toBe(true);
    expect(dados).toEqual({ status: 'concluida' });
  });

  it('permite prazo no passado em atualização (tarefa atrasada)', () => {
    const { valido } = validarAtualizacaoTarefa({ prazo: '2020-01-01' });

    expect(valido).toBe(true);
  });

  it('rejeita atualização sem nenhum campo conhecido', () => {
    const { valido, erros } = validarAtualizacaoTarefa({ foo: 'bar' });

    expect(valido).toBe(false);
    expect(erros[0].campo).toBe('corpo');
  });

  it('valida os campos enviados', () => {
    const { valido, erros } = validarAtualizacaoTarefa({ titulo: '', prioridade: 'xyz' });

    expect(valido).toBe(false);
    expect(erros.map((e) => e.campo)).toEqual(expect.arrayContaining(['titulo', 'prioridade']));
  });
});

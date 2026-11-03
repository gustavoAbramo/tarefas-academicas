import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { abrirBanco } from '../src/db.js';

const HOJE = '2026-11-02';

let app;

beforeEach(() => {
  // Banco em memória novo a cada teste: testes isolados e rápidos.
  app = createApp({ db: abrirBanco(':memory:'), hoje: () => HOJE });
});

const novaTarefa = (extra = {}) => ({
  titulo: 'Lista de exercícios de Cálculo',
  disciplina: 'Cálculo I',
  prazo: '2026-11-10',
  prioridade: 'alta',
  ...extra,
});

async function criar(extra) {
  const res = await request(app).post('/api/tarefas').send(novaTarefa(extra));
  return res.body;
}

describe('POST /api/tarefas', () => {
  it('cadastra uma tarefa válida e responde 201 com o recurso criado', async () => {
    const res = await request(app).post('/api/tarefas').send(novaTarefa());

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.headers.location).toBe(`/api/tarefas/${res.body.id}`);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      titulo: 'Lista de exercícios de Cálculo',
      disciplina: 'Cálculo I',
      prazo: '2026-11-10',
      prioridade: 'alta',
      status: 'pendente',
      concluidaEm: null,
    });
    expect(res.body.criadaEm).toBeTruthy();
  });

  it('rejeita tarefa sem título com 400 e lista de erros', async () => {
    const res = await request(app).post('/api/tarefas').send(novaTarefa({ titulo: '' }));

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Dados inválidos.');
    expect(res.body.detalhes).toContainEqual({ campo: 'titulo', mensagem: 'O título é obrigatório.' });
  });

  it('responde 400 para JSON malformado', async () => {
    const res = await request(app)
      .post('/api/tarefas')
      .set('Content-Type', 'application/json')
      .send('{"titulo": ');

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('JSON inválido no corpo da requisição.');
  });
});

describe('GET /api/tarefas', () => {
  it('lista vazia no início', async () => {
    const res = await request(app).get('/api/tarefas');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('lista ordenada por prazo e, no mesmo prazo, por prioridade (alta primeiro)', async () => {
    await criar({ titulo: 'Depois', prazo: '2026-11-20', prioridade: 'alta' });
    await criar({ titulo: 'Mesmo dia baixa', prazo: '2026-11-05', prioridade: 'baixa' });
    await criar({ titulo: 'Mesmo dia alta', prazo: '2026-11-05', prioridade: 'alta' });

    const res = await request(app).get('/api/tarefas');

    expect(res.body.map((t) => t.titulo)).toEqual(['Mesmo dia alta', 'Mesmo dia baixa', 'Depois']);
  });

  it('filtra por status e prioridade', async () => {
    await criar({ titulo: 'Alta pendente', prioridade: 'alta' });
    await criar({ titulo: 'Baixa pendente', prioridade: 'baixa' });
    await criar({ titulo: 'Alta concluída', prioridade: 'alta', status: 'concluida' });

    const res = await request(app).get('/api/tarefas?status=pendente&prioridade=alta');

    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.titulo)).toEqual(['Alta pendente']);
  });

  it('busca por texto no título e na descrição, ignorando maiúsculas e acentos', async () => {
    await criar({ titulo: 'Relatório de TAP', descricao: 'Entrega final do semestre' });
    await criar({ titulo: 'Lista de Cálculo', descricao: 'Exercícios do capítulo 3' });

    const porTitulo = await request(app).get('/api/tarefas?busca=relatorio');
    expect(porTitulo.status).toBe(200);
    expect(porTitulo.body.map((t) => t.titulo)).toEqual(['Relatório de TAP']);

    const porDescricao = await request(app).get('/api/tarefas?busca=capitulo');
    expect(porDescricao.body.map((t) => t.titulo)).toEqual(['Lista de Cálculo']);
  });

  it('combina a busca com os demais filtros', async () => {
    await criar({ titulo: 'Relatório de TAP', status: 'pendente' });
    await criar({ titulo: 'Relatório de BD', status: 'concluida' });

    const res = await request(app).get('/api/tarefas?busca=relatorio&status=pendente');

    expect(res.body.map((t) => t.titulo)).toEqual(['Relatório de TAP']);
  });

  it('ignora busca vazia ou só com espaços', async () => {
    await criar({ titulo: 'Relatório de TAP' });
    await criar({ titulo: 'Lista de Cálculo' });

    const vazia = await request(app).get('/api/tarefas?busca=');
    const espacos = await request(app).get('/api/tarefas?busca=%20%20');

    expect(vazia.body).toHaveLength(2);
    expect(espacos.body).toHaveLength(2);
  });

  it('rejeita filtro inválido com 400', async () => {
    const res = await request(app).get('/api/tarefas?status=qualquer');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/tarefas/:id', () => {
  it('retorna a tarefa pelo id', async () => {
    const criada = await criar();

    const res = await request(app).get(`/api/tarefas/${criada.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(criada);
  });

  it('responde 404 para id inexistente', async () => {
    const res = await request(app).get('/api/tarefas/999');

    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Tarefa não encontrada.');
  });

  it('responde 400 para id que não é número inteiro positivo', async () => {
    const res = await request(app).get('/api/tarefas/abc');

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/tarefas/:id', () => {
  it('substitui os dados da tarefa', async () => {
    const criada = await criar();

    const res = await request(app)
      .put(`/api/tarefas/${criada.id}`)
      .send(novaTarefa({ titulo: 'Lista revisada', prioridade: 'media', prazo: '2026-11-15' }));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: criada.id, titulo: 'Lista revisada', prioridade: 'media', prazo: '2026-11-15' });
  });

  it('valida os dados com 400', async () => {
    const criada = await criar();

    const res = await request(app).put(`/api/tarefas/${criada.id}`).send({ titulo: 'ok ok' });

    expect(res.status).toBe(400);
    expect(res.body.detalhes.map((d) => d.campo)).toContain('prazo');
  });

  it('responde 404 para id inexistente', async () => {
    const res = await request(app).put('/api/tarefas/999').send(novaTarefa());

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tarefas/:id', () => {
  it('atualiza apenas os campos enviados', async () => {
    const criada = await criar();

    const res = await request(app).patch(`/api/tarefas/${criada.id}`).send({ status: 'em_andamento' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ titulo: criada.titulo, status: 'em_andamento' });
  });

  it('registra a data de conclusão ao concluir e limpa ao reabrir', async () => {
    const criada = await criar();

    const concluida = await request(app).patch(`/api/tarefas/${criada.id}`).send({ status: 'concluida' });
    expect(concluida.body.concluidaEm).toBeTruthy();

    const reaberta = await request(app).patch(`/api/tarefas/${criada.id}`).send({ status: 'pendente' });
    expect(reaberta.body.concluidaEm).toBeNull();
  });

  it('responde 400 com corpo sem campos válidos', async () => {
    const criada = await criar();

    const res = await request(app).patch(`/api/tarefas/${criada.id}`).send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tarefas/:id', () => {
  it('exclui a tarefa e responde 204', async () => {
    const criada = await criar();

    const res = await request(app).delete(`/api/tarefas/${criada.id}`);
    expect(res.status).toBe(204);

    const depois = await request(app).get(`/api/tarefas/${criada.id}`);
    expect(depois.status).toBe(404);
  });

  it('responde 404 ao excluir id inexistente', async () => {
    const res = await request(app).delete('/api/tarefas/999');

    expect(res.status).toBe(404);
  });
});

describe('rotas desconhecidas', () => {
  it('responde 404 em JSON para rota da API inexistente', async () => {
    const res = await request(app).get('/api/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.erro).toBeDefined();
  });
});

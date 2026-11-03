import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { abrirBanco } from '../src/db.js';

// O relógio da aplicação é controlado: assim conseguimos "avançar o tempo"
// e verificar quando uma tarefa passa a ficar atrasada.
let hoje;
let app;

beforeEach(() => {
  hoje = '2026-11-02';
  app = createApp({ db: abrirBanco(':memory:'), hoje: () => hoje });
});

const criar = (extra) =>
  request(app)
    .post('/api/tarefas')
    .send({ titulo: 'Seminário', prazo: '2026-11-05', ...extra })
    .then((r) => r.body);

describe('regra: tarefa atrasada', () => {
  it('não está atrasada antes do prazo', async () => {
    const tarefa = await criar();

    expect(tarefa.atrasada).toBe(false);
  });

  it('fica atrasada quando o prazo passa e ela não foi concluída', async () => {
    const tarefa = await criar();
    hoje = '2026-11-06';

    const res = await request(app).get(`/api/tarefas/${tarefa.id}`);

    expect(res.body.atrasada).toBe(true);
  });

  it('tarefa concluída nunca é considerada atrasada', async () => {
    const tarefa = await criar({ status: 'concluida' });
    hoje = '2026-12-01';

    const res = await request(app).get(`/api/tarefas/${tarefa.id}`);

    expect(res.body.atrasada).toBe(false);
  });

  it('permite filtrar só as atrasadas', async () => {
    await criar({ titulo: 'Vence logo', prazo: '2026-11-03' });
    await criar({ titulo: 'Vence depois', prazo: '2026-11-30' });
    hoje = '2026-11-10';

    const res = await request(app).get('/api/tarefas?atrasadas=true');

    expect(res.body.map((t) => t.titulo)).toEqual(['Vence logo']);
  });
});

describe('GET /api/tarefas/resumo', () => {
  it('retorna zeros sem tarefas', async () => {
    const res = await request(app).get('/api/tarefas/resumo');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, pendente: 0, em_andamento: 0, concluida: 0, atrasadas: 0 });
  });

  it('conta tarefas por status e atrasadas', async () => {
    await criar({ prazo: '2026-11-03' });
    await criar({ prazo: '2026-11-20', status: 'em_andamento' });
    await criar({ prazo: '2026-11-03', status: 'concluida' });
    hoje = '2026-11-04';

    const res = await request(app).get('/api/tarefas/resumo');

    expect(res.body).toEqual({ total: 3, pendente: 1, em_andamento: 1, concluida: 1, atrasadas: 1 });
  });
});

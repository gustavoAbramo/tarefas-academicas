import express from 'express';
import { abrirBanco } from './db.js';
import { hojeISO } from './tarefas/tarefa.validator.js';
import { criarTarefaRepository } from './tarefas/tarefa.repository.js';
import { criarTarefaService } from './tarefas/tarefa.service.js';
import { criarTarefaRoutes } from './tarefas/tarefa.routes.js';
import { rotaNaoEncontrada, tratarErros } from './http/erros.js';

/**
 * Monta a aplicação Express.
 * As dependências (banco, relógio) são injetáveis para facilitar os testes.
 */
export function createApp({ db = abrirBanco(':memory:'), hoje = hojeISO } = {}) {
  const app = express();
  app.use(express.json());

  const service = criarTarefaService({ repository: criarTarefaRepository(db), hoje });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/tarefas', criarTarefaRoutes(service));
  app.use('/api', rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}

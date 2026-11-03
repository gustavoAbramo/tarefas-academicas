import express from 'express';
import { abrirBanco } from './db.js';
import { validarNovaTarefa, validarAtualizacaoTarefa, hojeISO } from './tarefas/tarefa.validator.js';

function paraJson(l) {
  return {
    id: l.id,
    titulo: l.titulo,
    descricao: l.descricao,
    disciplina: l.disciplina,
    prazo: l.prazo,
    prioridade: l.prioridade,
    status: l.status,
    criadaEm: l.criada_em,
    atualizadaEm: l.atualizada_em,
    concluidaEm: l.concluida_em,
  };
}

export function createApp({ db = abrirBanco(':memory:'), hoje = hojeISO } = {}) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/tarefas', (req, res) => {
    const { status, prioridade } = req.query;
    if (status && !['pendente', 'em_andamento', 'concluida'].includes(status)) {
      return res.status(400).json({ erro: 'Filtro de status inválido.' });
    }
    if (prioridade && !['baixa', 'media', 'alta'].includes(prioridade)) {
      return res.status(400).json({ erro: 'Filtro de prioridade inválido.' });
    }
    let sql = 'SELECT * FROM tarefas WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (prioridade) { sql += ' AND prioridade = ?'; params.push(prioridade); }
    sql += " ORDER BY prazo, CASE prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, id";
    res.json(db.prepare(sql).all(...params).map(paraJson));
  });

  app.get('/api/tarefas/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'Id inválido.' });
    const l = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id);
    if (!l) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    res.json(paraJson(l));
  });

  app.post('/api/tarefas', (req, res) => {
    const v = validarNovaTarefa(req.body, { hoje: hoje() });
    if (!v.valido) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: v.erros });
    const agora = new Date().toISOString();
    const d = v.dados;
    const r = db
      .prepare('INSERT INTO tarefas (titulo, descricao, disciplina, prazo, prioridade, status, criada_em, atualizada_em, concluida_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(d.titulo, d.descricao, d.disciplina, d.prazo, d.prioridade, d.status, agora, agora, d.status === 'concluida' ? agora : null);
    const l = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).location(`/api/tarefas/${l.id}`).json(paraJson(l));
  });

  app.put('/api/tarefas/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'Id inválido.' });
    const atual = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    const v = validarNovaTarefa(req.body, { hoje: '0000-01-01' });
    if (!v.valido) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: v.erros });
    const d = v.dados;
    const agora = new Date().toISOString();
    const concluidaEm = d.status === 'concluida' ? atual.concluida_em ?? agora : null;
    db.prepare('UPDATE tarefas SET titulo=?, descricao=?, disciplina=?, prazo=?, prioridade=?, status=?, atualizada_em=?, concluida_em=? WHERE id=?')
      .run(d.titulo, d.descricao, d.disciplina, d.prazo, d.prioridade, d.status, agora, concluidaEm, id);
    res.json(paraJson(db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id)));
  });

  app.patch('/api/tarefas/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'Id inválido.' });
    const atual = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    const v = validarAtualizacaoTarefa(req.body);
    if (!v.valido) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: v.erros });
    const d = { ...paraJson(atual), ...v.dados };
    const agora = new Date().toISOString();
    const concluidaEm = d.status === 'concluida' ? atual.concluida_em ?? agora : null;
    db.prepare('UPDATE tarefas SET titulo=?, descricao=?, disciplina=?, prazo=?, prioridade=?, status=?, atualizada_em=?, concluida_em=? WHERE id=?')
      .run(d.titulo, d.descricao, d.disciplina, d.prazo, d.prioridade, d.status, agora, concluidaEm, id);
    res.json(paraJson(db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id)));
  });

  app.delete('/api/tarefas/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'Id inválido.' });
    const r = db.prepare('DELETE FROM tarefas WHERE id = ?').run(id);
    if (r.changes === 0) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    res.status(204).end();
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  });

  return app;
}

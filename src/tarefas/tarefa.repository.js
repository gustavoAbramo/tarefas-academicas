// Acesso a dados das tarefas (SQLite). Só SQL aqui; regras ficam no service.

const ORDEM_PRIORIDADE = "CASE prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END";

function linhaParaTarefa(linha) {
  if (!linha) return null;
  return {
    id: linha.id,
    titulo: linha.titulo,
    descricao: linha.descricao,
    disciplina: linha.disciplina,
    prazo: linha.prazo,
    prioridade: linha.prioridade,
    status: linha.status,
    criadaEm: linha.criada_em,
    atualizadaEm: linha.atualizada_em,
    concluidaEm: linha.concluida_em,
  };
}

export function criarTarefaRepository(db) {
  const buscarStmt = db.prepare('SELECT * FROM tarefas WHERE id = ?');
  const inserirStmt = db.prepare(`
    INSERT INTO tarefas (titulo, descricao, disciplina, prazo, prioridade, status, criada_em, atualizada_em, concluida_em)
    VALUES (:titulo, :descricao, :disciplina, :prazo, :prioridade, :status, :criadaEm, :atualizadaEm, :concluidaEm)
  `);
  const atualizarStmt = db.prepare(`
    UPDATE tarefas
       SET titulo = :titulo, descricao = :descricao, disciplina = :disciplina, prazo = :prazo,
           prioridade = :prioridade, status = :status, atualizada_em = :atualizadaEm, concluida_em = :concluidaEm
     WHERE id = :id
  `);
  const excluirStmt = db.prepare('DELETE FROM tarefas WHERE id = ?');

  return {
    listar({ status, prioridade } = {}) {
      const condicoes = [];
      const params = {};
      if (status) {
        condicoes.push('status = :status');
        params.status = status;
      }
      if (prioridade) {
        condicoes.push('prioridade = :prioridade');
        params.prioridade = prioridade;
      }
      const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
      const sql = `SELECT * FROM tarefas ${where} ORDER BY prazo, ${ORDEM_PRIORIDADE}, id`;
      return db.prepare(sql).all(params).map(linhaParaTarefa);
    },

    buscarPorId(id) {
      return linhaParaTarefa(buscarStmt.get(id));
    },

    inserir(tarefa) {
      const { lastInsertRowid } = inserirStmt.run(tarefa);
      return this.buscarPorId(lastInsertRowid);
    },

    atualizar(id, { titulo, descricao, disciplina, prazo, prioridade, status, atualizadaEm, concluidaEm }) {
      atualizarStmt.run({ id, titulo, descricao, disciplina, prazo, prioridade, status, atualizadaEm, concluidaEm });
      return this.buscarPorId(id);
    },

    excluir(id) {
      return excluirStmt.run(id).changes > 0;
    },
  };
}

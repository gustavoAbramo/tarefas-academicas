import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Abre (ou cria) o banco SQLite e garante o schema.
 * Use ':memory:' para um banco temporário (testes).
 */
export function abrirBanco(caminho = 'data/tarefas.db') {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });

  const db = new DatabaseSync(caminho);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tarefas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo       TEXT    NOT NULL,
      descricao    TEXT    NOT NULL DEFAULT '',
      disciplina   TEXT    NOT NULL DEFAULT '',
      prazo        TEXT    NOT NULL,
      prioridade   TEXT    NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta')),
      status       TEXT    NOT NULL CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
      criada_em    TEXT    NOT NULL,
      atualizada_em TEXT   NOT NULL,
      concluida_em TEXT
    );
  `);
  return db;
}

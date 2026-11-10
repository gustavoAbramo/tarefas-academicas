import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { abrirBanco } from './db.js';

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || 'data/tarefas.db';

const app = createApp({ db: abrirBanco(DB_PATH) });

app.get('/runtime-config.js', (_req, res) => {
  res
    .type('application/javascript')
    .set('Cache-Control', 'no-store')
    .send(`window.APP_CONFIG = ${JSON.stringify({ showApiLog: process.env.NODE_ENV !== 'production' })};`);
});

// A interface web (HTML/CSS/JS estático) é servida pelo mesmo servidor da API.
app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

app.listen(PORT, () => {
  console.log(`Tarefas Acadêmicas rodando em http://localhost:${PORT}`);
  console.log(`Banco de dados: ${DB_PATH}`);
});

import { Router } from 'express';
import { ErroValidacao } from '../http/erros.js';

function idDaRota(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErroValidacao('Id inválido.');
  return id;
}

// Express 4 não captura erros de handlers sozinho de forma uniforme; este wrapper repassa ao middleware.
const rota = (handler) => (req, res, next) => {
  try {
    handler(req, res);
  } catch (err) {
    next(err);
  }
};

export function criarTarefaRoutes(service) {
  const router = Router();

  router.get('/', rota((req, res) => {
    const { status, prioridade, atrasadas, busca } = req.query;
    res.json(service.listar({ status, prioridade, busca, atrasadas: atrasadas === 'true' }));
  }));

  // Precisa vir antes de "/:id" para "resumo" não ser lido como id.
  router.get('/resumo', rota((req, res) => {
    res.json(service.resumo());
  }));

  router.get('/:id', rota((req, res) => {
    res.json(service.obter(idDaRota(req)));
  }));

  router.post('/', rota((req, res) => {
    const tarefa = service.criar(req.body);
    res.status(201).location(`/api/tarefas/${tarefa.id}`).json(tarefa);
  }));

  router.put('/:id', rota((req, res) => {
    res.json(service.substituir(idDaRota(req), req.body));
  }));

  router.patch('/:id', rota((req, res) => {
    res.json(service.atualizarParcial(idDaRota(req), req.body));
  }));

  router.delete('/:id', rota((req, res) => {
    service.excluir(idDaRota(req));
    res.status(204).end();
  }));

  return router;
}

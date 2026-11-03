// Erros de domínio com o código HTTP correspondente.

export class ErroHttp extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

export class ErroValidacao extends ErroHttp {
  constructor(mensagem, detalhes) {
    super(400, mensagem, detalhes);
  }
}

export class ErroNaoEncontrado extends ErroHttp {
  constructor(mensagem) {
    super(404, mensagem);
  }
}

export function rotaNaoEncontrada(_req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  if (err instanceof ErroHttp) {
    const corpo = { erro: err.message };
    if (err.detalhes) corpo.detalhes = err.detalhes;
    return res.status(err.status).json(corpo);
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}

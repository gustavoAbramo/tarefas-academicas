# Tarefas Acadêmicas

Aplicativo web para **organizar as atividades do semestre**: cadastrar tarefas, definir prazos e prioridades,
acompanhar o status e ver o que está atrasado.

Projeto da atividade prática **"Desenvolvimento de aplicativo com API REST, TDD e Git"**, disciplina
*Técnicas Avançadas de Programação Web e Mobile*, Fatec Araras. Tema: **Opção 1, Gerenciador de tarefas acadêmicas**.

| Eixo | Como o projeto atende |
| --- | --- |
| API REST | API própria em Node.js + Express, CRUD completo, JSON, códigos HTTP 200/201/204/400/404/500 |
| Persistência | SQLite (arquivo `data/tarefas.db`), módulo nativo `node:sqlite`, sem instalar servidor de banco |
| Interface | Site responsivo com lista e calendário mensal de prazos (HTML, CSS e JavaScript) que consome a API |
| TDD | Testes com Vitest + Supertest, escritos antes do código (veja [docs/tdd.md](docs/tdd.md)) |
| Git | Branches por funcionalidade, merges, commits `test(red)` → `feat(green)` → `refactor` |

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalação](#2-instalação)
3. [Configuração](#3-configuração)
4. [Execução](#4-execução)
5. [Testes](#5-testes)
6. [Estrutura do projeto](#6-estrutura-do-projeto)
7. [API REST: endpoints](#7-api-rest-endpoints)
8. [Regras de negócio](#8-regras-de-negócio)
9. [Como contribuir (fluxo do grupo)](#9-como-contribuir-fluxo-do-grupo)
10. [Integrantes e papéis](#10-integrantes-e-papéis)
11. [Melhorias futuras](#11-melhorias-futuras)

---

## 1. Pré-requisitos

| Ferramenta | Versão |
| --- | --- |
| [Node.js](https://nodejs.org/) | **22.13 ou mais recente** (precisa do módulo `node:sqlite`) |
| npm | vem junto com o Node |
| Git | qualquer versão recente |

```bash
node -v
```

## 2. Instalação

```bash
git clone https://github.com/gustavoAbramo/tarefas-academicas.git
cd tarefas-academicas
npm install
```

> Para instalar exatamente as versões travadas no `package-lock.json`, use `npm ci` no lugar de `npm install`.

> No PowerShell do Windows, se aparecer erro de "execução de scripts desabilitada", use `npm.cmd install`
> (e `npm.cmd start`, `npm.cmd test`).

## 3. Configuração

Não é preciso configurar nada para rodar. Opcionalmente, defina variáveis de ambiente (veja `.env.example`):

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `PORT` | `3000` | porta do servidor |
| `DB_PATH` | `data/tarefas.db` | arquivo do banco SQLite (criado automaticamente) |
| `NODE_ENV` | não definido | define o ambiente; o histórico de requisições da API fica oculto quando o valor é `production` |

O projeto **não usa senhas, tokens nem credenciais**. O arquivo do banco fica fora do Git (`.gitignore`).

## 4. Execução

```bash
npm start
```

Abra **http://localhost:3000**. A interface e a API rodam no mesmo servidor.

Para desenvolver com recarregamento automático ao salvar arquivos:

```bash
npm run dev
```

## 5. Testes

```bash
npm test
```

Para deixar os testes rodando enquanto programa (modo watch, ideal para TDD):

```bash
npm run test:watch
```

| Arquivo | O que testa |
| --- | --- |
| `tests/tarefa.validator.test.js` | regras de validação (unidade): título, prazo, prioridade, status |
| `tests/tarefas.api.test.js` | endpoints CRUD via HTTP (integração com Supertest + SQLite em memória) |
| `tests/tarefas.resumo.test.js` | regra de tarefa atrasada e endpoint de resumo, com relógio controlado |
| `tests/health.test.js` | health check da API |

Os testes usam um banco **em memória** novo para cada caso, então não mexem no `data/tarefas.db`.

O GitHub Actions (`.github/workflows/testes.yml`) roda `npm test` em todo push na `main` e em todo Pull Request.
Se o PR ficar com ❌, os testes quebraram: rode `npm test` localmente e corrija antes do merge.

## 6. Estrutura do projeto

```text
tarefas-academicas/
├── public/                    # Interface web (servida pelo Express)
│   ├── index.html
│   ├── styles.css
│   ├── api.js                 # cliente da API (fetch)
│   └── app.js                 # telas, formulário, filtros
├── src/
│   ├── server.js              # ponto de entrada (porta, banco em arquivo, arquivos estáticos)
│   ├── app.js                 # monta o Express (injeção de banco e relógio para testes)
│   ├── db.js                  # conexão SQLite e criação da tabela
│   ├── http/erros.js          # erros HTTP e middleware de tratamento
│   └── tarefas/
│       ├── tarefa.routes.js      # rotas REST
│       ├── tarefa.service.js     # regras de negócio
│       ├── tarefa.repository.js  # SQL
│       └── tarefa.validator.js   # validação dos dados
├── tests/                     # testes automatizados (Vitest + Supertest)
├── docs/                      # documentação extra (API, TDD, planejamento)
└── data/                      # banco SQLite local (ignorado pelo Git)
```

Fluxo de uma requisição: **rota → service (regras) → repository (SQL) → SQLite**.
Erros lançados no service (`ErroValidacao`, `ErroNaoEncontrado`) viram respostas 400/404 no middleware.

## 7. API REST: endpoints

Base: `http://localhost:3000/api`. Todas as respostas são JSON. Detalhes e exemplos em [docs/api.md](docs/api.md).

| Método | Rota | Descrição | Sucesso | Erros |
| --- | --- | --- | --- | --- |
| GET | `/health` | status da API | 200 | |
| GET | `/tarefas` | lista tarefas (filtros `status`, `prioridade`, `atrasadas=true`, `busca`) | 200 | 400 |
| GET | `/tarefas/resumo` | contagem por status e atrasadas | 200 | |
| GET | `/tarefas/:id` | busca uma tarefa | 200 | 400, 404 |
| POST | `/tarefas` | cadastra tarefa | 201 | 400 |
| PUT | `/tarefas/:id` | substitui todos os dados | 200 | 400, 404 |
| PATCH | `/tarefas/:id` | altera só os campos enviados (ex.: status) | 200 | 400, 404 |
| DELETE | `/tarefas/:id` | exclui tarefa | 204 | 400, 404 |

Exemplo:

```bash
curl -X POST http://localhost:3000/api/tarefas \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Relatório de TAP","disciplina":"TAP","prazo":"2026-11-11","prioridade":"alta"}'
```

```json
{
  "id": 1,
  "titulo": "Relatório de TAP",
  "descricao": "",
  "disciplina": "TAP",
  "prazo": "2026-11-11",
  "prioridade": "alta",
  "status": "pendente",
  "criadaEm": "2026-11-02T23:10:00.000Z",
  "atualizadaEm": "2026-11-02T23:10:00.000Z",
  "concluidaEm": null,
  "atrasada": false
}
```

Erro de validação (400):

```json
{
  "erro": "Dados inválidos.",
  "detalhes": [{ "campo": "titulo", "mensagem": "O título é obrigatório." }]
}
```

## 8. Regras de negócio

- **Título** obrigatório, de 3 a 120 caracteres (espaços nas pontas são removidos).
- **Prazo** obrigatório, formato `AAAA-MM-DD`, data real. **No cadastro não pode estar no passado**
  (na edição pode, para registrar tarefas que já atrasaram).
- **Prioridade**: `baixa`, `media` (padrão) ou `alta`.
- **Status**: `pendente` (padrão), `em_andamento` ou `concluida`.
- Ao concluir, grava `concluidaEm`; ao reabrir, a data é limpa.
- **Atrasada** = prazo já passou e a tarefa não foi concluída. É calculada na leitura (não fica salva).
- **Busca** (`?busca=...`) filtra por título e descrição, sem diferenciar maiúsculas/minúsculas nem acentos.
- Listagem ordenada por **prazo** e, no mesmo dia, por **prioridade** (alta primeiro).

## 9. Como contribuir (fluxo do grupo)

Cada integrante trabalha numa **branch própria** e integra por **Pull Request**. Nunca commite direto na `main`.

```bash
# 1. Atualize sua main
git checkout main
git pull

# 2. Crie uma branch para a sua tarefa
git checkout -b feature/nome-da-funcionalidade

# 3. TDD: escreva o teste que falha e commite
npm test
git add tests
git commit -m "test(red): descreve o comportamento esperado"

# 4. Implemente o mínimo para passar e commite
git commit -am "feat(green): implementa ..."

# 5. Melhore o código sem quebrar os testes e commite
git commit -am "refactor: ..."

# 6. Envie e abra o Pull Request no GitHub
git push -u origin feature/nome-da-funcionalidade
```

**Padrão de mensagens de commit**

| Prefixo | Uso |
| --- | --- |
| `test(red):` | teste novo que ainda falha |
| `feat(green):` | código que faz o teste passar |
| `refactor:` | melhoria sem mudar comportamento (testes continuam verdes) |
| `feat:` / `fix:` | funcionalidade ou correção |
| `docs:` / `chore:` | documentação, configuração |

**Nomes de branch:** `feature/...`, `fix/...`, `docs/...`.

**Antes de abrir o PR:** `npm test` passando, README atualizado se mudou algo de uso.

Para ser adicionado ao repositório (ele é privado), peça ao dono para te convidar em
*Settings → Collaborators* no GitHub.

## 10. Integrantes e papéis

> Preencham com os nomes do grupo. Os papéis podem mudar ao longo das semanas.

| Integrante | GitHub | Papel principal |
| --- | --- | --- |
| Gustavo Abramo | [@gustavoAbramo](https://github.com/gustavoAbramo) | API, TDD e integração |
| _nome_ | _@usuario_ | Interface (telas e consumo da API) |
| _nome_ | _@usuario_ | Testes e qualidade |
| _nome_ | _@usuario_ | Documentação e apresentação |

## 11. Melhorias futuras

Ideias para o grupo pegar (cada uma vira uma branch + PR):

- [ ] Entidade **Disciplina** com CRUD próprio (hoje a disciplina é um texto livre na tarefa)
- [ ] Paginação na listagem
- [ ] Testes da interface (ex.: Playwright)
- [ ] Login de usuário (cada aluno com suas tarefas)
- [ ] Notificação de tarefas que vencem amanhã
- [ ] Trocar SQLite por MySQL, se o professor pedir

Planejamento, requisitos e modelo de dados estão em [docs/planejamento.md](docs/planejamento.md).

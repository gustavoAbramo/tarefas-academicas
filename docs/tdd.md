# Evidências do ciclo TDD (Red → Green → Refactor)

Os testes foram escritos **antes** do código. Cada etapa virou um commit separado, então o ciclo pode ser
conferido no histórico:

```bash
git log --oneline --graph
```

## Ciclo 1: validação de tarefa (branch `feature/validacao-tarefa`)

| Etapa | Commit | O que aconteceu |
| --- | --- | --- |
| RED | `test(red): regras de validação de tarefa (título, prazo, prioridade, status)` | 15 testes escritos; a suíte falha porque `tarefa.validator.js` não existe |
| GREEN | `feat(green): implementa validação de nova tarefa e atualização parcial` | implementação direta, tudo numa função; a atualização reaproveitava a validação completa com valores "falsos" (`titulo: 'xxx'`) |
| REFACTOR | `refactor: extrai validadores por campo e constantes de prioridade/status` | um validador por campo, constantes `PRIORIDADES`/`STATUS`, sem os valores falsos; os mesmos testes continuam verdes |

Exemplo de teste (o mesmo pedido no enunciado):

```js
it('rejeita tarefa sem título', () => {
  const { valido, erros } = validarNovaTarefa({ ...tarefaValida, titulo: undefined }, { hoje: HOJE });

  expect(valido).toBe(false);
  expect(erros).toContainEqual({ campo: 'titulo', mensagem: 'O título é obrigatório.' });
});
```

## Ciclo 2: endpoints CRUD (branch `feature/api-crud`)

| Etapa | Commit | O que aconteceu |
| --- | --- | --- |
| RED | `test(red): endpoints CRUD de /api/tarefas (POST, GET, PUT, PATCH, DELETE)` | 19 testes de integração com Supertest; falham porque não há banco nem rotas |
| GREEN | `feat(green): CRUD de tarefas com persistência em SQLite` | todas as rotas dentro de `app.js`, com SQL repetido em cada uma |
| REFACTOR | `refactor: separa repository, service, rotas e tratamento de erros` | camadas separadas e erros como classes. **Os testes pegaram uma regressão no meio do refactor** (o `node:sqlite` recusava um parâmetro a mais no `UPDATE`): 3 testes ficaram vermelhos, corrigimos e só então commitamos |

## Ciclo 3: tarefa atrasada e resumo (branch `feature/api-crud`)

| Etapa | Commit | O que aconteceu |
| --- | --- | --- |
| RED | `test(red): regra de tarefa atrasada e endpoint de resumo` | 6 testes; o relógio da aplicação é injetado (`hoje: () => ...`) para "avançar o tempo" no teste |
| GREEN | `feat(green): calcula tarefas atrasadas, filtro ?atrasadas=true e GET /api/tarefas/resumo` | `estaAtrasada()` no service; rota `/resumo` declarada antes de `/:id` |

## Correção guiada por teste

`fix: usa a data local do servidor para validar prazo`: durante o teste manual da interface percebemos que
`new Date().toISOString()` usa UTC; no Brasil (UTC-3), depois das 21h o servidor achava que já era o dia
seguinte e recusava tarefas com prazo "hoje". Criamos o teste `hojeISO › usa a data local` e corrigimos.

## Como demonstrar ao vivo na apresentação

1. `npm run test:watch` num terminal.
2. Escreva um teste novo, por exemplo "rejeita descrição com mais de 1000 caracteres", em
   `tests/tarefa.validator.test.js` → fica **vermelho**.
3. Adicione a regra no validador de `descricao` em `src/tarefas/tarefa.validator.js` → fica **verde**.
4. Melhore o código (ex.: extrair a constante `MAX_DESCRICAO`) → continua **verde**.

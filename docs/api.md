# API REST: Tarefas Acadêmicas

Base URL local: `http://localhost:3000/api`
Formato: JSON (`Content-Type: application/json`).

## Recurso `Tarefa`

| Campo | Tipo | Obrigatório | Observação |
| --- | --- | --- | --- |
| `id` | número | gerado | |
| `titulo` | texto | sim | 3 a 120 caracteres |
| `descricao` | texto | não | padrão `""` |
| `disciplina` | texto | não | padrão `""` |
| `prazo` | data `AAAA-MM-DD` | sim | não pode estar no passado ao cadastrar |
| `prioridade` | `baixa` \| `media` \| `alta` | não | padrão `media` |
| `status` | `pendente` \| `em_andamento` \| `concluida` | não | padrão `pendente` |
| `criadaEm` | data-hora ISO | gerado | |
| `atualizadaEm` | data-hora ISO | gerado | |
| `concluidaEm` | data-hora ISO ou `null` | gerado | preenchido ao concluir |
| `atrasada` | booleano | calculado | prazo passou e não está concluída |

## Formato de erro

```json
{ "erro": "Mensagem legível", "detalhes": [{ "campo": "prazo", "mensagem": "..." }] }
```

`detalhes` só aparece em erros de validação.

| Código | Quando |
| --- | --- |
| 200 | leitura/atualização ok |
| 201 | tarefa criada (header `Location` aponta para o recurso) |
| 204 | tarefa excluída (sem corpo) |
| 400 | dados inválidos, JSON malformado, id inválido, filtro inválido |
| 404 | tarefa ou rota inexistente |
| 500 | erro inesperado no servidor |

---

## GET `/health`

```json
{ "status": "ok" }
```

## GET `/tarefas`

Query opcionais: `status`, `prioridade`, `atrasadas=true`, `busca`. Ordenado por prazo e prioridade.
A `busca` considera título e descrição, sem diferenciar maiúsculas/minúsculas nem acentos.

```http
GET /api/tarefas?status=pendente&prioridade=alta
GET /api/tarefas?busca=relatorio
```

```json
[
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
]
```

`GET /api/tarefas?status=xyz` → **400** `{ "erro": "Filtro de status inválido." }`

## GET `/tarefas/resumo`

```json
{ "total": 3, "pendente": 1, "em_andamento": 1, "concluida": 1, "atrasadas": 1 }
```

## GET `/tarefas/:id`

**200** com a tarefa · **404** `{ "erro": "Tarefa não encontrada." }` · **400** se o id não for inteiro positivo.

## POST `/tarefas`

```http
POST /api/tarefas
Content-Type: application/json

{ "titulo": "Lista 4", "disciplina": "Estatística", "prazo": "2026-11-10", "prioridade": "alta" }
```

**201 Created**, header `Location: /api/tarefas/2`, corpo com a tarefa criada.

Sem título → **400**:

```json
{
  "erro": "Dados inválidos.",
  "detalhes": [{ "campo": "titulo", "mensagem": "O título é obrigatório." }]
}
```

## PUT `/tarefas/:id`

Substitui a tarefa inteira; mesmas regras do POST, mas o prazo **pode** estar no passado.
Campos omitidos voltam ao padrão (`descricao: ""`, `prioridade: "media"`, `status: "pendente"`).

## PATCH `/tarefas/:id`

Altera só os campos enviados. Uso típico pela interface: mudar o status.

```http
PATCH /api/tarefas/2
Content-Type: application/json

{ "status": "concluida" }
```

**200** com a tarefa (`concluidaEm` preenchido). Corpo sem nenhum campo conhecido → **400**.

## DELETE `/tarefas/:id`

**204** sem corpo · **404** se não existir.

---

## Testando no terminal

```bash
curl http://localhost:3000/api/tarefas
curl -X PATCH http://localhost:3000/api/tarefas/1 -H "Content-Type: application/json" -d '{"status":"concluida"}'
curl -X DELETE -i http://localhost:3000/api/tarefas/1
```

Na interface, abra **"Últimas requisições à API"** (abaixo do formulário) para ver cada requisição feita
pela tela, com o JSON enviado e recebido. É útil para demonstrar os endpoints na apresentação.

# Planejamento (entrega da Semana 1)

## Problema

Estudantes acumulam atividades de várias disciplinas com prazos diferentes, espalhadas entre o
ambiente virtual, grupos de mensagem e anotações. É fácil perder um prazo ou não perceber o que é mais urgente.

## Objetivo do aplicativo

Centralizar as tarefas acadêmicas num só lugar, mostrando **o que vence primeiro**, **o que é mais importante**
e **o que já está atrasado**.

**Público-alvo:** estudantes de graduação/tecnólogo (ex.: alunos da Fatec).

## Requisitos funcionais

| # | Requisito |
| --- | --- |
| RF01 | Cadastrar tarefa com título, disciplina, descrição, prazo e prioridade |
| RF02 | Listar tarefas ordenadas por prazo e prioridade |
| RF03 | Filtrar por status, prioridade e atrasadas |
| RF04 | Editar todos os dados de uma tarefa |
| RF05 | Alterar o status (pendente, em andamento, concluída) |
| RF06 | Excluir tarefa, com confirmação |
| RF07 | Mostrar resumo: total, por status e atrasadas |
| RF08 | Indicar visualmente tarefas atrasadas e que vencem hoje |
| RF09 | Buscar tarefas por texto no título ou na descrição |

## Requisitos não funcionais

| # | Requisito |
| --- | --- |
| RNF01 | Interface responsiva (celular e computador) |
| RNF02 | API REST com JSON e códigos HTTP adequados |
| RNF03 | Dados persistidos (sobrevivem ao reiniciar o servidor) |
| RNF04 | Testes automatizados executáveis com um comando (`npm test`) |
| RNF05 | Sem credenciais no repositório |

## Modelo de dados

Tabela `tarefas` (SQLite):

| Coluna | Tipo | Restrição |
| --- | --- | --- |
| `id` | INTEGER | PK, autoincremento |
| `titulo` | TEXT | NOT NULL |
| `descricao` | TEXT | NOT NULL, padrão `''` |
| `disciplina` | TEXT | NOT NULL, padrão `''` |
| `prazo` | TEXT (`AAAA-MM-DD`) | NOT NULL |
| `prioridade` | TEXT | CHECK em (`baixa`, `media`, `alta`) |
| `status` | TEXT | CHECK em (`pendente`, `em_andamento`, `concluida`) |
| `criada_em` | TEXT (ISO) | NOT NULL |
| `atualizada_em` | TEXT (ISO) | NOT NULL |
| `concluida_em` | TEXT (ISO) | pode ser nulo |

## Endpoints planejados

Ver [api.md](api.md).

## Decisões técnicas

| Decisão | Motivo |
| --- | --- |
| **Node.js + Express** | sugerido no enunciado; simples de ler e testar |
| **SQLite (`node:sqlite`)** | banco real, em arquivo, sem instalar servidor nem configurar senha. Qualquer integrante clona e roda. O SQL é padrão e migraria para MySQL sem mudar o service |
| **Vitest + Supertest** | sugeridos no enunciado; Supertest testa as rotas sem abrir porta |
| **Banco em memória nos testes** | cada teste começa do zero, rápido e isolado |
| **Relógio injetável (`hoje`)** | permite testar a regra de "atrasada" sem depender da data real |
| **Front-end em HTML/CSS/JS puro** | sem etapa de build; servido pelo próprio Express, então um único `npm start` sobe tudo |
| **Camadas rota → service → repository** | regras de negócio separadas do HTTP e do SQL, mais fáceis de testar e alterar |

## Cronograma do grupo

| Semana | Entrega | Situação |
| --- | --- | --- |
| 1 | Tema, requisitos, modelo de dados, endpoints, repositório | ✅ |
| 2 | API inicial + primeiros testes TDD | ✅ |
| 3 | Interface integrada com CRUD | ✅ |
| 4 | Mais testes, validações, refatoração, merges | em andamento |
| 5 | Ajustes finais, documentação, apresentação | a fazer |

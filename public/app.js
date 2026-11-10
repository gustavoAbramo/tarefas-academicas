import { api, ErroApi, observarRespostas } from './api.js';

const $ = (seletor) => document.querySelector(seletor);

const form = $('#form-tarefa');
const lista = $('#lista');
const template = $('#tpl-tarefa');
const filtros = {
  busca: $('#filtro-busca'),
  status: $('#filtro-status'),
  prioridade: $('#filtro-prioridade'),
  atrasadas: $('#filtro-atrasadas'),
};

const ROTULO_PRIORIDADE = { alta: 'Prioridade alta', media: 'Prioridade média', baixa: 'Prioridade baixa' };
const ORDEM_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };

// ---------- utilidades ----------

function hojeLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function textoPrazo(tarefa) {
  if (tarefa.status === 'concluida') return `Prazo ${formatarData(tarefa.prazo)}`;
  const dias = Math.round((new Date(tarefa.prazo) - new Date(hojeLocal())) / 86400000);
  if (tarefa.atrasada) return `Atrasada · ${formatarData(tarefa.prazo)}`;
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `${formatarData(tarefa.prazo)} · em ${dias} dias`;
}

function compararTarefas(a, b) {
  const aConcluida = a.status === 'concluida';
  const bConcluida = b.status === 'concluida';
  if (aConcluida !== bConcluida) return Number(aConcluida) - Number(bConcluida);
  if (a.atrasada !== b.atrasada) return Number(b.atrasada) - Number(a.atrasada);
  return a.prazo.localeCompare(b.prazo)
    || ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade];
}

let timerToast;
function avisar(mensagem, tipo = 'ok') {
  const toast = $('#toast');
  toast.textContent = mensagem;
  toast.className = `toast toast--visivel${tipo === 'erro' ? ' toast--erro' : ''}`;
  clearTimeout(timerToast);
  timerToast = setTimeout(() => (toast.className = 'toast'), 3000);
}

function tratarErro(erro) {
  if (erro instanceof ErroApi) {
    avisar(`${erro.status} · ${erro.message}`, 'erro');
  } else {
    avisar('Não foi possível falar com a API. O servidor está rodando?', 'erro');
  }
}

// ---------- resumo e lista ----------

async function carregarResumo() {
  const resumo = await api.resumo();
  for (const [chave, valor] of Object.entries(resumo)) {
    const el = document.getElementById(`r-${chave}`);
    if (el) el.textContent = valor;
  }
}

function renderizarTarefa(tarefa) {
  const item = template.content.firstElementChild.cloneNode(true);
  item.dataset.id = tarefa.id;
  item.classList.add(`tarefa--${tarefa.prioridade}`);
  if (tarefa.status === 'concluida') item.classList.add('tarefa--concluida');

  item.querySelector('.tarefa__titulo').textContent = tarefa.titulo;
  item.querySelector('.tarefa__meta').textContent = tarefa.disciplina;
  item.querySelector('.tarefa__descricao').textContent = tarefa.descricao;

  const check = item.querySelector('.tarefa__check');
  const concluida = tarefa.status === 'concluida';
  check.textContent = concluida ? '✓' : '';
  check.setAttribute('aria-label', concluida ? 'Reabrir tarefa' : 'Marcar como concluída');
  check.addEventListener('click', () => alterarStatus(tarefa.id, concluida ? 'pendente' : 'concluida'));

  const prioridade = item.querySelector('.chip--prioridade');
  prioridade.textContent = ROTULO_PRIORIDADE[tarefa.prioridade];
  prioridade.classList.add(`chip--${tarefa.prioridade}`);

  const prazo = item.querySelector('.chip--prazo');
  prazo.textContent = textoPrazo(tarefa);
  if (tarefa.atrasada) prazo.classList.add('chip--atrasada');
  else if (!concluida && tarefa.prazo === hojeLocal()) prazo.classList.add('chip--hoje');

  const status = item.querySelector('.tarefa__status');
  status.value = tarefa.status;
  status.addEventListener('change', () => alterarStatus(tarefa.id, status.value));

  item.querySelector('[data-acao="editar"]').addEventListener('click', () => iniciarEdicao(tarefa));
  item.querySelector('[data-acao="excluir"]').addEventListener('click', () => excluir(tarefa));
  return item;
}

let disciplinasConhecidas = new Set();

async function carregarTarefas() {
  const tarefas = await api.listar({
    busca: filtros.busca.value.trim(),
    status: filtros.status.value,
    prioridade: filtros.prioridade.value,
    atrasadas: filtros.atrasadas.checked ? 'true' : '',
  });
  lista.replaceChildren(...[...tarefas].sort(compararTarefas).map(renderizarTarefa));
  $('#vazio').hidden = tarefas.length > 0;

  for (const t of tarefas) if (t.disciplina) disciplinasConhecidas.add(t.disciplina);
  $('#disciplinas').replaceChildren(
    ...[...disciplinasConhecidas].sort().map((d) => Object.assign(document.createElement('option'), { value: d })),
  );
}

async function atualizarTela() {
  try {
    await Promise.all([carregarResumo(), carregarTarefas()]);
  } catch (erro) {
    tratarErro(erro);
  }
}

// ---------- ações ----------

async function alterarStatus(id, status) {
  try {
    await api.atualizar(id, { status });
    avisar(status === 'concluida' ? 'Tarefa concluída 🎉' : 'Status atualizado');
    await atualizarTela();
  } catch (erro) {
    tratarErro(erro);
  }
}

async function excluir(tarefa) {
  if (!confirm(`Excluir a tarefa "${tarefa.titulo}"?`)) return;
  try {
    await api.excluir(tarefa.id);
    if (form.elements.id.value === String(tarefa.id)) sairDaEdicao();
    avisar('Tarefa excluída');
    await atualizarTela();
  } catch (erro) {
    tratarErro(erro);
  }
}

// ---------- formulário (criar / editar) ----------

function limparErros() {
  form.querySelectorAll('[data-erro]').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('.campo--invalido').forEach((el) => el.classList.remove('campo--invalido'));
  $('#form-erro').textContent = '';
}

function mostrarErros(detalhes) {
  for (const { campo, mensagem } of detalhes) {
    const alvo = form.querySelector(`[data-erro="${campo}"]`);
    if (alvo) {
      alvo.textContent = mensagem;
      alvo.closest('.campo').classList.add('campo--invalido');
    } else {
      $('#form-erro').textContent = mensagem;
    }
  }
  form.querySelector('.campo--invalido input')?.focus();
}

function iniciarEdicao(tarefa) {
  limparErros();
  for (const campo of ['id', 'titulo', 'disciplina', 'prazo', 'prioridade', 'status', 'descricao']) {
    form.elements[campo].value = tarefa[campo] ?? '';
  }
  $('#form-titulo').textContent = 'Editar tarefa';
  $('#botao-salvar').textContent = 'Salvar alterações';
  $('#botao-cancelar').hidden = false;
  $('#campo-status').hidden = false;
  form.elements.prazo.removeAttribute('min');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.elements.titulo.focus({ preventScroll: true });
}

function sairDaEdicao() {
  form.reset();
  form.elements.id.value = '';
  limparErros();
  $('#form-titulo').textContent = 'Nova tarefa';
  $('#botao-salvar').textContent = 'Adicionar tarefa';
  $('#botao-cancelar').hidden = true;
  $('#campo-status').hidden = true;
  form.elements.prazo.min = hojeLocal();
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparErros();

  const dados = Object.fromEntries(new FormData(form));
  const id = dados.id;
  delete dados.id;
  if (!id) delete dados.status;

  const botao = $('#botao-salvar');
  botao.disabled = true;
  try {
    if (id) {
      await api.substituir(id, dados);
      avisar('Tarefa atualizada');
    } else {
      await api.criar(dados);
      avisar('Tarefa cadastrada');
    }
    sairDaEdicao();
    await atualizarTela();
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 400 && erro.detalhes.length) {
      mostrarErros(erro.detalhes);
    } else {
      tratarErro(erro);
    }
  } finally {
    botao.disabled = false;
  }
});

$('#botao-cancelar').addEventListener('click', sairDaEdicao);

// ---------- filtros ----------

[filtros.status, filtros.prioridade, filtros.atrasadas].forEach((el) => el.addEventListener('change', atualizarTela));

// A busca é digitada: espera o usuário parar de digitar para não disparar uma requisição por tecla.
let timerBusca;
filtros.busca.addEventListener('input', () => {
  clearTimeout(timerBusca);
  timerBusca = setTimeout(atualizarTela, 300);
});

document.querySelectorAll('.resumo__item').forEach((botao) => {
  botao.addEventListener('click', () => {
    clearTimeout(timerBusca);
    filtros.busca.value = '';
    filtros.status.value = botao.dataset.filtroStatus ?? '';
    filtros.prioridade.value = '';
    filtros.atrasadas.checked = botao.dataset.filtroAtrasadas === 'true';
    atualizarTela();
  });
});

// ---------- painel "últimas requisições à API" (mais recente primeiro) ----------

const historicoApi = [];
observarRespostas(({ metodo, url, enviado, status, recebido }) => {
  const linhas = [`${metodo} ${url}  →  ${status}`];
  if (enviado !== undefined) linhas.push('Enviado:', JSON.stringify(enviado, null, 2));
  linhas.push('Recebido:', recebido === null ? '(sem corpo)' : JSON.stringify(recebido, null, 2));
  historicoApi.unshift(linhas.join('\n'));
  historicoApi.length = Math.min(historicoApi.length, 6);
  $('#api-log').textContent = historicoApi.join('\n\n────────────\n\n');
});

// ---------- início ----------

async function verificarApi() {
  const el = $('#api-status');
  try {
    await api.saude();
    el.textContent = 'API online';
    el.className = 'api-status api-status--ok';
  } catch {
    el.textContent = 'API offline';
    el.className = 'api-status api-status--erro';
  }
}

form.elements.prazo.min = hojeLocal();
verificarApi();
atualizarTela();

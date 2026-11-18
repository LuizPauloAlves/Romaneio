// Digitação dos clientes um a um, sem planilha. O botão "+ Adicionar cliente" cria uma linha embaixo.
// A lista fica salva neste navegador até ser limpa (não se perde se a página recarregar).
// Enter num campo pula para o próximo cliente; no último, cria um novo.

import { PAYMENT_CHOICES, create_empty_entry } from '../parsing/manual_entries.js';
import { get_manual_entry, save_manual_entry } from '../storage/storage_repository.js';
import { escape_html, query } from '../utils/dom_utils.js';

const TEXT_FIELDS = Object.freeze([
  { key: 'client', label: 'Cliente', placeholder: 'Nome do cliente' },
  { key: 'address', label: 'Endereço', placeholder: 'Rua, número, bairro, cidade - UF' },
  { key: 'cep', label: 'CEP', placeholder: 'Opcional' },
  { key: 'packages', label: 'Pacotes', placeholder: 'Ex.: 2 caixas' },
  { key: 'nf', label: 'NF', placeholder: 'Nº da nota' },
]);

export function render_manual_entry(container) {
  const entries = load_entries();
  container.innerHTML = `
    <div class="manual-list">${entries.map(render_entry).join('')}</div>
    <div class="actions">
      <button type="button" class="button" data-manual="add">+ Adicionar cliente</button>
      <button type="button" class="button button--danger" data-manual="clear">Limpar lista</button>
    </div>
    <p class="muted manual-hint">A lista fica salva neste navegador até você limpar. Enter pula para o próximo cliente.</p>`;
  bind_events(container);
}

export function get_manual_entries() {
  return load_entries();
}

function load_entries() {
  const { entries } = get_manual_entry();
  return entries.length > 0 ? entries : [create_empty_entry()];
}

function store_entries(entries) {
  save_manual_entry({ ...get_manual_entry(), entries });
}

function render_entry(entry, index) {
  const inputs = TEXT_FIELDS.map((field) => `
    <label class="manual-field manual-field--${field.key}">
      <span>${field.label}</span>
      <input type="text" data-field="${field.key}" value="${escape_html(entry[field.key] ?? '')}" placeholder="${field.placeholder}" autocomplete="off">
    </label>`).join('');

  const payment = `
    <label class="manual-field manual-field--payment">
      <span>Pagamento</span>
      <select data-field="payment">${PAYMENT_CHOICES.map(([value, label]) =>
        `<option value="${value}" ${entry.payment === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
    </label>`;

  return `
    <div class="manual-row" data-index="${index}">
      <span class="manual-number" aria-hidden="true">${index + 1}</span>
      ${inputs}${payment}
      <button type="button" class="icon-button manual-remove" data-manual="remove" title="Remover cliente" aria-label="Remover cliente ${index + 1}">✕</button>
    </div>`;
}

// Os eventos ficam no container (que não é redesenhado) e são ligados uma única vez;
// a lista de dentro pode ser redesenhada à vontade.
function bind_events(container) {
  if (container.dataset.manualBound) return;
  container.dataset.manualBound = 'true';

  container.addEventListener('input', (event) => update_field(event.target));
  container.addEventListener('change', (event) => update_field(event.target));
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !event.target.matches('.manual-row input')) return;
    event.preventDefault(); // não envia o formulário
    const next = event.target.closest('.manual-row').nextElementSibling;
    if (next) query('[data-field="client"]', next).focus();
    else add_entry(container);
  });

  container.addEventListener('click', (event) => {
    const action = event.target.closest('[data-manual]')?.dataset.manual;
    if (action === 'add') add_entry(container);
    if (action === 'remove') remove_entry(container, Number(event.target.closest('.manual-row').dataset.index));
    if (action === 'clear') clear_entries(container);
  });
}

function update_field(target) {
  const field = target.dataset.field;
  const row = target.closest('.manual-row');
  if (!field || !row) return;
  const entries = load_entries();
  entries[Number(row.dataset.index)][field] = target.value;
  store_entries(entries);
}

function add_entry(container) {
  const entries = [...load_entries(), create_empty_entry()];
  store_entries(entries);
  render_manual_entry(container);
  const rows = container.querySelectorAll('.manual-row');
  query('[data-field="client"]', rows[rows.length - 1]).focus();
}

function remove_entry(container, index) {
  const entries = load_entries().filter((_, position) => position !== index);
  store_entries(entries);
  render_manual_entry(container);
}

function clear_entries(container) {
  if (!window.confirm('Apagar todos os clientes digitados?')) return;
  store_entries([]);
  render_manual_entry(container);
}

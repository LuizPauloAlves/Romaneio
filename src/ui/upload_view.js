// Passo 1: informar as entregas (anexar planilha, colar do Excel ou digitar cliente por cliente)
// e definir data, saída, veículo e tipo de rota.

import { app_state } from './app_state.js';
import { render_stops_view } from './stops_view.js';
import { render_fields, read_fields } from './form_fields.js';
import { render_manual_entry, get_manual_entries } from './manual_entry_view.js';
import { read_romaneio_file, parse_pasted_text, ACCEPTED_EXTENSIONS } from '../parsing/romaneio_file_reader.js';
import { parse_romaneio_rows } from '../parsing/romaneio_table.js';
import { entries_to_rows, describe_manual_row } from '../parsing/manual_entries.js';
import { get_manual_entry, get_settings, get_vehicles, save_manual_entry } from '../storage/storage_repository.js';
import { APP_CONFIG, ROUTE_TYPES, TEMPLATE_FILES } from '../config/app_config.js';
import { ROUTE_OBJECTIVES, DEFAULT_OBJECTIVE } from '../optimization/route_objectives.js';
import { today_iso } from '../utils/time_utils.js';
import { escape_html, query, show_message } from '../utils/dom_utils.js';

const INPUT_MODES = Object.freeze([
  ['file', '📎 Anexar planilha'],
  ['manual', '✍️ Digitar clientes'],
]);

function option_fields() {
  return [
    { key: 'date', label: 'Data da rota', type: 'date', required: true },
    { key: 'departure_time', label: 'Horário de saída', type: 'time', required: true },
    { key: 'vehicle_id', label: 'Veículo', options: get_vehicles().map((vehicle) => [vehicle.id, vehicle.name]) },
    { key: 'type', label: 'Tipo de rota', options: Object.entries(ROUTE_TYPES) },
    { key: 'objective', label: 'Otimizar a rota por', options: Object.entries(ROUTE_OBJECTIVES) },
    { key: 'tolls', label: 'Pedágios previstos', step: '0.01', unit: 'R$' },
    { key: 'freight', label: 'Frete cobrado (opcional)', step: '0.01', unit: 'R$' },
  ];
}

export function render_upload_view() {
  const card = query('#upload_card');
  const defaults = {
    date: today_iso(),
    departure_time: APP_CONFIG.default_departure_time,
    vehicle_id: get_vehicles()[0].id,
    type: 'delivery',
    objective: DEFAULT_OBJECTIVE,
    tolls: 0,
    freight: 0,
    ...app_state.route_options,
  };

  card.innerHTML = `
    <h2><span class="step">1</span> Romaneio e saída</h2>
    <form id="upload_form">
      <div class="input-mode" role="tablist" aria-label="Como informar as entregas">
        ${INPUT_MODES.map(([mode, label]) => `<button type="button" role="tab" data-input-mode="${mode}">${label}</button>`).join('')}
      </div>
      <div data-mode-panel="file">
      <label class="drop-zone" id="drop_zone">
        <input type="file" id="romaneio_file" accept="${ACCEPTED_EXTENSIONS}">
        <strong>Escolha a planilha do romaneio (.xlsx ou .csv)</strong>
        <span id="file_name">ou arraste e solte aqui</span>
      </label>
      <p class="template-links">Modelos para preencher:
        ${TEMPLATE_FILES.map((file) => `<a href="${file.url}" download>${escape_html(file.label)}</a>`).join(' · ')}
      </p>
      <details class="paste-box">
        <summary>Prefiro colar direto do Excel</summary>
        <textarea id="romaneio_paste" rows="6" placeholder="Selecione as linhas no Excel (com o cabeçalho Cliente, Endereço, CEP, Pacotes, NF, Pagamento), copie e cole aqui."></textarea>
      </details>
      </div>
      <div data-mode-panel="manual" id="manual_entry"></div>
      <div class="field-grid">${render_fields(option_fields(), defaults)}</div>
      <div class="actions">
        <button type="submit" class="button button--primary">Ler romaneio</button>
      </div>
    </form>`;

  render_manual_entry(query('#manual_entry', card));
  show_input_mode(card, get_manual_entry().mode);
  bind_events(card);
}

function show_input_mode(card, mode) {
  card.querySelectorAll('[data-input-mode]').forEach((button) => {
    const active = button.dataset.inputMode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  card.querySelectorAll('[data-mode-panel]').forEach((panel) => { panel.hidden = panel.dataset.modePanel !== mode; });
}

function current_mode(card) {
  return query('[data-input-mode].is-active', card)?.dataset.inputMode ?? 'file';
}

function bind_events(card) {
  const form = query('#upload_form', card);
  const file_input = query('#romaneio_file', card);
  const drop_zone = query('#drop_zone', card);

  card.querySelectorAll('[data-input-mode]').forEach((button) => button.addEventListener('click', () => {
    save_manual_entry({ ...get_manual_entry(), mode: button.dataset.inputMode });
    show_input_mode(card, button.dataset.inputMode);
  }));

  file_input.addEventListener('change', () => {
    query('#file_name', card).textContent = file_input.files[0]?.name ?? 'ou arraste e solte aqui';
  });
  drop_zone.addEventListener('dragover', (event) => { event.preventDefault(); drop_zone.classList.add('is-over'); });
  drop_zone.addEventListener('dragleave', () => drop_zone.classList.remove('is-over'));
  drop_zone.addEventListener('drop', (event) => {
    event.preventDefault();
    drop_zone.classList.remove('is-over');
    file_input.files = event.dataTransfer.files;
    file_input.dispatchEvent(new Event('change'));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    let result;
    try {
      result = current_mode(card) === 'manual'
        ? read_manual_entries()
        : await read_input(file_input.files[0], query('#romaneio_paste', card).value);
    } catch (error) {
      return show_message(error.message, 'error');
    }
    if (result.stops.length === 0) {
      const where = current_mode(card) === 'manual' ? 'na lista' : 'na planilha';
      return show_message(`Não encontrei entregas ${where}. Confira se os clientes têm Cliente e Endereço.`, 'error');
    }

    app_state.route_options = read_fields(form, option_fields());
    app_state.draft_stops = result.stops.map(to_draft_stop);
    app_state.import_warnings = result.warnings;
    render_stops_view();
    const warning_note = result.warnings.length > 0 ? ` ${result.warnings.length} aviso(s) para conferir.` : '';
    show_message(`${result.stops.length} entregas lidas. Confira endereços e horários.${warning_note}`, result.warnings.length ? 'error' : 'success');
  });
}

function read_manual_entries() {
  return parse_romaneio_rows(entries_to_rows(get_manual_entries()), { describe_row: describe_manual_row });
}

async function read_input(file, pasted_text) {
  if (file) return read_romaneio_file(file);
  if (pasted_text.trim()) return parse_pasted_text(pasted_text);
  throw new Error('Escolha a planilha do romaneio (.xlsx ou .csv) ou cole as linhas do Excel.');
}

function to_draft_stop(stop) {
  return {
    ...stop,
    window_start: '',
    window_end: '',
    service_minutes: get_settings().default_service_minutes,
    lat: null,
    lng: null,
    formatted_address: '',
    not_found: false,
  };
}

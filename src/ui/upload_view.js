// Passo 1: carregar a planilha do romaneio (ou colar do Excel) e definir data, saída, veículo e tipo de rota.

import { app_state } from './app_state.js';
import { render_stops_view } from './stops_view.js';
import { render_fields, read_fields } from './form_fields.js';
import { read_romaneio_file, parse_pasted_text, ACCEPTED_EXTENSIONS } from '../parsing/romaneio_file_reader.js';
import { get_settings, get_vehicles } from '../storage/storage_repository.js';
import { APP_CONFIG, ROUTE_TYPES, TEMPLATE_FILES } from '../config/app_config.js';
import { today_iso } from '../utils/time_utils.js';
import { escape_html, query, show_message } from '../utils/dom_utils.js';

function option_fields() {
  return [
    { key: 'date', label: 'Data da rota', type: 'date', required: true },
    { key: 'departure_time', label: 'Horário de saída', type: 'time', required: true },
    { key: 'vehicle_id', label: 'Veículo', options: get_vehicles().map((vehicle) => [vehicle.id, vehicle.name]) },
    { key: 'type', label: 'Tipo de rota', options: Object.entries(ROUTE_TYPES) },
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
    tolls: 0,
    freight: 0,
    ...app_state.route_options,
  };

  card.innerHTML = `
    <h2><span class="step">1</span> Romaneio e saída</h2>
    <form id="upload_form">
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
        <textarea id="romaneio_paste" rows="6" placeholder="Selecione as linhas no Excel (com o cabeçalho Cliente, Endereço, CEP, Pacotes, NF, A vista, Boleto), copie e cole aqui."></textarea>
      </details>
      <div class="field-grid">${render_fields(option_fields(), defaults)}</div>
      <div class="actions">
        <button type="submit" class="button button--primary">Ler romaneio</button>
      </div>
    </form>`;

  bind_events(card);
}

function bind_events(card) {
  const form = query('#upload_form', card);
  const file_input = query('#romaneio_file', card);
  const drop_zone = query('#drop_zone', card);

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
      result = await read_input(file_input.files[0], query('#romaneio_paste', card).value);
    } catch (error) {
      return show_message(error.message, 'error');
    }
    if (result.stops.length === 0) return show_message('Não encontrei entregas na planilha. Confira se as linhas têm Cliente e Endereço.', 'error');

    app_state.route_options = read_fields(form, option_fields());
    app_state.draft_stops = result.stops.map(to_draft_stop);
    app_state.import_warnings = result.warnings;
    render_stops_view();
    const warning_note = result.warnings.length > 0 ? ` ${result.warnings.length} aviso(s) na planilha.` : '';
    show_message(`${result.stops.length} entregas lidas. Confira endereços e horários.${warning_note}`, result.warnings.length ? 'error' : 'success');
  });
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

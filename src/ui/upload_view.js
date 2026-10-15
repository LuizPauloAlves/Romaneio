// Passo 1: carregar o .txt (ou colar o texto) e definir data, saída, veículo e tipo de rota.

import { app_state } from './app_state.js';
import { render_stops_view } from './stops_view.js';
import { render_fields, read_fields } from './form_fields.js';
import { parse_romaneio_text, decode_text_file } from '../parsing/txt_parser.js';
import { get_settings, get_vehicles } from '../storage/storage_repository.js';
import { APP_CONFIG, ROUTE_TYPES } from '../config/app_config.js';
import { today_iso } from '../utils/time_utils.js';
import { query, show_message } from '../utils/dom_utils.js';

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
        <input type="file" id="txt_file" accept=".txt,text/plain">
        <strong>Escolha o arquivo .txt</strong>
        <span id="file_name">ou arraste e solte aqui</span>
      </label>
      <details class="paste-box">
        <summary>Prefiro colar o texto</summary>
        <textarea id="txt_paste" rows="6" placeholder="1. CLIENTE – 1 caixa – Pedido 123&#10;Endereço completo"></textarea>
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
  const file_input = query('#txt_file', card);
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
    const text = await read_input_text(file_input, query('#txt_paste', card));
    if (!text.trim()) return show_message('Escolha um arquivo .txt ou cole o texto do romaneio.', 'error');

    const stops = parse_romaneio_text(text);
    if (stops.length === 0) return show_message('Não encontrei endereços no texto. Confira o formato.', 'error');

    app_state.route_options = read_fields(form, option_fields());
    app_state.draft_stops = stops.map(to_draft_stop);
    render_stops_view();
    show_message(`${stops.length} paradas lidas. Confira endereços e horários.`, 'success');
  });
}

async function read_input_text(file_input, paste_area) {
  const file = file_input.files[0];
  if (file) return decode_text_file(await file.arrayBuffer());
  return paste_area.value;
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

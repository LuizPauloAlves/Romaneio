// Configurações: base, senha de acesso, tempo de parada, veículos e custos, backup.

import { render_fields, read_fields } from './form_fields.js';
import { render_upload_view } from './upload_view.js';
import { open_map_picker } from './map_picker.js';
import { geocode, forget_cached_address, save_manual_location } from '../maps/geocoder.js';
import { download_backup, restore_backup } from '../storage/backup_service.js';
import { get_settings, get_vehicles, save_settings, save_vehicles } from '../storage/storage_repository.js';
import { COST_SOURCES, DEFAULT_VEHICLE, FUEL_REFERENCES } from '../config/default_costs.js';
import { escape_html, generate_id, query, set_busy, show_message } from '../utils/dom_utils.js';
import { to_number } from '../utils/format_utils.js';

const VEHICLE_SECTIONS = [
  {
    title: 'Veículo e combustível',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true, wide: true },
      { key: 'fuel_type', label: 'Combustível', options: [['gasolina', 'Gasolina'], ['etanol', 'Etanol'], ['diesel', 'Diesel']] },
      { key: 'fuel_price', label: 'Preço do litro', step: '0.01', unit: 'R$' },
      { key: 'km_per_liter', label: 'Consumo de referência', step: '0.1', unit: 'km/l' },
    ],
  },
  {
    title: 'Manutenção (por km rodado)',
    fields: [
      { key: 'preventive_per_km', label: 'Preventiva', step: '0.001', unit: 'R$/km', hint: 'Óleo, filtros, revisões' },
      { key: 'predictive_per_km', label: 'Preditiva', step: '0.001', unit: 'R$/km', hint: 'Correia, freios, suspensão' },
      { key: 'corrective_per_km', label: 'Corretiva (reserva)', step: '0.001', unit: 'R$/km', hint: 'Quebras e imprevistos' },
      { key: 'tires_set_price', label: 'Jogo de 4 pneus', step: '1', unit: 'R$' },
      { key: 'tires_life_km', label: 'Vida útil dos pneus', step: '1000', unit: 'km' },
    ],
  },
  {
    title: 'Custos fixos (por ano)',
    fields: [
      { key: 'insurance_year', label: 'Seguro', step: '1', unit: 'R$' },
      { key: 'ipva_year', label: 'IPVA', step: '1', unit: 'R$' },
      { key: 'licensing_year', label: 'Licenciamento', step: '1', unit: 'R$' },
      { key: 'tracker_year', label: 'Rastreador', step: '1', unit: 'R$' },
      { key: 'vehicle_value', label: 'Valor do veículo (FIPE)', step: '100', unit: 'R$' },
      { key: 'depreciation_rate', label: 'Depreciação anual', step: '0.01', hint: '0,03 = 3% ao ano' },
      { key: 'km_per_year', label: 'KM rodados por ano', step: '500', unit: 'km', hint: 'Divide os custos fixos por km' },
    ],
  },
  {
    title: 'Mão de obra',
    fields: [
      { key: 'driver_cost_hour', label: 'Custo do motorista', step: '0.5', unit: 'R$/h', hint: 'Coloque 0 se não quiser incluir' },
    ],
  },
];

const ALL_VEHICLE_FIELDS = VEHICLE_SECTIONS.flatMap((section) => section.fields);

export function render_settings_view() {
  const panel = query('#tab_settings');
  const settings = get_settings();

  panel.innerHTML = `
    <form class="card" id="general_form">
      <h2>Base e preferências</h2>
      <div class="field-grid">
        <label class="field field--wide"><span>Endereço da base (saída e chegada)</span>
          <div class="field-input"><input name="base_address" type="text" value="${escape_html(settings.base.address)}" required></div>
          <small id="base_status">${describe_base(settings.base)}</small>
        </label>
        <label class="field"><span>Tempo padrão por parada</span>
          <div class="field-input"><input name="default_service_minutes" type="number" min="0" value="${settings.default_service_minutes}"><em>min</em></div>
        </label>
        <label class="field"><span>Senha de acesso (só se definida na Vercel)</span>
          <div class="field-input"><input name="access_token" type="password" value="${escape_html(settings.access_token ?? '')}" autocomplete="off"></div>
          <small>Usada apenas na busca extra pelo Google. Deixe vazio se não definiu senha.</small>
        </label>
      </div>
      <div class="actions">
        <button type="button" class="button" id="locate_base_button">Localizar base</button>
        <button type="button" class="button" id="pick_base_button">📍 Marcar base no mapa</button>
        <button type="submit" class="button button--primary">Salvar</button>
      </div>
    </form>

    <div id="vehicles_container">${get_vehicles().map(render_vehicle_form).join('')}</div>
    <div class="actions"><button type="button" class="button" id="add_vehicle_button">+ Adicionar veículo</button></div>

    <div class="card">
      <h2>Backup dos dados</h2>
      <p class="muted">Os dados ficam salvos neste navegador. Faça backup de vez em quando para não perder o histórico.</p>
      <div class="actions">
        <button type="button" class="button" id="export_button">Baixar backup (.json)</button>
        <label class="button">Restaurar backup<input type="file" id="import_input" accept=".json" hidden></label>
      </div>
    </div>

    <div class="card">
      <h2>Fontes dos valores de referência</h2>
      <ul class="sources">${COST_SOURCES.map((source) => `<li>${escape_html(source)}</li>`).join('')}</ul>
    </div>`;

  bind_events(panel);
}

function render_vehicle_form(vehicle) {
  const sections = VEHICLE_SECTIONS.map((section) => `
    <fieldset><legend>${section.title}</legend>
      <div class="field-grid">${render_fields(section.fields, vehicle)}</div>
    </fieldset>`).join('');

  return `
    <form class="card vehicle-form" data-vehicle-id="${vehicle.id}">
      <h2>${escape_html(vehicle.name)}</h2>
      ${sections}
      <div class="actions">
        <button type="submit" class="button button--primary">Salvar veículo</button>
        <button type="button" class="button button--danger" data-remove-vehicle="${vehicle.id}">Remover</button>
      </div>
    </form>`;
}

function bind_events(panel) {
  query('#general_form', panel).addEventListener('submit', (event) => {
    event.preventDefault();
    save_general_settings(event.target);
    show_message('Configurações salvas.', 'success');
  });

  query('#locate_base_button', panel).addEventListener('click', (event) => locate_base_address(event.target, panel));
  query('#pick_base_button', panel).addEventListener('click', () => pick_base_on_map(panel));

  query('#vehicles_container', panel).addEventListener('submit', (event) => {
    event.preventDefault();
    save_vehicle(event.target);
  });
  query('#vehicles_container', panel).addEventListener('change', (event) => {
    if (event.target.name === 'fuel_type') apply_fuel_reference(event.target.form, event.target.value);
  });
  query('#vehicles_container', panel).addEventListener('click', (event) => {
    if (event.target.dataset.removeVehicle) remove_vehicle(event.target.dataset.removeVehicle);
  });

  query('#add_vehicle_button', panel).addEventListener('click', add_vehicle);
  query('#export_button', panel).addEventListener('click', download_backup);
  query('#import_input', panel).addEventListener('change', (event) => import_backup(event.target.files[0]));
}

function save_general_settings(form) {
  const settings = get_settings();
  const new_address = form.elements.base_address.value.trim();
  const base = new_address === settings.base.address ? settings.base : { address: new_address, lat: null, lng: null, formatted_address: '', approximate: false };
  save_settings({
    ...settings,
    base,
    default_service_minutes: to_number(form.elements.default_service_minutes.value, 10),
    access_token: form.elements.access_token.value.trim(),
  });
}

async function locate_base_address(button, panel) {
  const form = query('#general_form', panel);
  save_general_settings(form);
  set_busy(button, true, 'Localizando…');
  try {
    const settings = get_settings();
    forget_cached_address(settings.base.address);
    const location = await geocode(settings.base.address);
    if (!location) throw new Error('Endereço da base não encontrado. Tente colar as coordenadas.');
    save_settings({ ...settings, base: { ...settings.base, ...location } });
    query('#base_status', panel).textContent = describe_base(location);
  } catch (error) {
    show_message(error.message, 'error');
  } finally {
    set_busy(button, false);
  }
}

async function pick_base_on_map(panel) {
  save_general_settings(query('#general_form', panel));
  const settings = get_settings();
  const picked = await open_map_picker({ title: 'Base (saída e chegada)', address: settings.base.address, start_point: settings.base });
  if (!picked) return;
  const location = save_manual_location(settings.base.address, picked);
  save_settings({ ...settings, base: { ...settings.base, ...location } });
  query('#base_status', panel).textContent = describe_base(location);
  show_message('Local da base salvo.', 'success');
}

function describe_base(base) {
  if (base.lat == null) return 'Ainda não localizado. Use "Marcar base no mapa" para mais precisão.';
  if (base.approximate) return '⚠ Aproximado (só a cidade). Marque a base no mapa.';
  return `✓ ${base.formatted_address}`;
}

function apply_fuel_reference(form, fuel_type) {
  const reference = FUEL_REFERENCES[fuel_type];
  if (!reference) return;
  form.elements.fuel_price.value = reference.price_per_liter;
  form.elements.km_per_liter.value = reference.km_per_liter;
}

function save_vehicle(form) {
  const vehicle_id = form.dataset.vehicleId;
  const updated = { id: vehicle_id, ...read_fields(form, ALL_VEHICLE_FIELDS) };
  save_vehicles(get_vehicles().map((vehicle) => (vehicle.id === vehicle_id ? updated : vehicle)));
  refresh_dependent_views();
  show_message(`Veículo "${updated.name}" salvo.`, 'success');
}

function add_vehicle() {
  save_vehicles([...get_vehicles(), { ...DEFAULT_VEHICLE, id: generate_id('veiculo'), name: 'Novo veículo' }]);
  refresh_dependent_views();
}

function remove_vehicle(vehicle_id) {
  const vehicles = get_vehicles();
  if (vehicles.length === 1) return show_message('É preciso ter pelo menos um veículo.', 'error');
  if (!window.confirm('Remover este veículo?')) return;
  save_vehicles(vehicles.filter((vehicle) => vehicle.id !== vehicle_id));
  refresh_dependent_views();
}

async function import_backup(file) {
  if (!file) return;
  try {
    await restore_backup(file);
    refresh_dependent_views();
    show_message('Backup restaurado.', 'success');
  } catch (error) {
    show_message(error.message, 'error');
  }
}

function refresh_dependent_views() {
  render_settings_view();
  render_upload_view();
}

// Passo 2: revisar paradas (endereço, janela de horário, tempo de parada) e calcular a rota.

import { app_state } from './app_state.js';
import { render_route_view } from './route_view.js';
import { locate_stops, plan_route } from '../services/route_planner.js';
import { open_map_picker } from './map_picker.js';
import { save_manual_location } from '../maps/geocoder.js';
import { find_vehicle, get_settings } from '../storage/storage_repository.js';
import { escape_html, query, set_busy, show_message } from '../utils/dom_utils.js';
import { to_number } from '../utils/format_utils.js';

export function render_stops_view() {
  const card = query('#stops_card');
  card.hidden = false;
  card.innerHTML = `
    <h2><span class="step">2</span> Paradas <small class="muted">(${app_state.draft_stops.length})</small></h2>
    <p class="muted">Endereços <strong>não encontrados</strong> ou <strong>aproximados</strong> (só a cidade) devem ser marcados no mapa pelo botão 📍.
      O local marcado fica salvo: na próxima vez esse endereço já é encontrado.
      Preencha a janela só para quem tem horário de recebimento.</p>
    <div class="table-scroll">
      <table class="edit-table">
        <thead><tr><th>#</th><th>Cliente</th><th>Endereço</th><th>Recebe de</th><th>até</th><th>Parada</th><th>Local</th><th></th></tr></thead>
        <tbody>${app_state.draft_stops.map(render_row).join('')}</tbody>
      </table>
    </div>
    <div class="actions">
      <button type="button" class="button" id="locate_button">Localizar endereços</button>
      <button type="button" class="button button--primary" id="plan_button">Calcular melhor rota</button>
    </div>`;

  bind_events(card);
}

function render_row(stop, index) {
  return `
    <tr data-index="${index}">
      <td class="num">${stop.sequence}</td>
      <td><strong>${escape_html(stop.client || '—')}</strong>${stop.details ? `<br><small>${escape_html(stop.details)}</small>` : ''}</td>
      <td><textarea data-field="address" rows="2">${escape_html(stop.address)}</textarea></td>
      <td><input data-field="window_start" type="time" value="${stop.window_start}"></td>
      <td><input data-field="window_end" type="time" value="${stop.window_end}"></td>
      <td><div class="field-input field-input--small"><input data-field="service_minutes" type="number" min="0" value="${stop.service_minutes}"><em>min</em></div></td>
      <td class="status-cell">${render_status(stop)}</td>
      <td class="row-buttons">
        <button type="button" class="icon-button icon-button--map" data-pick="${index}" title="Marcar no mapa" aria-label="Marcar no mapa">📍</button>
        <button type="button" class="icon-button" data-remove="${index}" title="Remover parada" aria-label="Remover parada">✕</button>
      </td>
    </tr>`;
}

function render_status(stop) {
  if (stop.not_found) return `<span class="badge badge--error" title="${escape_html(stop.error ?? '')}">Não encontrado</span>`;
  if (stop.lat != null && stop.approximate) {
    return `<span class="badge badge--warn">Aproximado</span> <small>só a cidade foi encontrada, marque no mapa 📍</small>`;
  }
  if (stop.lat != null) return `<span class="badge badge--ok">✓</span> <small>${escape_html(stop.formatted_address)}</small>`;
  return '<span class="badge">Pendente</span>';
}

function bind_events(card) {
  card.querySelector('tbody').addEventListener('change', (event) => {
    const row = event.target.closest('tr');
    const field = event.target.dataset.field;
    if (!row || !field) return;
    update_stop(Number(row.dataset.index), field, event.target.value);
  });

  card.querySelector('tbody').addEventListener('click', (event) => {
    const { remove, pick } = event.target.dataset;
    if (pick != null) return pick_on_map(Number(pick));
    if (remove == null) return;
    app_state.draft_stops.splice(Number(remove), 1);
    render_stops_view();
  });

  query('#locate_button', card).addEventListener('click', (event) => run_locate(event.target));
  query('#plan_button', card).addEventListener('click', (event) => run_plan(event.target));
}

function update_stop(index, field, value) {
  const stop = app_state.draft_stops[index];
  if (field === 'service_minutes') {
    stop.service_minutes = to_number(value, 0);
    return;
  }
  stop[field] = value;
  if (field === 'address') {
    Object.assign(stop, { lat: null, lng: null, formatted_address: '', approximate: false, not_found: false, error: undefined });
    render_status_cell(index);
  }
}

function render_status_cell(index) {
  const cell = query(`#stops_card tr[data-index="${index}"] .status-cell`);
  if (cell) cell.innerHTML = render_status(app_state.draft_stops[index]);
}

async function pick_on_map(index) {
  const stop = app_state.draft_stops[index];
  const start_point = stop.lat != null ? stop : get_settings().base;
  const picked = await open_map_picker({ title: stop.client || `Parada ${stop.sequence}`, address: stop.address, start_point });
  if (!picked) return;
  Object.assign(stop, save_manual_location(stop.address, picked), { not_found: false, error: undefined });
  render_status_cell(index);
}

// Mostra o progresso no botão: o OpenStreetMap aceita 1 consulta por segundo.
function locate_with_progress(button) {
  const total = app_state.draft_stops.length;
  return locate_stops(app_state.draft_stops, (index) => {
    render_status_cell(index);
    button.textContent = `Localizando ${index + 1}/${total}…`;
  });
}

async function run_locate(button) {
  set_busy(button, true, 'Localizando…');
  try {
    await locate_with_progress(button);
    report_location_problems();
  } catch (error) {
    show_message(error.message, 'error');
  } finally {
    set_busy(button, false);
  }
}

async function run_plan(button) {
  set_busy(button, true, 'Localizando…');
  try {
    await locate_with_progress(button);
    button.textContent = 'Calculando rota…';
    const options = app_state.route_options;
    app_state.current_route = await plan_route({
      stops: app_state.draft_stops,
      vehicle: find_vehicle(options.vehicle_id),
      departure_time: options.departure_time,
      date: options.date,
      type: options.type,
      tolls: options.tolls,
      freight: options.freight,
    });
    render_route_view(app_state.current_route);
    report_location_problems();
  } catch (error) {
    show_message(error.message, 'error');
  } finally {
    set_busy(button, false);
  }
}

function report_location_problems() {
  const missing = app_state.draft_stops.filter((stop) => stop.not_found).length;
  const approximate = app_state.draft_stops.filter((stop) => stop.approximate).length;
  const problems = [
    missing && `${missing} não encontrado(s) ficaram fora da rota`,
    approximate && `${approximate} aproximado(s) (só a cidade)`,
  ].filter(Boolean);
  if (problems.length > 0) show_message(`${problems.join(' e ')}. Marque no mapa 📍 e calcule de novo.`, 'error');
}

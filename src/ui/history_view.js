// Histórico de rotas: lançar gasto real, comparar com o previsto, reenviar links e imprimir.

import { render_links_block, bind_route_actions } from './route_actions.js';
import { render_fields, read_fields } from './form_fields.js';
import { render_comparison_table } from '../reports/cost_tables.js';
import { compute_real_cost, compute_learned_km_per_liter } from '../costs/real_cost_calculator.js';
import { APP_CONFIG, ROUTE_TYPES } from '../config/app_config.js';
import { delete_route, find_route, find_vehicle, get_routes, get_vehicles, save_route } from '../storage/storage_repository.js';
import { format_currency, format_date, format_km, format_number } from '../utils/format_utils.js';
import { escape_html, query, show_message } from '../utils/dom_utils.js';

const REAL_FIELDS = [
  { key: 'km_start', label: 'KM inicial (hodômetro)', step: '1', required: true },
  { key: 'km_end', label: 'KM final (hodômetro)', step: '1', required: true },
  { key: 'fuel_spent', label: 'Combustível gasto', step: '0.01', unit: 'R$', required: true },
  { key: 'fuel_price_paid', label: 'Preço do litro pago', step: '0.01', unit: 'R$/l' },
  { key: 'start_time', label: 'Carro ligado às', type: 'time', required: true },
  { key: 'end_time', label: 'Carro desligado às', type: 'time', required: true },
  { key: 'tolls', label: 'Pedágios pagos', step: '0.01', unit: 'R$' },
  { key: 'other_costs', label: 'Outros gastos (estacionamento, lanche…)', step: '0.01', unit: 'R$' },
];

export function render_history_view() {
  const panel = query('#tab_history');
  const routes = get_routes();

  panel.innerHTML = `
    <div class="card">
      <h2>Histórico de rotas</h2>
      ${render_learning_summary(routes)}
      ${routes.length === 0 ? '<p class="muted">Nenhuma rota salva ainda. Calcule uma rota e clique em “Salvar no histórico”.</p>' : ''}
    </div>
    ${routes.map(render_route_card).join('')}`;

  bind_events(panel);
}

function render_learning_summary(routes) {
  const lines = get_vehicles().map((vehicle) => {
    const learned = compute_learned_km_per_liter({ routes, vehicle_id: vehicle.id, window: APP_CONFIG.learning_window });
    return learned
      ? `<li><strong>${escape_html(vehicle.name)}</strong>: consumo real médio de ${format_number(learned, 2)} km/l (usado nas próximas estimativas)</li>`
      : `<li><strong>${escape_html(vehicle.name)}</strong>: sem gasto real lançado, estimativas usam ${format_number(vehicle.km_per_liter, 1)} km/l</li>`;
  });
  return `<ul class="learning-list">${lines.join('')}</ul>`;
}

function render_route_card(route) {
  const status = route.real_result
    ? `<span class="badge badge--ok">Real: ${format_currency(route.real_result.total)}</span>`
    : '<span class="badge">Falta gasto real</span>';

  return `
    <details class="card route-card" data-route-id="${route.id}">
      <summary>
        <div>
          <strong>${format_date(route.date)} · ${ROUTE_TYPES[route.type] ?? ''}</strong>
          <small>${escape_html(route.vehicle_name)} · ${route.stops.length} paradas · ${format_km(route.summary.distance_km)}
            · previsto ${format_currency(route.estimate.total)}</small>
        </div>
        ${status}
      </summary>
      <div class="route-card-body">
        <h3>Links</h3>
        ${render_links_block(route)}
        ${route.real_result ? `<h3>Previsto × real</h3>${render_comparison_table(route.estimate, route.real_result)}` : ''}
        <h3>${route.real ? 'Corrigir gasto real' : 'Lançar gasto real'}</h3>
        <form class="real-form">
          <div class="field-grid">${render_fields(REAL_FIELDS, route.real ?? default_real_values(route))}</div>
          <div class="actions">
            <button type="submit" class="button button--primary">Salvar gasto real</button>
            <button type="button" class="button button--danger" data-delete="${route.id}">Excluir rota</button>
          </div>
        </form>
      </div>
    </details>`;
}

function default_real_values(route) {
  return {
    fuel_price_paid: find_vehicle(route.vehicle_id).fuel_price,
    start_time: route.departure_time,
    end_time: route.summary.return_time,
    tolls: route.tolls,
    other_costs: 0,
  };
}

function bind_events(panel) {
  bind_route_actions(panel, (target) => find_route(target.closest('[data-route-id]')?.dataset.routeId));
  if (panel.dataset.historyBound) return;
  panel.dataset.historyBound = 'true';

  panel.addEventListener('submit', (event) => {
    if (!event.target.matches('.real-form')) return;
    event.preventDefault();
    const route_id = event.target.closest('[data-route-id]').dataset.routeId;
    save_real_data(route_id, read_fields(event.target, REAL_FIELDS));
  });

  panel.addEventListener('click', (event) => {
    const route_id = event.target.dataset.delete;
    if (!route_id || !window.confirm('Excluir esta rota do histórico?')) return;
    delete_route(route_id);
    render_history_view();
  });
}

function save_real_data(route_id, real) {
  if (real.km_end <= real.km_start) return show_message('O KM final precisa ser maior que o inicial.', 'error');

  const route = find_route(route_id);
  const real_result = compute_real_cost({ vehicle: find_vehicle(route.vehicle_id), real });
  save_route({ ...route, real, real_result });
  render_history_view();
  query(`[data-route-id="${route_id}"]`)?.setAttribute('open', '');
  show_message(`Gasto real salvo: ${format_currency(real_result.total)} (${format_number(real_result.km_per_liter ?? 0, 2)} km/l).`, 'success');
}

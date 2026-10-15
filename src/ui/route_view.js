// Passo 3: resultado da rota (ordem, horários, links, custo previsto) e salvar no histórico.

import { app_state } from './app_state.js';
import { render_links_block, bind_route_actions } from './route_actions.js';
import { render_history_view } from './history_view.js';
import { render_route_map } from './route_map.js';
import { render_stops_table } from '../reports/report_builder.js';
import { render_cost_table } from '../reports/cost_tables.js';
import { find_route, save_route } from '../storage/storage_repository.js';
import { format_currency, format_duration, format_km, format_number } from '../utils/format_utils.js';
import { escape_html, query, show_message } from '../utils/dom_utils.js';

export function render_route_view(route) {
  const card = query('#route_card');
  card.hidden = false;
  card.innerHTML = `
    <h2><span class="step">3</span> Rota otimizada</h2>
    ${render_summary(route)}
    ${render_warnings(route)}
    <h3>Mapa da rota</h3>
    <div class="route-map" id="route_map"><p class="muted">Carregando mapa…</p></div>
    <h3>Ordem das paradas</h3>
    <div class="table-scroll">${render_stops_table(route.stops)}</div>
    <h3>Links para o entregador</h3>
    ${render_links_block(route)}
    <h3>Custo previsto</h3>
    <p class="muted">Consumo: ${format_number(route.estimate.km_per_liter, 2)} km/l
      ${route.estimate.uses_learned_consumption ? '— média das últimas rotas reais' : '— referência do veículo (atualiza quando você lançar gastos reais)'}</p>
    ${render_cost_table(route.estimate, route.freight)}
    <div class="actions">
      <button type="button" class="button button--primary" id="save_route_button">${find_route(route.id) ? 'Rota salva ✓' : 'Salvar no histórico'}</button>
    </div>`;

  bind_route_actions(card, () => app_state.current_route);
  render_route_map(query('#route_map', card), route);
  query('#save_route_button', card).addEventListener('click', (event) => {
    save_route(route);
    event.target.textContent = 'Rota salva ✓';
    render_history_view();
    show_message('Rota salva. Lance o gasto real no Histórico ao final do dia.', 'success');
  });
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function render_summary(route) {
  const stats = [
    ['Distância', format_km(route.summary.distance_km)],
    ['Tempo total', format_duration(route.summary.total_minutes)],
    ['Volta prevista', route.summary.return_time],
    ['Custo previsto', format_currency(route.estimate.total)],
  ];
  return `<div class="stats">${stats.map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
}

function render_warnings(route) {
  const warnings = [
    ...route.stops.filter((stop) => stop.late_minutes > 0)
      .map((stop) => `${escape_html(stop.client || stop.address)}: chegada ${stop.arrival_time}, limite ${stop.window_end} (${stop.late_minutes} min de atraso)`),
    ...route.stops.filter((stop) => stop.approximate)
      .map((stop) => `${escape_html(stop.client || stop.address)}: local aproximado (centro da cidade), marque no mapa 📍 e recalcule`),
    ...route.skipped_stops.map((stop) => `${escape_html(stop.client || stop.address)}: endereço não encontrado, ficou fora da rota`),
  ];
  if (warnings.length === 0) return '';
  return `<div class="warning-box"><strong>Atenção</strong><ul>${warnings.map((text) => `<li>${text}</li>`).join('')}</ul></div>`;
}

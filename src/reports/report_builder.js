// Relatório para impressão / PDF: romaneio do entregador + custos (previsto e, se houver, real).

import { ROUTE_TYPES } from '../config/app_config.js';
import { COST_SOURCES } from '../config/default_costs.js';
import { render_cost_table, render_comparison_table } from './cost_tables.js';
import { format_date, format_km, format_duration, format_number } from '../utils/format_utils.js';
import { escape_html } from '../utils/dom_utils.js';

export function build_route_report_html(route) {
  return `
    <article class="report">
      <header class="report-header">
        <h1>Romaneio · ${format_date(route.date)}</h1>
        <p>${ROUTE_TYPES[route.type] ?? ''} · ${escape_html(route.vehicle_name)} · Saída ${route.departure_time}
          · Volta prevista ${route.summary.return_time}</p>
        <p>${route.stops.length} paradas · ${format_km(route.summary.distance_km)} · ${format_duration(route.summary.total_minutes)} no total
          (${format_duration(route.summary.driving_minutes)} dirigindo)</p>
      </header>

      <section>
        <h2>Paradas na ordem</h2>
        ${render_stops_table(route.stops)}
      </section>

      <section>
        <h2>Links do Google Maps</h2>
        <ol class="report-links">${route.links.map((link) => `<li><strong>${escape_html(link.label)}</strong><br><span class="url">${escape_html(link.url)}</span></li>`).join('')}</ol>
      </section>

      <section class="page-break">
        <h2>Custo previsto</h2>
        <p class="muted">Consumo usado: ${format_number(route.estimate.km_per_liter, 2)} km/l
          ${route.estimate.uses_learned_consumption ? '(média das últimas rotas reais)' : '(referência do veículo)'}</p>
        ${render_cost_table(route.estimate, route.freight)}
      </section>

      ${route.real_result ? render_real_section(route) : ''}

      <footer class="report-footer">
        <p>Fontes dos valores de referência:</p>
        <ul>${COST_SOURCES.map((source) => `<li>${escape_html(source)}</li>`).join('')}</ul>
      </footer>
    </article>`;
}

export function render_stops_table(stops) {
  const rows = stops.map((stop) => `
    <tr class="${stop.late_minutes > 0 ? 'late' : ''}">
      <td class="num">${stop.position}</td>
      <td><strong>${escape_html(stop.client || '—')}</strong>
        ${stop.details ? `<br><small>${escape_html(stop.details)}</small>` : ''}</td>
      <td>${escape_html(stop.address)}</td>
      <td class="num">${stop.arrival_time}${stop.wait_minutes > 0 ? `<br><small>espera ${stop.wait_minutes} min</small>` : ''}</td>
      <td class="num">${describe_window(stop)}${stop.late_minutes > 0 ? `<br><small class="worse">atraso ${stop.late_minutes} min</small>` : ''}</td>
    </tr>`).join('');

  return `
    <table class="stops-table">
      <thead><tr><th>#</th><th>Cliente</th><th>Endereço</th><th class="num">Chegada</th><th class="num">Janela</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function render_real_section(route) {
  const { real, real_result } = route;
  return `
    <section>
      <h2>Gasto real</h2>
      <p>KM ${format_number(real.km_start, 0)} → ${format_number(real.km_end, 0)}
        · ${real.start_time} às ${real.end_time} (carro ligado)
        · ${format_number(real_result.liters, 1)} litros · ${format_number(real_result.km_per_liter ?? 0, 2)} km/l</p>
      ${render_comparison_table(route.estimate, real_result)}
    </section>`;
}

function describe_window(stop) {
  if (!stop.window_start && !stop.window_end) return '—';
  return `${stop.window_start || '…'}–${stop.window_end || '…'}`;
}

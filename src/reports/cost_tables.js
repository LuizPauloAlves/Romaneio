// Tabelas de custo em HTML, usadas na tela e no relatório impresso.

import { COST_GROUPS } from '../costs/cost_calculator.js';
import { format_currency, format_km, format_duration, format_number } from '../utils/format_utils.js';
import { escape_html } from '../utils/dom_utils.js';

export function render_cost_table(breakdown, freight = 0) {
  const rows = breakdown.items.map((item) => `
    <tr><td><span class="group-tag group-tag--${item.group}">${COST_GROUPS[item.group]}</span> ${escape_html(item.label)}</td>
    <td class="num">${format_currency(item.value)}</td></tr>`).join('');

  return `
    <table class="cost-table">
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="total"><td>Custo total</td><td class="num">${format_currency(breakdown.total)}</td></tr>
        <tr><td>Custo por km</td><td class="num">${format_currency(breakdown.cost_per_km)}</td></tr>
        ${render_freight_rows(breakdown.total, freight)}
      </tfoot>
    </table>`;
}

export function render_comparison_table(estimate, real) {
  const labels = [...new Set([...estimate.items, ...real.items].map((item) => item.label))];
  const value_of = (breakdown, label) => breakdown.items.find((item) => item.label === label)?.value ?? 0;

  const rows = labels.map((label) => comparison_row(label, value_of(estimate, label), value_of(real, label), format_currency)).join('');
  const summary_rows = [
    comparison_row('Distância', estimate.distance_km, real.distance_km, format_km),
    comparison_row('Tempo total', estimate.total_minutes, real.total_minutes, format_duration),
    comparison_row('Consumo (km/l)', estimate.km_per_liter, real.km_per_liter ?? 0, (value) => format_number(value, 2)),
  ].join('');

  return `
    <table class="cost-table comparison">
      <thead><tr><th></th><th class="num">Previsto</th><th class="num">Real</th><th class="num">Diferença</th></tr></thead>
      <tbody>${summary_rows}<tr class="spacer"><td colspan="4"></td></tr>${rows}</tbody>
      <tfoot>${comparison_row('Custo total', estimate.total, real.total, format_currency, 'total')}</tfoot>
    </table>`;
}

function comparison_row(label, expected, actual, formatter, css_class = '') {
  const difference = actual - expected;
  const sign = difference > 0 ? '+' : '';
  const is_zero = formatter(Math.abs(difference)) === formatter(0);
  const tone = is_zero ? '' : difference > 0 ? 'worse' : 'better';
  return `<tr class="${css_class}"><td>${escape_html(label)}</td><td class="num">${formatter(expected)}</td>
    <td class="num">${formatter(actual)}</td><td class="num diff ${tone}">${sign}${formatter(difference)}</td></tr>`;
}

function render_freight_rows(total, freight) {
  if (!(freight > 0)) return '';
  const result = freight - total;
  return `
    <tr><td>Frete cobrado</td><td class="num">${format_currency(freight)}</td></tr>
    <tr class="${result >= 0 ? 'better' : 'worse'}"><td>Resultado (frete − custo)</td><td class="num">${format_currency(result)}</td></tr>`;
}

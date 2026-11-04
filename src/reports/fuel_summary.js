// Textos sobre combustível e refrigeração, usados na tela, no relatório e no WhatsApp.

import { ROUTE_OBJECTIVES } from '../optimization/route_objectives.js';
import { format_currency, format_duration, format_km, format_number } from '../utils/format_utils.js';

export function has_refrigeration(estimate) {
  return (estimate?.refrigeration_extra_percent ?? 0) > 0;
}

// "Refrigeração ligada em 77,8 km (até a última entrega) · desligada em 34,1 km (volta para a base)"
export function describe_refrigeration_split(estimate) {
  if (!has_refrigeration(estimate) || estimate.refrigerated_km == null) return '';
  const off_label = estimate.refrigeration_off_leg === 'first' ? 'ida até a primeira coleta' : 'volta para a base';
  const on_label = estimate.refrigeration_off_leg === 'first' ? 'da primeira coleta até a base' : 'até a última entrega';
  return `Refrigeração ligada em ${format_km(estimate.refrigerated_km)} (${on_label}, ${format_number(estimate.km_per_liter_on, 1)} km/l)`
    + ` · desligada em ${format_km(estimate.plain_km)} (${off_label}, ${format_number(estimate.km_per_liter_off, 1)} km/l)`;
}

export function describe_consumption(estimate) {
  const source = estimate.uses_learned_consumption ? 'ajustado pela média das últimas rotas reais' : 'referência do veículo, ajusta quando você lançar gastos reais';
  return `${format_number(estimate.liters, 1)} litros previstos (média ${format_number(estimate.km_per_liter, 2)} km/l, ${source})`;
}

// Comparação da rota escolhida com a rota mais rápida.
export function describe_comparison(route) {
  const comparison = route.comparison;
  if (!comparison) return '';
  const goal = ROUTE_OBJECTIVES[route.objective]?.toLowerCase() ?? '';
  if (comparison.same_route || Math.abs(comparison.liters_saved) < 0.05) {
    return `A rota de ${goal} é também a mais rápida.`;
  }
  const time = comparison.minutes_added >= 1
    ? `leva ${format_duration(comparison.minutes_added)} a mais`
    : `é ${format_duration(-comparison.minutes_added)} mais rápida`;
  const distance = comparison.km_added >= 0.1 ? ` e roda ${format_km(comparison.km_added)} a mais` : '';
  return `Comparada à rota mais rápida, esta economiza ${format_number(comparison.liters_saved, 1)} l de combustível`
    + ` (${format_currency(comparison.fuel_cost_saved)}), ${time}${distance}.`
    + ` Custo total: ${comparison.total_cost_saved >= 0 ? `${format_currency(comparison.total_cost_saved)} a menos` : `${format_currency(-comparison.total_cost_saved)} a mais`}.`;
}

// Instrução para o entregador.
export function describe_refrigeration_instruction(route) {
  if (!has_refrigeration(route.estimate) || route.stops.length === 0) return '';
  if (route.estimate.refrigeration_off_leg === 'first') {
    return `❄️ Saia com a refrigeração desligada e ligue na primeira coleta (${route.stops[0].client || 'parada 1'}).`;
  }
  const last = route.stops.at(-1);
  return `❄️ Depois da última entrega (${last.position}. ${last.client || last.address}), desligue a refrigeração para voltar à base.`;
}

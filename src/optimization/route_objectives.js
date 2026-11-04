// O que a otimização procura minimizar. Cada objetivo vira uma pontuação:
//   pontos = peso_km_refrigerado × km com refrigeração
//          + peso_km_sem_refrigeração × km sem refrigeração
//          + peso_minuto × minutos totais
//          + penalidade por minuto de atraso nas janelas de horário
// Combustível e custo estão em R$; o atraso pesa muito mais que qualquer economia.

import { split_distance_by_refrigeration } from '../costs/fuel_model.js';
import { compute_cost_breakdown } from '../costs/cost_calculator.js';

export const ROUTE_OBJECTIVES = Object.freeze({
  fuel: 'Menor gasto de combustível',
  cost: 'Menor custo total',
  time: 'Menor tempo',
});

export const DEFAULT_OBJECTIVE = 'fuel';

const LATE_PENALTY_PER_MINUTE = 1000;
const TIME_WEIGHTS = Object.freeze({ refrigerated_km: 0.1, plain_km: 0.1, minute: 1 });
const TIE_BREAK_PER_MINUTE = 0.001; // entre duas rotas com o mesmo combustível, a mais curta no tempo
const FUEL_TIE_BREAK = 0.01;         // no "menor tempo", entre rotas iguais, o sentido que gasta menos combustível

export function build_route_scorer({ objective, vehicle, consumption, route_type }) {
  const weights = build_weights(objective, vehicle, consumption);
  return (simulation) => {
    const split = split_distance_by_refrigeration(simulation, route_type);
    return weights.refrigerated_km * split.refrigerated_km
      + weights.plain_km * split.plain_km
      + weights.minute * simulation.total_minutes
      + LATE_PENALTY_PER_MINUTE * simulation.late_minutes;
  };
}

// Pontuação padrão (menor tempo), que não precisa de dados do veículo.
export function score_by_time(simulation) {
  return TIME_WEIGHTS.refrigerated_km * simulation.distance_km
    + TIME_WEIGHTS.minute * simulation.total_minutes
    + LATE_PENALTY_PER_MINUTE * simulation.late_minutes;
}

function build_weights(objective, vehicle, consumption) {
  const fuel_on = per_km(vehicle.fuel_price, consumption.km_per_liter_on);
  const fuel_off = per_km(vehicle.fuel_price, consumption.km_per_liter_off);
  if (objective === 'time') {
    return {
      refrigerated_km: TIME_WEIGHTS.refrigerated_km + FUEL_TIE_BREAK * fuel_on,
      plain_km: TIME_WEIGHTS.plain_km + FUEL_TIE_BREAK * fuel_off,
      minute: TIME_WEIGHTS.minute,
    };
  }
  if (objective === 'cost') {
    const other_per_km = compute_cost_breakdown({ vehicle, distance_km: 1, hours: 0, fuel_cost: 0 }).total;
    return { refrigerated_km: fuel_on + other_per_km, plain_km: fuel_off + other_per_km, minute: vehicle.driver_cost_hour / 60 };
  }
  return { refrigerated_km: fuel_on, plain_km: fuel_off, minute: TIE_BREAK_PER_MINUTE };
}

function per_km(price, km_per_liter) {
  return km_per_liter > 0 ? price / km_per_liter : 0;
}

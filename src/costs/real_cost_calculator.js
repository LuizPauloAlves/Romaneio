// Custo real da rota (dados lançados ao final do dia) e consumo aprendido para as próximas estimativas.

import { compute_cost_breakdown } from './cost_calculator.js';
import { build_consumption } from './fuel_model.js';
import { minutes_between } from '../utils/time_utils.js';

export function compute_real_cost({ vehicle, real }) {
  const distance_km = Math.max(0, real.km_end - real.km_start);
  const total_minutes = minutes_between(real.start_time, real.end_time) ?? 0;
  const fuel_price = real.fuel_price_paid > 0 ? real.fuel_price_paid : vehicle.fuel_price;
  const liters = fuel_price > 0 ? real.fuel_spent / fuel_price : 0;

  const breakdown = compute_cost_breakdown({
    vehicle,
    distance_km,
    hours: total_minutes / 60,
    fuel_cost: real.fuel_spent,
    tolls: real.tolls,
    other_costs: real.other_costs,
  });

  return {
    ...breakdown,
    distance_km,
    total_minutes,
    liters,
    km_per_liter: liters > 0 ? distance_km / liters : null,
  };
}

// Aprende com as últimas rotas reais do veículo quanto o consumo real difere da referência.
// factor = consumo real ÷ consumo de referência daquela rota (com a parte refrigerada já considerada).
// Ex.: referência 9,4 km/l e real 8,5 km/l → factor 0,90 (as próximas estimativas gastam 10% a mais).
// Retorna null se não houver gasto real lançado.
export function compute_consumption_learning({ routes, vehicle, window }) {
  const samples = routes
    .filter((route) => route.vehicle_id === vehicle.id && route.real_result?.km_per_liter > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, window);
  if (samples.length === 0) return null;

  // Rotas antigas (antes da refrigeração no cálculo) não guardaram a referência: usa o consumo com refrigeração.
  const fallback_reference = build_consumption(vehicle).km_per_liter_on;
  const factors = samples.map((route) => route.real_result.km_per_liter / (route.estimate?.reference_km_per_liter || fallback_reference));
  return {
    factor: average(factors),
    average_km_per_liter: average(samples.map((route) => route.real_result.km_per_liter)),
    samples: samples.length,
  };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

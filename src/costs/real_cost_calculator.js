// Custo real da rota (dados lançados ao final do dia) e consumo aprendido para as próximas estimativas.

import { compute_cost_breakdown } from './cost_calculator.js';
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

// Média do consumo real (km/l) das últimas rotas do veículo. Retorna null se não houver dados.
export function compute_learned_km_per_liter({ routes, vehicle_id, window }) {
  const samples = routes
    .filter((route) => route.vehicle_id === vehicle_id && route.real_result?.km_per_liter > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, window)
    .map((route) => route.real_result.km_per_liter);

  if (samples.length === 0) return null;
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

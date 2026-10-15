// Custo previsto de uma rota a partir dos km e do tempo calculados.

import { compute_cost_breakdown } from './cost_calculator.js';

export function estimate_route_cost({ vehicle, distance_km, total_minutes, tolls = 0, learned_km_per_liter = null }) {
  const km_per_liter = learned_km_per_liter ?? vehicle.km_per_liter;
  const liters = km_per_liter > 0 ? distance_km / km_per_liter : 0;
  const breakdown = compute_cost_breakdown({
    vehicle,
    distance_km,
    hours: total_minutes / 60,
    fuel_cost: liters * vehicle.fuel_price,
    tolls,
  });

  return {
    ...breakdown,
    distance_km,
    total_minutes,
    liters,
    km_per_liter,
    uses_learned_consumption: learned_km_per_liter != null,
  };
}

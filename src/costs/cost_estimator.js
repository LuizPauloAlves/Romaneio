// Custo previsto de uma rota a partir dos km (com e sem refrigeração) e do tempo calculados.

import { compute_cost_breakdown } from './cost_calculator.js';
import { build_consumption, compute_fuel_use } from './fuel_model.js';

export function estimate_route_cost({ vehicle, split, total_minutes, tolls = 0, consumption_factor = null }) {
  const consumption = build_consumption(vehicle, consumption_factor ?? 1);
  const fuel = compute_fuel_use(split, consumption);
  const reference = compute_fuel_use(split, build_consumption(vehicle));
  const distance_km = split.refrigerated_km + split.plain_km;

  const breakdown = compute_cost_breakdown({
    vehicle,
    distance_km,
    hours: total_minutes / 60,
    fuel_cost: fuel.liters * vehicle.fuel_price,
    tolls,
  });

  return {
    ...breakdown,
    distance_km,
    total_minutes,
    refrigerated_km: split.refrigerated_km,
    plain_km: split.plain_km,
    refrigeration_off_leg: split.off_leg,
    ...fuel,
    fuel_cost: fuel.liters * vehicle.fuel_price,
    km_per_liter_on: consumption.km_per_liter_on,
    km_per_liter_off: consumption.km_per_liter_off,
    refrigeration_extra_percent: consumption.refrigeration_extra_percent,
    reference_km_per_liter: reference.km_per_liter, // consumo de referência desta rota, para o aprendizado
    consumption_factor: consumption_factor ?? 1,
    uses_learned_consumption: consumption_factor != null,
  };
}

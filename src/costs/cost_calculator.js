// Cálculo único da composição de custos de uma rota.
// Usado tanto pela estimativa (antes da rota) quanto pelo gasto real (depois).

export const COST_GROUPS = Object.freeze({
  fuel: 'Combustível',
  maintenance: 'Manutenção',
  fixed: 'Custos fixos (rateados)',
  labor: 'Mão de obra',
  trip: 'Despesas da viagem',
});

export function compute_cost_breakdown({ vehicle, distance_km, hours, fuel_cost, tolls = 0, other_costs = 0 }) {
  const per_fixed_km = (annual_value) => (vehicle.km_per_year > 0 ? annual_value / vehicle.km_per_year : 0);
  const tires_per_km = vehicle.tires_life_km > 0 ? vehicle.tires_set_price / vehicle.tires_life_km : 0;

  const items = [
    { group: 'fuel', label: 'Combustível', value: fuel_cost },
    { group: 'maintenance', label: 'Manutenção preventiva (óleo, filtros, revisões)', value: distance_km * vehicle.preventive_per_km },
    { group: 'maintenance', label: 'Manutenção preditiva (correia, freios, suspensão)', value: distance_km * vehicle.predictive_per_km },
    { group: 'maintenance', label: 'Manutenção corretiva (reserva para imprevistos)', value: distance_km * vehicle.corrective_per_km },
    { group: 'maintenance', label: 'Desgaste de pneus', value: distance_km * tires_per_km },
    { group: 'fixed', label: 'Seguro', value: distance_km * per_fixed_km(vehicle.insurance_year) },
    { group: 'fixed', label: 'IPVA e licenciamento', value: distance_km * per_fixed_km(vehicle.ipva_year + vehicle.licensing_year) },
    { group: 'fixed', label: 'Rastreador', value: distance_km * per_fixed_km(vehicle.tracker_year) },
    { group: 'fixed', label: 'Depreciação do veículo', value: distance_km * per_fixed_km(vehicle.vehicle_value * vehicle.depreciation_rate) },
    { group: 'labor', label: 'Motorista (horas de rota)', value: hours * vehicle.driver_cost_hour },
    { group: 'trip', label: 'Pedágios', value: tolls },
    { group: 'trip', label: 'Outros gastos', value: other_costs },
  ].filter((item) => item.value > 0.004);

  const total = items.reduce((sum, item) => sum + item.value, 0);
  return {
    items,
    total,
    cost_per_km: distance_km > 0 ? total / distance_km : 0,
    group_totals: sum_by_group(items),
  };
}

function sum_by_group(items) {
  return items.reduce((totals, item) => {
    totals[item.group] = (totals[item.group] ?? 0) + item.value;
    return totals;
  }, {});
}

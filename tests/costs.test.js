import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VEHICLE } from '../src/config/default_costs.js';
import { estimate_route_cost } from '../src/costs/cost_estimator.js';
import { compute_real_cost, compute_learned_km_per_liter } from '../src/costs/real_cost_calculator.js';

test('estimativa calcula combustível por km/l e preço', () => {
  const vehicle = { ...DEFAULT_VEHICLE, km_per_liter: 10, fuel_price: 6 };
  const estimate = estimate_route_cost({ vehicle, distance_km: 100, total_minutes: 120 });
  const fuel = estimate.items.find((item) => item.label === 'Combustível');
  assert.equal(fuel.value, 60);
  assert.ok(estimate.total > 60);
});

test('consumo aprendido substitui o de fábrica', () => {
  const vehicle = { ...DEFAULT_VEHICLE, km_per_liter: 10, fuel_price: 6 };
  const estimate = estimate_route_cost({ vehicle, distance_km: 100, total_minutes: 0, learned_km_per_liter: 8 });
  assert.equal(estimate.liters, 12.5);
  assert.equal(estimate.uses_learned_consumption, true);
});

test('gasto real (exemplo do usuário)', () => {
  const real = {
    km_start: 20000, km_end: 20050, fuel_spent: 300, fuel_price_paid: 6,
    start_time: '08:00', end_time: '15:00', tolls: 0, other_costs: 0,
  };
  const result = compute_real_cost({ vehicle: DEFAULT_VEHICLE, real });
  assert.equal(result.distance_km, 50);
  assert.equal(result.total_minutes, 420);
  assert.equal(result.liters, 50);
  assert.equal(result.km_per_liter, 1);
});

test('média de consumo usa as últimas rotas do veículo', () => {
  const routes = [
    { vehicle_id: 'a', date: '2026-10-01', real_result: { km_per_liter: 10 } },
    { vehicle_id: 'a', date: '2026-10-08', real_result: { km_per_liter: 12 } },
    { vehicle_id: 'b', date: '2026-10-08', real_result: { km_per_liter: 99 } },
    { vehicle_id: 'a', date: '2026-10-09', real_result: null },
  ];
  assert.equal(compute_learned_km_per_liter({ routes, vehicle_id: 'a', window: 4 }), 11);
  assert.equal(compute_learned_km_per_liter({ routes, vehicle_id: 'c', window: 4 }), null);
});

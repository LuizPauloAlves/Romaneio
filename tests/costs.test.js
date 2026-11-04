import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VEHICLE } from '../src/config/default_costs.js';
import { estimate_route_cost } from '../src/costs/cost_estimator.js';
import { compute_real_cost, compute_consumption_learning } from '../src/costs/real_cost_calculator.js';

const no_fridge = { ...DEFAULT_VEHICLE, km_per_liter: 10, fuel_price: 6, refrigeration_extra_percent: 0 };
const split = (refrigerated_km, plain_km) => ({ refrigerated_km, plain_km, off_leg: 'last' });

test('estimativa calcula combustível por km/l e preço', () => {
  const estimate = estimate_route_cost({ vehicle: no_fridge, split: split(60, 40), total_minutes: 120 });
  const fuel = estimate.items.find((item) => item.label === 'Combustível');
  assert.equal(fuel.value, 60);
  assert.equal(estimate.distance_km, 100);
  assert.ok(estimate.total > 60);
});

test('com refrigeração, só a parte refrigerada gasta mais', () => {
  const vehicle = { ...no_fridge, refrigeration_extra_percent: 25 }; // 10 km/l → 8 km/l ligado
  const estimate = estimate_route_cost({ vehicle, split: split(80, 20), total_minutes: 0 });
  assert.equal(estimate.refrigerated_liters, 10);
  assert.equal(estimate.plain_liters, 2);
  assert.equal(estimate.liters, 12);
  assert.equal(estimate.fuel_cost, 72);
  assert.equal(estimate.km_per_liter_on, 8);
});

test('consumo aprendido ajusta as duas faixas pelo mesmo fator', () => {
  const vehicle = { ...no_fridge, refrigeration_extra_percent: 25 };
  const estimate = estimate_route_cost({ vehicle, split: split(80, 20), total_minutes: 0, consumption_factor: 0.8 });
  assert.equal(estimate.km_per_liter_off, 8);
  assert.ok(Math.abs(estimate.km_per_liter_on - 6.4) < 1e-9);
  assert.equal(estimate.uses_learned_consumption, true);
  assert.ok(Math.abs(estimate.reference_km_per_liter - 100 / 12) < 1e-9); // referência sem o fator
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

test('aprendizado compara o consumo real com a referência de cada rota', () => {
  const vehicle = { ...no_fridge, id: 'a', refrigeration_extra_percent: 25 };
  const routes = [
    { vehicle_id: 'a', date: '2026-10-01', estimate: { reference_km_per_liter: 10 }, real_result: { km_per_liter: 9 } },
    { vehicle_id: 'a', date: '2026-10-08', estimate: { reference_km_per_liter: 8 }, real_result: { km_per_liter: 8.8 } },
    { vehicle_id: 'b', date: '2026-10-08', estimate: { reference_km_per_liter: 8 }, real_result: { km_per_liter: 99 } },
    { vehicle_id: 'a', date: '2026-10-09', estimate: { reference_km_per_liter: 8 }, real_result: null },
  ];
  const learning = compute_consumption_learning({ routes, vehicle, window: 4 });
  assert.ok(Math.abs(learning.factor - 1) < 1e-9); // (0,9 + 1,1) ÷ 2
  assert.ok(Math.abs(learning.average_km_per_liter - 8.9) < 1e-9);
  assert.equal(learning.samples, 2);
  assert.equal(compute_consumption_learning({ routes, vehicle: { ...vehicle, id: 'c' }, window: 4 }), null);
});

test('rota antiga sem referência usa o consumo com refrigeração', () => {
  const vehicle = { ...no_fridge, id: 'a', refrigeration_extra_percent: 25 }; // 8 km/l ligado
  const routes = [{ vehicle_id: 'a', date: '2026-10-01', estimate: { km_per_liter: 10 }, real_result: { km_per_liter: 6 } }];
  assert.equal(compute_consumption_learning({ routes, vehicle, window: 4 }).factor, 0.75);
});

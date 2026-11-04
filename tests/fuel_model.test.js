import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VEHICLE } from '../src/config/default_costs.js';
import { build_consumption, compute_fuel_use, split_distance_by_refrigeration } from '../src/costs/fuel_model.js';
import { build_route_scorer, score_by_time } from '../src/optimization/route_objectives.js';
import { simulate_route } from '../src/optimization/route_simulator.js';
import { optimize_route } from '../src/optimization/route_optimizer.js';

const vehicle = { ...DEFAULT_VEHICLE, km_per_liter: 11, refrigeration_extra_percent: 19, fuel_price: 6.4 };

function matrix_from(points) {
  const distances = points.map((a) => points.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) * 1000));
  return { distances, durations: distances.map((row) => row.map((meters) => (meters / 1000) * 60)) };
}

const make_stops = (count) => Array.from({ length: count }, () => ({ service_minutes: 10, window_start: null, window_end: null }));

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

test('consumo com refrigeração = sem refrigeração ÷ (1 + aumento)', () => {
  const consumption = build_consumption(vehicle);
  assert.equal(consumption.km_per_liter_off, 11);
  assert.ok(Math.abs(consumption.km_per_liter_on - 11 / 1.19) < 1e-9);
  assert.equal(build_consumption({ ...vehicle, refrigeration_extra_percent: 0 }).km_per_liter_on, 11);
  assert.equal(build_consumption(vehicle, 0.9).km_per_liter_off, 11 * 0.9);
});

test('entrega: refrigeração desligada na volta; coleta: desligada na ida', () => {
  const simulation = { distance_km: 100, first_leg_km: 15, last_leg_km: 40 };
  assert.deepEqual(split_distance_by_refrigeration(simulation, 'delivery'), { refrigerated_km: 60, plain_km: 40, off_leg: 'last' });
  assert.deepEqual(split_distance_by_refrigeration(simulation, 'pickup'), { refrigerated_km: 85, plain_km: 15, off_leg: 'first' });
});

test('litros somam as duas partes', () => {
  const fuel = compute_fuel_use({ refrigerated_km: 59.5, plain_km: 11 }, { km_per_liter_on: 8.5, km_per_liter_off: 11 });
  assert.ok(Math.abs(fuel.refrigerated_liters - 7) < 1e-9);
  assert.ok(Math.abs(fuel.plain_liters - 1) < 1e-9);
  assert.ok(Math.abs(fuel.km_per_liter - 70.5 / 8) < 1e-9);
});

test('simulação separa o primeiro e o último trecho', () => {
  const simulation = simulate_route({ order: [1, 2], matrix: matrix_from([[0, 0], [0, 10], [0, 40]]), stops: make_stops(2), departure_minutes: 480 });
  assert.equal(Math.round(simulation.first_leg_km), 10);
  assert.equal(Math.round(simulation.last_leg_km), 40);
  assert.equal(Math.round(simulation.distance_km), 80);
});

test('em linha reta, o combustível manda entregar o mais perto primeiro e voltar do mais longe', () => {
  // Base em 0, paradas em 40 km e 10 km: ida e volta somam 80 km nos dois sentidos.
  const matrix = matrix_from([[0, 0], [0, 40], [0, 10]]);
  const score_route = build_route_scorer({ objective: 'fuel', vehicle, consumption: build_consumption(vehicle), route_type: 'delivery' });
  const result = optimize_route({ matrix, stops: make_stops(2), departure_minutes: 480, score_route });
  assert.deepEqual(result.order, [2, 1]);
  assert.equal(Math.round(result.simulation.last_leg_km), 40);
});

test('rota mais econômica pode rodar mais km e ainda gastar menos (comparação com força bruta)', () => {
  const points = [[0, 0], [0, 19], [11, 38], [-7, 35], [-12, 11], [18, 29]];
  const matrix = matrix_from(points);
  const stops = make_stops(5);
  const consumption = build_consumption(vehicle);
  const fuel_score = build_route_scorer({ objective: 'fuel', vehicle, consumption, route_type: 'delivery' });
  const simulate = (order) => simulate_route({ order, matrix, stops, departure_minutes: 480 });

  const all = permutations([1, 2, 3, 4, 5]).map(simulate);
  const best_by = (score) => all.reduce((best, simulation) => (score(simulation) < score(best) ? simulation : best));
  const fuel_optimum = best_by(fuel_score);
  const time_optimum = best_by(score_by_time);

  // O ótimo de combustível roda mais km, mas termina mais longe da base (volta longa sem refrigeração).
  assert.ok(fuel_optimum.distance_km > time_optimum.distance_km + 1);
  assert.ok(fuel_optimum.last_leg_km > time_optimum.last_leg_km + 10);
  const liters = (simulation) => compute_fuel_use(split_distance_by_refrigeration(simulation, 'delivery'), consumption).liters;
  assert.ok(liters(fuel_optimum) < liters(time_optimum));

  // O otimizador encontra os dois ótimos.
  const optimized_fuel = optimize_route({ matrix, stops, departure_minutes: 480, score_route: fuel_score });
  const optimized_time = optimize_route({ matrix, stops, departure_minutes: 480 });
  assert.ok(Math.abs(fuel_score(optimized_fuel.simulation) - fuel_score(fuel_optimum)) < 1e-9);
  assert.ok(Math.abs(score_by_time(optimized_time.simulation) - score_by_time(time_optimum)) < 1e-9);
});

test('sem refrigeração (0%), o objetivo de combustível é só a menor distância', () => {
  const plain_vehicle = { ...vehicle, refrigeration_extra_percent: 0 };
  const score = build_route_scorer({ objective: 'fuel', vehicle: plain_vehicle, consumption: build_consumption(plain_vehicle), route_type: 'delivery' });
  const a = { distance_km: 100, first_leg_km: 10, last_leg_km: 50, total_minutes: 200, late_minutes: 0 };
  const b = { ...a, first_leg_km: 50, last_leg_km: 10 };
  assert.ok(Math.abs(score(a) - score(b)) < 1e-9);
});

test('atraso na janela de horário pesa mais que qualquer economia', () => {
  const score = build_route_scorer({ objective: 'fuel', vehicle, consumption: build_consumption(vehicle), route_type: 'delivery' });
  const on_time = { distance_km: 300, first_leg_km: 10, last_leg_km: 10, total_minutes: 400, late_minutes: 0 };
  const late = { distance_km: 100, first_leg_km: 10, last_leg_km: 50, total_minutes: 200, late_minutes: 1 };
  assert.ok(score(on_time) < score(late));
});

test('custo total inclui o tempo do motorista', () => {
  const consumption = build_consumption(vehicle);
  const cost = build_route_scorer({ objective: 'cost', vehicle, consumption, route_type: 'delivery' });
  const fuel = build_route_scorer({ objective: 'fuel', vehicle, consumption, route_type: 'delivery' });
  const short_time = { distance_km: 100, first_leg_km: 10, last_leg_km: 10, total_minutes: 120, late_minutes: 0 };
  const long_time = { ...short_time, total_minutes: 240 };
  assert.ok(cost(long_time) - cost(short_time) > 40); // 2 h × R$ 21/h
  assert.ok(fuel(long_time) - fuel(short_time) < 1);
});

test('"menor tempo" desempata pelo sentido que gasta menos combustível', () => {
  const time = build_route_scorer({ objective: 'time', vehicle, consumption: build_consumption(vehicle), route_type: 'delivery' });
  const short_return = { distance_km: 100, first_leg_km: 40, last_leg_km: 10, total_minutes: 200, late_minutes: 0 };
  const long_return = { ...short_return, first_leg_km: 10, last_leg_km: 40 };
  assert.ok(time(long_return) < time(short_return));
  // Mas um minuto a mais ainda pesa mais que o desempate.
  assert.ok(time({ ...long_return, total_minutes: 201 }) > time(short_return));
});

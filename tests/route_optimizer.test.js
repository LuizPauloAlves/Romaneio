import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optimize_route } from '../src/optimization/route_optimizer.js';
import { simulate_route } from '../src/optimization/route_simulator.js';

// Pontos numa linha reta: base em 0, paradas em 10, 20, 30, 40 km (1 km = 60 s).
function line_matrix(positions) {
  const size = positions.length;
  const durations = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => Math.abs(positions[i] - positions[j]) * 60));
  const distances = durations.map((row) => row.map((seconds) => (seconds / 60) * 1000));
  return { durations, distances };
}

const make_stops = (count, overrides = {}) => Array.from({ length: count }, (_, index) => ({
  service_minutes: 10, window_start: null, window_end: null, ...(overrides[index + 1] ?? {}),
}));

test('sem janelas, visita em sequência pela estrada', () => {
  const matrix = line_matrix([0, 30, 10, 40, 20]);
  const result = optimize_route({ matrix, stops: make_stops(4), departure_minutes: 480 });
  const visited_positions = result.order.map((node) => [0, 30, 10, 40, 20][node]);
  const ascending = [10, 20, 30, 40];
  const descending = [40, 30, 20, 10];
  assert.ok(
    JSON.stringify(visited_positions) === JSON.stringify(ascending)
      || JSON.stringify(visited_positions) === JSON.stringify(descending),
  );
  assert.equal(Math.round(result.simulation.distance_km), 80);
});

test('respeita janela de horário mesmo andando mais', () => {
  const positions = [0, 10, 20, 30, 40];
  const matrix = line_matrix(positions);
  // Parada 4 (40 km) precisa receber até 08:45; saída 08:00.
  const stops = make_stops(4, { 4: { window_end: 525 } });
  const result = optimize_route({ matrix, stops, departure_minutes: 480 });
  assert.equal(result.order[0], 4);
  assert.equal(result.simulation.late_minutes, 0);
});

test('simulação calcula espera quando chega antes da janela', () => {
  const matrix = line_matrix([0, 10]);
  const stops = make_stops(1, { 1: { window_start: 540 } });
  const simulation = simulate_route({ order: [1], matrix, stops, departure_minutes: 480 });
  assert.equal(Math.round(simulation.schedule[0].arrival), 490);
  assert.equal(Math.round(simulation.schedule[0].wait), 50);
  assert.equal(Math.round(simulation.return_time), 540 + 10 + 10);
});

test('50 paradas otimizam em tempo aceitável', () => {
  const positions = Array.from({ length: 51 }, (_, index) => (index === 0 ? 0 : (index * 37) % 101));
  const matrix = line_matrix(positions);
  const started = Date.now();
  const result = optimize_route({ matrix, stops: make_stops(50), departure_minutes: 480 });
  assert.ok(Date.now() - started < 4000);
  assert.equal(new Set(result.order).size, 50);
});

// Encontra uma boa ordem de visita respeitando as janelas de horário.
//
// Estratégia (simples e rápida para até ~50 paradas):
//   1. Gera ordens iniciais (vizinho mais próximo, mais urgente primeiro e aleatórias).
//   2. Melhora cada uma com busca local: mover uma parada (relocate) e inverter trechos (2-opt).
//   3. Fica com a melhor.

import { simulate_route, route_score } from './route_simulator.js';

const DEFAULT_RANDOM_STARTS = 12;
const DEFAULT_TIME_BUDGET_MS = 2000;

export function optimize_route({ matrix, stops, departure_minutes, random_starts = DEFAULT_RANDOM_STARTS, time_budget_ms = DEFAULT_TIME_BUDGET_MS, seed = 42 }) {
  const context = { matrix, stops, departure_minutes };
  if (stops.length === 0) return evaluate([], context);

  const random = create_random(seed);
  const deadline = Date.now() + time_budget_ms;
  const initial_orders = [
    nearest_neighbor_order(matrix, stops.length),
    urgent_first_order(stops),
    ...Array.from({ length: random_starts }, () => shuffled_order(stops.length, random)),
  ];

  let best = null;
  for (const order of initial_orders) {
    if (best && Date.now() > deadline) break;
    const candidate = improve_with_local_search(order, context, deadline);
    if (!best || candidate.score < best.score) best = candidate;
  }
  return best;
}

function evaluate(order, context) {
  const simulation = simulate_route({ ...context, order });
  return { order, simulation, score: route_score(simulation) };
}

function improve_with_local_search(initial_order, context, deadline) {
  let best = evaluate(initial_order, context);
  let improved = true;

  while (improved && Date.now() <= deadline) {
    improved = false;
    for (const neighbor of generate_neighbors(best.order)) {
      const candidate = evaluate(neighbor, context);
      if (candidate.score < best.score - 1e-9) {
        best = candidate;
        improved = true;
        break;
      }
    }
  }
  return best;
}

function* generate_neighbors(order) {
  const size = order.length;
  for (let from = 0; from < size; from += 1) {
    for (let to = 0; to < size; to += 1) {
      if (from !== to) yield relocate(order, from, to);
    }
  }
  for (let start = 0; start < size - 1; start += 1) {
    for (let end = start + 1; end < size; end += 1) {
      yield reverse_segment(order, start, end);
    }
  }
}

function relocate(order, from, to) {
  const copy = [...order];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

function reverse_segment(order, start, end) {
  return [...order.slice(0, start), ...order.slice(start, end + 1).reverse(), ...order.slice(end + 1)];
}

function nearest_neighbor_order(matrix, stop_count) {
  const remaining = new Set(Array.from({ length: stop_count }, (_, index) => index + 1));
  const order = [];
  let current = 0;
  while (remaining.size > 0) {
    let next = null;
    for (const node of remaining) {
      if (next == null || matrix.durations[current][node] < matrix.durations[current][next]) next = node;
    }
    order.push(next);
    remaining.delete(next);
    current = next;
  }
  return order;
}

function urgent_first_order(stops) {
  return stops
    .map((stop, index) => ({ node: index + 1, deadline: stop.window_end ?? Infinity }))
    .sort((a, b) => a.deadline - b.deadline)
    .map((item) => item.node);
}

function shuffled_order(stop_count, random) {
  const order = Array.from({ length: stop_count }, (_, index) => index + 1);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap_index = Math.floor(random() * (index + 1));
    [order[index], order[swap_index]] = [order[swap_index], order[index]];
  }
  return order;
}

// Gerador pseudoaleatório com semente (resultado repetível).
function create_random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

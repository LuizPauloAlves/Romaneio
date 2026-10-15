// Simula a rota em uma ordem de paradas: horários de chegada, esperas e atrasos.
//
// Índices da matriz: 0 = base, 1..n = paradas (na mesma ordem da lista `stops`).
// Tempos da matriz em segundos e distâncias em metros.

const LATE_PENALTY_PER_MINUTE = 1000;
const DISTANCE_WEIGHT_PER_KM = 0.1;

export function simulate_route({ order, matrix, stops, departure_minutes }) {
  let clock = departure_minutes;
  let previous = 0;
  let distance_m = 0;
  let driving_s = 0;
  let total_late = 0;
  const schedule = [];

  for (const node of order) {
    const stop = stops[node - 1];
    driving_s += matrix.durations[previous][node];
    distance_m += matrix.distances[previous][node];
    clock += matrix.durations[previous][node] / 60;

    const arrival = clock;
    const wait = stop.window_start != null ? Math.max(0, stop.window_start - arrival) : 0;
    clock += wait;
    const late = stop.window_end != null ? Math.max(0, clock - stop.window_end) : 0;
    total_late += late;

    schedule.push({ node, arrival, wait, late, departure: clock + stop.service_minutes });
    clock += stop.service_minutes;
    previous = node;
  }

  driving_s += matrix.durations[previous][0];
  distance_m += matrix.distances[previous][0];
  clock += matrix.durations[previous][0] / 60;

  return {
    schedule,
    return_time: clock,
    total_minutes: clock - departure_minutes,
    driving_minutes: driving_s / 60,
    distance_km: distance_m / 1000,
    late_minutes: total_late,
  };
}

export function route_score(simulation) {
  return simulation.total_minutes
    + simulation.distance_km * DISTANCE_WEIGHT_PER_KM
    + simulation.late_minutes * LATE_PENALTY_PER_MINUTE;
}

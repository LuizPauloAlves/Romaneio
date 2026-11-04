// Orquestra o planejamento: localiza endereços, calcula a matriz, otimiza a ordem,
// gera os links e estima o custo. Devolve um objeto de rota pronto para salvar.

import { geocode } from '../maps/geocoder.js';
import { build_distance_matrix, find_unreachable_points } from '../maps/distance_matrix.js';
import { build_maps_links } from '../maps/maps_link_builder.js';
import { optimize_route } from '../optimization/route_optimizer.js';
import { build_route_scorer, DEFAULT_OBJECTIVE } from '../optimization/route_objectives.js';
import { estimate_route_cost } from '../costs/cost_estimator.js';
import { build_consumption, split_distance_by_refrigeration } from '../costs/fuel_model.js';
import { compute_consumption_learning } from '../costs/real_cost_calculator.js';
import { APP_CONFIG } from '../config/app_config.js';
import { get_routes, get_settings, save_settings } from '../storage/storage_repository.js';
import { parse_hhmm, format_hhmm } from '../utils/time_utils.js';
import { generate_id } from '../utils/dom_utils.js';

// Localiza cada parada que ainda não tem coordenadas. Chama on_progress(stop_index) a cada uma.
export async function locate_stops(stops, on_progress = () => {}) {
  const base = await locate_base().catch(() => null);
  for (const [index, stop] of stops.entries()) {
    if (stop.lat == null) {
      try {
        const location = await geocode(stop.address, base);
        Object.assign(stop, location ?? { lat: null, lng: null, formatted_address: '', approximate: false }, { not_found: !location });
      } catch (error) {
        stop.not_found = true;
        stop.error = error.message;
      }
    }
    on_progress(index);
  }
  return stops;
}

export async function locate_base() {
  const settings = get_settings();
  if (settings.base.lat != null) return settings.base;

  const location = await geocode(settings.base.address);
  if (!location) throw new Error('Não encontrei o endereço da base. Marque no mapa em Configurações.');
  const base = { ...settings.base, ...location };
  save_settings({ ...settings, base });
  return base;
}

export async function plan_route({ stops, vehicle, departure_time, date, type, objective = DEFAULT_OBJECTIVE, tolls = 0, freight = 0 }) {
  const located = stops.filter((stop) => stop.lat != null);
  if (located.length === 0) throw new Error('Nenhum endereço localizado. Corrija os endereços e tente de novo.');

  const base = await locate_base();
  const matrix = await build_distance_matrix([base, ...located]);
  ensure_all_reachable(matrix, located);

  const departure_minutes = parse_hhmm(departure_time) ?? parse_hhmm(APP_CONFIG.default_departure_time);
  const learning = compute_consumption_learning({ routes: get_routes(), vehicle, window: APP_CONFIG.learning_window });
  const consumption_factor = learning?.factor ?? null;
  const consumption = build_consumption(vehicle, consumption_factor ?? 1);

  const context = { matrix, stops: located.map(to_optimization_stop), departure_minutes };
  const score_route = build_route_scorer({ objective, vehicle, consumption, route_type: type });
  const { best, fastest } = optimize_with_baseline({ context, objective, score_route, vehicle, consumption, route_type: type });
  const { order, simulation } = best;

  const estimate_for = (result) => estimate_route_cost({
    vehicle,
    split: split_distance_by_refrigeration(result.simulation, type),
    total_minutes: result.simulation.total_minutes,
    tolls,
    consumption_factor,
  });
  const estimate = estimate_for(best);
  const ordered_stops = order.map((node, position) => build_ordered_stop(located[node - 1], simulation.schedule[position], position));

  return {
    id: generate_id('rota'),
    created_at: new Date().toISOString(),
    date,
    type,
    objective,
    vehicle_id: vehicle.id,
    vehicle_name: vehicle.name,
    departure_time: format_hhmm(departure_minutes),
    tolls,
    freight,
    base,
    stops: ordered_stops,
    skipped_stops: stops.filter((stop) => stop.lat == null),
    summary: {
      distance_km: simulation.distance_km,
      driving_minutes: simulation.driving_minutes,
      total_minutes: simulation.total_minutes,
      return_time: format_hhmm(simulation.return_time),
      late_minutes: simulation.late_minutes,
    },
    links: build_maps_links({ base, ordered_stops }),
    estimate,
    comparison: fastest ? compare_with_fastest(estimate, estimate_for(fastest), best, fastest) : null,
    real: null,
    real_result: null,
  };
}

// Otimiza pelo objetivo escolhido e também pela rota mais rápida, para mostrar a diferença.
// Como a busca é heurística, se a rota "mais rápida" sair melhor no objetivo escolhido, ela é usada.
function optimize_with_baseline({ context, objective, score_route, vehicle, consumption, route_type }) {
  const chosen = optimize_route({ ...context, score_route });
  if (objective === 'time') return { best: chosen, fastest: null };

  const fastest = optimize_route({ ...context, score_route: build_route_scorer({ objective: 'time', vehicle, consumption, route_type }) });
  const best = score_route(fastest.simulation) < score_route(chosen.simulation) ? fastest : chosen;
  return { best, fastest };
}

function compare_with_fastest(estimate, fastest_estimate, best, fastest) {
  return {
    same_route: best.order.join() === fastest.order.join(),
    liters_saved: fastest_estimate.liters - estimate.liters,
    fuel_cost_saved: fastest_estimate.fuel_cost - estimate.fuel_cost,
    total_cost_saved: fastest_estimate.total - estimate.total,
    minutes_added: best.simulation.total_minutes - fastest.simulation.total_minutes,
    km_added: best.simulation.distance_km - fastest.simulation.distance_km,
  };
}

function to_optimization_stop(stop) {
  return {
    service_minutes: stop.service_minutes,
    window_start: parse_hhmm(stop.window_start),
    window_end: parse_hhmm(stop.window_end),
  };
}

function build_ordered_stop(stop, schedule_item, position) {
  return {
    ...stop,
    position: position + 1,
    arrival_time: format_hhmm(schedule_item.arrival),
    wait_minutes: Math.round(schedule_item.wait),
    late_minutes: Math.round(schedule_item.late),
    leave_time: format_hhmm(schedule_item.departure),
  };
}

function ensure_all_reachable(matrix, located) {
  const unreachable = find_unreachable_points(matrix).filter((index) => index > 0);
  if (unreachable.length === 0) return;
  const names = unreachable.map((index) => located[index - 1].client || located[index - 1].address).join(', ');
  throw new Error(`Sem rota de carro até: ${names}. Ajuste o ponto no mapa.`);
}

// Monta os links do Google Maps com a rota já na ordem otimizada.
// Rotas longas são divididas em vários links, cada um começando onde o anterior terminou.

import { APP_CONFIG } from '../config/app_config.js';

const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/';

export function build_maps_links({ base, ordered_stops, max_waypoints = APP_CONFIG.max_waypoints_per_link }) {
  const points = [base, ...ordered_stops, base];
  const step = max_waypoints + 1;
  const links = [];

  for (let start = 0; start < points.length - 1; start += step) {
    const end = Math.min(start + step, points.length - 1);
    links.push({
      label: describe_segment(start, end, ordered_stops.length),
      url: build_directions_url(points[start], points[end], points.slice(start + 1, end)),
    });
  }
  return links;
}

function build_directions_url(origin, destination, waypoints) {
  const params = new URLSearchParams({
    api: '1',
    origin: to_coordinate(origin),
    destination: to_coordinate(destination),
    travelmode: 'driving',
  });
  if (waypoints.length > 0) params.set('waypoints', waypoints.map(to_coordinate).join('|'));
  return `${MAPS_DIRECTIONS_URL}?${params.toString()}`;
}

function to_coordinate(point) {
  const round = (value) => Number(value.toFixed(6)); // ~10 cm de precisão, link mais curto
  return `${round(point.lat)},${round(point.lng)}`;
}

// Os pontos são: 0 = base, 1..n = paradas, n+1 = base de volta.
function describe_segment(start, end, stop_count) {
  const from = start === 0 ? 'Base' : `Parada ${start}`;
  const to = end === stop_count + 1 ? 'Base' : `Parada ${end}`;
  return `${from} → ${to}`;
}

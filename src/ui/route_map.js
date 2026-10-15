// Mapa da rota calculada: base, paradas numeradas e o traçado pelas estradas.

import { load_leaflet, create_base_map, create_number_icon } from '../maps/leaflet_loader.js';
import { fetch_osrm_route_geometry } from '../maps/osrm_client.js';
import { escape_html } from '../utils/dom_utils.js';

export async function render_route_map(element, route) {
  try {
    const L = await load_leaflet();
    element.innerHTML = '';
    const map = create_base_map(L, element, route.base);
    const points = [route.base, ...route.stops, route.base];

    L.marker([route.base.lat, route.base.lng], { icon: create_number_icon(L, 'B', 'map-pin--base') })
      .bindPopup('Base (saída e chegada)').addTo(map);
    route.stops.forEach((stop) => {
      L.marker([stop.lat, stop.lng], { icon: create_number_icon(L, stop.position, stop.approximate ? 'map-pin--warn' : '') })
        .bindPopup(`<strong>${stop.position}. ${escape_html(stop.client || '')}</strong><br>${escape_html(stop.address)}<br>Chegada ${stop.arrival_time}`)
        .addTo(map);
    });

    const path = await fetch_osrm_route_geometry(points).catch(() => points.map((point) => [point.lat, point.lng]));
    const line = L.polyline(path, { color: '#1f5c43', weight: 4, opacity: 0.8 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [24, 24] });
  } catch (error) {
    element.innerHTML = `<p class="muted">${escape_html(error.message)}</p>`;
  }
}

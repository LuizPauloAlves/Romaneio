// Carrega o Leaflet (biblioteca de mapas gratuita) só quando um mapa for aberto.

import { OSM_CONFIG } from '../config/app_config.js';

let loading_promise = null;

export function load_leaflet() {
  if (window.L) return Promise.resolve(window.L);
  loading_promise ??= new Promise((resolve, reject) => {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = OSM_CONFIG.leaflet_css;
    document.head.append(stylesheet);

    const script = document.createElement('script');
    script.src = OSM_CONFIG.leaflet_js;
    script.onload = () => resolve(window.L);
    script.onerror = () => {
      loading_promise = null;
      reject(new Error('Não foi possível carregar o mapa. Verifique a internet.'));
    };
    document.head.append(script);
  });
  return loading_promise;
}

export function create_base_map(L, element, center, zoom = 13) {
  const map = L.map(element).setView([center.lat, center.lng], zoom);
  L.tileLayer(OSM_CONFIG.tile_url, { maxZoom: 19, attribution: OSM_CONFIG.tile_attribution }).addTo(map);
  return map;
}

// Marcador numerado (círculo com o número da parada).
export function create_number_icon(L, label, css_class = '') {
  return L.divIcon({
    className: `map-pin ${css_class}`,
    html: `<span>${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

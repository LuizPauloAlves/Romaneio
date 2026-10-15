// Cálculo de distâncias, tempos e traçado pelas estradas usando o OSRM (OpenStreetMap). Sem chave.

import { OSM_CONFIG } from '../config/app_config.js';

// Matriz de tempos (segundos) e distâncias (metros) entre todos os pontos. null = sem rota.
export async function fetch_osrm_table(points) {
  if (points.length > OSM_CONFIG.osrm_max_points) {
    throw new Error(`O cálculo gratuito aceita até ${OSM_CONFIG.osrm_max_points - 1} paradas por rota.`);
  }
  const url = `${OSM_CONFIG.osrm_url}/table/v1/driving/${to_coordinate_path(points)}?annotations=duration,distance`;
  const data = await fetch_osrm(url);
  return { durations: data.durations, distances: data.distances };
}

// Traçado da rota pelas estradas, para desenhar no mapa. Retorna lista de [lat, lng].
export async function fetch_osrm_route_geometry(points) {
  const url = `${OSM_CONFIG.osrm_url}/route/v1/driving/${to_coordinate_path(points)}?overview=full&geometries=geojson`;
  const data = await fetch_osrm(url);
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

function to_coordinate_path(points) {
  return points.map(({ lat, lng }) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
}

async function fetch_osrm(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Sem conexão com o servidor de rotas (OSRM). Verifique a internet.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code !== 'Ok') {
    throw new Error(`Servidor de rotas respondeu: ${data.message ?? data.code ?? response.status}. Tente novamente em instantes.`);
  }
  return data;
}

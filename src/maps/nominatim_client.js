// Busca de endereços no Nominatim (OpenStreetMap). Gratuito, sem chave,
// limitado a 1 consulta por segundo (o cliente espera sozinho entre as chamadas).

import { OSM_CONFIG } from '../config/app_config.js';

// Resultados nesses níveis são só a cidade ou o bairro: o ponto fica marcado como aproximado.
const CITY_LEVEL_TYPES = new Set([
  'city', 'town', 'municipality', 'village', 'county', 'state', 'region', 'country',
  'suburb', 'neighbourhood', 'quarter', 'city_district', 'postcode',
]);

let last_request_at = 0;

export async function search_nominatim(query, bias_point = null) {
  await wait_rate_limit();

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'br',
    'accept-language': 'pt-BR',
  });
  if (bias_point) params.set('viewbox', build_viewbox(bias_point));

  const results = await fetch_json(`${OSM_CONFIG.nominatim_url}?${params}`);
  const place = results[0];
  if (!place) return null;

  return {
    lat: Number(place.lat),
    lng: Number(place.lon),
    formatted_address: place.display_name,
    city_level: CITY_LEVEL_TYPES.has(place.addresstype),
  };
}

async function wait_rate_limit() {
  const elapsed = Date.now() - last_request_at;
  if (elapsed < OSM_CONFIG.nominatim_interval_ms) {
    await new Promise((resolve) => setTimeout(resolve, OSM_CONFIG.nominatim_interval_ms - elapsed));
  }
  last_request_at = Date.now();
}

// Caixa ao redor da base: prioriza resultados próximos sem excluir os distantes.
function build_viewbox({ lat, lng }) {
  const delta = OSM_CONFIG.search_bias_degrees;
  return [lng - delta, lat + delta, lng + delta, lat - delta].join(',');
}

async function fetch_json(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Sem conexão com o OpenStreetMap. Verifique a internet.');
  }
  if (response.status === 429) throw new Error('OpenStreetMap pediu uma pausa (muitas consultas). Tente em alguns minutos.');
  if (!response.ok) throw new Error(`OpenStreetMap respondeu com erro ${response.status}.`);
  return response.json();
}

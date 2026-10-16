// Consulta à Geocoding API do Google. Executa só no servidor: a chave nunca vai ao navegador.

const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const BIAS_DEGREES = 1.0; // prioriza resultados até ~100 km da base

// Tipos do Google que significam "só a região", sem endereço específico.
const AREA_TYPES = new Set([
  'locality', 'sublocality', 'sublocality_level_1', 'neighborhood', 'postal_code',
  'administrative_area_level_1', 'administrative_area_level_2', 'country',
]);

export async function geocode_with_google(api_key, query, bias = null, fetch_impl = fetch) {
  const params = new URLSearchParams({ address: query, key: api_key, region: 'br', language: 'pt-BR', components: 'country:BR' });
  if (bias) params.set('bounds', build_bounds(bias));

  const response = await fetch_impl(`${GEOCODING_URL}?${params}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google respondeu com erro ${response.status}.`);
  return parse_geocoding_response(data);
}

export function parse_geocoding_response(data) {
  if (data.status === 'ZERO_RESULTS') return { found: false };
  if (data.status !== 'OK') throw new Error(data.error_message ?? `Google respondeu ${data.status}.`);

  const place = data.results[0];
  return {
    found: true,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    formatted_address: place.formatted_address,
    precision: precision_of(place),
  };
}

function precision_of(place) {
  const { location_type } = place.geometry;
  if (location_type === 'ROOFTOP' || location_type === 'RANGE_INTERPOLATED') return 'exact';
  if (place.types.includes('route')) return 'street';
  if (location_type === 'APPROXIMATE' || place.types.some((type) => AREA_TYPES.has(type))) return 'approximate';
  return 'exact'; // comércio, prédio ou ponto de interesse
}

function build_bounds({ lat, lng }) {
  return `${lat - BIAS_DEGREES},${lng - BIAS_DEGREES}|${lat + BIAS_DEGREES},${lng + BIAS_DEGREES}`;
}

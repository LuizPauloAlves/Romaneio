// Segunda opinião: busca o endereço no Google (pela função da Vercel) quando o OpenStreetMap
// não acha ou acha só a cidade/rua. É opcional: se o servidor não tiver a chave do Google
// (ou o site estiver rodando sem servidor), esta etapa é ignorada e o app funciona só com o OSM.

import { post_api, ApiError } from './api_client.js';
import { APP_CONFIG } from '../config/app_config.js';

// Respostas que significam "não existe fallback Google neste servidor".
const UNAVAILABLE_STATUSES = new Set([404, 405, 501, 503]);

let availability = 'unknown'; // 'unknown' | 'disabled'
let last_problem = null;

export async function search_google(address, bias_point = null) {
  if (availability === 'disabled') return null;

  try {
    const result = await post_api(APP_CONFIG.google_fallback.endpoint, {
      query: address,
      bias: bias_point ? { lat: bias_point.lat, lng: bias_point.lng } : null,
    });
    if (!result.found) return null;
    return {
      lat: result.lat,
      lng: result.lng,
      formatted_address: result.formatted_address,
      precision: result.precision,
      source: 'google',
    };
  } catch (error) {
    return handle_failure(error);
  }
}

// Mensagem de problema do Google (chave recusada, senha errada…), uma vez só. null se não houve.
export function take_google_problem() {
  const problem = last_problem;
  last_problem = null;
  return problem;
}

function handle_failure(error) {
  if (error instanceof ApiError && UNAVAILABLE_STATUSES.has(error.status)) {
    availability = 'disabled';
    return null;
  }
  if (error instanceof ApiError && error.status > 0) last_problem = `Google: ${error.message}`;
  return null; // sem internet ou erro do Google: segue só com o OpenStreetMap
}

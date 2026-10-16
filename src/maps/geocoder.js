// Transforma endereço em coordenadas, com cache local.
//
// Ordem de busca:
//   1. coordenadas digitadas ("-23.38, -45.66")
//   2. cache (inclui pontos marcados no mapa)
//   3. OpenStreetMap (várias versões do endereço)
//   4. Google, só se o OSM não achou ou achou algo aproximado (opcional, via servidor)
// O melhor resultado fica salvo: na próxima semana o cliente já é encontrado.

import { search_nominatim } from './nominatim_client.js';
import { search_google } from './google_geocode_client.js';
import { build_search_variants, extract_house_number } from './address_variants.js';
import { is_approximate, pick_best } from './location_precision.js';
import { APP_CONFIG } from '../config/app_config.js';
import { get_geocode_cache, save_geocode_cache } from '../storage/storage_repository.js';

const COORDINATE_PATTERN = /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function geocode(address, bias_point = null) {
  const coordinates = parse_coordinates(address);
  if (coordinates) return coordinates;

  const cached = read_cached(address);
  if (cached) return cached;

  const wants_house_number = extract_house_number(address) != null;
  const { result: osm_result, error: osm_error } = await attempt(() => search_osm(address, bias_point, wants_house_number));

  if (osm_result && !osm_result.approximate) return remember_location(address, osm_result);

  const { result: google_result, error: google_error } = await attempt(async () => {
    const found = await search_google(address, bias_point);
    return found && { ...found, approximate: is_approximate(found.precision, wants_house_number) };
  });

  const best = pick_best([osm_result, google_result]);
  if (!best) {
    const error = osm_error ?? google_error;
    if (error) throw error;
    return null;
  }
  return best.approximate ? best : remember_location(address, best);
}

// Salva um ponto escolhido no mapa para este endereço.
export function save_manual_location(address, { lat, lng }) {
  return remember_location(address, { lat, lng, formatted_address: 'Marcado no mapa', precision: 'exact', approximate: false, source: 'manual' });
}

export function forget_cached_address(address) {
  const cache = get_geocode_cache();
  delete cache[normalize(address)];
  save_geocode_cache(cache);
}

async function search_osm(address, bias_point, wants_house_number) {
  for (const variant of build_search_variants(address)) {
    const found = await search_nominatim(variant.query, bias_point);
    if (!found) continue;
    const precision = variant.approximate ? 'approximate' : found.precision;
    return { ...found, precision, approximate: is_approximate(precision, wants_house_number), source: 'osm' };
  }
  return null;
}

// Executa a busca sem deixar o erro de uma fonte impedir a outra.
async function attempt(search) {
  try {
    return { result: await search(), error: null };
  } catch (error) {
    return { result: null, error };
  }
}

// Resultados do Google só podem ficar guardados por tempo limitado (regra de uso do Google).
function remember_location(address, location) {
  const expires_at = location.source === 'google' ? Date.now() + APP_CONFIG.google_fallback.cache_days * MS_PER_DAY : null;
  save_geocode_cache({ ...get_geocode_cache(), [normalize(address)]: { ...location, expires_at } });
  return location;
}

function read_cached(address) {
  const entry = get_geocode_cache()[normalize(address)];
  if (!entry) return null;
  return entry.expires_at && entry.expires_at < Date.now() ? null : entry;
}

function parse_coordinates(text) {
  const match = String(text).match(COORDINATE_PATTERN);
  if (!match) return null;
  return {
    lat: Number(match[1]), lng: Number(match[2]), formatted_address: 'Coordenadas informadas',
    precision: 'exact', approximate: false, source: 'manual',
  };
}

function normalize(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

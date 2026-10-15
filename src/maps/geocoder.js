// Transforma endereço em coordenadas, com cache local.
// Ordem: coordenadas digitadas → cache (inclui pontos marcados no mapa) → OpenStreetMap.
// Endereços ajustados no mapa ficam salvos: na próxima semana o cliente já é encontrado.

import { search_nominatim } from './nominatim_client.js';
import { build_search_variants } from './address_variants.js';
import { get_geocode_cache, save_geocode_cache } from '../storage/storage_repository.js';

const COORDINATE_PATTERN = /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/;

export async function geocode(address, bias_point = null) {
  const coordinates = parse_coordinates(address);
  if (coordinates) return coordinates;

  const cached = get_geocode_cache()[normalize(address)];
  if (cached) return cached;

  for (const variant of build_search_variants(address)) {
    const result = await search_nominatim(variant.query, bias_point);
    if (result) {
      const location = {
        lat: result.lat,
        lng: result.lng,
        formatted_address: result.formatted_address,
        approximate: variant.approximate || result.city_level,
      };
      if (!location.approximate) remember_location(address, location);
      return location;
    }
  }
  return null;
}

// Salva um ponto escolhido no mapa para este endereço.
export function save_manual_location(address, { lat, lng }) {
  const location = { lat, lng, formatted_address: 'Marcado no mapa', approximate: false };
  remember_location(address, location);
  return location;
}

export function forget_cached_address(address) {
  const cache = get_geocode_cache();
  delete cache[normalize(address)];
  save_geocode_cache(cache);
}

function remember_location(address, location) {
  save_geocode_cache({ ...get_geocode_cache(), [normalize(address)]: location });
}

function parse_coordinates(text) {
  const match = String(text).match(COORDINATE_PATTERN);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]), formatted_address: 'Coordenadas informadas', approximate: false };
}

function normalize(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

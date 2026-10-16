// Única porta de acesso aos dados salvos.
// Hoje grava no navegador (localStorage). Para usar um banco online gratuito (Supabase, Firebase),
// basta reescrever este arquivo mantendo as mesmas funções.

import { APP_CONFIG } from '../config/app_config.js';
import { DEFAULT_VEHICLE } from '../config/default_costs.js';

const KEYS = Object.freeze({
  settings: 'settings',
  vehicles: 'vehicles',
  routes: 'routes',
  geocode_cache: 'geocode_cache',
});

const DEFAULT_SETTINGS = Object.freeze({
  base: { ...APP_CONFIG.default_base },
  default_service_minutes: APP_CONFIG.default_service_minutes,
});

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storage_prefix + key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function write(key, value) {
  try {
    localStorage.setItem(APP_CONFIG.storage_prefix + key, JSON.stringify(value));
  } catch (error) {
    throw new Error(`Não foi possível salvar no navegador: ${error.message}`);
  }
}

// Configurações
export function get_settings() {
  const settings = { ...DEFAULT_SETTINGS, ...read(KEYS.settings, DEFAULT_SETTINGS) };
  return { ...settings, base: upgrade_legacy_base(settings.base) };
}

// Quem usou a versão anterior tinha a base só por endereço (sem coordenadas): troca pela base fixa.
function upgrade_legacy_base(base) {
  const is_legacy = base.address === APP_CONFIG.legacy_base_address && (base.lat == null || base.approximate);
  return is_legacy ? { ...APP_CONFIG.default_base } : base;
}
export const save_settings = (settings) => write(KEYS.settings, settings);

// Veículos (já preparado para mais de um)
export function get_vehicles() {
  const vehicles = read(KEYS.vehicles, []);
  return vehicles.length > 0 ? vehicles.map((vehicle) => ({ ...DEFAULT_VEHICLE, ...vehicle })) : [{ ...DEFAULT_VEHICLE }];
}
export const save_vehicles = (vehicles) => write(KEYS.vehicles, vehicles);
export const find_vehicle = (vehicle_id) => get_vehicles().find((vehicle) => vehicle.id === vehicle_id) ?? get_vehicles()[0];

// Rotas (histórico)
export const get_routes = () => read(KEYS.routes, []);
export const find_route = (route_id) => get_routes().find((route) => route.id === route_id) ?? null;

export function save_route(route) {
  const routes = get_routes().filter((item) => item.id !== route.id);
  write(KEYS.routes, [route, ...routes].sort((a, b) => b.date.localeCompare(a.date)));
}

export function delete_route(route_id) {
  write(KEYS.routes, get_routes().filter((route) => route.id !== route_id));
}

// Cache de endereços já localizados (economiza cota do Google)
export const get_geocode_cache = () => read(KEYS.geocode_cache, {});
export const save_geocode_cache = (cache) => write(KEYS.geocode_cache, cache);

// Backup completo
export function export_all_data() {
  return Object.fromEntries(Object.values(KEYS).map((key) => [key, read(key, null)]));
}

export function import_all_data(data) {
  Object.values(KEYS).forEach((key) => {
    if (data[key] != null) write(key, data[key]);
  });
}

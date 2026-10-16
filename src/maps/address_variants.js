// Gera versões cada vez mais simples de um endereço para tentar no OpenStreetMap.
// Primeiro expande abreviações (Av., Jd., Res.…). Depois, como o OSM não entende bem
// "Km 64", CEP, bairro, condomínio ou nome de estabelecimento junto do endereço, vamos
// removendo esses pedaços até achar algo. A última tentativa (só cidade) é marcada
// como aproximada para o usuário ajustar no mapa.

import { expand_abbreviations } from './address_abbreviations.js';

const CEP_PATTERN = /\b(?:cep[:.\s]*)?\d{5}-?\d{3}\b/gi; // "12260-000" ou "CEP 12260000"
const KM_PATTERN = /\b(km\s*\d+([.,]\d+)?|\d+([.,]\d+)?\s*km)\b/gi; // "Km 64" ou "60km"
const SEPARATOR_PATTERN = /\s*[,–—]\s*|\s+-\s+/;
const STATE_PATTERN = /^[A-Z]{2}$/;
const STREET_PREFIX = /^(rua|r\.|av\.?|avenida|rod\.?|rodovia|estrada|estr\.?|pra[çc]a|travessa|alameda|largo|via|sp-?\d+)\b/i;
const HIGHWAY_PATTERN = /^(rod\.?|rodovia|estrada|estr\.?)\b|\b(sp|br)-?\d+/i;
const HOUSE_NUMBER_PART = /^(n[º°o.]*\s*)?(\d{1,5}[a-z]?)$/i;
const TRAILING_NUMBER = /\s(\d{1,5})$/;

export function build_search_variants(address) {
  const { without_cep, without_km } = clean_parts(address);
  const starts_with_name = without_km.length > 2 && !STREET_PREFIX.test(without_km[0]);
  const without_name = starts_with_name ? without_km.slice(1) : without_km;
  const city = extract_city(without_km);

  const variants = [
    { query: join_parts(without_cep), approximate: false },
    { query: join_parts(without_km), approximate: false },
    { query: join_parts(without_name), approximate: false },
    { query: build_street_and_city(without_km, city), approximate: false },
    city && { query: city, approximate: true },
  ].filter((variant) => variant && variant.query);

  return dedupe(variants);
}

// Número da casa/prédio, se o endereço tiver um ("Av. X, 521 - Bairro" → "521"). Km de rodovia não conta.
export function extract_house_number(address) {
  const { without_km } = clean_parts(address);
  const separate_part = without_km.slice(1).map((part) => part.match(HOUSE_NUMBER_PART)).find(Boolean);
  if (separate_part) return separate_part[2];

  const first = without_km[0] ?? '';
  const trailing = first.match(TRAILING_NUMBER);
  const is_street = STREET_PREFIX.test(first) && !HIGHWAY_PATTERN.test(first);
  return trailing && is_street ? trailing[1] : null;
}

function clean_parts(address) {
  const parts = expand_abbreviations(address).split(SEPARATOR_PATTERN).map((part) => part.trim()).filter(Boolean);
  const without_cep = parts.map((part) => part.replace(CEP_PATTERN, '').trim()).filter(Boolean);
  const without_km = without_cep.map((part) => part.replace(KM_PATTERN, '').trim()).filter(Boolean);
  return { without_cep, without_km };
}

// "Rua X, 10, Condomínio Y, Cidade, SP" → "Rua X, 10, Cidade, SP" (sem bairro nem condomínio).
function build_street_and_city(parts, city) {
  if (!city || parts.length < 4) return '';
  const number_part = parts.slice(1).find((part) => HOUSE_NUMBER_PART.test(part));
  return [parts[0], number_part, city].filter(Boolean).join(', ');
}

// Pega "Cidade, UF" a partir do fim do endereço.
function extract_city(parts) {
  if (parts.length === 0) return '';
  const last = parts.at(-1);
  if (STATE_PATTERN.test(last) && parts.length >= 2) return `${parts.at(-2)}, ${last}`;
  return parts.length >= 2 ? last : '';
}

function join_parts(parts) {
  return parts.join(', ');
}

function dedupe(variants) {
  const seen = new Set();
  return variants.filter((variant) => {
    const key = variant.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

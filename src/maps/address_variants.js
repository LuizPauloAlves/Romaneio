// Gera versões cada vez mais simples de um endereço para tentar no OpenStreetMap.
// O OSM não entende bem "Km 64", CEP ou nome de estabelecimento junto do endereço,
// então vamos removendo esses pedaços até achar algo. A última tentativa (só cidade)
// é marcada como aproximada para o usuário ajustar no mapa.

const CEP_PATTERN = /\b\d{5}-?\d{3}\b/g;
const KM_PATTERN = /\b(km\s*\d+([.,]\d+)?|\d+([.,]\d+)?\s*km)\b/gi; // "Km 64" ou "60km"
const SEPARATOR_PATTERN = /\s*[,–—]\s*|\s+-\s+/;
const STATE_PATTERN = /^[A-Z]{2}$/;
const STREET_PREFIX = /^(rua|r\.|av\.?|avenida|rod\.?|rodovia|estrada|estr\.?|pra[çc]a|travessa|alameda|largo|via|sp-?\d+)\b/i;

export function build_search_variants(address) {
  const parts = split_parts(address);
  const without_cep = parts.map((part) => part.replace(CEP_PATTERN, '').trim()).filter(Boolean);
  const without_km = without_cep.map((part) => part.replace(KM_PATTERN, '').trim()).filter(Boolean);
  const starts_with_name = without_km.length > 2 && !STREET_PREFIX.test(without_km[0]);
  const without_name = starts_with_name ? without_km.slice(1) : without_km;
  const city_only = extract_city(without_km);

  const variants = [
    { query: join_parts(without_cep), approximate: false },
    { query: join_parts(without_km), approximate: false },
    { query: join_parts(without_name), approximate: false },
    city_only && { query: city_only, approximate: true },
  ].filter((variant) => variant && variant.query);

  return dedupe(variants);
}

function split_parts(address) {
  return String(address ?? '')
    .split(SEPARATOR_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean);
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

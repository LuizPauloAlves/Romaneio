// Monta a matriz completa de tempos e distâncias entre todos os pontos (via OSRM).

import { fetch_osrm_table } from './osrm_client.js';

// Valor usado quando não existe rota entre dois pontos (o otimizador evita esse trecho).
const UNREACHABLE_SECONDS = 24 * 3600;
const UNREACHABLE_METERS = 1_000_000;

export async function build_distance_matrix(points) {
  const table = await fetch_osrm_table(points);
  return {
    durations: replace_missing(table.durations, UNREACHABLE_SECONDS),
    distances: replace_missing(table.distances, UNREACHABLE_METERS),
  };
}

export function find_unreachable_points(matrix) {
  return matrix.durations
    .map((row, index) => ({ index, unreachable: row.some((value, column) => column !== index && value >= UNREACHABLE_SECONDS) }))
    .filter((item) => item.unreachable)
    .map((item) => item.index);
}

function replace_missing(rows, fallback) {
  return rows.map((row, row_index) => row.map((value, column) => {
    if (row_index === column) return 0;
    return value == null ? fallback : value;
  }));
}

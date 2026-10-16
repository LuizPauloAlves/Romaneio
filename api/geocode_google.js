// POST /api/geocode_google  { "query": "Av. Cassiano Ricardo, 521 - São José dos Campos - SP", "bias": { "lat": ..., "lng": ... } }
// → { "found": true, "lat": ..., "lng": ..., "formatted_address": "...", "precision": "exact" }
//
// Variáveis de ambiente (cadastradas na Vercel, nunca no código):
//   GOOGLE_MAPS_API_KEY  chave do Google (obrigatória; sem ela este recurso fica desligado)
//   APP_ACCESS_TOKEN     senha opcional, para estranhos não gastarem a sua cota

import { geocode_with_google } from './_lib/google_geocoder.js';

const MAX_QUERY_LENGTH = 300;

export default async function handler(req, res) {
  if (req.method !== 'POST') return send_json(res, 405, { error: 'Use POST.' });

  const api_key = process.env.GOOGLE_MAPS_API_KEY;
  if (!api_key) return send_json(res, 503, { error: 'Google não configurado neste servidor.' });

  const access_token = process.env.APP_ACCESS_TOKEN;
  if (access_token && req.headers['x-app-token'] !== access_token) {
    return send_json(res, 401, { error: 'Senha de acesso inválida. Confira em Configurações.' });
  }

  const { query, bias } = read_body(req);
  const text = String(query ?? '').trim();
  if (!text || text.length > MAX_QUERY_LENGTH) return send_json(res, 400, { error: 'Endereço vazio ou muito longo.' });

  try {
    return send_json(res, 200, await geocode_with_google(api_key, text, is_valid_point(bias) ? bias : null));
  } catch (error) {
    return send_json(res, 502, { error: error.message });
  }
}

function is_valid_point(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
}

function read_body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

function send_json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

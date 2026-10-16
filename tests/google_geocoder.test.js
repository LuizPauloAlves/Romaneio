import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geocode_with_google, parse_geocoding_response } from '../api/_lib/google_geocoder.js';
import handler from '../api/geocode_google.js';

const google_ok = (location_type, types) => ({
  status: 'OK',
  results: [{ formatted_address: 'Av. Cassiano Ricardo, 521 - SJC', types, geometry: { location: { lat: -23.2, lng: -45.9 }, location_type } }],
});

test('interpreta a precisão da resposta do Google', () => {
  assert.equal(parse_geocoding_response(google_ok('ROOFTOP', ['street_address'])).precision, 'exact');
  assert.equal(parse_geocoding_response(google_ok('RANGE_INTERPOLATED', ['street_address'])).precision, 'exact');
  assert.equal(parse_geocoding_response(google_ok('GEOMETRIC_CENTER', ['route'])).precision, 'street');
  assert.equal(parse_geocoding_response(google_ok('APPROXIMATE', ['locality', 'political'])).precision, 'approximate');
  assert.equal(parse_geocoding_response(google_ok('GEOMETRIC_CENTER', ['establishment'])).precision, 'exact');
});

test('ZERO_RESULTS vira found:false e erros do Google viram exceção', () => {
  assert.deepEqual(parse_geocoding_response({ status: 'ZERO_RESULTS' }), { found: false });
  assert.throws(() => parse_geocoding_response({ status: 'REQUEST_DENIED', error_message: 'API não ativada' }), /API não ativada/);
});

test('a chamada ao Google leva a chave, o país e a região de preferência', async () => {
  let requested_url;
  const fake_fetch = async (url) => {
    requested_url = new URL(url);
    return { ok: true, json: async () => google_ok('ROOFTOP', ['street_address']) };
  };
  const result = await geocode_with_google('CHAVE', 'Av. X, 1', { lat: -23.5, lng: -45.5 }, fake_fetch);
  assert.equal(result.found, true);
  assert.equal(requested_url.searchParams.get('key'), 'CHAVE');
  assert.equal(requested_url.searchParams.get('components'), 'country:BR');
  assert.equal(requested_url.searchParams.get('bounds'), '-24.5,-46.5|-22.5,-44.5');
});

function call_handler({ method = 'POST', headers = {}, body = { query: 'Av. X, 1' } }) {
  const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(text) { this.body = JSON.parse(text); } };
  return handler({ method, headers, body }, res).then(() => res);
}

test('servidor: sem chave devolve 503 e não consulta o Google', async () => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  assert.equal((await call_handler({})).statusCode, 503);
});

test('servidor: exige POST e respeita a senha de acesso', async () => {
  process.env.GOOGLE_MAPS_API_KEY = 'CHAVE';
  process.env.APP_ACCESS_TOKEN = 'segredo';
  assert.equal((await call_handler({ method: 'GET' })).statusCode, 405);
  assert.equal((await call_handler({ headers: { 'x-app-token': 'errada' } })).statusCode, 401);
  delete process.env.APP_ACCESS_TOKEN;
});

test('servidor: rejeita endereço vazio e devolve o resultado do Google', async () => {
  process.env.GOOGLE_MAPS_API_KEY = 'CHAVE';
  assert.equal((await call_handler({ body: { query: '  ' } })).statusCode, 400);

  const original_fetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => google_ok('ROOFTOP', ['street_address']) });
  try {
    const res = await call_handler({});
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { found: true, lat: -23.2, lng: -45.9, formatted_address: 'Av. Cassiano Ricardo, 521 - SJC', precision: 'exact' });
  } finally {
    globalThis.fetch = original_fetch;
    delete process.env.GOOGLE_MAPS_API_KEY;
  }
});

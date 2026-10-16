import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is_approximate, pick_best } from '../src/maps/location_precision.js';

test('só cidade é sempre aproximado; só rua só quando o endereço tem número', () => {
  assert.equal(is_approximate('approximate', false), true);
  assert.equal(is_approximate('street', true), true);
  assert.equal(is_approximate('street', false), false);
  assert.equal(is_approximate('exact', true), false);
});

test('escolhe o resultado mais preciso e, em empate, o mais recente', () => {
  const osm = { precision: 'street', source: 'osm' };
  const google = { precision: 'exact', source: 'google' };
  assert.equal(pick_best([osm, google]).source, 'google');
  assert.equal(pick_best([{ precision: 'exact', source: 'osm' }, { precision: 'street', source: 'google' }]).source, 'osm');
  assert.equal(pick_best([{ precision: 'street', source: 'osm' }, { precision: 'street', source: 'google' }]).source, 'google');
  assert.equal(pick_best([null, null]), null);
  assert.equal(pick_best([null, osm]), osm);
});

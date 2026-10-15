import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build_search_variants } from '../src/maps/address_variants.js';

test('remove CEP, km e nome do estabelecimento aos poucos', () => {
  const variants = build_search_variants('Restaurante Neblina, Km 64 – Paraibuna – SP, 12260-000');
  assert.deepEqual(variants.map((variant) => variant.query), [
    'Restaurante Neblina, Km 64, Paraibuna, SP',
    'Restaurante Neblina, Paraibuna, SP',
    'Paraibuna, SP',
  ]);
});

test('entende "60km" e marca a cidade como aproximada', () => {
  const variants = build_search_variants('Rod. dos Tamoios, 60km - Espigão, Paraibuna - SP');
  assert.equal(variants[0].query, 'Rod. dos Tamoios, 60km, Espigão, Paraibuna, SP');
  assert.equal(variants[1].query, 'Rod. dos Tamoios, Espigão, Paraibuna, SP');
  assert.deepEqual(variants.at(-1), { query: 'Paraibuna, SP', approximate: true });
});

test('endereço simples gera uma única tentativa exata', () => {
  const variants = build_search_variants('Rua das Flores 120');
  assert.deepEqual(variants, [{ query: 'Rua das Flores 120', approximate: false }]);
});

test('não descarta o nome da rua achando que é estabelecimento', () => {
  const variants = build_search_variants('Rua Coronel Camargo, Centro – Natividade da Serra – SP');
  assert.ok(variants.every((variant) => variant.approximate || variant.query.startsWith('Rua Coronel Camargo')));
  assert.deepEqual(variants.at(-1), { query: 'Natividade da Serra, SP', approximate: true });
});

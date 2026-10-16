import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build_search_variants, extract_house_number } from '../src/maps/address_variants.js';

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
  assert.equal(variants[0].query, 'Rodovia dos Tamoios, 60km, Espigão, Paraibuna, SP');
  assert.equal(variants[1].query, 'Rodovia dos Tamoios, Espigão, Paraibuna, SP');
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

test('endereço com bairro e número ganha uma versão só com rua, número e cidade', () => {
  const variants = build_search_variants('Av. Cassiano Ricardo, 521 - Parque Res. Aquarius, São José dos Campos - SP');
  assert.ok(variants.some((variant) => variant.query === 'Avenida Cassiano Ricardo, 521, São José dos Campos, SP' && !variant.approximate));
});

test('condomínio é removido na versão simplificada', () => {
  const variants = build_search_variants('Rua Narcisio da Silva, 10, Condominio Chacara dos Eucaliptos, São José dos Campos - SP');
  assert.ok(variants.some((variant) => variant.query === 'Rua Narcisio da Silva, 10, São José dos Campos, SP'));
});

test('extract_house_number lê o número, mas não o km da rodovia', () => {
  assert.equal(extract_house_number('Av. Cassiano Ricardo, 521 - Parque Res. Aquarius, São José dos Campos - SP'), '521');
  assert.equal(extract_house_number('Rua Narcisio da Silva, 10, Condominio Chacara dos Eucaliptos, São José dos Campos - SP'), '10');
  assert.equal(extract_house_number('Av. Dep. Benedito Matarazzo, 9009 - Jd Oswaldo Cruz, São José dos Campos - SP'), '9009');
  assert.equal(extract_house_number('Rua das Flores 120, Centro, Paraibuna - SP'), '120');
  assert.equal(extract_house_number('Restaurante Neblina, Km 64 – Paraibuna – SP, 12260-000'), null);
  assert.equal(extract_house_number('Rod. dos Tamoios, 60km - Espigão, Paraibuna - SP'), null);
});

test('abreviações são expandidas antes de buscar', () => {
  const variants = build_search_variants('Av. Dep. Benedito Matarazzo, 9009 - Jd Oswaldo Cruz, São José dos Campos - SP');
  assert.equal(variants[0].query, 'Avenida Deputado Benedito Matarazzo, 9009, Jardim Oswaldo Cruz, São José dos Campos, SP');
  assert.ok(variants.some((variant) => variant.query === 'Avenida Deputado Benedito Matarazzo, 9009, São José dos Campos, SP'));
});

test('remove o CEP mesmo com o rótulo "CEP" na frente', () => {
  const variants = build_search_variants('Rua das Flores, 120, Centro, Paraibuna - SP – CEP 12260-000');
  assert.ok(variants.every((variant) => !/cep|12260/i.test(variant.query)));
  assert.deepEqual(variants.at(-1), { query: 'Paraibuna, SP', approximate: true });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse_romaneio_text, decode_text_file } from '../src/parsing/txt_parser.js';

const SAMPLE = `1. CINTIA RAMOS DE PAULA “NEBLINA” – 1 caixa Quadrada – Pedido 18182
Restaurante Neblina, Km 64 – Paraibuna – SP, 12260-000

2) JOÃO DA SILVA - 2 caixas - Pedido nº 18183
Rua das Flores, 120
Centro, Paraibuna - SP
`;

test('lê blocos numerados com cliente, pedido e endereço', () => {
  const stops = parse_romaneio_text(SAMPLE);
  assert.equal(stops.length, 2);
  assert.equal(stops[0].client, 'CINTIA RAMOS DE PAULA “NEBLINA”');
  assert.equal(stops[0].order_number, '18182');
  assert.equal(stops[0].address, 'Restaurante Neblina, Km 64 – Paraibuna – SP, 12260-000');
  assert.equal(stops[1].order_number, '18183');
  assert.equal(stops[1].address, 'Rua das Flores, 120, Centro, Paraibuna - SP');
});

test('CEP no início da linha não vira cabeçalho', () => {
  const stops = parse_romaneio_text('1. CLIENTE\n12260-000 Paraibuna');
  assert.equal(stops.length, 1);
  assert.equal(stops[0].address, '12260-000 Paraibuna');
});

test('sem numeração, cada linha é um endereço', () => {
  const stops = parse_romaneio_text('Rua A, 10\nRua B, 20\n');
  assert.deepEqual(stops.map((stop) => stop.address), ['Rua A, 10', 'Rua B, 20']);
});

test('decodifica arquivo ANSI (windows-1252)', () => {
  const bytes = new Uint8Array([0x4a, 0x6f, 0xe3, 0x6f]); // "João" em windows-1252
  assert.equal(decode_text_file(bytes.buffer), 'João');
});

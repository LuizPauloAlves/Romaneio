import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entries_to_rows, describe_manual_row, create_empty_entry } from '../src/parsing/manual_entries.js';
import { parse_romaneio_rows } from '../src/parsing/romaneio_table.js';

const read = (entries) => parse_romaneio_rows(entries_to_rows(entries), { describe_row: describe_manual_row });

test('clientes digitados viram entregas, como na planilha', () => {
  const { stops, warnings } = read([
    { client: 'MERCEARIA AQUARIUS', address: 'Av. Cassiano Ricardo, 521, São José dos Campos - SP', cep: '', packages: '3', nf: '0000018183', payment: 'boleto' },
    { client: 'PADARIA', address: 'Rua A, 10, Paraibuna - SP', cep: '12260000', packages: '2 caixas', nf: '7', payment: 'cash' },
  ]);
  assert.deepEqual(warnings, []);
  assert.equal(stops.length, 2);
  assert.equal(stops[0].payment, 'boleto');
  assert.equal(stops[0].nf, '0000018183');
  assert.equal(stops[1].packages, '2 caixas');
  assert.equal(stops[1].cep, '12260-000');
  assert.equal(stops[1].payment, 'cash');
});

test('linha vazia é ignorada e os avisos falam "Cliente N"', () => {
  const { stops, warnings } = read([
    { client: 'A', address: 'Rua 1', payment: 'cash' },
    create_empty_entry(),
    { client: 'SEM ENDEREÇO', address: '', payment: 'cash' },
    { client: 'SEM PAGAMENTO', address: 'Rua 4' },
  ]);
  assert.equal(stops.length, 2);
  assert.deepEqual(warnings, [
    'Cliente 3 (SEM ENDEREÇO): sem endereço, ficou fora da rota.',
    'Cliente 4 (SEM PAGAMENTO): forma de pagamento não informada.',
  ]);
});

test('lista sem nenhum cliente não dá erro', () => {
  assert.deepEqual(read([create_empty_entry()]), { stops: [], warnings: [] });
});

test('as cinco formas escolhidas na lista chegam como estão', () => {
  const keys = ['cash', 'boleto', 'transfer', 'pix', 'card'];
  const { stops, warnings } = read(keys.map((payment, index) => ({ client: `C${index}`, address: `Rua ${index}`, payment })));
  assert.deepEqual(warnings, []);
  assert.deepEqual(stops.map((stop) => stop.payment), keys);
});

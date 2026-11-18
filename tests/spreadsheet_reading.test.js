import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse_csv } from '../src/parsing/csv_parser.js';
import { read_xlsx_rows } from '../src/parsing/xlsx_reader.js';
import { parse_romaneio_rows } from '../src/parsing/romaneio_table.js';
import { parse_pasted_text } from '../src/parsing/romaneio_file_reader.js';
import { decode_text_file } from '../src/parsing/text_decoder.js';

const load_buffer = async (path) => {
  const file = await readFile(new URL(path, import.meta.url));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
};

test('CSV com ";" do Excel, aspas e campo vazio', () => {
  const rows = parse_csv('﻿Cliente;Endereço;NF\r\n"JOSÉ ""ZÉ"" SILVA";"Rua A, 10; fundos";007\r\n;;\r\n');
  assert.deepEqual(rows, [['Cliente', 'Endereço', 'NF'], ['JOSÉ "ZÉ" SILVA', 'Rua A, 10; fundos', '007'], ['', '', '']]);
});

test('CSV com vírgula e texto colado do Excel (tabulação)', () => {
  assert.deepEqual(parse_csv('Cliente,Endereço\nA,"Rua B, 2"'), [['Cliente', 'Endereço'], ['A', 'Rua B, 2']]);
  assert.deepEqual(parse_csv('Cliente\tEndereço\nA\tRua B, 2'), [['Cliente', 'Endereço'], ['A', 'Rua B, 2']]);
});

test('modelo CSV de exemplo vira 4 paradas com pacotes, NF e pagamento', async () => {
  const { stops, warnings } = parse_romaneio_rows(parse_csv(decode_text_file(await load_buffer('../exemplos/exemplo_romaneio.csv'))));
  assert.equal(stops.length, 4);
  assert.deepEqual(warnings, []);
  assert.equal(stops[0].client, 'CINTIA RAMOS DE PAULA "NEBLINA"');
  assert.equal(stops[0].address, 'Restaurante Neblina, Km 64 – Paraibuna – SP – CEP 12260-000');
  assert.equal(stops[0].packages, '1 caixa');
  assert.equal(stops[0].nf, '0000018182');
  assert.deepEqual(stops.map((stop) => stop.payment), ['cash', 'boleto', 'pix', 'card']);
  assert.equal(stops[1].details, '3 pacotes – NF 0000018183 – Boleto');
  assert.equal(stops[3].details, '4 pacotes – NF 0000018185 – Cartão');
});

for (const fixture of ['romaneio_openpyxl.xlsx', 'romaneio_libreoffice.xlsx']) {
  test(`lê Excel gravado por ${fixture.includes('openpyxl') ? 'openpyxl' : 'LibreOffice'}`, async () => {
    const rows = await read_xlsx_rows(await load_buffer(`./fixtures/${fixture}`));
    const { stops } = parse_romaneio_rows(rows);
    assert.equal(stops.length, 4);
    assert.equal(stops[1].address, 'Av. Cassiano Ricardo, 521 - Parque Res. Aquarius, São José dos Campos - SP');
    assert.equal(stops[3].client, 'PADARIA OSWALDO CRUZ');
    assert.equal(stops[0].payment, 'cash'); // planilha antiga: colunas "A vista"/"Boleto" com X
  });
}

test('Excel: título acima do cabeçalho, números, CEP numérico e linha sem endereço', async () => {
  const rows = await read_xlsx_rows(await load_buffer('./fixtures/romaneio_openpyxl.xlsx'));
  assert.equal(rows[0][0], 'Romaneio semana 42');
  const { stops, warnings } = parse_romaneio_rows(rows);
  assert.equal(stops[0].cep, '12260-000');
  assert.equal(stops[0].packages, '1');
  assert.equal(stops[1].nf, '18183');
  assert.deepEqual(warnings, ['Linha 9 (SEM ENDERECO LTDA): sem endereço, ficou fora da rota.']);
});

test('modelo antigo: colunas "A vista"/"Boleto" com X continuam aceitas', () => {
  const { stops, warnings } = parse_romaneio_rows([
    ['CLIENTE', 'ENDEREÇO', 'À VISTA', 'BOLETO'],
    ['A', 'Rua 1', 'x', ''],
    ['B', 'Rua 2', '', ''],
    ['C', 'Rua 3', 'X', 'X'],
    ['D', 'Rua 4', '', 'X'],
  ]);
  assert.deepEqual(stops.map((stop) => stop.payment), ['cash', '', '', 'boleto']);
  assert.deepEqual(warnings, [
    'Linha 3 (B): forma de pagamento não informada.',
    'Linha 4 (C): marcado "A vista" e "Boleto" ao mesmo tempo.',
  ]);
});

test('coluna "Pagamento": aceita as cinco formas e avisa o que não reconhecer', () => {
  const { stops, warnings } = parse_romaneio_rows([
    ['Cliente', 'Endereço', 'Forma de pagamento'],
    ['A', 'Rua 1', 'pix'],
    ['B', 'Rua 2', 'Transferencia'],
    ['C', 'Rua 3', ''],
    ['D', 'Rua 4', 'Cheque'],
  ]);
  assert.deepEqual(stops.map((stop) => stop.payment), ['pix', 'transfer', '', '']);
  assert.deepEqual(warnings, [
    'Linha 4 (C): forma de pagamento não informada.',
    'Linha 5 (D): forma de pagamento "Cheque" não reconhecida (use À vista, Boleto, Transferência, Pix, Cartão).',
  ]);
});

test('Excel com a lista suspensa, gravado pelo LibreOffice', async () => {
  const rows = await read_xlsx_rows(await load_buffer('./fixtures/romaneio_pagamento_libreoffice.xlsx'));
  const { stops, warnings } = parse_romaneio_rows(rows);
  assert.deepEqual(warnings, []);
  assert.deepEqual(stops.map((stop) => stop.payment), ['pix', 'card', 'transfer', 'cash', 'boleto']);
  assert.equal(stops[2].nf, '0000000003');
});

test('CEP com zero à esquerda perdido pelo Excel é corrigido', () => {
  const { stops } = parse_romaneio_rows([['Cliente', 'Endereço', 'CEP'], ['A', 'Av. Paulista, 1000, São Paulo - SP', '1310100']]);
  assert.equal(stops[0].cep, '01310-100');
});

test('sem as colunas obrigatórias dá erro claro', () => {
  assert.throws(() => parse_romaneio_rows([['Nome', 'Rua']]), /Cliente.*Endereço/);
});

test('texto colado: planilha ou formato antigo', () => {
  assert.equal(parse_pasted_text('Cliente\tEndereço\nA\tRua 1').stops[0].client, 'A');
  assert.equal(parse_pasted_text('1. CLIENTE X – 1 caixa\nRua 2, Centro').stops[0].address, 'Rua 2, Centro');
});

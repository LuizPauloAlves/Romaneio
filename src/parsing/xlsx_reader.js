// Lê a primeira aba de um arquivo Excel (.xlsx) e devolve as linhas como listas de textos.
// A posição na lista é a linha do Excel (índice 0 = linha 1), inclusive linhas vazias.
// Não usa bibliotecas: abre o ZIP e lê os XMLs da planilha diretamente.

import { read_zip_entries } from './zip_reader.js';

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export async function read_xlsx_rows(array_buffer) {
  const entries = read_zip_entries(array_buffer);
  const read_text = (name) => (entries.has(name) ? entries.get(name)() : Promise.resolve(''));

  const sheet_path = await find_first_sheet_path(read_text);
  const shared_strings = parse_shared_strings(await read_text('xl/sharedStrings.xml'));
  const sheet_xml = await read_text(sheet_path);
  if (!sheet_xml) throw new Error('Não encontrei a primeira aba da planilha.');
  return parse_sheet_rows(sheet_xml, shared_strings);
}

async function find_first_sheet_path(read_text) {
  const workbook = await read_text('xl/workbook.xml');
  const relationships = await read_text('xl/_rels/workbook.xml.rels');
  const first_sheet = workbook.match(/<(?:\w+:)?sheet\b[^>]*>/)?.[0] ?? '';
  const relationship_id = first_sheet.match(/\b(?:\w+:)?id="([^"]+)"/)?.[1];

  const relationship = (relationships.match(/<(?:\w+:)?Relationship\b[^>]*>/g) ?? [])
    .find((tag) => get_attribute(tag, 'Id') === relationship_id);
  const target = relationship ? get_attribute(relationship, 'Target') : 'worksheets/sheet1.xml';
  return target.startsWith('/') ? target.slice(1) : `xl/${target}`;
}

function parse_shared_strings(xml) {
  return (xml.match(/<(?:\w+:)?si\b[\s\S]*?<\/(?:\w+:)?si>/g) ?? []).map(extract_text);
}

function parse_sheet_rows(xml, shared_strings) {
  const rows = [];
  for (const row_match of xml.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const row_number = Number(get_attribute(row_match[1], 'r')) || rows.length + 1;
    const row = [];
    let next_column = 0;
    for (const cell_match of (row_match[2] ?? '').matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attributes = cell_match[1];
      const reference = get_attribute(attributes, 'r');
      const column = reference ? column_index(reference) : next_column;
      row[column] = read_cell_value(get_attribute(attributes, 't'), cell_match[2] ?? '', shared_strings);
      next_column = column + 1;
    }
    rows[row_number - 1] = Array.from(row, (value) => value ?? '');
  }
  // Mantém as linhas vazias para a numeração bater com a do Excel nos avisos.
  return Array.from(rows, (row) => row ?? []);
}

function read_cell_value(type, inner_xml, shared_strings) {
  if (type === 'inlineStr') return extract_text(inner_xml).trim();
  const raw = decode_entities(inner_xml.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1] ?? '');
  if (type === 's') return (shared_strings[Number(raw)] ?? '').trim();
  if (type === 'b') return raw === '1' ? 'VERDADEIRO' : '';
  if (type === 'str' || type === 'e') return raw.trim();
  return format_number(raw);
}

// Números do Excel vêm como "123456789" ou "2.0000000000000004": devolve o texto limpo.
function format_number(raw) {
  if (raw === '') return '';
  const number = Number(raw);
  if (!Number.isFinite(number)) return raw;
  return Number.isInteger(number) ? String(number) : String(Number(number.toPrecision(12)));
}

// Junta todos os <t> de um bloco (texto com formatação vem em vários pedaços), ignorando a fonética.
function extract_text(xml) {
  const without_phonetic = xml.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '');
  return [...without_phonetic.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)]
    .map((match) => decode_entities(match[1]))
    .join('');
}

function column_index(reference) {
  const letters = reference.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? 'A';
  return [...letters].reduce((total, letter) => total * 26 + (letter.charCodeAt(0) - 64), 0) - 1;
}

function get_attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;
}

function decode_entities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, code) => {
    if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
    return XML_ENTITIES[code] ?? entity;
  });
}

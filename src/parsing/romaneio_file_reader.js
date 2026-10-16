// Ponto único de entrada: recebe o arquivo (ou texto colado) e devolve { stops, warnings }.
//   .xlsx → Excel   |   .csv → CSV   |   .txt → formato antigo
//   texto colado → planilha (copiado do Excel) ou formato antigo

import { decode_text_file } from './text_decoder.js';
import { parse_csv } from './csv_parser.js';
import { read_xlsx_rows } from './xlsx_reader.js';
import { parse_romaneio_rows, looks_like_table } from './romaneio_table.js';
import { parse_romaneio_text } from './txt_parser.js';

export const ACCEPTED_EXTENSIONS = '.xlsx,.csv,.txt';

export async function read_romaneio_file(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  const buffer = await file.arrayBuffer();

  if (extension === 'xlsx') return parse_romaneio_rows(await read_xlsx_rows(buffer));
  if (extension === 'csv') return parse_romaneio_rows(parse_csv(decode_text_file(buffer)));
  if (extension === 'txt') return parse_pasted_text(decode_text_file(buffer));
  if (extension === 'xls') throw new Error('Arquivo .xls antigo: abra no Excel e salve como .xlsx (Pasta de Trabalho do Excel) ou .csv.');
  throw new Error('Formato não reconhecido. Use .xlsx ou .csv (veja o modelo no site).');
}

export function parse_pasted_text(text) {
  const rows = parse_csv(text);
  if (looks_like_table(rows)) return parse_romaneio_rows(rows);
  return { stops: parse_romaneio_text(text), warnings: [] };
}

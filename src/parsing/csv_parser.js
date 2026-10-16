// Lê texto CSV (ou colado do Excel) e devolve uma lista de linhas, cada uma uma lista de células.
// Descobre sozinho o separador: ";" (Excel em português), "," ou tabulação (colado do Excel).
// Aceita campos entre aspas, com aspas duplas ("") e quebras de linha dentro.

const CANDIDATE_DELIMITERS = [';', '\t', ','];

export function parse_csv(text) {
  const content = String(text ?? '').replace(/^﻿/, '');
  const delimiter = detect_delimiter(content);
  const rows = [];
  let row = [];
  let cell = '';
  let in_quotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (in_quotes) {
      if (char === '"' && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        in_quotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.trim() === '') {
      in_quotes = true;
      cell = '';
    } else if (char === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows; // linhas vazias ficam, para a numeração bater com a da planilha
}

// O separador mais frequente na primeira linha (fora de aspas).
function detect_delimiter(content) {
  const first_line = content.split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, '');
  const counts = CANDIDATE_DELIMITERS.map((delimiter) => ({ delimiter, count: first_line.split(delimiter).length - 1 }));
  const best = counts.reduce((winner, current) => (current.count > winner.count ? current : winner));
  return best.count > 0 ? best.delimiter : ';';
}

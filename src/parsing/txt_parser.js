// Lê o texto do romaneio (.txt) e devolve a lista de paradas.
//
// Formato esperado (uma entrega por bloco):
//   1. CINTIA RAMOS DE PAULA "NEBLINA" – 1 caixa Quadrada – Pedido 18182
//   Restaurante Neblina, Km 64 – Paraibuna – SP, 12260-000
//
// A primeira linha (numerada) identifica a entrega; as linhas seguintes são o endereço.
// Se o arquivo não tiver linhas numeradas, cada linha é tratada como um endereço.

const HEADER_PATTERN = /^\s*(\d{1,3})\s*(?:[.)]|\s[-–—])\s*(.+)$/;
const ORDER_PATTERN = /pedido\s*(?:n[º°o.]*)?\s*:?\s*(\d+)/i;
const PART_SEPARATOR = /\s+[-–—]\s+/;

export function decode_text_file(array_buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(array_buffer);
  } catch {
    // Bloco de notas antigo do Windows salva em ANSI (windows-1252).
    return new TextDecoder('windows-1252').decode(array_buffer);
  }
}

export function parse_romaneio_text(text) {
  const lines = split_lines(text);
  const has_headers = lines.some((line) => HEADER_PATTERN.test(line));
  return has_headers ? parse_numbered_blocks(lines) : parse_plain_addresses(lines);
}

function split_lines(text) {
  return String(text ?? '')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parse_numbered_blocks(lines) {
  const stops = [];
  let current = null;

  for (const line of lines) {
    const header_match = line.match(HEADER_PATTERN);
    if (header_match) {
      current = build_stop_from_header(Number(header_match[1]), header_match[2]);
      stops.push(current);
    } else if (current) {
      current.address_lines.push(line);
    }
  }

  return stops
    .map(finalize_stop)
    .filter((stop) => stop.address);
}

function parse_plain_addresses(lines) {
  return lines.map((line, index) => finalize_stop({
    ...build_stop_from_header(index + 1, ''),
    address_lines: [line],
  }));
}

function build_stop_from_header(sequence, header_text) {
  const parts = header_text.split(PART_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  const order_match = header_text.match(ORDER_PATTERN);
  return {
    sequence,
    header: header_text.trim(),
    client: parts[0] ?? '',
    details: parts.slice(1).join(' – '),
    order_number: order_match ? order_match[1] : '',
    address_lines: [],
  };
}

function finalize_stop(stop) {
  const { address_lines, ...rest } = stop;
  return { ...rest, address: address_lines.join(', ') };
}

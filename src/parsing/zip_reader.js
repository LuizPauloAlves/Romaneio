// Leitor mínimo de arquivos ZIP (o .xlsx é um ZIP com arquivos XML dentro).
// Usa o descompactador nativo do navegador (DecompressionStream), sem bibliotecas.

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
const MAX_COMMENT_LENGTH = 0xffff;

// Retorna um Map: nome do arquivo → função assíncrona que devolve o conteúdo como texto.
export function read_zip_entries(array_buffer) {
  const view = new DataView(array_buffer);
  const end = find_end_of_central_directory(view);
  const entry_count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = new Map();

  for (let index = 0; index < entry_count; index += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_DIRECTORY_ENTRY) throw new Error('Arquivo compactado corrompido.');
    const method = view.getUint16(offset + 10, true);
    const compressed_size = view.getUint32(offset + 20, true);
    const name_length = view.getUint16(offset + 28, true);
    const extra_length = view.getUint16(offset + 30, true);
    const comment_length = view.getUint16(offset + 32, true);
    const local_header = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(array_buffer, offset + 46, name_length));

    entries.set(name, () => read_entry(array_buffer, local_header, method, compressed_size));
    offset += 46 + name_length + extra_length + comment_length;
  }
  return entries;
}

function find_end_of_central_directory(view) {
  const lowest = Math.max(0, view.byteLength - 22 - MAX_COMMENT_LENGTH);
  for (let offset = view.byteLength - 22; offset >= lowest; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error('Não é um arquivo .xlsx válido.');
}

async function read_entry(array_buffer, local_header, method, compressed_size) {
  const view = new DataView(array_buffer);
  if (view.getUint32(local_header, true) !== LOCAL_FILE_HEADER) throw new Error('Arquivo compactado corrompido.');
  const data_start = local_header + 30 + view.getUint16(local_header + 26, true) + view.getUint16(local_header + 28, true);
  const data = new Uint8Array(array_buffer, data_start, compressed_size);

  if (method === METHOD_STORED) return new TextDecoder().decode(data);
  if (method !== METHOD_DEFLATE) throw new Error('Formato de compactação não suportado.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

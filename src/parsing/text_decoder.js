// Lê bytes de arquivo de texto como UTF-8 ou, se não for, como ANSI (windows-1252),
// que é o padrão do Bloco de Notas antigo e do "CSV (separado por vírgulas)" do Excel em português.

export function decode_text_file(array_buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(array_buffer).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(array_buffer);
  }
}

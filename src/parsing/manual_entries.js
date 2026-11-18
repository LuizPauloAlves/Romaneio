// Clientes digitados um a um na tela (sem planilha).
// Viram as mesmas linhas de uma planilha, para passar pela mesma leitura e pelos mesmos avisos.

import { PAYMENT_METHODS, payment_label } from '../config/payment_methods.js';

export const MANUAL_HEADER = Object.freeze(['Cliente', 'Endereço', 'CEP', 'Pacotes', 'NF', 'Pagamento']);

export const PAYMENT_CHOICES = Object.freeze([
  ['', 'Escolha…'],
  ...PAYMENT_METHODS.map((method) => [method.key, method.label]),
]);

export function create_empty_entry() {
  return { client: '', address: '', cep: '', packages: '', nf: '', payment: '' };
}

export function entries_to_rows(entries) {
  return [
    [...MANUAL_HEADER],
    ...entries.map((entry) => [
      entry.client, entry.address, entry.cep, entry.packages, entry.nf, payment_label(entry.payment),
    ].map((value) => String(value ?? '').trim())),
  ];
}

// Nos avisos, "Cliente 3" em vez de "Linha 4" (a linha 1 seria o cabeçalho).
export function describe_manual_row(line_number) {
  return `Cliente ${line_number - 1}`;
}

// Formas de pagamento aceitas. É a única lista: planilha, digitação e comprovante usam esta.
// Para incluir uma forma nova, acrescente uma linha aqui (e no modelo do Excel, se quiser na lista suspensa).
//   key:     código salvo (não mude depois de usar)
//   label:   como aparece na tela, no Excel e no comprovante
//   aliases: outras formas de escrever aceitas na planilha (sem acento, minúsculas)

export const PAYMENT_METHODS = Object.freeze([
  { key: 'cash', label: 'À vista', aliases: ['a vista', 'avista'] },
  { key: 'boleto', label: 'Boleto', aliases: ['boleto', 'boleto bancario'] },
  { key: 'transfer', label: 'Transferência', aliases: ['transferencia', 'transf', 'ted', 'doc'] },
  { key: 'pix', label: 'Pix', aliases: ['pix'] },
  { key: 'card', label: 'Cartão', aliases: ['cartao', 'cartao de credito', 'cartao de debito', 'credito', 'debito'] },
]);

export const PAYMENT_LABEL_LIST = PAYMENT_METHODS.map((method) => method.label).join(', ');

// Texto da planilha → código. '' se vazio; null se não reconhecer.
export function parse_payment(text) {
  const normalized = normalize(text);
  if (!normalized) return '';
  const method = PAYMENT_METHODS.find((item) => normalize(item.label) === normalized || item.aliases.includes(normalized));
  return method ? method.key : null;
}

export function payment_label(key) {
  return PAYMENT_METHODS.find((method) => method.key === key)?.label ?? '';
}

// Rotas salvas antes desta mudança guardavam { cash: true, boleto: false }.
export function normalize_payment(value) {
  if (typeof value === 'string') return value;
  if (value?.cash && !value?.boleto) return 'cash';
  if (value?.boleto && !value?.cash) return 'boleto';
  return '';
}

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

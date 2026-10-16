// Transforma as linhas da planilha (CSV ou Excel) em paradas do romaneio.
//
// Colunas (a ordem não importa, maiúsculas e acentos também não):
//   Cliente | Endereço | CEP (opcional) | Pacotes | NF | A vista | Boleto
// "A vista" e "Boleto": marque com X a forma de pagamento.

const COLUMN_ALIASES = Object.freeze({
  client: ['cliente', 'nome do cliente', 'destinatario'],
  address: ['endereco', 'logradouro', 'endereco completo'],
  cep: ['cep'],
  packages: ['pacotes', 'pacote', 'volumes', 'volume', 'caixas', 'qtd', 'quantidade'],
  nf: ['nf', 'nota fiscal', 'nfe', 'nf e', 'numero nf', 'n nf'],
  cash: ['a vista', 'avista'],
  boleto: ['boleto'],
});

const REQUIRED_COLUMNS = ['client', 'address'];
const HEADER_SEARCH_ROWS = 10;
const NOT_MARKED = new Set(['', '0', 'n', 'nao', 'falso', 'false', '-']);

export const PAYMENT_LABELS = Object.freeze({ cash: 'À vista', boleto: 'Boleto' });

// Retorna { stops, warnings }. Lança erro se não achar as colunas obrigatórias.
export function parse_romaneio_rows(rows) {
  const header_index = rows.slice(0, HEADER_SEARCH_ROWS).findIndex((row) => has_required_columns(map_columns(row)));
  if (header_index === -1) {
    throw new Error('Não encontrei as colunas "Cliente" e "Endereço" na planilha. Use o modelo disponível no site.');
  }

  const columns = map_columns(rows[header_index]);
  const stops = [];
  const warnings = [];

  rows.slice(header_index + 1).forEach((row, offset) => {
    const line_number = header_index + offset + 2; // número da linha como aparece no Excel
    const values = read_values(row, columns);
    if (Object.values(values).every((value) => value === '')) return;

    const label = `Linha ${line_number}${values.client ? ` (${values.client})` : ''}`;
    if (!values.address) {
      warnings.push(`${label}: sem endereço, ficou fora da rota.`);
      return;
    }

    const stop = build_stop(values, stops.length + 1);
    warnings.push(...payment_warnings(label, stop.payment));
    stops.push(stop);
  });

  return { stops, warnings };
}

// Diz se o texto colado parece uma planilha (tem cabeçalho com Cliente e Endereço).
export function looks_like_table(rows) {
  return rows.slice(0, HEADER_SEARCH_ROWS).some((row) => has_required_columns(map_columns(row)));
}

function map_columns(header_row) {
  const columns = {};
  header_row.forEach((cell, index) => {
    const header = normalize_header(cell);
    const field = Object.keys(COLUMN_ALIASES).find((key) => COLUMN_ALIASES[key].some((alias) => header === alias || header.startsWith(`${alias} `)));
    if (field && columns[field] == null) columns[field] = index;
  });
  return columns;
}

function has_required_columns(columns) {
  return REQUIRED_COLUMNS.every((field) => columns[field] != null);
}

function read_values(row, columns) {
  return Object.fromEntries(Object.keys(COLUMN_ALIASES).map((field) => [field, String(row[columns[field]] ?? '').trim()]));
}

function build_stop(values, sequence) {
  const cep = format_cep(values.cep);
  const payment = { cash: is_marked(values.cash), boleto: is_marked(values.boleto) };
  return {
    sequence,
    client: values.client,
    address: append_cep(values.address, cep),
    cep,
    packages: values.packages,
    nf: values.nf,
    payment,
    details: [describe_packages(values.packages), values.nf && `NF ${values.nf}`, describe_payment(payment)].filter(Boolean).join(' – '),
    order_number: '',
    header: values.client,
  };
}

function payment_warnings(label, payment) {
  if (payment.cash && payment.boleto) return [`${label}: marcado "A vista" e "Boleto" ao mesmo tempo.`];
  if (!payment.cash && !payment.boleto) return [`${label}: forma de pagamento não marcada.`];
  return [];
}

function is_marked(value) {
  return !NOT_MARKED.has(normalize_header(value));
}

// "12260000" → "12260-000"; CEP com zero à esquerda perdido pelo Excel ("1310100") também é corrigido.
function format_cep(value) {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length > 8) return value;
  const padded = digits.padStart(8, '0');
  return `${padded.slice(0, 5)}-${padded.slice(5)}`;
}

function append_cep(address, cep) {
  if (!cep || address.replace(/\D/g, '').includes(cep.replace('-', ''))) return address;
  return `${address} – CEP ${cep}`;
}

function describe_packages(packages) {
  if (!packages) return '';
  if (!/^\d+$/.test(packages)) return packages;
  return `${packages} ${packages === '1' ? 'pacote' : 'pacotes'}`;
}

function describe_payment(payment) {
  return [payment.cash && PAYMENT_LABELS.cash, payment.boleto && PAYMENT_LABELS.boleto].filter(Boolean).join(' + ');
}

function normalize_header(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

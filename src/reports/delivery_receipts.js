// Comprovantes de entrega para imprimir: um bloco por cliente, na ordem da rota.
//
// Cada página (A4) tem:
//   cabeçalho  → logo à esquerda, título e "PG. N" à direita
//   corpo      → até RECEIPT_CONFIG.receipts_per_page comprovantes (menos, se algum for mais alto)
//   rodapé     → nome da empresa centralizado
//
// Cada comprovante (a coluna da direita tem largura fixa, igual em todos):
//   Cliente: NOME DO CLIENTE QUE PODE              NF: 0000018182
//            CONTINUAR NA LINHA DE BAIXO           Pacotes: 2 caixas
//   Endereço: Rua …                                Pagamento: **Pix** (forma em negrito)
//   Nome: ____________                  Assinatura: ____________
//   RG ou CPF: ________   Data de entrega: dd/mm/aaaa   Horário: ___:___
// Texto longo quebra nos espaços e continua embaixo, sem invadir a coluna da direita.
// Nome, RG/CPF e assinatura: quem recebe preenche. Horário: o entregador preenche.
// A data vem da data da rota escolhida no início.

import { COMPANY_CONFIG, RECEIPT_CONFIG } from '../config/app_config.js';
import { normalize_payment, payment_label } from '../config/payment_methods.js';
import { format_date } from '../utils/format_utils.js';
import { escape_html } from '../utils/dom_utils.js';

const EMPTY_DATE = '___/___/______';

// page_sizes: quantos comprovantes em cada página (ex.: [5, 4, 5]). Sem ele, 5 por página.
export function build_delivery_receipts_html(route, page_sizes = null) {
  const delivery_date = route.date ? format_date(route.date) : EMPTY_DATE;
  const pages = page_sizes ? split_by_sizes(route.stops, page_sizes) : split_into_pages(route.stops, RECEIPT_CONFIG.receipts_per_page);
  return pages.map((stops, index) => render_page(stops, index + 1, delivery_date)).join('');
}

// Decide quantos comprovantes vão em cada página a partir da altura de cada um (já medida).
// Enche a página até não caber o próximo (ou até o máximo por página).
export function plan_receipt_pages({ heights, available_height, gap, max_per_page = RECEIPT_CONFIG.receipts_per_page }) {
  const sizes = [];
  let count = 0;
  let used = 0;
  for (const height of heights) {
    const needed = count === 0 ? height : used + gap + height;
    if (count > 0 && (needed > available_height || count >= max_per_page)) {
      sizes.push(count);
      count = 0;
      used = 0;
    }
    used = count === 0 ? height : used + gap + height;
    count += 1;
  }
  if (count > 0) sizes.push(count);
  return sizes;
}

export function split_into_pages(items, per_page) {
  const pages = [];
  for (let start = 0; start < items.length; start += per_page) pages.push(items.slice(start, start + per_page));
  return pages;
}

function split_by_sizes(items, sizes) {
  const pages = [];
  let start = 0;
  for (const size of sizes) {
    if (start >= items.length) break;
    pages.push(items.slice(start, start + size));
    start += size;
  }
  if (start < items.length) pages.push(...split_into_pages(items.slice(start), RECEIPT_CONFIG.receipts_per_page));
  return pages;
}

function render_page(stops, page_number, delivery_date) {
  return `
    <section class="receipt-page">
      <header class="receipt-header">
        <img class="receipt-logo" src="${COMPANY_CONFIG.logo_url}" alt="${escape_html(COMPANY_CONFIG.name)}">
        <div class="receipt-title">
          <strong>Comprovante de entrega</strong>
          <span>Entregas de ${delivery_date}</span>
        </div>
        <span class="receipt-page-number">PG. ${page_number}</span>
      </header>
      <div class="receipt-list">${stops.map((stop) => render_receipt(stop, delivery_date)).join('')}</div>
      <footer class="receipt-footer">${escape_html(COMPANY_CONFIG.name)}</footer>
    </section>`;
}

function render_receipt(stop, delivery_date) {
  const payment = normalize_payment(stop.payment);
  return `
    <article class="receipt">
      <span class="receipt-number" title="Ordem na rota">${stop.position ?? stop.sequence ?? ''}</span>
      <div class="receipt-info">
        ${text_line('Cliente', stop.client)}
        <div class="receipt-side">
          ${text_line('NF', stop.nf)}
          ${text_line('Pacotes', stop.packages)}
        </div>
        ${text_line('Endereço', stop.address)}
        ${text_line('Pagamento', payment_label(payment), 'strong')}
      </div>
      <div class="receipt-row">
        ${field('Nome', blank_line(), 'grow')}
        ${field('Assinatura', blank_line(), 'grow')}
      </div>
      <div class="receipt-row">
        ${field('RG ou CPF', blank_line(), 'grow')}
        ${field('Data de entrega', delivery_date)}
        ${field('Horário', `${blank_line('time')} : ${blank_line('time')}`)}
      </div>
    </article>`;
}

// Rótulo + texto que quebra nos espaços e continua alinhado depois do rótulo.
// Sem valor, vira uma linha em branco para preencher à mão.
function text_line(label, value, modifier = '') {
  const text = String(value ?? '').trim();
  const classes = `receipt-text${modifier ? ` receipt-text--${modifier}` : ''}`;
  const content = text ? `<span class="${classes}">${keep_cep_together(escape_html(text))}</span>` : blank_line();
  return `<p class="receipt-line"><b>${label}:</b> ${content}</p>`;
}

function field(label, content, modifiers = '') {
  const classes = modifiers.split(' ').filter(Boolean).map((modifier) => `receipt-field--${modifier}`).join(' ');
  return `<span class="receipt-field ${classes}"><b>${label}:</b> ${content}</span>`;
}

// Evita que o CEP quebre no hífen ("12260-" numa linha e "000" na outra).
function keep_cep_together(html) {
  return html.replace(/\b(\d{5}-\d{3})\b/g, '<span class="nowrap">$1</span>');
}

function blank_line(size = '') {
  return `<span class="fill-line ${size ? `fill-line--${size}` : ''}"></span>`;
}

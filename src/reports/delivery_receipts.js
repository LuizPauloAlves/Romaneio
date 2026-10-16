// Comprovantes de entrega para imprimir: um bloco por cliente, na ordem da rota.
//
// Cada página (A4) tem:
//   cabeçalho  → logo à esquerda, título e "PG. N" à direita
//   corpo      → até RECEIPT_CONFIG.receipts_per_page comprovantes
//   rodapé     → nome da empresa centralizado
//
// Cada comprovante:
//   Cliente: …            Pacotes: …            NF: …
//   Endereço: …                                 À vista ( X )  Boleto (   )
//   Nome: ____________                          Assinatura: ____________
//   RG ou CPF: ________   Data de entrega: dd/mm/aaaa   Horário: ___:___
// Nome, RG/CPF e assinatura: quem recebe preenche. Horário: o entregador preenche.
// A data vem da data da rota escolhida no início.

import { COMPANY_CONFIG, RECEIPT_CONFIG } from '../config/app_config.js';
import { format_date } from '../utils/format_utils.js';
import { escape_html } from '../utils/dom_utils.js';

const EMPTY_DATE = '___/___/______';

export function build_delivery_receipts_html(route, receipts_per_page = RECEIPT_CONFIG.receipts_per_page) {
  const delivery_date = route.date ? format_date(route.date) : EMPTY_DATE;
  return split_into_pages(route.stops, receipts_per_page)
    .map((stops, index) => render_page(stops, index + 1, delivery_date))
    .join('');
}

export function split_into_pages(items, per_page) {
  const pages = [];
  for (let start = 0; start < items.length; start += per_page) pages.push(items.slice(start, start + per_page));
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
  const payment = stop.payment ?? {};
  return `
    <article class="receipt">
      <span class="receipt-number" title="Ordem na rota">${stop.position ?? stop.sequence ?? ''}</span>
      <div class="receipt-row">
        ${field('Cliente', value_or_line(stop.client), 'grow')}
        ${field('Pacotes', value_or_line(stop.packages, 'short'))}
        ${field('NF', value_or_line(stop.nf))}
      </div>
      <div class="receipt-row">
        ${field('Endereço', value_or_line(stop.address), 'grow address')}
        <span class="receipt-field receipt-payment">À vista ( ${mark(payment.cash)} ) &nbsp; Boleto ( ${mark(payment.boleto)} )</span>
      </div>
      <div class="receipt-row receipt-row--sign">
        ${field('Nome', blank_line(), 'grow')}
        ${field('Assinatura', blank_line(), 'grow')}
      </div>
      <div class="receipt-row receipt-row--sign">
        ${field('RG ou CPF', blank_line(), 'grow')}
        ${field('Data de entrega', `<span class="receipt-value">${delivery_date}</span>`)}
        ${field('Horário', `${blank_line('time')} : ${blank_line('time')}`)}
      </div>
    </article>`;
}

function field(label, content, modifiers = '') {
  const classes = modifiers.split(' ').filter(Boolean).map((modifier) => `receipt-field--${modifier}`).join(' ');
  return `<span class="receipt-field ${classes}"><b>${label}:</b> ${content}</span>`;
}

function value_or_line(value, size = '') {
  const text = String(value ?? '').trim();
  return text ? `<span class="receipt-value">${keep_cep_together(escape_html(text))}</span>` : blank_line(size);
}

// Evita que o CEP quebre no hífen ("12260-" numa linha e "000" na outra).
function keep_cep_together(html) {
  return html.replace(/\b(\d{5}-\d{3})\b/g, '<span class="nowrap">$1</span>');
}

function blank_line(size = '') {
  return `<span class="fill-line ${size ? `fill-line--${size}` : ''}"></span>`;
}

function mark(is_marked) {
  return is_marked ? '<b class="receipt-mark">X</b>' : '<span class="receipt-mark">&nbsp;</span>';
}

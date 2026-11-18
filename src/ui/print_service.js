// Imprime (ou salva em PDF pelo navegador) documentos de uma rota:
// o relatório da rota e os comprovantes de entrega.

import { build_route_report_html } from '../reports/report_builder.js';
import { build_delivery_receipts_html, plan_receipt_pages } from '../reports/delivery_receipts.js';
import { query } from '../utils/dom_utils.js';

export function print_route_report(route) {
  return print_html(build_route_report_html(route), 'report');
}

export function print_delivery_receipts(route) {
  return print_html(build_delivery_receipts_html(route, measure_receipt_pages(route)), 'receipts');
}

// Monta todos os comprovantes numa página de teste fora da tela, mede a altura de cada um
// e decide quantos cabem em cada página. Se não der para medir, usa o padrão (5 por página).
function measure_receipt_pages(route) {
  const probe = document.createElement('div');
  probe.className = 'receipt-measure';
  probe.innerHTML = build_delivery_receipts_html(route, [route.stops.length]);
  document.body.append(probe);
  try {
    const list = probe.querySelector('.receipt-list');
    if (!list) return null;
    const style = getComputedStyle(list);
    const available_height = list.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const heights = [...list.querySelectorAll('.receipt')].map((receipt) => receipt.getBoundingClientRect().height);
    if (!(available_height > 0) || heights.some((height) => !(height > 0))) return null;
    return plan_receipt_pages({ heights, available_height, gap: parseFloat(style.rowGap) || 0 });
  } finally {
    probe.remove();
  }
}

// Tamanho e margem do papel para cada documento. Os comprovantes já trazem a própria margem.
const PAGE_RULES = Object.freeze({
  report: '@page { size: A4; margin: 14mm; }',
  receipts: '@page { size: A4; margin: 0; }',
});

// Espera as imagens (o logo) carregarem antes de abrir a impressão, senão saem em branco.
async function print_html(html, kind) {
  set_page_rule(PAGE_RULES[kind]);
  const area = query('#print_area');
  area.className = `print-area print-area--${kind}`;
  area.innerHTML = html;
  await Promise.all([...area.querySelectorAll('img')].map((image) => image.decode().catch(() => {})));
  window.print();
}

function set_page_rule(rule) {
  let style = document.getElementById('print_page_rule');
  if (!style) {
    style = document.createElement('style');
    style.id = 'print_page_rule';
    document.head.append(style);
  }
  style.textContent = rule;
}

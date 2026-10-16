// Imprime (ou salva em PDF pelo navegador) documentos de uma rota:
// o relatório da rota e os comprovantes de entrega.

import { build_route_report_html } from '../reports/report_builder.js';
import { build_delivery_receipts_html } from '../reports/delivery_receipts.js';
import { query } from '../utils/dom_utils.js';

export function print_route_report(route) {
  return print_html(build_route_report_html(route), 'report');
}

export function print_delivery_receipts(route) {
  return print_html(build_delivery_receipts_html(route), 'receipts');
}

// Espera as imagens (o logo) carregarem antes de abrir a impressão, senão saem em branco.
async function print_html(html, kind) {
  const area = query('#print_area');
  area.className = `print-area print-area--${kind}`;
  area.innerHTML = html;
  await Promise.all([...area.querySelectorAll('img')].map((image) => image.decode().catch(() => {})));
  window.print();
}

// Imprime (ou salva em PDF pelo navegador) o relatório de uma rota.

import { build_route_report_html } from '../reports/report_builder.js';
import { query } from '../utils/dom_utils.js';

export function print_route_report(route) {
  query('#print_area').innerHTML = build_route_report_html(route);
  window.print();
}

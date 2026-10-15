// Blocos e ações reaproveitados pela tela de resultado e pelo histórico:
// links do Maps, envio por WhatsApp e impressão.

import { build_whatsapp_message, build_whatsapp_url } from '../reports/whatsapp_message.js';
import { print_route_report } from './print_service.js';
import { copy_to_clipboard, escape_html, show_message } from '../utils/dom_utils.js';

export function render_links_block(route) {
  const items = route.links.map((link, index) => `
    <li>
      <span class="link-label">Rota ${index + 1}: ${escape_html(link.label)}</span>
      <a class="button button--small" href="${escape_html(link.url)}" target="_blank" rel="noopener">Abrir no Maps</a>
      <button type="button" class="button button--small" data-copy-link="${index}">Copiar link</button>
    </li>`).join('');

  return `
    <ul class="link-list">${items}</ul>
    <div class="actions">
      <button type="button" class="button button--whatsapp" data-action="whatsapp">Enviar pelo WhatsApp Web</button>
      <button type="button" class="button" data-action="copy_message">Copiar mensagem</button>
      <button type="button" class="button" data-action="print">Imprimir / PDF</button>
    </div>`;
}

// Liga os botões uma única vez por container (o conteúdo interno pode ser redesenhado à vontade).
export function bind_route_actions(container, get_route) {
  if (container.dataset.actionsBound) return;
  container.dataset.actionsBound = 'true';
  container.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action], [data-copy-link]');
    if (!target) return;
    const route = get_route(target);
    if (!route) return;

    if (target.dataset.copyLink != null) {
      await copy_with_feedback(route.links[Number(target.dataset.copyLink)].url, 'Link copiado.');
    } else if (target.dataset.action === 'whatsapp') {
      window.open(build_whatsapp_url(build_whatsapp_message(route)), '_blank', 'noopener');
    } else if (target.dataset.action === 'copy_message') {
      await copy_with_feedback(build_whatsapp_message(route), 'Mensagem copiada. Cole na conversa do entregador.');
    } else if (target.dataset.action === 'print') {
      print_route_report(route);
    }
  });
}

async function copy_with_feedback(text, success_message) {
  try {
    await copy_to_clipboard(text);
    show_message(success_message, 'success');
  } catch {
    show_message('Não foi possível copiar automaticamente.', 'error');
  }
}

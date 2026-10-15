// Pequenos atalhos para manipular a página.

export function query(selector, root = document) {
  return root.querySelector(selector);
}

export function escape_html(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function show_message(text, kind = 'info') {
  const box = query('#message_box');
  box.textContent = text;
  box.className = `message message--${kind}`;
  box.hidden = false;
  clearTimeout(show_message.timer);
  show_message.timer = setTimeout(() => { box.hidden = true; }, 6000);
}

export function set_busy(button, busy, busy_label = 'Aguarde…') {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = busy_label;
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
  button.disabled = busy;
}

export async function copy_to_clipboard(text) {
  await navigator.clipboard.writeText(text);
}

export function generate_id(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

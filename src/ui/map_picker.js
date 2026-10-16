// Janela com mapa para marcar o local exato de um endereço (clique no mapa ou arraste o marcador).
// Retorna uma Promise com { lat, lng } ou null se cancelado.

import { load_leaflet, create_base_map } from '../maps/leaflet_loader.js';
import { APP_CONFIG } from '../config/app_config.js';
import { escape_html, show_message } from '../utils/dom_utils.js';

const DEFAULT_CENTER = APP_CONFIG.default_base;

export async function open_map_picker({ title, address, start_point }) {
  let L;
  try {
    L = await load_leaflet();
  } catch (error) {
    show_message(error.message, 'error');
    return null;
  }

  const dialog = build_dialog(title, address);
  document.body.append(dialog);
  dialog.showModal();

  const center = start_point?.lat != null ? start_point : DEFAULT_CENTER;
  const map = create_base_map(L, dialog.querySelector('.map-picker-map'), center, start_point?.lat != null ? 15 : 11);
  const marker = L.marker([center.lat, center.lng], { draggable: true }).addTo(map);
  map.on('click', (event) => marker.setLatLng(event.latlng));
  setTimeout(() => map.invalidateSize(), 50);

  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      const confirmed = dialog.returnValue === 'confirm';
      const { lat, lng } = marker.getLatLng();
      map.remove();
      dialog.remove();
      resolve(confirmed ? { lat, lng } : null);
    });
  });
}

function build_dialog(title, address) {
  const dialog = document.createElement('dialog');
  dialog.className = 'map-picker';
  dialog.innerHTML = `
    <form method="dialog">
      <header>
        <strong>${escape_html(title)}</strong>
        <small>${escape_html(address ?? '')}</small>
      </header>
      <p class="muted">Clique no mapa ou arraste o marcador até o local exato. Use + / − para aproximar.</p>
      <div class="map-picker-map"></div>
      <div class="actions">
        <button value="cancel" class="button">Cancelar</button>
        <button value="confirm" class="button button--primary">Usar este local</button>
      </div>
    </form>`;
  return dialog;
}

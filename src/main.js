// Ponto de entrada: monta as telas e controla as abas.

import { render_upload_view } from './ui/upload_view.js';
import { render_history_view } from './ui/history_view.js';
import { render_settings_view } from './ui/settings_view.js';

function setup_tabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('is-active', item === tab));
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.hidden = panel.id !== `tab_${tab.dataset.tab}`;
      });
      if (tab.dataset.tab === 'history') render_history_view();
      if (tab.dataset.tab === 'settings') render_settings_view();
    });
  });
}

setup_tabs();
render_upload_view();
render_history_view();
render_settings_view();

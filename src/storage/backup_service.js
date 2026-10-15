// Exporta e importa todos os dados em um arquivo .json (backup manual).

import { export_all_data, import_all_data } from './storage_repository.js';
import { today_iso } from '../utils/time_utils.js';

export function download_backup() {
  const content = JSON.stringify({ app: 'romaneio', version: 1, exported_at: new Date().toISOString(), data: export_all_data() }, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `romaneio_backup_${today_iso()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function restore_backup(file) {
  const parsed = JSON.parse(await file.text());
  if (parsed?.app !== 'romaneio' || !parsed.data) throw new Error('Arquivo de backup inválido.');
  import_all_data(parsed.data);
}

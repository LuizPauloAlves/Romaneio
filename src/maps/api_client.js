// Comunicação com a função do servidor (/api). A chave do Google fica só lá.

import { get_settings } from '../storage/storage_repository.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function post_api(path, body) {
  const { access_token } = get_settings();
  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(access_token ? { 'X-App-Token': access_token } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.error ?? `Erro ${response.status} no servidor.`);
  return data;
}

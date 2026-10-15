// Texto do romaneio para enviar ao entregador pelo WhatsApp.

import { format_date, format_km, format_duration } from '../utils/format_utils.js';

export function build_whatsapp_message(route) {
  const header = [
    `*Romaneio ${format_date(route.date)}*`,
    `Saída: ${route.departure_time} · Volta prevista: ${route.summary.return_time}`,
    `${route.stops.length} paradas · ${format_km(route.summary.distance_km)} · ${format_duration(route.summary.total_minutes)}`,
  ];

  const stops = route.stops.map((stop) => {
    const window = describe_window(stop);
    const details = [stop.details, stop.order_number && !stop.details.includes(stop.order_number) ? `Pedido ${stop.order_number}` : '']
      .filter(Boolean).join(' – ');
    return [
      `*${stop.position}. ${stop.client || stop.address}* (previsto ${stop.arrival_time}${window})`,
      details,
      stop.address,
    ].filter(Boolean).join('\n');
  });

  const links = route.links.map((link, index) => `🗺️ Rota ${index + 1} (${link.label}):\n${link.url}`);

  return [header.join('\n'), stops.join('\n\n'), links.join('\n\n')].join('\n\n');
}

export function build_whatsapp_url(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function describe_window(stop) {
  if (stop.window_start && stop.window_end) return `, receber ${stop.window_start}–${stop.window_end}`;
  if (stop.window_end) return `, receber até ${stop.window_end}`;
  if (stop.window_start) return `, a partir de ${stop.window_start}`;
  return '';
}

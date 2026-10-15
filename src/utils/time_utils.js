// Conversões entre "HH:MM" e minutos desde a meia-noite.

export function parse_hhmm(text) {
  if (!text) return null;
  const match = String(text).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function format_hhmm(total_minutes) {
  if (total_minutes == null || Number.isNaN(total_minutes)) return '--:--';
  const rounded = Math.round(total_minutes);
  const hours = Math.floor(rounded / 60) % 24;
  const minutes = rounded % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function minutes_between(start_hhmm, end_hhmm) {
  const start = parse_hhmm(start_hhmm);
  const end = parse_hhmm(end_hhmm);
  if (start == null || end == null) return null;
  return end >= start ? end - start : end + 24 * 60 - start;
}

export function today_iso() {
  const now = new Date();
  const offset_ms = now.getTimezoneOffset() * 60000;
  return new Date(now - offset_ms).toISOString().slice(0, 10);
}

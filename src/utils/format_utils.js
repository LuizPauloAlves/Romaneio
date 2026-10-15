// Formatação de valores para exibição (padrão brasileiro).

const currency_formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number_formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function format_currency(value) {
  return currency_formatter.format(Number(value) || 0);
}

export function format_km(value) {
  return `${number_formatter.format(Number(value) || 0)} km`;
}

export function format_number(value, digits = 1) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(Number(value) || 0);
}

export function format_duration(total_minutes) {
  const rounded = Math.round(Number(total_minutes) || 0);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${minutes} min`;
}

export function format_date(iso_date) {
  if (!iso_date) return '';
  const [year, month, day] = iso_date.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function to_number(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

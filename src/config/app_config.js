// Configurações gerais da aplicação (valores que não dependem do veículo).

export const APP_CONFIG = Object.freeze({
  // Base da Fiorino (saída e chegada de todas as rotas). Pode ser alterada em Configurações.
  default_base: Object.freeze({
    address: 'Base – Rod. dos Tamoios, 60km - Espigão, Paraibuna - SP',
    lat: -23.557128,
    lng: -45.519515,
    formatted_address: 'Base (coordenadas fixas)',
    approximate: false,
  }),
  legacy_base_address: 'Rod. dos Tamoios, 60km - Espigão, Paraibuna - SP',
  default_service_minutes: 10,
  default_departure_time: '08:00',

  // Paradas intermediárias por link do Google Maps.
  // O app do Google Maps aceita até 9; navegadores de celular, só 3.
  max_waypoints_per_link: 9,

  // Quantas rotas reais recentes entram na média de consumo aprendido.
  learning_window: 4,

  // Segunda opinião do Google quando o OpenStreetMap não acha bem o endereço.
  // Precisa da função /api/geocode_google com a chave na Vercel; sem ela, é ignorado.
  google_fallback: Object.freeze({
    endpoint: 'geocode_google',
    cache_days: 30, // o Google só permite guardar coordenadas dele por até 30 dias
  }),

  storage_prefix: 'romaneio:',
});

// Serviços gratuitos do OpenStreetMap (sem chave). Respeite as regras de uso de cada um.
export const OSM_CONFIG = Object.freeze({
  nominatim_url: 'https://nominatim.openstreetmap.org/search',
  nominatim_interval_ms: 1100,        // regra do Nominatim: no máximo 1 consulta por segundo
  search_bias_degrees: 1.0,           // prioriza resultados até ~100 km da base
  osrm_url: 'https://router.project-osrm.org',
  osrm_max_points: 100,               // limite do servidor público do OSRM por tabela
  tile_url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  tile_attribution: '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  leaflet_js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  leaflet_css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
});

// Empresa (cabeçalho e rodapé do comprovante de entrega).
export const COMPANY_CONFIG = Object.freeze({
  name: 'QUEIJOS DO REI LATICÍNIOS LTDA',
  logo_url: 'assets/logo_queijos_do_rei.png',
});

export const RECEIPT_CONFIG = Object.freeze({
  receipts_per_page: 5,
});

// Modelos de planilha para download na tela inicial.
export const TEMPLATE_FILES = Object.freeze([
  { label: 'Modelo Excel (.xlsx)', url: 'exemplos/modelo_romaneio.xlsx' },
  { label: 'Modelo CSV', url: 'exemplos/modelo_romaneio.csv' },
  { label: 'Exemplo preenchido (.csv)', url: 'exemplos/exemplo_romaneio.csv' },
]);

export const ROUTE_TYPES = Object.freeze({
  delivery: 'Entrega',
  pickup: 'Coleta',
});

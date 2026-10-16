// Estado da tela de planejamento (vive só enquanto a página está aberta).

export const app_state = {
  draft_stops: [],     // paradas lidas da planilha, editáveis antes de calcular
  import_warnings: [], // avisos da leitura da planilha (linha sem endereço, pagamento não marcado…)
  route_options: {},   // data, horário de saída, veículo, tipo, pedágio, frete
  current_route: null, // última rota calculada
};

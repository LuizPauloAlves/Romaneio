// Estado da tela de planejamento (vive só enquanto a página está aberta).

export const app_state = {
  draft_stops: [],     // paradas lidas do .txt, editáveis antes de calcular
  route_options: {},   // data, horário de saída, veículo, tipo, pedágio, frete
  current_route: null, // última rota calculada
};

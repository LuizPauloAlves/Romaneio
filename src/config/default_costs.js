// Valores de referência para a Fiat Fiorino 1.4 Evo Flex 2015.
// Pesquisados em outubro/2026. Todos são editáveis em Configurações.
// Cada valor indica a fonte para você conferir ou substituir pelo seu dado real.

export const FUEL_REFERENCES = Object.freeze({
  gasolina: {
    price_per_liter: 6.40, // ANP, média SP, semana 27/09–03/10/2026
    km_per_liter: 11.0,    // ficha técnica: 10,7 cidade / 12,1 estrada
  },
  etanol: {
    price_per_liter: 3.90, // ANP, média SP, set–out/2026
    km_per_liter: 7.8,     // ficha técnica: 7,5 cidade / 8,3 estrada
  },
});

export const DEFAULT_VEHICLE = Object.freeze({
  id: 'fiorino_2015',
  name: 'Fiat Fiorino 2015',
  fuel_type: 'gasolina',
  fuel_price: FUEL_REFERENCES.gasolina.price_per_liter,
  km_per_liter: FUEL_REFERENCES.gasolina.km_per_liter,

  // Custos variáveis (R$ por km)
  preventive_per_km: 0.045,  // revisão básica R$ 320–560 a cada 10.000 km (2026)
  predictive_per_km: 0.05,   // correia dentada, freios, velas, suspensão (R$ 1.730–3.980 aos 60.000 km)
  corrective_per_km: 0.05,   // reserva para quebras e imprevistos (estimativa)
  tires_set_price: 2000,     // 4 pneus 175/70 R14 a ~R$ 450–600 cada (Procon, out/2025)
  tires_life_km: 40000,

  // Custos fixos anuais (rateados pelos km rodados no ano)
  insurance_year: 2500,      // cotações de R$ 1.800–2.600 para Fiorino 2015 em SP
  ipva_year: 2120,           // 4% sobre ~R$ 53.000 (confira no carnê, utilitários podem ter alíquota menor)
  licensing_year: 160,       // taxa de licenciamento SP (aproximada)
  tracker_year: 0,           // rastreador, se houver
  vehicle_value: 54000,      // FIPE jun/2026: R$ 54.005
  depreciation_rate: 0.03,   // perda anual de valor (a FIPE deste modelo está estável)
  km_per_year: 10000,        // km rodados no ano (para dividir os custos fixos)

  // Mão de obra
  driver_cost_hour: 21.0,    // salário ~R$ 2.750 + encargos (~70%) ÷ 220 h (CAGED 2026)
});

export const COST_SOURCES = Object.freeze([
  'Combustível: pesquisa semanal ANP, São Paulo, set–out/2026',
  'Consumo: ficha técnica Fiorino 1.4 Evo 2015 (fichacompleta.com.br)',
  'Valor do veículo: Tabela FIPE jun/2026 (R$ 54.005)',
  'Revisões: tabela de preços de revisão 2026 (autocidade.com)',
  'Pneus: pesquisa Procon de preços de pneus, out/2025',
  'Seguro: cotações médias de seguradoras (valores de anos anteriores, confira com seu corretor)',
  'Mão de obra: salário de motorista entregador, CAGED/MTE 2026',
]);

// Consumo de combustível com refrigeração ligada e desligada.
//
// Entrega: a refrigeração fica ligada da base até a última entrega e é desligada
//          na volta (carga já entregue), quando o motor gasta menos.
// Coleta:  a refrigeração fica desligada na ida até a primeira coleta e é ligada
//          depois que a carga entra no veículo.
//
// O consumo "com refrigeração" é o consumo sem refrigeração dividido por
// (1 + aumento %). Ex.: 11 km/l e 19% a mais de gasto → 11 / 1,19 = 9,2 km/l.

// Trecho da rota em que a refrigeração fica desligada, por tipo de rota.
const REFRIGERATION_OFF_LEG = Object.freeze({ delivery: 'last', pickup: 'first' });

export function split_distance_by_refrigeration({ distance_km, first_leg_km, last_leg_km }, route_type) {
  const off_leg = REFRIGERATION_OFF_LEG[route_type] ?? REFRIGERATION_OFF_LEG.delivery;
  const plain_km = off_leg === 'first' ? first_leg_km : last_leg_km;
  return { refrigerated_km: Math.max(0, distance_km - plain_km), plain_km, off_leg };
}

// factor ajusta os dois consumos pelo que foi aprendido nas rotas reais (1 = referência).
export function build_consumption(vehicle, factor = 1) {
  const km_per_liter_off = vehicle.km_per_liter * factor;
  const extra = Math.max(0, Number(vehicle.refrigeration_extra_percent) || 0) / 100;
  return { km_per_liter_off, km_per_liter_on: km_per_liter_off / (1 + extra), refrigeration_extra_percent: extra * 100 };
}

export function compute_fuel_use(split, consumption) {
  const refrigerated_liters = divide(split.refrigerated_km, consumption.km_per_liter_on);
  const plain_liters = divide(split.plain_km, consumption.km_per_liter_off);
  const liters = refrigerated_liters + plain_liters;
  const distance_km = split.refrigerated_km + split.plain_km;
  return {
    refrigerated_liters,
    plain_liters,
    liters,
    km_per_liter: liters > 0 ? distance_km / liters : consumption.km_per_liter_off,
  };
}

function divide(value, by) {
  return by > 0 ? value / by : 0;
}

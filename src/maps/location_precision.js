// Regras para decidir se um resultado de busca é bom o bastante ou se vale tentar o Google.
//
// precision:
//   'exact'       casa, prédio, comércio ou ponto específico
//   'street'      só a rua (sem número)
//   'approximate' só bairro, cidade ou região

const RANK = Object.freeze({ approximate: 0, street: 1, exact: 2 });

// "Aproximado" = vale avisar o usuário (e tentar outra fonte):
// só a cidade, ou só a rua quando o endereço tem número.
export function is_approximate(precision, address_has_house_number) {
  return precision === 'approximate' || (precision === 'street' && address_has_house_number);
}

// Escolhe o resultado mais preciso. Em empate, vale o último da lista (o mais recente).
export function pick_best(candidates) {
  return candidates
    .filter(Boolean)
    .reduce((best, candidate) => (!best || RANK[candidate.precision] >= RANK[best.precision] ? candidate : best), null);
}

// Expande abreviações comuns de endereços brasileiros antes da busca no mapa.
// Ex.: "Av. Dep. Benedito Matarazzo, 9009 - Jd Oswaldo Cruz" → "Avenida Deputado Benedito Matarazzo, 9009 - Jardim Oswaldo Cruz"
//
// Fontes: tipos de logradouro do eSocial (Tabela 20) e listas de uso comum (Correios, Waze, sites de CEP).
//
// Regras de segurança, para não estragar o que já está certo:
//   - só expande quando vem outra palavra ou número depois, na mesma parte do endereço
//     (assim o "AL" de "Maceió - AL" continua sendo o estado);
//   - tipos de logradouro (R., Av., Rod.…) só valem no começo de uma parte do endereço;
//   - abreviações que também são palavras comuns ("Bar", "Faz", "Mal", "Ver"…) só valem com ponto.

const START_OF_PART = 'start';
const ANYWHERE = 'anywhere';

// [por extenso, abreviações, onde vale, exige ponto]
const ABBREVIATION_TABLE = [
  // Tipos de logradouro
  ['Rua', ['r'], START_OF_PART, false],
  ['Avenida', ['av', 'avda', 'aven', 'avn'], START_OF_PART, false],
  ['Travessa', ['tv', 'trav'], START_OF_PART, false],
  ['Alameda', ['al'], START_OF_PART, false],
  ['Praça', ['pc', 'pca', 'prc'], START_OF_PART, false],
  ['Largo', ['lgo', 'lrg'], START_OF_PART, false],
  ['Estrada', ['est', 'estr'], START_OF_PART, false],
  ['Rodovia', ['rod'], START_OF_PART, false],
  ['Ladeira', ['ld', 'lad'], START_OF_PART, false],
  ['Viaduto', ['vd'], START_OF_PART, false],
  ['Beco', ['bc'], START_OF_PART, false],
  ['Viela', ['vla'], START_OF_PART, false],
  ['Passagem', ['psg'], START_OF_PART, false],
  ['Servidão', ['srv'], START_OF_PART, false],
  ['Escadaria', ['esd'], START_OF_PART, false],

  // Bairros, loteamentos e complementos
  ['Jardim', ['jd', 'jard'], ANYWHERE, false],
  ['Jardins', ['jds'], ANYWHERE, false],
  ['Parque', ['pq', 'pque', 'prq'], ANYWHERE, false],
  ['Residencial', ['res', 'resid'], ANYWHERE, false],
  ['Condomínio', ['cond'], ANYWHERE, false],
  ['Conjunto', ['cj', 'conj'], ANYWHERE, false],
  ['Vila', ['vl'], ANYWHERE, false],
  ['Loteamento', ['lot'], ANYWHERE, false],
  ['Chácara', ['ch', 'chac'], ANYWHERE, true],
  ['Sítio', ['sit'], ANYWHERE, true],
  ['Fazenda', ['faz'], ANYWHERE, true],
  ['Núcleo', ['nuc'], ANYWHERE, true],
  ['Habitacional', ['hab'], ANYWHERE, true],
  ['Recanto', ['rec', 'rcto'], ANYWHERE, true],
  ['Distrito', ['dist'], ANYWHERE, true],
  ['Edifício', ['ed', 'edif'], ANYWHERE, true],
  ['Bloco', ['bl'], ANYWHERE, false],
  ['Quadra', ['qd'], ANYWHERE, false],
  ['Lote', ['lt'], ANYWHERE, false],
  ['Apartamento', ['ap', 'apto'], ANYWHERE, false],
  ['Casa', ['cs'], ANYWHERE, true],
  ['Sala', ['sl'], ANYWHERE, true],
  ['Fundos', ['fds'], ANYWHERE, false],

  // Títulos, cargos e patentes (comuns em nomes de rua)
  ['Doutor', ['dr'], ANYWHERE, false],
  ['Doutora', ['dra'], ANYWHERE, false],
  ['Professor', ['prof'], ANYWHERE, false],
  ['Professora', ['profa'], ANYWHERE, false],
  ['Engenheiro', ['eng'], ANYWHERE, false],
  ['Deputado', ['dep'], ANYWHERE, false],
  ['Senador', ['sen'], ANYWHERE, true],
  ['Vereador', ['ver'], ANYWHERE, true],
  ['Presidente', ['pres'], ANYWHERE, false],
  ['Governador', ['gov'], ANYWHERE, false],
  ['Prefeito', ['pref'], ANYWHERE, false],
  ['Ministro', ['min'], ANYWHERE, true],
  ['Desembargador', ['des'], ANYWHERE, true],
  ['Conselheiro', ['cons'], ANYWHERE, true],
  ['Comendador', ['comend'], ANYWHERE, false],
  ['Coronel', ['cel'], ANYWHERE, false],
  ['Capitão', ['cap', 'cpt'], ANYWHERE, true],
  ['Tenente', ['ten'], ANYWHERE, true],
  ['Major', ['maj'], ANYWHERE, true],
  ['General', ['gen', 'gal'], ANYWHERE, true],
  ['Sargento', ['sgt'], ANYWHERE, false],
  ['Brigadeiro', ['brig'], ANYWHERE, false],
  ['Marechal', ['mal'], ANYWHERE, true],
  ['Almirante', ['alm'], ANYWHERE, true],
  ['Comandante', ['cmte'], ANYWHERE, false],
  ['Padre', ['pe'], ANYWHERE, true],
  ['Frei', ['fr'], ANYWHERE, true],
  ['Monsenhor', ['mons'], ANYWHERE, false],
  ['Visconde', ['visc'], ANYWHERE, false],
  ['Barão', ['bar'], ANYWHERE, true],
  ['Santa', ['sta'], ANYWHERE, false],
  ['Santo', ['sto'], ANYWHERE, false],
  ['Senhor', ['sr'], ANYWHERE, true],
  ['Senhora', ['sra'], ANYWHERE, true],
];

// "N. Sra.", "Nsa. Sra.", "N.S." → "Nossa Senhora"
const NOSSA_SENHORA_PATTERN = /(^|[\s,(])N(?:sa)?\.?\s?(?:Sra\.?|S\.)(?=\s)/giu;
// Palavra (com ponto opcional) seguida de algo na mesma parte do endereço.
const WORD_PATTERN = /\p{L}+\.?/gu;
const PART_BOUNDARY = /[,;–—]|\s-\s|^\s*$/;

const LOOKUP = build_lookup(ABBREVIATION_TABLE);

export function expand_abbreviations(address) {
  const text = String(address ?? '')
    .replace(NOSSA_SENHORA_PATTERN, '$1Nossa Senhora')
    .replace(/\.(?=\p{L})/gu, '. '); // "Jd.Oswaldo" → "Jd. Oswaldo"

  return text.replace(WORD_PATTERN, (token, offset) => {
    if (!is_whole_word(text, offset, token)) return token;
    const has_dot = token.endsWith('.');
    const entry = LOOKUP.get(normalize_key(has_dot ? token.slice(0, -1) : token));
    if (!entry || (entry.requires_dot && !has_dot)) return token;
    if (!has_text_after(text, offset + token.length)) return token;
    if (entry.where === START_OF_PART && !is_start_of_part(text, offset)) return token;
    return entry.full;
  });
}

function build_lookup(table) {
  const lookup = new Map();
  for (const [full, abbreviations, where, requires_dot] of table) {
    for (const abbreviation of abbreviations) lookup.set(abbreviation, { full, where, requires_dot });
  }
  return lookup;
}

// Ignora pedaços de palavra (ex.: o "Res" dentro de "Resende").
function is_whole_word(text, offset, token) {
  const before = text[offset - 1] ?? ' ';
  const after = text[offset + token.length] ?? ' ';
  return !/[\p{L}\d]/u.test(before) && (token.endsWith('.') || !/[\p{L}\d]/u.test(after));
}

function has_text_after(text, position) {
  const rest = text.slice(position);
  const boundary = rest.search(/[,;–—]|\s-\s/);
  const same_part = boundary === -1 ? rest : rest.slice(0, boundary);
  return /[\p{L}\d]/u.test(same_part);
}

function is_start_of_part(text, offset) {
  const before = text.slice(0, offset).trimEnd();
  return before === '' || PART_BOUNDARY.test(before.slice(-1)) || /\s-$/.test(` ${before}`.slice(-2));
}

function normalize_key(word) {
  return word.toLowerCase().replace('ª', 'a').replace('º', 'o').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

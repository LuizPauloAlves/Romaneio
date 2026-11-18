import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build_delivery_receipts_html, plan_receipt_pages, split_into_pages } from '../src/reports/delivery_receipts.js';

const make_stop = (position, overrides = {}) => ({
  position,
  client: `CLIENTE ${position}`,
  address: `Rua ${position}, 10 - São José dos Campos - SP`,
  packages: '2',
  nf: `000${position}`,
  payment: position % 2 === 1 ? 'cash' : 'boleto',
  ...overrides,
});

const count = (html, text) => html.split(text).length - 1;

test('divide os comprovantes em páginas de 5 e numera PG. 1, PG. 2…', () => {
  const html = build_delivery_receipts_html({ date: '2026-10-16', stops: Array.from({ length: 12 }, (_, index) => make_stop(index + 1)) });
  assert.equal(count(html, 'class="receipt-page"'), 3);
  assert.equal(count(html, 'class="receipt"'), 12);
  assert.ok(html.includes('PG. 1') && html.includes('PG. 2') && html.includes('PG. 3'));
  assert.equal(count(html, 'LATICÍNIOS QUEIJOS DO REI LTDA</footer>'), 3);
  assert.equal(count(html, 'assets/logo_queijos_do_rei.png'), 3);
});

test('preenche cliente, pacotes, NF, endereço, pagamento e data da rota', () => {
  const html = build_delivery_receipts_html({ date: '2026-10-16', stops: [make_stop(1)] });
  for (const text of ['CLIENTE 1', '>2<', '0001', 'Rua 1, 10 - São José dos Campos - SP', '16/10/2026', 'Nome:', 'Assinatura:', 'RG ou CPF:', 'Horário:']) {
    assert.ok(html.includes(text), `faltou: ${text}`);
  }
  assert.ok(html.includes('<b>Pagamento:</b> <span class="receipt-text receipt-text--strong">À vista</span>'));
  for (const label of ['Boleto', 'Transferência', 'Pix', 'Cartão']) assert.ok(!html.includes(label), label);
});

test('campos vazios viram linha para preencher e texto é protegido', () => {
  const html = build_delivery_receipts_html({ date: '', stops: [make_stop(1, { nf: '', packages: '', client: 'A <b>B</b>', payment: undefined })] });
  assert.ok(html.includes('A &lt;b&gt;B&lt;/b&gt;'));
  assert.ok(html.includes('___/___/______'));
  assert.match(html, /<b>Pagamento:<\/b> <span class="fill-line ?"><\/span>/); // sem forma: linha para preencher
});

test('split_into_pages', () => {
  assert.deepEqual(split_into_pages([1, 2, 3, 4, 5, 6, 7], 5), [[1, 2, 3, 4, 5], [6, 7]]);
  assert.deepEqual(split_into_pages([], 5), []);
});

test('CEP não quebra no hífen', () => {
  const html = build_delivery_receipts_html({ date: '2026-10-16', stops: [make_stop(1, { address: 'Rua A, 1 – CEP 12260-000' })] });
  assert.ok(html.includes('<span class="nowrap">12260-000</span>'));
});

test('NF fica na coluna da direita com Pacotes logo abaixo; cliente e endereço à esquerda', () => {
  const html = build_delivery_receipts_html({ date: '2026-10-16', stops: [make_stop(1, { packages: '10 caixas quadradas de queijo minas frescal' })] });
  const side = html.slice(html.indexOf('class="receipt-side"'), html.indexOf('</div>', html.indexOf('class="receipt-side"')));
  assert.ok(side.indexOf('NF:') < side.indexOf('Pacotes:'));
  assert.ok(side.includes('10 caixas quadradas de queijo minas frescal'));
  assert.ok(!side.includes('Cliente:'));
  assert.ok(html.indexOf('Cliente:') < html.indexOf('class="receipt-side"'));
  assert.ok(html.includes('class="receipt-text">CLIENTE 1</span>'));
});

test('páginas montadas pela altura medida de cada comprovante', () => {
  // Página com 245 mm úteis, 3 mm entre comprovantes, no máximo 5 por página.
  const plan = (heights) => plan_receipt_pages({ heights, available_height: 245, gap: 3, max_per_page: 5 });
  assert.deepEqual(plan([45, 45, 45, 45, 45, 45, 45]), [5, 2]);   // 5 × 45 + 4 × 3 = 237 cabe
  assert.deepEqual(plan([45, 60, 60, 45, 45, 45]), [4, 2]);       // 45+60+60+45 + 9 = 219; +48 passaria
  assert.deepEqual(plan([45, 45, 45, 45, 50]), [5]);              // 180 + 50 + 12 = 242 cabe
  assert.deepEqual(plan([45, 45, 45, 45, 60]), [4, 1]);           // 180 + 60 + 12 = 252 não cabe
  assert.deepEqual(plan([]), []);
});

test('build usa a quantidade por página informada', () => {
  const stops = Array.from({ length: 7 }, (_, index) => make_stop(index + 1));
  const html = build_delivery_receipts_html({ date: '2026-10-16', stops }, [3, 4]);
  const pages = html.split('class="receipt-page"').slice(1);
  assert.deepEqual(pages.map((page) => count(page, 'class="receipt"')), [3, 4]);
  assert.ok(pages[1].includes('PG. 2'));
});

test('mostra só a forma escolhida, em negrito, inclusive em rotas antigas', () => {
  const pix = build_delivery_receipts_html({ date: '2026-10-16', stops: [make_stop(1, { payment: 'pix' })] });
  assert.ok(pix.includes('<b>Pagamento:</b> <span class="receipt-text receipt-text--strong">Pix</span>'));
  const card = build_delivery_receipts_html({ date: '2026-10-16', stops: [make_stop(1, { payment: 'card' })] });
  assert.ok(card.includes('receipt-text--strong">Cartão</span>'));
  const old = build_delivery_receipts_html({ date: '2026-10-16', stops: [make_stop(1, { payment: { cash: false, boleto: true } })] });
  assert.ok(old.includes('receipt-text--strong">Boleto</span>'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build_delivery_receipts_html, split_into_pages } from '../src/reports/delivery_receipts.js';

const make_stop = (position, overrides = {}) => ({
  position,
  client: `CLIENTE ${position}`,
  address: `Rua ${position}, 10 - São José dos Campos - SP`,
  packages: '2',
  nf: `000${position}`,
  payment: { cash: position % 2 === 1, boleto: position % 2 === 0 },
  ...overrides,
});

const count = (html, text) => html.split(text).length - 1;

test('divide os comprovantes em páginas de 5 e numera PG. 1, PG. 2…', () => {
  const html = build_delivery_receipts_html({ date: '2026-10-16', stops: Array.from({ length: 12 }, (_, index) => make_stop(index + 1)) });
  assert.equal(count(html, 'class="receipt-page"'), 3);
  assert.equal(count(html, 'class="receipt"'), 12);
  assert.ok(html.includes('PG. 1') && html.includes('PG. 2') && html.includes('PG. 3'));
  assert.equal(count(html, 'QUEIJOS DO REI LATICÍNIOS LTDA</footer>'), 3);
  assert.equal(count(html, 'assets/logo_queijos_do_rei.png'), 3);
});

test('preenche cliente, pacotes, NF, endereço, pagamento e data da rota', () => {
  const html = build_delivery_receipts_html({ date: '2026-10-16', stops: [make_stop(1)] });
  for (const text of ['CLIENTE 1', '>2<', '0001', 'Rua 1, 10 - São José dos Campos - SP', '16/10/2026', 'Nome:', 'Assinatura:', 'RG ou CPF:', 'Horário:']) {
    assert.ok(html.includes(text), `faltou: ${text}`);
  }
  assert.match(html, /À vista \( <b class="receipt-mark">X<\/b> \)/);
  assert.match(html, /Boleto \( <span class="receipt-mark">&nbsp;<\/span> \)/);
});

test('campos vazios viram linha para preencher e texto é protegido', () => {
  const html = build_delivery_receipts_html({ date: '', stops: [make_stop(1, { nf: '', packages: '', client: 'A <b>B</b>', payment: undefined })] });
  assert.ok(html.includes('A &lt;b&gt;B&lt;/b&gt;'));
  assert.ok(html.includes('___/___/______'));
  assert.equal(count(html, 'receipt-mark">&nbsp;'), 2);
});

test('split_into_pages', () => {
  assert.deepEqual(split_into_pages([1, 2, 3, 4, 5, 6, 7], 5), [[1, 2, 3, 4, 5], [6, 7]]);
  assert.deepEqual(split_into_pages([], 5), []);
});

test('CEP não quebra no hífen', () => {
  const html = build_delivery_receipts_html({ date: '2026-10-16', stops: [make_stop(1, { address: 'Rua A, 1 – CEP 12260-000' })] });
  assert.ok(html.includes('<span class="nowrap">12260-000</span>'));
});

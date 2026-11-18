import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAYMENT_METHODS, parse_payment, payment_label, normalize_payment } from '../src/config/payment_methods.js';

test('as cinco formas de pagamento, nesta ordem', () => {
  assert.deepEqual(PAYMENT_METHODS.map((method) => method.label), ['À vista', 'Boleto', 'Transferência', 'Pix', 'Cartão']);
});

test('entende o texto da lista e variações comuns', () => {
  const cases = {
    'À vista': 'cash', 'A vista': 'cash', 'a vista': 'cash', AVISTA: 'cash',
    Boleto: 'boleto', 'Transferência': 'transfer', transferencia: 'transfer', TED: 'transfer',
    Pix: 'pix', PIX: 'pix', 'Cartão': 'card', cartao: 'card', 'Cartão de crédito': 'card', 'débito': 'card',
  };
  for (const [text, key] of Object.entries(cases)) assert.equal(parse_payment(text), key, text);
  assert.equal(parse_payment(''), '');
  assert.equal(parse_payment('   '), '');
  assert.equal(parse_payment('cheque'), null);
});

test('rótulo e rotas antigas', () => {
  assert.equal(payment_label('pix'), 'Pix');
  assert.equal(payment_label(''), '');
  assert.equal(normalize_payment('card'), 'card');
  assert.equal(normalize_payment({ cash: true, boleto: false }), 'cash');
  assert.equal(normalize_payment({ cash: false, boleto: true }), 'boleto');
  assert.equal(normalize_payment(undefined), '');
});

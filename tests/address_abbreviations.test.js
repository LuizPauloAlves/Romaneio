import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expand_abbreviations } from '../src/maps/address_abbreviations.js';

test('expande os exemplos de São José dos Campos', () => {
  assert.equal(
    expand_abbreviations('Av. Cassiano Ricardo, 521 - Parque Res. Aquarius, São José dos Campos - SP'),
    'Avenida Cassiano Ricardo, 521 - Parque Residencial Aquarius, São José dos Campos - SP',
  );
  assert.equal(
    expand_abbreviations('Av. Dep. Benedito Matarazzo, 9009 - Jd Oswaldo Cruz, São José dos Campos - SP'),
    'Avenida Deputado Benedito Matarazzo, 9009 - Jardim Oswaldo Cruz, São José dos Campos - SP',
  );
  assert.equal(
    expand_abbreviations('R. Narcisio da Silva, 10, Cond. Chacara dos Eucaliptos, São José dos Campos - SP'),
    'Rua Narcisio da Silva, 10, Condomínio Chacara dos Eucaliptos, São José dos Campos - SP',
  );
});

test('aceita maiúsculas, sem ponto e com ponto colado', () => {
  assert.equal(expand_abbreviations('RUA X, 10 - JD. AQUARIUS'), 'RUA X, 10 - Jardim AQUARIUS');
  assert.equal(expand_abbreviations('Rua X, 10 - JD OSWALDO CRUZ'), 'Rua X, 10 - Jardim OSWALDO CRUZ');
  assert.equal(expand_abbreviations('Rua X, 10 - Jd.Satélite'), 'Rua X, 10 - Jardim Satélite');
  assert.equal(expand_abbreviations('Pça. da Matriz, Centro'), 'Praça da Matriz, Centro');
});

test('títulos e Nossa Senhora', () => {
  assert.equal(expand_abbreviations('Rua Cel. José Monteiro, 50'), 'Rua Coronel José Monteiro, 50');
  assert.equal(expand_abbreviations('Av. N. Sra. Aparecida, 100'), 'Avenida Nossa Senhora Aparecida, 100');
  assert.equal(expand_abbreviations('Rua Pe. Rodolfo, 7 - Vl. Ema'), 'Rua Padre Rodolfo, 7 - Vila Ema');
  assert.equal(expand_abbreviations('Rua Profª Maria, 3'), 'Rua Professora Maria, 3');
});

test('não estraga estado, palavras comuns nem pedaços de palavra', () => {
  assert.equal(expand_abbreviations('Rua A, 1, Maceió - AL'), 'Rua A, 1, Maceió - AL');
  assert.equal(expand_abbreviations('Recife - PE'), 'Recife - PE');
  assert.equal(expand_abbreviations('Bar do Zé, Rua das Flores, 2'), 'Bar do Zé, Rua das Flores, 2');
  assert.equal(expand_abbreviations('Rua Resende Costa, 15'), 'Rua Resende Costa, 15');
  assert.equal(expand_abbreviations('Rua Dr Faz Tudo, 1'), 'Rua Doutor Faz Tudo, 1');
  // Tipo de logradouro só no começo de uma parte
  assert.equal(expand_abbreviations('Travessa R Silva, 2'), 'Travessa R Silva, 2');
});

test('rodovia e km continuam reconhecíveis', () => {
  assert.equal(expand_abbreviations('Rod. dos Tamoios, 60km - Espigão, Paraibuna - SP'), 'Rodovia dos Tamoios, 60km - Espigão, Paraibuna - SP');
});

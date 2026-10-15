import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build_maps_links } from '../src/maps/maps_link_builder.js';

const base = { lat: -23.4, lng: -45.6 };
const make_stops = (count) => Array.from({ length: count }, (_, index) => ({ lat: -23 - index / 100, lng: -45 }));

test('até 9 paradas cabem em um único link', () => {
  const links = build_maps_links({ base, ordered_stops: make_stops(9) });
  assert.equal(links.length, 1);
  const url = new URL(links[0].url);
  assert.equal(url.searchParams.get('origin'), '-23.4,-45.6');
  assert.equal(url.searchParams.get('destination'), '-23.4,-45.6');
  assert.equal(url.searchParams.get('waypoints').split('|').length, 9);
});

test('15 paradas viram 2 links encadeados', () => {
  const links = build_maps_links({ base, ordered_stops: make_stops(15) });
  assert.equal(links.length, 2);
  assert.equal(links[0].label, 'Base → Parada 10');
  assert.equal(links[1].label, 'Parada 10 → Base');
  const second = new URL(links[1].url);
  assert.equal(second.searchParams.get('waypoints').split('|').length, 5);
});

'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'oscilloscope.js', 'translations.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab, scope = app.oscilloscope;
assert.deepEqual(Array.from(scope.submenus.probe.options), [1, 5, 10, 20, 50, 100, 200, 500, 1000]);
let draft = scope.openSubmenu(scope.pressChannel(scope.createState(), 1), 'probe');
for (const factor of scope.submenus.probe.options) {
  assert.equal(draft.submenuSelection, factor);
  assert.equal(draft.channels[1].probe, 1);
  const confirmed = scope.confirmSubmenu(draft);
  assert.equal(confirmed.channels[1].probe, factor);
  assert.equal(confirmed.channels[2].probe, 1);
  assert.equal(confirmed.submenu, null);
  draft = scope.stepSubmenu(draft, 1);
}
assert.equal(draft.submenuSelection, 1000);
const paths = svg => Array.from(svg.matchAll(/<path d="([^"]+)" stroke="(#[^"]+)"/g), m => m[1]);
const points = path => Array.from(path.matchAll(/[ML]([0-9.-]+),([0-9.-]+)/g), m => [Number(m[1]), Number(m[2])]);
for (const waveform of ['sine', 'square']) for (const coupling of ['DC', 'AC', 'GND']) for (const factor of scope.submenus.probe.options) {
  const generator = { ...app.generatorDefaults, waveform, offset: .002, amplitudeVpp: .005 };
  const experiment = JSON.stringify(generator);
  const base = scope.createState({ channels: { 1: { coupling, positionDivisions: 1 } } });
  const amplified = scope.createState({ channels: { 1: { coupling, positionDivisions: 1, probe: factor } } });
  for (const [prefix, divisions, display] of [['scope', 10, {}], ['instrument', 12, { footerScales: true, cellWidth: 40 }]]) {
    const render = settings => scope.render(app.circuits.rc, app.circuits.rc.defaults, generator, key => app.translations.en[key], String, prefix, divisions, settings, display);
    const originalPaths = paths(render(base)), changedPaths = paths(render(amplified));
    assert.equal(originalPaths[1], changedPaths[1]);
    if (coupling === 'GND') assert.equal(originalPaths[0], changedPaths[0]);
    else {
      const before = points(originalPaths[0]), after = points(changedPaths[0]);
      for (let n = 0; n < before.length; n++) {
        assert.equal(before[n][0], after[n][0]);
        assert.ok(Math.abs((164 - after[n][1]) - (164 - before[n][1]) * factor) < .002 + .0006 * factor);
      }
    }
    const ground = /data-ground-channel="1"[^>]+transform="([^"]+)"/;
    assert.equal(render(base).match(ground)[1], render(amplified).match(ground)[1]);
  }
  assert.equal(JSON.stringify(generator), experiment);
}
// Dense bands use the same multiplication rather than ignoring the factor.
const generator = { ...app.generatorDefaults, frequency: 25e6, amplitudeVpp: .1 };
const band = factor => scope.render(app.circuits.rc, app.circuits.rc.defaults, generator, key => app.translations.en[key], String, 'scope', 10, scope.createState({ channels: { 1: { probe: factor } } }));
const height = svg => Number(svg.match(/<rect x="36" y="[0-9.]+"[^>]+height="([0-9.]+)" fill="#f4d35e"/)[1]);
assert.ok(Math.abs(height(band(10)) - height(band(1)) * 10) < 1e-9);
assert.equal(scope.createState().channels[1].probe, 1);
console.log('All nine probe factors scale DC/AC about their ground references, preserve GND and other channels, and apply to dense bands.');

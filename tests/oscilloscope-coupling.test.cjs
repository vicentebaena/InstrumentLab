'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'oscilloscope.js', 'translations.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab, scope = app.oscilloscope, initial = scope.createState();
assert.equal(scope.openSubmenu(initial, 'coupling'), initial);
let state = scope.openSubmenu(scope.pressChannel(initial, 1), 'coupling');
assert.equal(state.submenuSelection, 'DC');
state = scope.stepSubmenu(state, 1);
assert.equal(state.submenuSelection, 'AC');
assert.equal(state.channels[1].coupling, 'DC');
assert.equal(scope.confirmSubmenu(state).channels[1].coupling, 'AC');
assert.equal(scope.confirmSubmenu(state).channels[2].coupling, 'DC');
assert.equal(scope.confirmSubmenu(state).submenu, null);
assert.equal(scope.confirmSubmenu(state).menuChannel, 1);
const cancelled = scope.toggleChannelMenu(state);
assert.equal(cancelled.submenuSelection, null);
assert.equal(cancelled.channels[1].coupling, 'DC');
assert.equal(scope.confirmSubmenu(cancelled), cancelled);
assert.equal(scope.pressChannel(state, 2).submenuSelection, null);
for (let n = 0; n < 10; n++) state = scope.stepSubmenu(state, 1);
assert.equal(state.submenuSelection, 'GND');
for (let n = 0; n < 10; n++) state = scope.stepSubmenu(state, -1);
assert.equal(state.submenuSelection, 'DC');
// The same highlight/confirmation machinery supports other registered submenus.
scope.submenus.example = { property: 'probe', options: [1, 10] };
let future = scope.openSubmenu(scope.pressChannel(initial, 2), 'example');
future = scope.confirmSubmenu(scope.stepSubmenu(future, 1));
assert.equal(future.channels[2].probe, 10);
assert.equal(future.channels[1].probe, 1);
delete scope.submenus.example;
const paths = svg => Array.from(svg.matchAll(/<path d="([^"]+)" stroke="(#[^"]+)"/g), m => m[1]);
const points = path => Array.from(path.matchAll(/[ML]([0-9.-]+),([0-9.-]+)/g), m => [Number(m[1]), Number(m[2])]);
for (const waveform of ['sine', 'square']) for (const [prefix, divisions, cellWidth] of [['scope', 10, 56.8], ['instrument', 12, 40]]) {
  const generator = { ...app.generatorDefaults, waveform, offset: .7 };
  const render = (settings, source = generator) => scope.render(app.circuits.rc, app.circuits.rc.defaults, source, key => app.translations.en[key], String, prefix, divisions, settings, { cellWidth, footerScales: prefix === 'instrument', triggerAnalysis: { locked: true, time: 0 } });
  const dc = scope.createState(), ac = scope.createState({ channels: { 1: { coupling: 'AC' }, 2: { coupling: 'AC' } } });
  const dcPaths = paths(render(dc)), acPaths = paths(render(ac));
  for (const channel of [0, 1]) {
    const before = points(dcPaths[channel]), after = points(acPaths[channel]);
    assert.equal(before.length, after.length);
    for (let n = 0; n < before.length; n++) {
      assert.equal(before[n][0], after[n][0]);
      assert.ok(Math.abs(after[n][1] - before[n][1] - 56) < .002);
    }
  }
  const ac1 = scope.createState({ channels: { 1: { coupling: 'AC' } } });
  assert.equal(paths(render(ac1))[1], dcPaths[1]);
  assert.deepEqual(paths(render(ac, { ...generator, output1Enabled: false })), paths(render(dc, { ...generator, output1Enabled: false })));
  const ground = scope.createState({ channels: { 1: { coupling: 'GND', positionDivisions: 1.5 }, 2: { coupling: 'GND', positionDivisions: -1 } } });
  const grounded = render(ground, { ...generator, frequency: 25e6 });
  assert.deepEqual(paths(grounded), [`M36 144H${36 + cellWidth * divisions}`, `M36 244H${36 + cellWidth * divisions}`]);
  assert.ok(!grounded.includes('Cycles unresolved'));
  // At dense frequencies, AC bands also remove DC, while GND stays a line.
  const dense = render(scope.createState({ channels: { 1: { coupling: 'AC' }, 2: { coupling: 'GND' } } }), { ...generator, amplitudeVpp: .1, frequency: 25e6 });
  assert.ok(dense.includes('y="200"') && dense.includes('height="8"'));
  assert.ok(paths(dense).includes(`M36 204H${36 + cellWidth * divisions}`));
  assert.ok(!/NaN|undefined|Infinity/.test(dense));
}
console.log('Reusable submenu draft/confirm/cancel, independent DC/AC/GND, exact period means, ground position and dense-frequency rendering passed.');

'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'oscilloscope.js', 'translations.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab, scope = app.oscilloscope, initial = scope.createState();
assert.equal(initial.horizontalPositionDivisions, 0);
for (const selectedChannel of [1, 2, null]) for (const visible of [true, false]) {
  const state = scope.createState({ selectedChannel, channels: { 1: { visible }, 2: { visible } } });
  const moved = scope.stepHorizontalPosition(state, 1);
  assert.equal(moved.horizontalPositionDivisions, .1);
  assert.equal(state.horizontalPositionDivisions, 0);
  assert.equal(moved.selectedChannel, selectedChannel);
  assert.equal(moved.channels, state.channels);
  assert.equal(moved.timePerDivision, state.timePerDivision);
  assert.equal(scope.stepHorizontalPosition(moved, -1).horizontalPositionDivisions, 0);
}
for (const [direction, bound] of [[1, 5], [-1, -5]]) {
  let state = initial;
  for (let i = 0; i < 200; i++) state = scope.stepHorizontalPosition(state, direction);
  assert.equal(state.horizontalPositionDivisions, bound);
  assert.equal(scope.stepHorizontalPosition(state, direction), state);
}
const paths = svg => Array.from(svg.matchAll(/<path d="([^"]+)" stroke="(#[^"]+)"/g), m => m[1]);
for (const [prefix, divisions, cellWidth] of [['scope', 10, 56.8], ['instrument', 12, 40]]) for (const position of [-1, 1]) {
  const generator = { ...app.generatorDefaults, waveform: 'sine' };
  const render = (state, source = generator) => scope.render(app.circuits.rc, app.circuits.rc.defaults, source, key => app.translations.en[key], String, prefix, divisions, state, { cellWidth });
  const state = scope.createState({ horizontalPositionDivisions: position });
  const tracePaths = paths(render(state));
  const left = 36, width = divisions * cellWidth, duration = divisions * state.timePerDivision;
  const start = -duration / 2 - position * state.timePerDivision;
  for (const [channel, key] of ['input', 'output'].entries()) {
    const points = Array.from(tracePaths[channel].matchAll(/[ML]([0-9.-]+),([0-9.-]+)/g), m => [Number(m[1]), Number(m[2])]);
    for (let i = 0; i < points.length; i += 30) {
      const [x, y] = points[i], time = start + (x - left) / width * duration;
      const voltage = app.circuits.rc.sample(time, app.circuits.rc.defaults, generator)[key];
      assert.ok(Math.abs(y - (204 - voltage / .5 * 40)) < .003);
    }
    assert.notEqual(tracePaths[channel], paths(render(initial))[channel]);
  }
  // The shared t=0 edge moves by the same number of divisions in both traces.
  const square = render(state, app.generatorDefaults), edgeX = left + width / 2 + position * cellWidth;
  for (const [channel, key] of ['input', 'output'].entries()) {
    const voltage = app.circuits.rc.sample(0, app.circuits.rc.defaults, app.generatorDefaults)[key];
    assert.ok(paths(square)[channel].includes(`L${edgeX.toFixed(3)},${(204 - voltage / .5 * 40).toFixed(3)}`));
  }
  const markers = svg => [...svg.matchAll(/data-ground-channel="[12]"[^>]+transform="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(markers(render(state)), markers(render(initial)));
  const ground = scope.createState({ horizontalPositionDivisions: position, channels: { 1: { coupling: 'GND' }, 2: { coupling: 'GND' } } });
  assert.deepEqual(paths(render(ground)), paths(render(scope.createState({ channels: { 1: { coupling: 'GND' }, 2: { coupling: 'GND' } } }))));
  const hidden = scope.createState({ horizontalPositionDivisions: position, channels: { 1: { visible: false }, 2: { visible: false } } });
  assert.equal(paths(render(hidden)).length, 0);
  assert.equal(scope.pressChannel(hidden, 1).horizontalPositionDivisions, position);
  assert.ok(!/NaN|Infinity|undefined/.test(render(state, { ...generator, frequency: 25e6 })));
}
console.log('Shared horizontal position moves both signals, ignores visibility/selection, preserves zero references, retains hidden settings and resets to centre.');

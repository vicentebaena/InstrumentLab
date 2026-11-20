'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'translations.js', 'oscilloscope.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab;
const scope = app.oscilloscope;
const original = scope.createState();
assert.equal(original.channels[1].visible, true);
assert.equal(original.channels[2].visible, true);
assert.equal(original.menuChannel, null);
for (const channel of [1, 2]) {
  // First press shows/selects the menu without hiding an already visible trace.
  let state = scope.pressChannel(original, channel);
  assert.equal(state.channels[channel].visible, true);
  assert.equal(state.menuChannel, channel);
  assert.equal(state.selectedChannel, channel);
  // Second press hides the selected visible channel and dismisses its menu.
  state = scope.pressChannel(state, channel);
  assert.equal(state.channels[channel].visible, false);
  assert.equal(state.channels[channel === 1 ? 2 : 1].visible, true);
  assert.equal(state.menuChannel, null);
  // Pressing a hidden channel restores it, selects it and opens its menu.
  state = scope.pressChannel(state, channel);
  assert.equal(state.channels[channel].visible, true);
  assert.equal(state.menuChannel, channel);
  assert.equal(state.selectedChannel, channel);
}
let state = scope.pressChannel(original, 1);
state = scope.pressChannel(state, 2);
assert.equal(state.channels[1].visible, true);
assert.equal(state.channels[2].visible, true);
assert.equal(state.menuChannel, 2);
assert.equal(state.selectedChannel, 2);
// Changing menus never modifies the other channel's settings or visibility.
assert.equal(original.menuChannel, null);
assert.equal(original.channels[1].visible, true);
for (const channel of [2, 1]) { state = scope.pressChannel(state, channel); if (state.channels[channel].visible) state = scope.pressChannel(state, channel); }
assert.equal(state.channels[1].visible, false);
assert.equal(state.channels[2].visible, false);
const render = (settings, prefix = 'scope', divisions = 10, frequency = 1000) => scope.render(app.circuits.rc, app.circuits.rc.defaults, { ...app.generatorDefaults, frequency }, key => app.translations.en[key], String, prefix, divisions, settings);
const traces = svg => [...svg.matchAll(/<path d="[^"]+" stroke="(#[^"]+)"/g)].map(match => match[1]);
assert.deepEqual(traces(render(original)), ['#f4d35e', '#6ecbff']);
let hide1 = scope.pressChannel(scope.pressChannel(original, 1), 1);
assert.deepEqual(traces(render(hide1)), ['#6ecbff']);
let hide2 = scope.pressChannel(scope.pressChannel(original, 2), 2);
assert.deepEqual(traces(render(hide2)), ['#f4d35e']);
assert.deepEqual(traces(render(state)), []);
const instrument = render(hide1, 'ds1102e', 12);
assert.deepEqual(traces(instrument), ['#6ecbff']);
assert.ok(instrument.includes('Time 250us') && !instrument.includes('H 250'));
assert.ok(!/NaN|undefined|Infinity|Cycles unresolved/.test(render(state, 'scope', 10, 25e6)));
assert.equal(original.channels[1].coupling, 'DC');
assert.equal(original.channels[2].probe, 1);
console.log('CH1/CH2 menu-selection-visibility transitions, independent traces, empty display and Time label passed.');

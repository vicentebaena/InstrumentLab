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
assert.ok(instrument.includes('Time 200.0us') && !instrument.includes('H 200'));
assert.ok(!/NaN|undefined|Infinity|Cycles unresolved/.test(render(state, 'scope', 10, 25e6)));
assert.equal(original.channels[1].coupling, 'DC');
assert.equal(original.channels[2].probe, 1);
console.log('CH1/CH2 menu-selection-visibility transitions, independent traces, empty display and Time label passed.');

// MENU ON/OFF toggles only the selected channel's menu, even if its trace is hidden.
for (const initial of [original, hide1, state]) {
  const shown = scope.toggleChannelMenu(initial);
  assert.equal(shown.menuChannel, initial.selectedChannel);
  assert.equal(shown.selectedChannel, initial.selectedChannel);
  assert.deepEqual(shown.channels, initial.channels);
  assert.equal(render(shown), render(initial));
  const hidden = scope.toggleChannelMenu(shown);
  assert.equal(hidden.menuChannel, null);
  assert.equal(hidden.selectedChannel, initial.selectedChannel);
  assert.deepEqual(hidden.channels, initial.channels);
}
console.log('MENU ON/OFF toggles the selected menu without changing traces, settings or selection.');

// Independent vertical scales, direction, stops and hidden-channel guard.
assert.equal(original.channels[1].voltsPerDivision, 0.5);
const finer = scope.stepVerticalScale(original, -1);
assert.equal(finer.channels[1].voltsPerDivision, 0.2);
assert.equal(finer.channels[2].voltsPerDivision, 0.5);
assert.equal(original.channels[1].voltsPerDivision, 0.5);
assert.equal(finer.menuChannel, original.menuChannel);
assert.equal(scope.stepVerticalScale(finer, 1).channels[1].voltsPerDivision, 0.5);
const selected2 = scope.pressChannel(finer, 2);
const coarser2 = scope.stepVerticalScale(selected2, 1);
assert.equal(coarser2.channels[2].voltsPerDivision, 1);
assert.equal(coarser2.channels[1].voltsPerDivision, 0.2);
assert.equal(scope.stepVerticalScale(hide1, -1), hide1);
assert.equal(scope.stepVerticalScale(hide2, 1), hide2);
for (const [direction, limit] of [[-1, 0.01], [1, 10]]) {
  let bounded = original;
  for (let n = 0; n < 30; n++) bounded = scope.stepVerticalScale(bounded, direction);
  assert.equal(bounded.channels[1].voltsPerDivision, limit);
  assert.equal(bounded.channels[2].voltsPerDivision, 0.5);
  assert.equal(scope.stepVerticalScale(bounded, direction), bounded);
}
const paths = svg => [...svg.matchAll(/<path d="([^"]+)" stroke="(#[^"]+)"/g)].map(match => match[1]);
const initialPaths = paths(render(original)), finePaths = paths(render(finer));
assert.notEqual(initialPaths[0], finePaths[0]);
assert.equal(initialPaths[1], finePaths[1]);
for (const [prefix, divisions] of [['scope', 10], ['ds1102e', 12]]) {
  const svg = render(coarser2, prefix, divisions);
  assert.ok(svg.includes('CH1 200mV') && svg.includes('CH2 1.00V'));
  assert.ok(!/NaN|undefined|Infinity/.test(svg));
  assert.ok(!/NaN|undefined|Infinity/.test(render(coarser2, prefix, divisions, 25e6)));
}
assert.equal(scope.createState().channels[1].voltsPerDivision, 0.5);
console.log('Vertical scale direction, bounds, independent channels, hidden-channel guard and shared rendering passed.');

// Horizontal timebase is global: selection, menus and visibility are irrelevant.
const timeLabels = ['10.00us', '20.00us', '50.00us', '100.0us', '200.0us', '500.0us', '1.000ms', '2.000ms', '5.000ms', '10.00ms'];
assert.deepEqual(Array.from(scope.horizontalScales, value => scope.formatTimeScale(value)), timeLabels);
assert.equal(original.timePerDivision, 200e-6);
for (const initial of [original, selected2, hide1, state, { ...state, selectedChannel: null }]) {
  const zoomed = scope.stepHorizontalScale(initial, -1);
  assert.equal(zoomed.timePerDivision, 100e-6);
  assert.equal(zoomed.selectedChannel, initial.selectedChannel);
  assert.equal(zoomed.menuChannel, initial.menuChannel);
  assert.deepEqual(zoomed.channels, initial.channels);
  assert.equal(initial.timePerDivision, 200e-6);
  assert.equal(scope.stepHorizontalScale(zoomed, 1).timePerDivision, 200e-6);
}
for (const [direction, limit] of [[-1, 10e-6], [1, 10e-3]]) {
  let bounded = original;
  for (let n = 0; n < 30; n++) bounded = scope.stepHorizontalScale(bounded, direction);
  assert.equal(bounded.timePerDivision, limit);
  assert.equal(scope.stepHorizontalScale(bounded, direction), bounded);
}
for (const [i, timePerDivision] of Array.from(scope.horizontalScales).entries()) {
  const settings = { ...original, timePerDivision };
  for (const [prefix, divisions] of [['scope', 10], ['ds1102e', 12]]) {
    const svg = render(settings, prefix, divisions);
    assert.ok(svg.includes(prefix === 'scope' ? `H ${timeLabels[i]}/div` : `Time ${timeLabels[i]}`));
    assert.ok(!/NaN|undefined|Infinity/.test(svg));
    assert.ok(svg.includes('CH1 500mV') && svg.includes('CH2 500mV'));
  }
}
assert.notEqual(paths(render(original))[0], paths(render(scope.stepHorizontalScale(original, -1)))[0]);
assert.notEqual(paths(render(original))[1], paths(render(scope.stepHorizontalScale(original, -1)))[1]);
// At t=0 both zoom levels retain the same voltage at their common centre.
for (const timePerDivision of [10e-6, 200e-6, 1e-3]) {
  for (const [prefix, divisions, centre] of [['scope', 10, 320], ['ds1102e', 12, 276]]) {
    const svg = render({ ...original, timePerDivision }, prefix, divisions);
    for (const [index, key] of ['input', 'output'].entries()) {
      const expectedY = (204 - app.circuits.rc.sample(0, app.circuits.rc.defaults, app.generatorDefaults)[key] / .5 * 40).toFixed(3);
      assert.ok(paths(svg)[index].includes(`L${centre.toFixed(3)},${expectedY}`));
    }
  }
}
console.log('Shared horizontal scale, exact labels, direction, stops, hidden/unselected channels, centred zoom and both traces passed.');

// Vertical position is a display translation; ground and trace move together.
const raised = scope.stepVerticalPosition(original, 1);
assert.equal(raised.channels[1].positionDivisions, 0.1);
assert.equal(raised.channels[2].positionDivisions, 0);
assert.equal(original.channels[1].positionDivisions, 0);
assert.equal(scope.stepVerticalPosition(raised, -1).channels[1].positionDivisions, 0);
assert.equal(scope.stepVerticalPosition(hide1, 1), hide1);
assert.equal(scope.stepVerticalPosition(hide2, -1), hide2);
assert.equal(scope.stepVerticalPosition({ ...original, selectedChannel: null }, 1).selectedChannel, null);
assert.equal(raised.channels[1].voltsPerDivision, original.channels[1].voltsPerDivision);
assert.equal(raised.timePerDivision, original.timePerDivision);
assert.equal(raised.menuChannel, original.menuChannel);
const lowered2 = scope.stepVerticalPosition(scope.pressChannel(raised, 2), -1);
assert.equal(lowered2.channels[1].positionDivisions, 0.1);
assert.equal(lowered2.channels[2].positionDivisions, -0.1);
for (const [direction, limit] of [[-1, -4], [1, 4]]) {
  let bounded = original;
  for (let n = 0; n < 100; n++) bounded = scope.stepVerticalPosition(bounded, direction);
  assert.equal(bounded.channels[1].positionDivisions, limit);
  assert.equal(scope.stepVerticalPosition(bounded, direction), bounded);
  assert.equal(bounded.channels[2].positionDivisions, 0);
}
const markerY = (svg, channel) => Number(svg.match(new RegExp(`data-ground-channel="${channel}"[^>]+translate\\([0-9]+ ([^)]+)\\)`))[1]);
for (const [prefix, divisions] of [['scope', 10], ['ds1102e', 12]]) {
  const initialSvg = render(original, prefix, divisions), raisedSvg = render(raised, prefix, divisions);
  assert.equal(markerY(initialSvg, 1), 204);
  assert.equal(markerY(initialSvg, 2), 204);
  assert.equal(markerY(raisedSvg, 1), 200);
  assert.equal(markerY(raisedSvg, 2), 204);
  const initial = paths(initialSvg), moved = paths(raisedSvg);
  assert.equal(initial[1], moved[1]);
  const points = trace => Array.from(trace.matchAll(/[ML]([0-9.-]+),([0-9.-]+)/g), m => [Number(m[1]), Number(m[2])]);
  const oldPoints = points(initial[0]), newPoints = points(moved[0]);
  assert.equal(newPoints.length, oldPoints.length);
  for (let n = 0; n < oldPoints.length; n++) {
    assert.equal(newPoints[n][0], oldPoints[n][0]);
    assert.ok(Math.abs(newPoints[n][1] - oldPoints[n][1] + 4) < .002);
  }
  const rescaled = scope.stepVerticalScale(raised, 1);
  assert.equal(markerY(render(rescaled, prefix, divisions), 1), 200);
  assert.ok(!render(hide1, prefix, divisions).includes('data-ground-channel="1"'));
  assert.ok(!render(state, prefix, divisions).includes('data-ground-channel='));
  // Dense-frequency bands must shift too, including when the full band is off-screen.
  const smallSignal = { ...app.generatorDefaults, frequency: 25e6, amplitudeVpp: .02 };
  const denseRender = settings => scope.render(app.circuits.rc, app.circuits.rc.defaults, smallSignal, key => app.translations.en[key], String, prefix, divisions, settings);
  const bandTop = svg => Number(svg.match(/<rect x="36" y="([0-9.]+)"[^>]+fill="#f4d35e"/)[1]);
  assert.ok(Math.abs(bandTop(denseRender(raised)) - bandTop(denseRender(original)) + 4) < 1e-9);
  assert.ok(!/NaN|undefined|Infinity/.test(denseRender(lowered2)));
}
assert.equal(scope.createState().channels[1].positionDivisions, 0);
assert.equal(scope.createState().channels[2].positionDivisions, 0);
console.log('Independent vertical position, hidden-channel guard, bounds, moving ground markers and dense bands passed.');

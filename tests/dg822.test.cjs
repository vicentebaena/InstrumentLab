'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'dg822-panel.js', 'translations.js', 'oscilloscope.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
}
const app = context.window.InstrumentLab;
const api = app.DG822Panel;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-15, Math.abs(expected) * 1e-12));
for (const [unit, value] of [['MHz', 2e6], ['kHz', 2000], ['Hz', 2], ['mHz', .002], ['uHz', .000002]]) {
  const change = api.change('frequency', 2, unit);
  close(change.frequency, value);
  close(api.reading({ ...app.generatorDefaults, ...change }, 'frequency').value, 2);
}
for (const [unit, input, expected] of [['Vpp', 2, 2], ['mVpp', 500, .5], ['Vrms', .5, 1], ['mVrms', 500, 1]]) {
  const change = api.change('amplitude', input, unit);
  close(change.amplitudeVpp, expected);
  close(api.reading({ ...app.generatorDefaults, ...change }, 'amplitude').value, input);
}
close(api.change('offset', -500, 'mVdc').offset, -.5);
close(api.change('offset', 1, 'Vdc').offset, 1);
close(api.change('offset', 0, 'mVdc').offset, 0);
for (const args of [['frequency', 0, 'Hz'], ['frequency', -1, 'Hz'], ['amplitude', 0, 'Vpp'], ['amplitude', NaN, 'Vpp'], ['offset', Infinity, 'Vdc'], ['frequency', 1, 'Vpp']]) {
  assert.throws(() => api.change(...args));
}
assert.equal(api.formatNumber(1, 9), '1.000,000,000');
assert.equal(api.formatNumber(5, 4), '5.000,0');
assert.equal(api.formatNumber(-.5, 4), '-0.500,0');
// MHz frequencies must render in bounded work without producing a false sampled trace.
for (const frequency of [1e-6, 1e-3, 1, 1000, 1e6, 25e6]) {
  const svg = app.oscilloscope.render(app.circuits.rc, app.circuits.rc.defaults, { ...app.generatorDefaults, frequency }, key => app.translations.en[key], String);
  assert.ok(!/NaN|Infinity|undefined/.test(svg));
  assert.ok(svg.length < 150000);
  assert.equal(svg.includes('Cycles unresolved'), frequency > 56800);
}
console.log('DG822 unit conversions, RMS amplitude, numeric format, validation and wide frequency rendering passed.');

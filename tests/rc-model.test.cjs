'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'translations.js', 'oscilloscope.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
}
const app = context.window.InstrumentLab;
const rc = app.circuits.rc;
const p = rc.defaults;
const g = app.generatorDefaults;
const T = 1 / g.frequency;
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const sample = time => rc.sample(time, p, g);
close(rc.characteristics(p).tau, 100e-6);
close(rc.characteristics(p).cutoff, 1591.5494309189535);
close(sample(0).input, 1);
close(sample(T * .75).input, -1);
// Check the periodic steady-state boundary value and continuous capacitor voltage.
close(sample(0).output, -Math.tanh(2.5));
close(sample(T / 2 - 1e-12).output, sample(T / 2 + 1e-12).output, 1e-7);
close(sample(T - 1e-12).output, sample(T + 1e-12).output, 1e-7);
for (const time of [-.00021, .0001, .00045, .00071, .0012]) {
  close(sample(time).output, sample(time + T).output);
  close(sample(time).output, -sample(time + T / 2).output);
  const h = 1e-9;
  const derivative = (sample(time + h).output - sample(time - h).output) / (2 * h);
  close(derivative, (sample(time).input - sample(time).output) / (p.resistance * p.capacitance), 1e-4);
}
const offsetSample = rc.sample(.0001, p, { ...g, offset: 3 });
close(offsetSample.input, sample(.0001).input + 3);
close(offsetSample.output, sample(.0001).output + 3);
// Extreme permitted R/C values must still yield finite, bounded results.
for (const resistance of [1, 1e7]) for (const capacitance of [1e-12, 1e-3]) {
  const result = rc.sample(.0001, { resistance, capacitance }, g);
  assert.ok(Number.isFinite(result.output) && Math.abs(result.output) <= 1);
}
assert.ok(rc.sample(.0002, { ...p, resistance: 10000 }, g).output < sample(.0002).output);
const scale = app.oscilloscope.defaults.timePerDivision;
close(scale * 10 / T, 2.5);
for (const language of ['en', 'es']) {
  for (const resistance of [1000, 10000]) {
    const svg = app.oscilloscope.render(rc, { ...p, resistance }, g, key => app.translations[language][key], String);
    assert.ok(svg.includes('#f4d35e') && svg.includes('#6ecbff'));
    assert.ok(!/NaN|undefined|Infinity/.test(svg));
    assert.equal(app.oscilloscope.defaults.timePerDivision, scale);
  }
}
console.log('RC response, continuity, differential equation, offsets, limits, and fixed scope scales passed.');

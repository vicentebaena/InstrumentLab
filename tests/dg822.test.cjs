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

// Sine and square have different AC RMS-to-peak conversion factors.
close(api.change('amplitude', 1, 'Vrms', { waveform: 'sine' }).amplitudeVpp, 2 * Math.SQRT2);
close(api.reading({ ...app.generatorDefaults, waveform: 'sine', amplitudeVpp: 2 * Math.SQRT2, amplitudeUnit: 'Vrms' }, 'amplitude').value, 1);
const rmsGenerator = { ...app.generatorDefaults, amplitudeVpp: 4, amplitudeUnit: 'Vrms' };
const sineChange = api.waveformChange(rmsGenerator, 'sine');
close(sineChange.amplitudeVpp, 4 * Math.SQRT2);
close(api.reading({ ...rmsGenerator, ...sineChange }, 'amplitude').value, 2);
close(api.waveformChange(app.generatorDefaults, 'sine').amplitudeVpp, 2);
assert.throws(() => api.waveformChange(app.generatorDefaults, 'ramp'));
const rc = app.circuits.rc;
const params = rc.defaults;
const sine = { ...app.generatorDefaults, waveform: 'sine' };
const omegaTau = 2 * Math.PI * sine.frequency * params.resistance * params.capacitance;
close(rc.sample(0, params, sine).input, 0);
close(rc.sample(0, params, sine).output, -omegaTau / (1 + omegaTau ** 2));
close(rc.sample(.00025, params, sine).input, 1);
close(rc.sample(.00025, params, sine).output, 1 / (1 + omegaTau ** 2));
for (const time of [0, .0001, .00037, .00075]) {
  const h = 1e-9;
  const sample = rc.sample(time, params, sine);
  const derivative = (rc.sample(time + h, params, sine).output - rc.sample(time - h, params, sine).output) / (2 * h);
  assert.ok(Math.abs(derivative - (sample.input - sample.output) / (params.resistance * params.capacitance)) < 1e-4);
}
for (const waveform of ['sine', 'square']) for (const frequency of [1e-6, 1000, 25e6]) {
  const svg = app.oscilloscope.render(rc, params, { ...sine, waveform, frequency }, key => app.translations.en[key], String);
  assert.ok(!/NaN|Infinity|undefined/.test(svg));
}
console.log('Sine response, RC gain/phase and differential equation, waveform selection and waveform-aware RMS passed.');
// Output switches are independent; CH1 gates the connected circuit, including DC offset.
assert.equal(app.generatorDefaults.output1Enabled, true);
assert.equal(app.generatorDefaults.output2Enabled, false);
for (const waveform of ['sine', 'square']) {
  const programmed = { ...app.generatorDefaults, waveform, offset: 1.25, amplitudeVpp: 3 };
  for (const output2Enabled of [false, true]) {
    for (const time of [0, .00013, .00075]) {
      const off = rc.sample(time, params, { ...programmed, output1Enabled: false, output2Enabled });
      close(off.input, 0);
      close(off.output, 0);
      const on = rc.sample(time, params, { ...programmed, output2Enabled });
      close(on.input, rc.sample(time, params, programmed).input);
      close(on.output, rc.sample(time, params, programmed).output);
    }
  }
  const svg = app.oscilloscope.render(rc, params, { ...programmed, frequency: 25e6, output1Enabled: false }, key => app.translations.en[key], String);
  assert.ok(!/NaN|Infinity|undefined|Cycles unresolved/.test(svg));
  assert.ok(svg.includes('204.000'));
}
console.log('Output1 gating, independent Output2, DC removal and disabled high-frequency display passed.');
// Instrument and main views share scales/centre time but use 12 and 10 divisions.
for (const generator of [app.generatorDefaults, { ...app.generatorDefaults, waveform: 'sine' }, { ...app.generatorDefaults, output1Enabled: false }]) {
  const main = app.oscilloscope.render(rc, params, generator, key => app.translations.en[key], String);
  const instrument = app.oscilloscope.render(rc, params, generator, key => app.translations.en[key], String, 'ds1102e', 12);
  const ids = markup => [...markup.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.ok(ids(main).every(id => !ids(instrument).includes(id)));
  const gridLines = markup => [...markup.match(/stroke="#203038" stroke-width="1">(.*?)<\/g>/s)[1].matchAll(/<path /g)].length;
  assert.equal(gridLines(main), 11 + 9);
  assert.equal(gridLines(instrument), 13 + 9);
  assert.ok(main.includes('2 ms') && instrument.includes('2.4 ms'));
  assert.ok(main.includes('H 200.0us/div') && instrument.includes('Time 200.0us'));
  assert.ok(main.includes('CH1 500mV') && instrument.includes('CH1 500mV'));
  const traces = markup => [...markup.matchAll(/<path d="([^"]+)" stroke="#(?:f4d35e|6ecbff)"/g)].map(match => match[1]);
  assert.equal(traces(main).length, 2);

  const viewWidth = Number(instrument.match(/viewBox="0 0 ([0-9.]+)/)[1]);
  close(viewWidth, 552);
}
console.log('Scope views verified: 12/10 divisions, common scales and centre time, distinct IDs and correct duration.');

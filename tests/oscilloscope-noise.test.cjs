'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'oscilloscope.js', 'oscilloscope-controller.js']) vm.runInContext(fs.readFileSync(`app/${file}`, 'utf8'), context);
const app = context.window.InstrumentLab, scope = app.oscilloscope, circuit = app.circuits.rc;
let practice = app.createPracticeState('rc');
assert.equal(practice.oscilloscope.noiseRms, .0006);
assert.equal(practice.oscilloscopePlus.noiseRms, .0005);
const close = (actual, expected, tolerance) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
for (const name of ['oscilloscope', 'oscilloscopePlus']) {
  const settings = practice[name];
  const generator = { ...practice.generator, output1Enabled: false };
  const signals = scope.createSignals(circuit, practice.parameters, generator, settings, practice.probes);
  const count = 65536;
  const first = Array.from({ length: count }, (_, i) => signals.sample((i + .5) * 1e-9, 1));
  const second = first.map((_, i) => signals.sample((i + .5) * 1e-9, 2));
  const mean = first.reduce((a, b) => a + b, 0) / count;
  const power = first.reduce((a, b) => a + b * b, 0) / count;
  close(mean, 0, settings.noiseRms * .02);
  close(Math.sqrt(power), settings.noiseRms, settings.noiseRms * .02);
  close(first.reduce((sum, v, i) => sum + v * second[i], 0) / count / power, 0, .025);
  close(first.reduce((sum, v) => sum + v ** 4, 0) / count / power ** 2, 3, .15);
  const noise = signals.sample(.000012345, 1);
  assert.equal(signals.sample(.000012345, 1), noise, 'same acquisition/time has one value');
  const attenuated = scope.createSignals(circuit, practice.parameters, generator, settings, {1:10});
  assert.equal(attenuated.sample(.000012345, 1), noise, 'internal noise is after physical attenuation');
  const compensated = scope.createSignals(circuit, practice.parameters, generator, { ...settings, channels: { ...settings.channels, 1: { ...settings.channels[1], probe: 10, inverted: true, coupling: 'GND' } } });
  close(compensated.sample(.000012345, 1), -10 * noise, 1e-15);
  const voltage = scope.voltageStatistics(circuit, practice.parameters, generator, settings, {}, 0, .0024, 1);
  close(voltage.Vrms, settings.noiseRms, settings.noiseRms * .05);
  close(voltage['AC.Vrms'], settings.noiseRms, settings.noiseRms * .05);
  close(voltage.Variance, settings.noiseRms ** 2, settings.noiseRms ** 2 * .1);
  assert.equal(voltage.Vtop, undefined, 'noise alone has no flat pulse levels');
  assert.equal(scope.timeStatistics(circuit, practice.parameters, generator, settings, {}, 0, .0024, 1, voltage), null, 'noise alone has no periodic measurement');
  for (const channel of Object.keys(settings.channels).map(Number)) {
    const visible = { ...settings, channels: { ...settings.channels, [channel]: { ...settings.channels[channel], visible: true, voltsPerDivision: .01, positionDivisions: 0 } } };
    const result = scope.voltageStatistics(circuit, practice.parameters, generator, visible, {}, 0, .0024, channel);
    close(result.Vrms, settings.noiseRms, settings.noiseRms * .05);
  }
}
const controller = app.createOscilloscopeController({
  getSettings: () => practice.oscilloscopePlus, setSettings: state => { practice.oscilloscopePlus = state; },
  getExperiment: () => ({ circuit, parameters: practice.parameters, generator: practice.generator, probes: practice.probes }),
  t: key => key, format: String, onChange() {}, onAuto() { practice = app.createPracticeState('rc'); }
});
const display = () => controller.getDisplay({ horizontalDivisions: 12 });
const initial = display();
assert.equal(controller.getAcquisition().locked, true);
assert.equal(controller.needsAnimation(), true, 'locked traces still refresh noise');
controller.advance(.05);
assert.notEqual(display(), initial, 'RUN acquires a new noise realization');
controller.actions.runStop();
const frozen = display();
controller.advance(.5);
assert.equal(display(), frozen, 'STOP freezes signal and noise');
controller.actions.runStop(); controller.advance(.05);
assert.notEqual(display(), frozen);
controller.actions.auto();
assert.equal(practice.oscilloscopePlus.noiseRms, .0005);
assert.equal(practice.oscilloscope.noiseRms, .0006);
assert.equal(practice.oscilloscopePlus.noiseSeed, 0);
console.log('Independent Gaussian instrument noise: model RMS, distribution, probe scaling, GND/unconnected inputs, measured power, RUN/STOP and reset.');

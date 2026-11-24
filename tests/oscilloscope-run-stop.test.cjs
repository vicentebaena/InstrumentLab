'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'oscilloscope.js', 'oscilloscope-controller.js', 'translations.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab;
let practice = app.createPracticeState('rc'), changes = 0;
const controller = app.createOscilloscopeController({
  getSettings: () => practice.oscilloscope, setSettings: value => { practice.oscilloscope = value; },
  getExperiment: () => ({ circuit: app.circuits.rc, parameters: practice.parameters, generator: practice.generator }),
  t: key => app.translations.en[key], format: String, onChange: () => changes++,
  onAuto: () => { practice = app.createPracticeState('rc'); }
});
const traces = svg => Array.from(svg.matchAll(/<path d="([^"]+)" stroke="(#[^"]+)"/g), m => m[1]);
const display = () => traces(controller.getDisplay());
const faceplate = () => traces(controller.getDisplay({ horizontalDivisions: 12, cellWidth: 40 }));
assert.equal(practice.oscilloscope.acquisitionRunning, true);
const initial = display(), initialPanel = faceplate();
controller.actions.runStop();
assert.equal(practice.oscilloscope.acquisitionRunning, false);
assert.deepEqual(display(), initial);
assert.deepEqual(faceplate(), initialPanel);
// Mutate live objects in place: neither captured signal may change.
Object.assign(practice.generator, { waveform: 'sine', frequency: 2500, amplitudeVpp: 4, offset: .5, output1Enabled: false });
practice.parameters.resistance = 10000;
practice.parameters.capacitance = 1e-6;
assert.deepEqual(display(), initial);
assert.deepEqual(faceplate(), initialPanel);
controller.actions.triggerLevel(1);
assert.deepEqual(display(), initial, 'trigger adjustment must not acquire or realign a stopped waveform');
controller.actions.scale(-1);
assert.notDeepEqual(display(), initial, 'vertical scale still reprojects the capture');
controller.actions.scale(1);
assert.deepEqual(display(), initial);
controller.actions.timeScale(-1);
assert.notDeepEqual(display(), initial, 'time scale still reprojects the capture');
controller.actions.timeScale(1);
assert.deepEqual(display(), initial);
controller.actions.horizontalPosition(1);
assert.notDeepEqual(display(), initial);
controller.actions.horizontalPosition(-1);
assert.deepEqual(display(), initial);
controller.actions.channel(1); controller.actions.channel(1);
assert.equal(display().length, 1, 'channel visibility works while stopped');
controller.actions.channel(1);
assert.deepEqual(display(), initial);
controller.actions.runStop();
assert.equal(practice.oscilloscope.acquisitionRunning, true);
assert.notDeepEqual(display(), initial, 'resume uses the current live generator and circuit');
// Stop an unlocked acquisition without losing the displayed phase.
controller.actions.auto();
for (let i = 0; i < 50; i++) controller.actions.triggerLevel(1);
assert.equal(controller.needsAnimation(), true);
controller.advance(.023);
const moving = display();
controller.actions.runStop();
assert.equal(controller.needsAnimation(), false);
assert.deepEqual(display(), moving);
controller.advance(5);
assert.deepEqual(display(), moving);
controller.actions.runStop();
assert.equal(controller.needsAnimation(), true);
controller.advance(.011);
assert.notDeepEqual(display(), moving);
controller.actions.runStop(); controller.actions.auto();
assert.equal(practice.oscilloscope.acquisitionRunning, true);
assert.deepEqual(display(), initial);
controller.actions.runStop(); controller.resetTransient(); practice = app.createPracticeState('rc');
assert.deepEqual(display(), initial);
assert.ok(changes > 0);
console.log('RUN/STOP: capture isolation, shared views, display controls, unlocked phase, resume and reset passed.');

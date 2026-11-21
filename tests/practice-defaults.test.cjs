'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { value: '', listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; }, replaceChildren() {} });
  return elements.get(id);
};
const context = vm.createContext({ window: { InstrumentLabImages: { generator: '', scope: '' } }, document: { getElementById: element, documentElement: {}, querySelectorAll: () => [] }, localStorage: { getItem: () => 'es', setItem() {} }, Option: function() {} });
for (const file of ['circuits.js', 'oscilloscope.js', 'oscilloscope-controller.js', 'translations.js', 'generator.js', 'generator-controller.js', 'dg822-panel.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab;
const expected = app.createPracticeState('rc');
assert.equal(expected.generator.frequency, 1000);
assert.equal(expected.generator.frequencyUnit, 'kHz');
assert.equal(expected.oscilloscope.channels[1].positionDivisions, 0);
assert.equal(expected.oscilloscope.horizontalPositionDivisions, 0);
assert.equal(expected.oscilloscope.trigger.source, 1);
assert.equal(expected.oscilloscope.trigger.level, 0);
assert.equal(expected.oscilloscope.trigger.slope, 'rising');
assert.equal(expected.oscilloscope.channels[1].probe, 1);
assert.equal(expected.oscilloscope.channels[2].probe, 1);
// Mutating a running practice must never overwrite the templates used by reset.
const changed = app.createPracticeState('rc');
changed.parameters.resistance = 5000;
changed.generator.waveform = 'sine';
changed.oscilloscope.channels[1].visible = false;
assert.deepEqual(app.createPracticeState('rc'), expected);
let generatorPanel, scopePanel, menuResets = 0;
app.DG822Panel.create = options => { generatorPanel = options.controller; return { render() {}, reset() { menuResets++; } }; };
app.DS1102EPanel = { create(options) { scopePanel = options.controller; return { render() {} }; } };
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/main.js'), 'utf8'), context);
const dirtyInstruments = () => {
  generatorPanel.actions.waveform('sine');
  generatorPanel.actions.parameter('frequency', 42, 'Hz');
  generatorPanel.actions.parameter('amplitude', 7, 'Vrms');
  generatorPanel.actions.parameter('offset', 1500, 'mVdc');
  generatorPanel.actions.output(1); generatorPanel.actions.output(2);
  scopePanel.actions.triggerLevel(1);
  scopePanel.actions.triggerMenu(); scopePanel.actions.submenu('triggerSource'); scopePanel.actions.submenuStep(1); scopePanel.actions.submenuConfirm();
  scopePanel.actions.submenu('triggerSlope'); scopePanel.actions.submenuStep(1); scopePanel.actions.submenuConfirm();
  scopePanel.actions.horizontalPosition(1); scopePanel.actions.position(1); scopePanel.actions.scale(-1); scopePanel.actions.timeScale(1);
  scopePanel.actions.channel(2); scopePanel.actions.channel(2);
  scopePanel.actions.channel(1); scopePanel.actions.submenu('probe'); scopePanel.actions.submenuStep(1); scopePanel.actions.submenuConfirm();
};
dirtyInstruments();
element('resetCircuit').listeners.click();
assert.deepEqual(generatorPanel.getSettings(), expected.generator);
assert.deepEqual(scopePanel.getSettings(), expected.oscilloscope);
assert.equal(context.document.documentElement.lang, 'es');
assert.equal(menuResets, 1);
// A second synthetic practice proves reset reads active practice defaults, not RC globals.
app.circuits.other = { ...app.circuits.rc, defaults: { resistance: 2200, capacitance: 47e-9 }, instrumentDefaults: {
  generator: { waveform: 'sine', frequency: 2000, amplitudeVpp: 4, offset: .2, output1Enabled: false, output2Enabled: true, frequencyUnit: 'Hz' },
  oscilloscope: { timePerDivision: 1e-3, selectedChannel: 2, channels: { 1: { visible: false }, 2: { voltsPerDivision: 2, positionDivisions: -1 } } }
} };
element('circuit').listeners.change({ target: { value: 'other' } });
const other = app.createPracticeState('other');
assert.deepEqual(generatorPanel.getSettings(), other.generator);
assert.deepEqual(scopePanel.getSettings(), other.oscilloscope);
assert.ok(element('diagram').innerHTML.includes('R = 2,2 kΩ'));
dirtyInstruments();
element('resetCircuit').listeners.click();
assert.deepEqual(generatorPanel.getSettings(), other.generator);
assert.deepEqual(scopePanel.getSettings(), other.oscilloscope);
assert.equal(context.document.documentElement.lang, 'es');
assert.equal(app.circuits.other.instrumentDefaults.oscilloscope.channels[2].positionDivisions, -1);
assert.equal(app.circuits.rc.instrumentDefaults.oscilloscope.channels[1].visible, true);
console.log('Initial state, full instrument reset, independent templates, practice switching and active-practice defaults passed.');

// The physical AUTO key uses the same active-practice restoration as the page button.
dirtyInstruments();
scopePanel.actions.auto();
assert.deepEqual(generatorPanel.getSettings(), other.generator);
assert.deepEqual(scopePanel.getSettings(), other.oscilloscope);
assert.equal(context.document.documentElement.lang, 'es');
element('circuit').listeners.change({ target: { value: 'rc' } });
dirtyInstruments();
scopePanel.actions.auto();
assert.deepEqual(generatorPanel.getSettings(), expected.generator);
assert.deepEqual(scopePanel.getSettings(), expected.oscilloscope);
console.log('AUTO restores the complete active-practice defaults, for RC and a different practice.');

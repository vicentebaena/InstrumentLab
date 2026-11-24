'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Element {
  constructor() { this.attributes = {}; this.events = {}; this.error = ''; this.hidden = false; this.scrollLeft = 90; }
  addEventListener(type, callback) { (this.events[type] ||= []).push(callback); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  focus() { this.focused = true; }
  select() { this.selected = true; this.setSelectionRange(0, String(this.value).length); }
  setCustomValidity(error) { this.error = error; }
  replaceChildren(...options) { this.options = options; this.value = options.find(item => item.selected)?.value; }
  fire(type) { for (const callback of this.events[type] || []) callback({ preventDefault() {}, stopPropagation() {}, ...arguments[1] }); }
}
const context = vm.createContext({ window: {}, Option: function(text, value, defaultSelected, selected) { Object.assign(this, { text, value, selected }); } });
for (const file of ['circuits.js', 'generator.js', 'generator-controller.js', 'generator-panel.js', 'dg822-panel.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab;
let settings = { ...app.generatorDefaults };
const panels = [];
const controller = app.createGeneratorController({ getSettings: () => settings, onChange: change => { Object.assign(settings, change); panels.forEach(item => item.panel.render()); } });
function makePanel(presentation) {
  const elements = Object.fromEntries(['menu', 'body', 'parameters', 'waveMenu', 'phase', 'preview'].map(key => [key, new Element()]));
  elements.waveButtons = { sine: new Element(), square: new Element() };
  elements.channelButtons = { 1: new Element(), 2: new Element() };
  elements.channelWaves = { 1: new Element(), 2: new Element() };
  elements.outputButtons = { 1: new Element(), 2: new Element() };
  elements.readings = { frequency: new Element(), amplitude: new Element(), offset: new Element() };
  elements.editor = Object.fromEntries(['container', 'input', 'units', 'title', 'note', 'form', 'cancel', 'error'].map(key => [key, new Element()]));
  elements.editor.keys = ['0','1','2','3','4','5','6','7','8','9','.','sign','backspace'].map(action => {
    const key = new Element(); key.setAttribute('data-edit-key', action); return key;
  });
  let opens = 0;
  const panel = app.createGeneratorPanel({ elements, controller, presentation, openWindow: () => opens++ });
  const result = { elements, panel, opens: () => opens };
  panels.push(result); panel.reset(); panel.render(); return result;
}
const dg = app.DG822Panel.presentation();
const a = makePanel(dg);
const b = makePanel({ ...dg, readingText: (parameter, reading) => `${parameter}=${reading.value} ${reading.unit}`, editorTitle: parameter => `Another model: ${parameter}` });
assert.equal(a.elements.readings.frequency.textContent, '1.000,000,000 kHz');
assert.equal(a.elements.readings.amplitude.textContent, '2.000,0 Vpp');
assert.equal(a.elements.readings.offset.textContent, '0.000,0 Vdc');
assert.equal(a.elements.phase.textContent, '0.000º');
assert.equal(b.elements.readings.frequency.textContent, 'frequency=1 kHz');
a.elements.menu.fire('click');
assert.equal(a.elements.waveMenu.hidden, false);
assert.equal(a.elements.parameters.hidden, true);
assert.equal(a.elements.body.scrollLeft, 0);
assert.equal(a.elements.waveButtons.square.focused, true);
a.elements.waveButtons.sine.fire('click');
assert.equal(settings.waveform, 'sine');
assert.equal(a.elements.waveMenu.hidden, true);
assert.equal(b.elements.waveButtons.sine.attributes['aria-pressed'], 'true');
assert.equal(a.elements.readings.frequency.focused, true);
const edit = (panel, parameter, value, unit) => {
  panel.elements.readings[parameter].fire('click');
  assert.equal(panel.elements.editor.container.hidden, false);
  panel.elements.editor.input.value = value;
  panel.elements.editor.units.value = unit;
  panel.elements.editor.form.fire('submit');
};
edit(b, 'frequency', 2500, 'Hz');
assert.equal(b.elements.editor.title.textContent, 'Another model: frequency');
assert.equal(settings.frequency, 2500);
assert.equal(a.elements.readings.frequency.textContent, '2500.000,000,000 Hz');
edit(a, 'amplitude', 1, 'Vrms');
assert.equal(settings.amplitudeVpp, 2 * Math.SQRT2);
assert.equal(a.elements.editor.note.hidden, true);
assert.ok(a.elements.editor.input.title.includes('√2'));
assert.ok(a.elements.editor.note.textContent.includes('√2'));
b.elements.menu.fire('click'); b.elements.waveButtons.square.fire('click');
assert.equal(settings.amplitudeVpp, 2); // Preserve the programmed 1 Vrms when changing shape.
assert.equal(a.elements.readings.amplitude.textContent, '1.000,0 Vrms');
edit(b, 'offset', -500, 'mVdc');
assert.equal(settings.offset, -.5);
assert.equal(a.elements.readings.offset.textContent, '-500.000,0 mVdc');
// Cancel/Escape closure do not commit; invalid submissions keep the editor open.
a.elements.readings.frequency.fire('click');
a.elements.editor.input.value = 999;
a.elements.editor.cancel.fire('click');
assert.equal(settings.frequency, 2500);
assert.equal(a.elements.editor.container.hidden, true);
edit(b, 'frequency', 0, 'Hz');
assert.equal(settings.frequency, 2500);
assert.equal(b.elements.editor.container.hidden, false);
assert.equal(b.elements.editor.input.error, 'Enter a positive, finite value.');
b.elements.editor.input.value = 3; b.elements.editor.input.fire('input'); b.elements.editor.form.fire('submit');
assert.equal(settings.frequency, 3);
assert.equal(b.elements.editor.container.hidden, true);
assert.equal(b.elements.readings.frequency.focused, true);
// Touch input replaces the selected value, preserves caret/selection, and only OK commits.
const editor = a.elements.editor;
const tap = action => editor.keys.find(key => key.getAttribute('data-edit-key') === action).fire('click');
a.elements.readings.offset.fire('click');
assert.equal(a.elements.parameters.inert, true);
tap('1'); tap('.'); tap('2'); tap('.'); tap('5');
assert.equal(editor.input.value, '1.25');
tap('sign');
assert.equal(editor.input.value, '-1.25');
tap('backspace');
assert.equal(editor.input.value, '-1.2');
assert.equal(settings.offset, -.5);
editor.form.fire('submit');
assert.equal(settings.offset, -.0012); // mVdc selection was preserved.
assert.equal(a.elements.parameters.inert, false);
a.elements.readings.offset.fire('click');
editor.input.value = '';
editor.form.fire('submit');
assert.equal(editor.error.textContent, 'Enter a valid number.');
assert.equal(settings.offset, -.0012);
editor.container.fire('keydown', { key: 'Escape' });
assert.equal(editor.container.hidden, true);
assert.equal(settings.offset, -.0012);
// Each parameter retains every supported unit, including after changing editors.
for (const parameter of ['frequency', 'amplitude', 'offset']) {
  a.elements.readings[parameter].fire('click');
  assert.deepEqual(editor.units.options.map(option => option.value), Object.keys(app.generator.parameters[parameter].units));
  const sign = editor.keys.find(key => key.getAttribute('data-edit-key') === 'sign');
  assert.equal(sign.disabled, parameter !== 'offset');
  const valueBeforeSign = editor.input.value;
  sign.fire('click');
  assert.equal(editor.input.value, parameter === 'offset' ? (String(valueBeforeSign).startsWith('-') ? String(valueBeforeSign).slice(1) : `-${valueBeforeSign}`) : valueBeforeSign);
  editor.cancel.fire('click');
}
a.elements.readings.frequency.fire('click');
tap('9'); a.panel.reset();
assert.equal(editor.container.hidden, true);
assert.equal(settings.frequency, 3);
assert.equal(app.DG822Panel.presentation().editorValue('offset', 1e-8), '1e-8');
a.elements.outputButtons[1].fire('click');
assert.equal(settings.output1Enabled, false);
assert.equal(settings.output2Enabled, false);
assert.equal(b.elements.outputButtons[1].attributes['aria-pressed'], 'false');
b.elements.outputButtons[2].fire('click');
assert.equal(settings.output2Enabled, true);
assert.equal(a.elements.outputButtons[2].attributes['aria-label'], 'Output2 (CH2): ON');
assert.equal(a.elements.channelButtons[1].attributes['aria-pressed'], 'true');
assert.throws(() => controller.actions.output(3));
// Channel touch zones select independent settings, regardless of output enablement.
assert.equal(a.elements.channelWaves[1].textContent, 'Square');
assert.equal(a.elements.channelWaves[2].textContent, 'Square');
const ch1 = { frequency: settings.frequency, amplitudeVpp: settings.amplitudeVpp, offset: settings.offset, waveform: settings.waveform };
const samples = [0, .0001, .001].map(time => app.circuits.rc.sample(time, app.circuits.rc.defaults, { ...settings, output1Enabled: true }));
a.elements.channelButtons[2].fire('click');
assert.equal(settings.selectedChannel, 2);
assert.equal(a.elements.channelButtons[1].attributes['aria-pressed'], 'false');
assert.equal(b.elements.channelButtons[2].attributes['aria-pressed'], 'true');
assert.equal(a.elements.readings.frequency.textContent, '1.000,000,000 kHz');
a.elements.menu.fire('click'); a.elements.waveButtons.sine.fire('click');
edit(a, 'amplitude', 1, 'Vrms');
edit(a, 'frequency', 12, 'MHz');
edit(a, 'offset', -3, 'Vdc');
assert.equal(settings.channel2.frequency, 12e6);
assert.equal(settings.channel2.amplitudeVpp, 2 * Math.SQRT2);
assert.equal(settings.channel2.offset, -3);
assert.equal(a.elements.channelWaves[2].textContent, 'Sine');
assert.equal(a.elements.channelWaves[1].textContent, 'Square');
assert.equal(a.elements.channelButtons[2].attributes['aria-label'], 'Configure CH2: Sine, HighZ');
for (const [key, value] of Object.entries(ch1)) assert.equal(settings[key], value);
[0, .0001, .001].forEach((time, index) => assert.deepEqual(app.circuits.rc.sample(time, app.circuits.rc.defaults, { ...settings, output1Enabled: true }), samples[index]));
assert.equal(controller.reading('frequency', 1).value, 3);
a.elements.readings.frequency.fire('click'); a.elements.editor.input.value = 99;
a.elements.channelButtons[1].fire('click');
assert.equal(a.elements.editor.container.hidden, true);
assert.equal(a.elements.readings.frequency.textContent, '3.000,000,000 Hz');
assert.equal(a.elements.waveButtons.square.attributes['aria-pressed'], 'true');
a.elements.channelButtons[2].fire('click');
assert.equal(a.elements.readings.frequency.textContent, '12.000,000,000 MHz');
assert.equal(settings.channel2.frequency, 12e6);
assert.throws(() => controller.actions.channel(3));
assert.equal(app.generatorDefaults.channel2.frequency, 1000);
// Reset replaces the experiment settings without stale panel/controller copies.
settings = { ...app.generatorDefaults };
for (const item of panels) { item.panel.reset(); item.panel.render(); }
assert.equal(a.elements.readings.frequency.textContent, '1.000,000,000 kHz');
assert.equal(settings.selectedChannel, 1);
assert.equal(a.elements.channelButtons[1].attributes['aria-pressed'], 'true');
assert.equal(a.elements.channelWaves[2].textContent, 'Square');
assert.equal(a.elements.outputButtons[1].attributes['aria-pressed'], 'true');
assert.equal(a.elements.outputButtons[2].attributes['aria-pressed'], 'false');
a.elements.menu.fire('click'); a.panel.open();
assert.equal(a.elements.waveMenu.hidden, true);
assert.equal(a.opens(), 1);
for (let n = 0; n < 10; n++) a.panel.render();
a.elements.outputButtons[1].fire('click');
assert.equal(settings.output1Enabled, false); // Rendering never adds another listener.
assert.equal(Object.hasOwn(app.generator.parameters.frequency, 'element'), false);
console.log('Two generator panels share editing, units, waveform/RMS, validation, focus, outputs and reset with independent presentation/menu state.');

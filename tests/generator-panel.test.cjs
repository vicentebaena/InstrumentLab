'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Element {
  constructor() { this.attributes = {}; this.events = {}; this.error = ''; this.hidden = false; this.open = false; this.scrollLeft = 90; }
  addEventListener(type, callback) { (this.events[type] ||= []).push(callback); }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  setCustomValidity(error) { this.error = error; }
  reportValidity() { return !this.error; }
  replaceChildren(...options) { this.options = options; this.value = options.find(item => item.selected)?.value; }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
  fire(type) { for (const callback of this.events[type] || []) callback({ preventDefault() {} }); }
}
const context = vm.createContext({ window: {}, Option: function(text, value, defaultSelected, selected) { Object.assign(this, { text, value, selected }); } });
for (const file of ['circuits.js', 'generator.js', 'generator-controller.js', 'generator-panel.js', 'dg822-panel.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab;
let settings = { ...app.generatorDefaults };
const panels = [];
const controller = app.createGeneratorController({ getSettings: () => settings, onChange: change => { Object.assign(settings, change); panels.forEach(item => item.panel.render()); } });
function makePanel(presentation) {
  const elements = Object.fromEntries(['menu', 'body', 'parameters', 'waveMenu', 'phase', 'preview', 'channel'].map(key => [key, new Element()]));
  elements.waveButtons = { sine: new Element(), square: new Element() };
  elements.outputButtons = { 1: new Element(), 2: new Element() };
  elements.readings = { frequency: new Element(), amplitude: new Element(), offset: new Element() };
  elements.editor = Object.fromEntries(['dialog', 'input', 'units', 'title', 'note', 'form', 'cancel'].map(key => [key, new Element()]));
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
  assert.equal(panel.elements.editor.dialog.open, true);
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
assert.equal(a.elements.editor.note.hidden, false);
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
assert.equal(a.elements.editor.dialog.open, false);
edit(b, 'frequency', 0, 'Hz');
assert.equal(settings.frequency, 2500);
assert.equal(b.elements.editor.dialog.open, true);
assert.equal(b.elements.editor.input.error, 'Enter a positive, finite value.');
b.elements.editor.input.value = 3; b.elements.editor.input.fire('input'); b.elements.editor.form.fire('submit');
assert.equal(settings.frequency, 3);
assert.equal(b.elements.editor.dialog.open, false);
assert.equal(b.elements.readings.frequency.focused, true);
a.elements.outputButtons[1].fire('click');
assert.equal(settings.output1Enabled, false);
assert.equal(settings.output2Enabled, false);
assert.equal(b.elements.outputButtons[1].attributes['aria-pressed'], 'false');
b.elements.outputButtons[2].fire('click');
assert.equal(settings.output2Enabled, true);
assert.equal(a.elements.outputButtons[2].attributes['aria-label'], 'Output2 (CH2): ON');
assert.equal(a.elements.channel.attributes['data-output'], 'off');
assert.throws(() => controller.actions.output(3));
// Reset replaces the experiment settings without stale panel/controller copies.
settings = { ...app.generatorDefaults };
for (const item of panels) { item.panel.reset(); item.panel.render(); }
assert.equal(a.elements.readings.frequency.textContent, '1.000,000,000 kHz');
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

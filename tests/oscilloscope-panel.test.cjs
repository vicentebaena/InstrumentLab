'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Element {
  constructor() { this.attributes = {}; this.events = {}; this.style = { setProperty() {} }; }
  addEventListener(type, callback) { (this.events[type] ||= []).push(callback); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  setPointerCapture() {}
  focus() {}
  fire(type, extra = {}) { for (const callback of this.events[type] || []) callback({ button: 0, pointerId: 1, preventDefault() {}, ...extra }); }
}
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js', 'oscilloscope.js', 'translations.js', 'instrument-controls.js', 'oscilloscope-controller.js', 'oscilloscope-panel.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab;
let settings = app.oscilloscope.createState(), language = 'en', autoCalls = 0;
const panels = [];
const notify = () => panels.forEach(panel => panel.render());
const controller = app.createOscilloscopeController({
  getSettings: () => settings, setSettings: value => { settings = value; }, onChange: notify,
  onAuto: () => { autoCalls++; settings = app.oscilloscope.createState(); notify(); },
  getExperiment: () => ({ circuit: app.circuits.rc, parameters: app.circuits.rc.defaults, generator: app.generatorDefaults }),
  t: key => app.translations[language][key], format: String
});
const makePanel = (idPrefix, horizontalDivisions, footerScales, cellWidth) => {
  const elements = Object.fromEntries(['auto', 'menuToggle', 'scale', 'timeScale', 'position', 'screen', 'menu', 'menuTitle', 'couplingButton', 'couplingSubmenu', 'couplingValue', 'submenuIndicator', 'selectionKnob', 'probeButton', 'probeSubmenu', 'probeValue', 'horizontalPosition'].map(key => [key, new Element()]));
  elements.couplingOptions = { DC: new Element(), AC: new Element(), GND: new Element() };
  elements.probeOptions = Object.fromEntries([1, 5, 10, 20, 50, 100, 200, 500, 1000].map(factor => [factor, new Element()]));
  elements.submenuViews = {
    coupling: { button: elements.couplingButton, menu: elements.couplingSubmenu, value: elements.couplingValue, options: elements.couplingOptions, labelKey: 'scopeCoupling', formatValue: value => value === 'GND' ? app.translations[language].scopeGroundCoupling : value },
    probe: { button: elements.probeButton, menu: elements.probeSubmenu, value: elements.probeValue, options: elements.probeOptions, labelKey: 'scopeProbe', formatValue: value => `${value}X` }
  };
  elements.channelButtons = { 1: new Element(), 2: new Element() };
  let opens = 0;
  const panel = app.createOscilloscopePanel({ elements, controller, t: key => app.translations[language][key], display: { idPrefix, horizontalDivisions, footerScales, cellWidth }, openWindow: () => opens++ });
  panels.push(panel); panel.render();
  return { panel, elements, opens: () => opens };
};
const a = makePanel('first-model', 12, true, 40), b = makePanel('another-model', 10, false, 56.8);
assert.ok(a.elements.screen.innerHTML.includes('Time 200.0us'));
assert.ok(b.elements.screen.innerHTML.includes('H 200.0us/div'));
assert.ok(a.elements.screen.innerHTML.includes('viewBox="0 0 552 420"'));
assert.ok(b.elements.screen.innerHTML.includes('viewBox="0 0 640 420"'));
a.elements.channelButtons[2].fire('click');
assert.equal(settings.selectedChannel, 2);
assert.equal(a.elements.menu.hidden, false);
assert.equal(b.elements.menuTitle.textContent, 'CH2');
assert.equal(b.elements.channelButtons[2].attributes['aria-pressed'], 'true');
b.elements.menuToggle.fire('click');
assert.equal(a.elements.menu.hidden, true);
assert.equal(settings.channels[2].visible, true);
a.elements.scale.fire('keydown', { key: 'ArrowLeft' });
assert.equal(settings.channels[2].voltsPerDivision, 1);
assert.equal(settings.channels[1].voltsPerDivision, .5);
assert.equal(b.elements.scale.attributes['aria-valuetext'], 'CH2 1.00V');
b.elements.position.fire('keydown', { key: 'ArrowUp' });
assert.equal(settings.channels[2].positionDivisions, .1);
assert.equal(a.elements.position.attributes['aria-valuenow'], '0.1');
a.elements.channelButtons[2].fire('click'); a.elements.channelButtons[2].fire('click');
assert.equal(a.elements.scale.attributes['aria-disabled'], 'true');
assert.equal(b.elements.position.attributes['aria-disabled'], 'true');
a.elements.scale.fire('keydown', { key: 'ArrowRight' });
b.elements.position.fire('wheel', { deltaY: -40, deltaMode: 0 });
assert.equal(settings.channels[2].voltsPerDivision, 1);
assert.equal(settings.channels[2].positionDivisions, .1);
a.elements.timeScale.fire('keydown', { key: 'ArrowLeft' });
assert.equal(settings.timePerDivision, 500e-6);
assert.equal(b.elements.timeScale.attributes['aria-valuetext'], '500.0us');
b.elements.auto.fire('click');
assert.equal(autoCalls, 1);
assert.equal(settings.channels[2].positionDivisions, 0);
assert.equal(settings.channels[2].visible, true);
// Shared gestures retain direction, detents, wheel accumulation and drag cancellation.
a.elements.scale.fire('pointerdown', { clientX: 50, clientY: 0 });
a.elements.scale.fire('pointermove', { clientX: 100, clientY: 50 });
a.elements.scale.fire('pointerup');
assert.equal(settings.channels[1].voltsPerDivision, .02);
a.elements.scale.fire('pointermove', { clientX: 50, clientY: 100 });
assert.equal(settings.channels[1].voltsPerDivision, .02);
b.elements.auto.fire('click');
b.elements.scale.fire('wheel', { deltaY: -20, deltaMode: 0 });
assert.equal(settings.channels[1].voltsPerDivision, .5);
b.elements.scale.fire('wheel', { deltaY: -20, deltaMode: 0 });
assert.equal(settings.channels[1].voltsPerDivision, .2);
language = 'es'; notify();
assert.equal(a.elements.scale.attributes['aria-label'], 'Escala vertical');
a.panel.open(); assert.equal(a.opens(), 1);
for (let n = 0; n < 10; n++) a.panel.render();
a.elements.position.fire('keydown', { key: 'ArrowUp' });
assert.equal(settings.channels[1].positionDivisions, .1);
console.log('Two model-independent panels share controls, menus, scales, position, visibility, AUTO, translation and screen rendering.');

// Opening the submenu alone leaves signals unchanged; choices require knob confirmation.
controller.actions.auto();
a.elements.couplingButton.fire('click');
assert.equal(settings.submenu, null);
assert.equal(a.elements.couplingSubmenu.hidden, true);
a.elements.channelButtons[1].fire('click');
const screenBeforeSubmenu = a.elements.screen.innerHTML;
a.elements.couplingButton.fire('click');
assert.equal(settings.submenu, 'coupling');
assert.equal(a.elements.couplingSubmenu.hidden, false);
assert.equal(b.elements.submenuIndicator.hidden, false);
assert.equal(a.elements.couplingButton.attributes['aria-expanded'], 'true');
assert.equal(b.elements.couplingOptions.DC.attributes['data-selected'], 'true');
assert.equal(b.elements.couplingOptions.AC.attributes['data-selected'], 'false');
assert.equal(b.elements.couplingOptions.GND.attributes['data-selected'], 'false');
assert.equal(a.elements.screen.innerHTML, screenBeforeSubmenu);
const beforeChoiceClick = JSON.stringify(settings);
a.elements.couplingOptions.AC.fire('click');
a.elements.couplingOptions.GND.fire('click');
assert.equal(JSON.stringify(settings), beforeChoiceClick);
b.elements.menuToggle.fire('click');
assert.equal(settings.menuChannel, null);
assert.equal(settings.submenu, null);
assert.equal(a.elements.menu.hidden, true);
assert.equal(a.elements.couplingSubmenu.hidden, true);
assert.equal(b.elements.submenuIndicator.hidden, true);
b.elements.menuToggle.fire('click');
assert.equal(b.elements.menu.hidden, false);
assert.equal(b.elements.couplingSubmenu.hidden, true);
a.elements.couplingButton.fire('click');
a.elements.channelButtons[2].fire('click');
assert.equal(settings.submenu, null);
assert.equal(b.elements.submenuIndicator.hidden, true);
b.elements.couplingButton.fire('click');
controller.actions.auto();
assert.equal(a.elements.menu.hidden, true);
assert.equal(a.elements.couplingSubmenu.hidden, true);
assert.equal(a.elements.submenuIndicator.hidden, true);
console.log('Coupling submenu opens without changing the signal and supports full menu cancellation.');

a.elements.channelButtons[1].fire('click');
a.elements.couplingButton.fire('click');
a.elements.selectionKnob.fire('keydown', { key: 'ArrowDown' });
assert.equal(settings.submenuSelection, 'AC');
assert.equal(settings.channels[1].coupling, 'DC');
assert.equal(b.elements.couplingOptions.AC.attributes['data-selected'], 'true');
a.elements.selectionKnob.fire('keydown', { key: 'Enter' });
assert.equal(settings.channels[1].coupling, 'AC');
assert.equal(a.elements.couplingValue.textContent, 'AC');
assert.equal(a.elements.couplingSubmenu.hidden, true);
assert.equal(b.elements.submenuIndicator.hidden, true);
a.elements.couplingButton.fire('click');
assert.equal(settings.submenuSelection, 'AC');
b.elements.selectionKnob.fire('wheel', { deltaY: 40, deltaMode: 0 });
assert.equal(settings.submenuSelection, 'GND');
assert.equal(settings.channels[1].coupling, 'AC');
b.elements.selectionKnob.fire('click');
assert.equal(settings.channels[1].coupling, 'GND');
assert.equal(a.elements.couplingValue.textContent, 'Tierra');
// A rotation followed by its browser click must not accidentally commit the draft.
a.elements.couplingButton.fire('click');
a.elements.selectionKnob.fire('pointerdown', { clientX: 50, clientY: 0 });
a.elements.selectionKnob.fire('pointermove', { clientX: 0, clientY: 50 });
a.elements.selectionKnob.fire('pointerup');
a.elements.selectionKnob.fire('click');
assert.equal(settings.submenuSelection, 'DC');
assert.equal(settings.submenu, 'coupling');
assert.equal(settings.channels[1].coupling, 'GND');
a.elements.selectionKnob.fire('pointerdown', { clientX: 50, clientY: 0 });
a.elements.selectionKnob.fire('pointerup');
a.elements.selectionKnob.fire('click');
assert.equal(settings.channels[1].coupling, 'DC');
assert.equal(settings.submenu, null);
console.log('Selection knob navigation/press, reopening committed option, shared highlight, labels and drag-click suppression passed.');

// Sonda reuses the same knob and draft/confirm flow as Acoplamiento.
a.elements.probeButton.fire('click');
assert.equal(settings.submenu, 'probe');
assert.equal(a.elements.probeSubmenu.hidden, false);
assert.equal(a.elements.couplingSubmenu.hidden, true);
a.elements.selectionKnob.fire('keydown', { key: 'ArrowDown' });
assert.equal(settings.submenuSelection, 5);
assert.equal(settings.channels[1].probe, 1);
assert.equal(b.elements.probeOptions[5].attributes['data-selected'], 'true');
a.elements.selectionKnob.fire('click');
assert.equal(settings.channels[1].probe, 5);
assert.equal(settings.channels[2].probe, 1);
assert.equal(a.elements.probeValue.textContent, '5X');
assert.equal(a.elements.probeSubmenu.hidden, true);
assert.equal(a.elements.submenuIndicator.hidden, true);
a.elements.probeButton.fire('click');
assert.equal(settings.submenuSelection, 5);
a.elements.selectionKnob.fire('keydown', { key: 'ArrowDown' });
a.elements.couplingButton.fire('click');
assert.equal(a.elements.probeSubmenu.hidden, true);
assert.equal(a.elements.couplingSubmenu.hidden, false);
assert.equal(settings.submenuSelection, 'DC');
assert.equal(settings.channels[1].probe, 5);
controller.actions.auto();
assert.equal(a.elements.probeValue.textContent, '1X');
assert.equal(a.elements.probeSubmenu.hidden, true);
console.log('Probe submenu shares rotary confirmation, pending cancellation, independent factors and reset.');

// Horizontal position remains enabled with both traces hidden and no selected channel.
controller.actions.auto();
a.elements.channelButtons[1].fire('click'); a.elements.channelButtons[1].fire('click');
a.elements.channelButtons[2].fire('click'); a.elements.channelButtons[2].fire('click');
a.elements.horizontalPosition.fire('keydown', { key: 'ArrowRight' });
assert.equal(settings.horizontalPositionDivisions, .1);
assert.equal(b.elements.horizontalPosition.attributes['aria-valuenow'], '0.1');
assert.equal(a.elements.horizontalPosition.attributes['aria-disabled'], 'false');
assert.equal(settings.channels[1].visible, false);
assert.equal(settings.channels[2].visible, false);
settings = { ...settings, selectedChannel: null }; notify();
b.elements.horizontalPosition.fire('wheel', { deltaY: -40, deltaMode: 0 });
assert.equal(settings.horizontalPositionDivisions, .2);
controller.actions.auto();
assert.equal(settings.horizontalPositionDivisions, 0);
assert.equal(settings.channels[1].probe, 1);
assert.equal(settings.channels[2].probe, 1);
console.log('Horizontal POSITION is global and always enabled; AUTO resets its position and both probe factors.');

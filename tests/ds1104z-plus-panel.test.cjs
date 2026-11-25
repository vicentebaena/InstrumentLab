'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { attributes: {}, events: {}, style: { setProperty() {} },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.events[name] = callback; },
    click() { this.events.click?.(); },
    focus() {}, setPointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    fire(name, data = {}) { this.events[name]?.({ button: 0, pointerId: 1, preventDefault() {}, ...data }); }
  });
  return elements.get(id);
};
let opens = 0;
let triggerTimer = null, triggerDelay = null;
const context = vm.createContext({ window: { InstrumentLabImages: { ds1104zplus: 'data:image/svg+xml,test' }, setTimeout(callback, delay) { triggerTimer = callback; triggerDelay = delay; return 1; }, clearTimeout() { triggerTimer = null; } }, document: { getElementById: element } });
for (const name of ['circuits.js','oscilloscope.js','oscilloscope-controller.js','translations.js','instrument-controls.js','ds1104z-plus-panel.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', name), 'utf8'), context);
}
const app = context.window.InstrumentLab;
app.createInstrumentWindow = () => ({ open() { opens++; } });
let practice = app.createPracticeState('rc');
let panel;
const controller = app.createOscilloscopeController({
  getSettings: () => practice.oscilloscopePlus, setSettings: state => { practice.oscilloscopePlus = state; },
  getExperiment: () => ({ circuit: app.circuits.rc, parameters: practice.parameters, generator: practice.generator, probes: practice.probes }),
  t: key => app.translations.en[key], format: String, onChange() { panel?.render(); }, onAuto() { practice = app.createPracticeState('rc'); }
});
const adapter = context.window.InstrumentLab.DS1104ZPlusPanel;
const g = adapter.geometry;
assert.equal(g.columns, 12); assert.equal(g.rows, 8);
assert.equal(g.width - g.left - g.columns * g.cell, 140);
assert.ok(g.width - g.left - g.columns * g.cell > g.left);
panel = adapter.create({ controller, t: () => 'Grid preview' });
panel.open();
assert.equal(opens, 1);
const markup = element('ds1104zplusScreen').innerHTML;
assert.equal((markup.match(/data-grid-column=/g) || []).length, 13);
assert.equal((markup.match(/data-grid-row=/g) || []).length, 9);
assert.ok(markup.includes('fill="#000"'));
assert.ok(!/data-measurement|<button|tabindex=/.test(markup));
assert.ok(markup.includes('data-trace-channel="1"'));
assert.ok(markup.includes('data-trace-channel="2"'));
assert.ok(!markup.includes('data-trace-channel="3"'));
assert.ok(!markup.includes('data-trace-channel="4"'));
assert.equal(element('ds1104zplusFaceplate').src, 'data:image/svg+xml,test');
const preview = {};
panel.renderScreen(preview);
assert.equal((preview.innerHTML.match(/data-grid-column=/g) || []).length, 13);
// The derived faceplate clears the photographed display without external asset references.
const assets = vm.createContext({ window: { InstrumentLabImages: {} }, encodeURIComponent });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/instruments/ds1104z-plus.js'), 'utf8'), assets);
const svg = decodeURIComponent(assets.window.InstrumentLabImages.ds1104zplus.split(',').slice(1).join(','));
assert.ok(svg.includes('href="data:image/png;base64,'));
assert.ok(assets.window.InstrumentLabImages.ds1104zplusPhoto.startsWith('data:image/png;base64,'));
assert.ok(svg.includes('<rect x="138" y="113" width="878" height="494" rx="3" fill="#000"/>'));
// Every physical key reuses enable/select/open, repeat-to-disable/close semantics.
const isolated = JSON.stringify(practice.oscilloscope);
for (const channel of [1, 2, 3, 4]) {
  const key = element(`ds1104zplusCH${channel}`);
  key.click();
  assert.equal(controller.getSettings().selectedChannel, channel);
  assert.equal(controller.getSettings().menuChannel, channel);
  assert.equal(key.attributes['aria-pressed'], 'true');
  const display = element('ds1104zplusScreen').innerHTML;
  assert.ok(display.includes(`data-trace-channel="${channel}"`));
  assert.ok(display.includes(`aria-label="CH${channel}"`));
  for (const label of ['Coupling', 'BW Limit', 'Probe', 'Invert', 'Volts/Div', 'Unit']) assert.ok(display.includes(label));
  assert.ok(!/submenu|<button/.test(display));
  panel.renderScreen(preview, { idPrefix: 'mainScope', showMenus: false });
  assert.ok(!preview.innerHTML.includes('ds1104zplus-channel-menu'));
  assert.ok(!preview.innerHTML.includes('id="ds1104zplusTraceClip"'));
  key.click();
  assert.equal(controller.getSettings().menuChannel, null);
  assert.equal(key.attributes['aria-pressed'], 'false');
  assert.ok(!element('ds1104zplusScreen').innerHTML.includes(`data-trace-channel="${channel}"`));
}
assert.equal(JSON.stringify(practice.oscilloscope), isolated, 'DS1102E state is independent');
assert.deepEqual(Object.keys(controller.getSettings().channels), ['1','2','3','4']);
assert.throws(() => controller.actions.channel(5));
assert.throws(() => app.oscilloscope.pressChannel(practice.oscilloscope, 3));
element('ds1104zplusCH1').click(); element('ds1104zplusCH3').click();
assert.equal(controller.getSettings().channels[1].visible, true);
element('ds1104zplusCH1').click();
assert.equal(controller.getSettings().channels[1].visible, true, 'reselecting a channel after another menu does not disable it');
assert.equal(controller.getSettings().menuChannel, 1);
assert.equal(controller.getSettings().channels[3].visible, true);
element('ds1104zplusCH4').click();
assert.ok(element('ds1104zplusScreen').innerHTML.includes('stroke="#588cff"'));
assert.ok(element('ds1104zplusScreen').innerHTML.includes('stroke="#f06acb"'));
assert.ok(element('ds1104zplusScreen').innerHTML.includes('d="M84 224H660" stroke="#588cff"'), 'unconnected CH4 is a 0 V line');
controller.actions.auto(); panel.render();
assert.equal(controller.getSettings().channels[1].visible, true);
assert.equal(controller.getSettings().channels[2].visible, true);
assert.equal(controller.getSettings().channels[3].visible, false);
assert.equal(controller.getSettings().channels[4].visible, false);
assert.equal(controller.getSettings().menuChannel, null);
console.log('DS1104Z Plus: four independent channel keys, native menu, shared RC traces, pink/blue zero lines, preview and reset.');

// Four live footer readings remain visible, even for disabled channels.
let footer = adapter.renderChannelFooter(controller.getSettings(), 'Readings');
assert.equal((footer.match(/data-channel-reading=/g) || []).length, 4);
assert.ok(footer.includes('CH1 DC 500mV ON'));
assert.ok(footer.includes('CH3 DC 500mV OFF'));
assert.ok(!footer.includes('data-channel-frame='), 'a closed menu has no selection frame');
element('ds1104zplusCH2').click();
footer = adapter.renderChannelFooter(controller.getSettings(), 'Readings');
assert.ok(footer.includes('data-channel-frame="2"'));
assert.equal((footer.match(/data-channel-frame=/g) || []).length, 1);
assert.ok(footer.includes('data-channel-reading="3" data-visible="false" data-selected="false"'));
assert.ok(footer.includes('fill="#59616d"'));
controller.getSettings().channels[2].coupling = 'AC';
controller.getSettings().channels[2].voltsPerDivision = 2;
controller.getSettings().channels[3].coupling = 'GND';
panel.render();
footer = adapter.renderChannelFooter(controller.getSettings(), 'Readings');
assert.ok(footer.includes('CH2 AC 2.00V ON'));
assert.ok(footer.includes('data-coupling="AC"'));
assert.ok(footer.includes('data-coupling="GND"'));
assert.ok(footer.includes('stroke-dasharray="2 2"'), 'DC symbol includes a broken lower line');
element('ds1104zplusCH2').click();
footer = adapter.renderChannelFooter(controller.getSettings(), 'Readings');
assert.ok(footer.includes('CH2 AC 2.00V OFF'));
assert.ok(!footer.includes('data-channel-frame='));
panel.renderScreen(preview, { idPrefix: 'mainFooter', showMenus: false });
assert.equal((preview.innerHTML.match(/data-channel-reading=/g) || []).length, 4);
assert.equal(g.columns, 12); assert.equal(g.rows, 8);
assert.ok(438 >= g.top + g.rows * g.cell + 16, 'footer stays below the plot with a gap');
console.log('Four-channel footer: coupling symbols, live scales, disabled grey and active-menu frame.');

// Plus Coupling reuses the same draft, wrap, knob confirmation and electrical effects.
controller.actions.auto(); panel.render();
const couplingKey = element('ds1104zplusCouplingKey');
const knob = element('ds1104zplusSelectionKnob');
const indicator = element('ds1104zplusSelectionIndicator');
assert.equal(couplingKey.hidden, true);
const trace = () => element('ds1104zplusScreen').innerHTML.match(/<path d="([^"]+)" stroke="[^"]+" data-trace-channel="1"/)[1];
element('ds1104zplusCH1').click();
assert.equal(couplingKey.hidden, false);
const dcTrace = trace();
couplingKey.click();
assert.equal(controller.getSettings().submenuSelection, 'DC');
assert.equal(indicator.attributes['data-active'], 'true');
assert.equal(knob.attributes['aria-disabled'], 'false');
couplingKey.click();
assert.equal(controller.getSettings().submenuSelection, 'AC');
assert.equal(controller.getSettings().channels[1].coupling, 'DC');
assert.equal(trace(), dcTrace);
couplingKey.click(); assert.equal(controller.getSettings().submenuSelection, 'GND');
couplingKey.click(); assert.equal(controller.getSettings().submenuSelection, 'DC');
knob.fire('keydown', { key: 'ArrowDown' });
assert.equal(controller.getSettings().submenuSelection, 'AC');
knob.fire('keydown', { key: 'Enter' });
assert.equal(controller.getSettings().channels[1].coupling, 'AC');
assert.notEqual(trace(), dcTrace);
assert.equal(indicator.attributes['data-active'], 'false');
assert.ok(element('ds1104zplusScreen').innerHTML.includes('CH1 AC 500mV ON'));
couplingKey.click(); knob.fire('wheel', { deltaY: 40, deltaMode: 0 });
assert.equal(controller.getSettings().submenuSelection, 'GND');
knob.click();
assert.equal(controller.getSettings().channels[1].coupling, 'GND');
assert.equal(trace(), 'M84 368H660');
assert.equal(controller.getSettings().channels[2].coupling, 'DC');
// Selection limits and drag-click suppression remain shared with the other model.
couplingKey.click(); knob.fire('keydown', { key: 'ArrowDown' });
assert.equal(controller.getSettings().submenuSelection, 'GND');
knob.fire('pointerdown', { clientX: 50, clientY: 0 });
knob.fire('pointermove', { clientX: 0, clientY: 50 });
knob.fire('pointerup'); knob.click();
assert.equal(controller.getSettings().submenu, 'coupling');
assert.equal(controller.getSettings().channels[1].coupling, 'GND');
// Changing channel cancels the draft and extinguishes the arrow.
element('ds1104zplusCH2').click();
assert.equal(controller.getSettings().submenu, null);
assert.equal(indicator.attributes['data-active'], 'false');
assert.equal(knob.attributes['aria-disabled'], 'true');
couplingKey.click(); couplingKey.click();
panel.renderScreen(preview, { idPrefix: 'mainNoSubmenu', showMenus: false });
assert.ok(!preview.innerHTML.includes('ds1104zplus-coupling-submenu'));
element('ds1104zplusCH2').click();
assert.equal(couplingKey.hidden, true);
assert.equal(indicator.attributes['data-active'], 'false');
console.log('Plus Coupling: DC/AC/GND, blue-key cycling, keyboard/wheel/drag knob, confirmation, signal effects and cancellation.');

for (const channel of [3, 4]) {
  element(`ds1104zplusCH${channel}`).click();
  couplingKey.click(); couplingKey.click(); knob.click();
  assert.equal(controller.getSettings().channels[channel].coupling, 'AC');
  assert.ok(element('ds1104zplusScreen').innerHTML.includes(`CH${channel} AC 500mV ON`));
}
assert.equal(practice.oscilloscope.channels[1].coupling, 'DC');
assert.equal(practice.oscilloscope.channels[2].coupling, 'DC');

// Animation renders must update both the open instrument and the main preview.
controller.actions.auto(); panel.render();
element('ds1104zplusCH1').click(); couplingKey.click(); couplingKey.click(); couplingKey.click(); knob.click();
assert.equal(controller.getSettings().trigger.source, 1);
assert.equal(controller.getAcquisition().locked, false);
assert.equal(controller.needsAnimation(), true);
const beforeAnimatedInstrument = element('ds1104zplusScreen').innerHTML;
controller.advance(.03);
panel.renderScreen(preview, { idPrefix: 'animatingMain', showMenus: false });
assert.notEqual(element('ds1104zplusScreen').innerHTML, beforeAnimatedInstrument);
assert.ok(element('ds1104zplusScreen').innerHTML.includes('data-channel-reading="1"'));
console.log('GND trigger loss animates the instrument and preview together.');

// Plus Probe keeps the full range and the same shared pending/confirm behaviour.
controller.actions.auto(); panel.render();
const probeKey = element('ds1104zplusProbeKey');
assert.equal(probeKey.hidden, true);
assert.deepEqual(Array.from(app.oscilloscope.submenus.probe.options), [1,5,10,20,50,100,200,500,1000]);
const factors = [0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000];
assert.deepEqual(Array.from(app.oscilloscope.submenus.probePlus.options), factors);
element('ds1104zplusCH1').click();
assert.equal(probeKey.hidden, false);
probeKey.click();
assert.equal(indicator.attributes['data-active'], 'true');
assert.equal((element('ds1104zplusScreen').innerHTML.match(/data-probe-option=/g) || []).length, 16);
const initialProbeTrace = trace();
probeKey.click();
assert.equal(controller.getSettings().submenuSelection, 2);
assert.equal(controller.getSettings().channels[1].probe, 1);
assert.equal(trace(), initialProbeTrace);
knob.fire('keydown', { key: 'Enter' });
assert.equal(controller.getSettings().channels[1].probe, 2);
assert.notEqual(trace(), initialProbeTrace);
assert.equal(indicator.attributes['data-active'], 'false');
probeKey.click();
for (let step = 0; step < factors.length; step++) knob.fire('keydown', { key: 'ArrowDown' });
assert.equal(controller.getSettings().submenuSelection, 1000);
probeKey.click();
assert.equal(controller.getSettings().submenuSelection, 0.01, 'blue key wraps the full range');
knob.fire('keydown', { key: 'ArrowUp' });
assert.equal(controller.getSettings().submenuSelection, 0.01, 'knob clamps at the lower end');
couplingKey.click();
assert.equal(controller.getSettings().channels[1].probe, 2, 'another submenu discards pending attenuation');
probeKey.click();
knob.fire('keydown', { key: 'ArrowUp' });
knob.fire('keydown', { key: 'ArrowUp' });
assert.equal(controller.getSettings().submenuSelection, 0.5);
knob.click();
assert.equal(controller.getSettings().channels[1].probe, 0.5);
assert.equal(controller.getSettings().channels[2].probe, 1);
assert.equal(practice.oscilloscope.channels[1].probe, 1);
assert.equal(practice.probes[1], 1);
const signals = app.oscilloscope.createSignals(app.circuits.rc, practice.parameters, practice.generator, controller.getSettings(), {1:1,2:1});
assert.equal(signals.sample(.0002, 1), app.circuits.rc.sample(.0002, practice.parameters, practice.generator).input * 0.5);
probeKey.click();
panel.renderScreen(preview, { idPrefix: 'mainNoProbe', showMenus: false });
assert.ok(!preview.innerHTML.includes('data-probe-option'));
element('ds1104zplusCH2').click();
assert.equal(controller.getSettings().submenu, null);
assert.equal(indicator.attributes['data-active'], 'false');
console.log('Plus Probe: all 16 factors, pending/confirm, wrap/bounds, cancellation, independent physical probes and electrical scaling.');

// Invert is an immediate toggle; vertical scale uses the Plus range on all four channels.
controller.actions.auto(); panel.render();
const invertKey = element('ds1104zplusInvertKey');
const scaleKnob = element('ds1104zplusScaleKnob');
assert.equal(invertKey.hidden, true);
element('ds1104zplusCH1').click();
probeKey.click();
invertKey.click();
assert.equal(controller.getSettings().submenu, null);
assert.equal(controller.getSettings().channels[1].inverted, true);
assert.equal(invertKey.attributes['aria-pressed'], 'true');
assert.ok(element('ds1104zplusScreen').innerHTML.includes('<dt>Invert</dt><dd>ON</dd>'));
assert.equal(indicator.attributes['data-active'], 'false');
invertKey.click();
assert.equal(controller.getSettings().channels[1].inverted, false);
const plusScales = [0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10];
for (const channel of [1,2,3,4]) {
  if (channel !== 1) element(`ds1104zplusCH${channel}`).click();
  for (let i = 0; i < 20; i++) scaleKnob.fire('keydown', { key: 'ArrowRight' });
  assert.equal(controller.getSettings().channels[channel].voltsPerDivision, .001);
  for (const value of plusScales.slice(1)) {
    scaleKnob.fire('wheel', { deltaY: 40, deltaMode: 0 });
    assert.equal(controller.getSettings().channels[channel].voltsPerDivision, value);
    assert.ok(element('ds1104zplusScreen').innerHTML.includes(`CH${channel} DC ${app.oscilloscope.formatVerticalScale(value)} ON`));
  }
  scaleKnob.fire('keydown', { key: 'ArrowLeft' });
  assert.equal(controller.getSettings().channels[channel].voltsPerDivision, 10);
  invertKey.click();
  assert.equal(controller.getSettings().channels[channel].inverted, true);
}
assert.equal(practice.oscilloscope.channels[1].voltsPerDivision, .5);
assert.equal(practice.oscilloscope.channels[1].inverted, false);
element('ds1104zplusCH4').click();
scaleKnob.fire('keydown', { key: 'ArrowRight' });
assert.equal(controller.getSettings().channels[4].voltsPerDivision, 10, 'hidden channel ignores the scale knob');
controller.actions.auto(); panel.render();
for (const channel of [1,2,3,4]) assert.equal(controller.getSettings().channels[channel].inverted, false);
console.log('Plus Invert toggles immediately; all four scales traverse 1–2–5 from 1mV to 10V, clamp, stay independent and reset.');

// The Plus horizontal knob uses its full range without changing channels or the older model.
const timeKnob = element('ds1104zplusTimeScaleKnob');
const channelSettingsBeforeTime = JSON.stringify(controller.getSettings().channels);
for (let i = 0; i < 40; i++) timeKnob.fire('keydown', { key: 'ArrowRight' });
assert.equal(controller.getSettings().timePerDivision, 5e-9);
assert.equal(timeKnob.attributes['aria-valuenow'], '0');
assert.ok(element('ds1104zplusScreen').innerHTML.includes('H 5ns</text>'));
assert.ok(element('ds1104zplusScreen').innerHTML.includes('>RIGOL</text>'));
const timeScales = [5e-9,1e-8,2e-8,5e-8,1e-7,2e-7,5e-7,1e-6,2e-6,5e-6,1e-5,2e-5,5e-5,1e-4,2e-4,5e-4,1e-3,2e-3,5e-3,1e-2,2e-2,5e-2,.1,.2,.5,1,2,5,10,20,50];
assert.deepEqual(Array.from(app.oscilloscope.horizontalScalesPlus), timeScales);
for (const time of timeScales.slice(1)) {
  timeKnob.fire('wheel', { deltaY: 40, deltaMode: 0 });
  assert.equal(controller.getSettings().timePerDivision, time);
  assert.ok(element('ds1104zplusScreen').innerHTML.includes(`data-time-scale="${time}"`));
  assert.ok(!/NaN|undefined|Infinity/.test(element('ds1104zplusScreen').innerHTML));
}
timeKnob.fire('keydown', { key: 'ArrowLeft' });
assert.equal(controller.getSettings().timePerDivision, 50);
assert.ok(element('ds1104zplusScreen').innerHTML.includes('H 50s</text>'));
panel.renderScreen(preview, {idPrefix:'timePreview',showMenus:false});
assert.ok(preview.innerHTML.includes('H 50s</text>'));
assert.ok(preview.innerHTML.includes('>RIGOL</text>'));
assert.equal(JSON.stringify(controller.getSettings().channels),channelSettingsBeforeTime);
assert.equal(practice.oscilloscope.timePerDivision,200e-6);
element('ds1104zplusCH1').click();element('ds1104zplusCH1').click();
element('ds1104zplusCH2').click();element('ds1104zplusCH2').click();
assert.equal(controller.getSettings().channels[1].visible,false);
assert.equal(controller.getSettings().channels[2].visible,false);
timeKnob.fire('keydown', {key:'ArrowRight'});
assert.equal(controller.getSettings().timePerDivision,20,'time control also works with hidden channels');
controller.actions.auto();panel.render();
assert.equal(controller.getSettings().timePerDivision,200e-6);
assert.ok(element('ds1104zplusScreen').innerHTML.includes('H 200us</text>'));
console.log('Plus timebase: all 31 steps from 5ns to 50s, bounded shared knob, live header/preview, hidden channels, model independence and reset.');

// Verify actual pointer rotation, not just keyboard equivalents: top → right is clockwise.
const channel2BeforeRotation = JSON.stringify(controller.getSettings().channels[2]);
const beforeRotation = trace();
scaleKnob.fire('pointerdown', {clientX:50,clientY:0});
scaleKnob.fire('pointermove', {clientX:75,clientY:6.698729810778069}); // +30 degrees
scaleKnob.fire('pointerup');
assert.equal(controller.getSettings().channels[1].voltsPerDivision,.2,'clockwise reduces V/div: 500mV → 200mV');
assert.ok(element('ds1104zplusScreen').innerHTML.includes('CH1 DC 200mV ON'));
assert.notEqual(trace(),beforeRotation,'the waveform is reprojected at the reduced scale');
scaleKnob.fire('pointerdown', {clientX:75,clientY:6.698729810778069});
scaleKnob.fire('pointermove', {clientX:50,clientY:0}); // -30 degrees
scaleKnob.fire('pointerup');
assert.equal(controller.getSettings().channels[1].voltsPerDivision,.5,'counterclockwise increases V/div: 200mV → 500mV');
assert.ok(element('ds1104zplusScreen').innerHTML.includes('CH1 DC 500mV ON'));
assert.equal(trace(),beforeRotation,'returning the scale restores the waveform geometry');
assert.equal(JSON.stringify(controller.getSettings().channels[2]),channel2BeforeRotation);
console.log('Actual pointer rotation verified: clockwise reduces V/div; counterclockwise increases V/div, updating the trace and footer.');

// The horizontal knob follows the same rotation direction as the vertical knob.
const channelsBeforeTimeRotation = JSON.stringify(controller.getSettings().channels);
const beforeTimeRotation = trace();
timeKnob.fire('pointerdown', {clientX:50,clientY:0});
timeKnob.fire('pointermove', {clientX:75,clientY:6.698729810778069}); // +30 degrees clockwise
timeKnob.fire('pointerup');
assert.equal(controller.getSettings().timePerDivision,100e-6,'clockwise reduces time/div: 200us → 100us');
assert.ok(element('ds1104zplusScreen').innerHTML.includes('H 100us</text>'));
assert.notEqual(trace(),beforeTimeRotation,'the common time axis is reprojected');
timeKnob.fire('pointerdown', {clientX:75,clientY:6.698729810778069});
timeKnob.fire('pointermove', {clientX:50,clientY:0}); // -30 degrees counterclockwise
timeKnob.fire('pointerup');
assert.equal(controller.getSettings().timePerDivision,200e-6,'counterclockwise increases time/div: 100us → 200us');
assert.ok(element('ds1104zplusScreen').innerHTML.includes('H 200us</text>'));
assert.equal(trace(),beforeTimeRotation);
assert.equal(JSON.stringify(controller.getSettings().channels),channelsBeforeTimeRotation);
console.log('Horizontal pointer rotation verified: clockwise reduces time/div; counterclockwise increases time/div, updating the common time axis and header.');

// Position knobs move the selected vertical reference and the shared temporal zero.
controller.actions.auto();panel.render();
const positionKnob = element('ds1104zplusPositionKnob');
const horizontalPositionKnob = element('ds1104zplusHorizontalPositionKnob');
const timeMarkerX = () => Number(element('ds1104zplusScreen').innerHTML.match(/data-time-zero-label="true" x="([^"]+)"/)[1]);
assert.equal(timeMarkerX(),372);
positionKnob.fire('pointerdown',{clientX:50,clientY:0});
positionKnob.fire('pointermove',{clientX:75,clientY:6.698729810778069});
positionKnob.fire('pointerup');
assert.equal(controller.getSettings().channels[1].positionDivisions,-2.9,'clockwise raises selected channel');
assert.equal(controller.getSettings().channels[2].positionDivisions,-3);
assert.equal(timeMarkerX(),372,'vertical movement leaves time zero unchanged');
for (const channel of [1,2,3,4]) {
  if(channel!==1) element(`ds1104zplusCH${channel}`).click();
  for(let i=0;i<90;i++) positionKnob.fire('keydown',{key:'ArrowRight'});
  assert.equal(controller.getSettings().channels[channel].positionDivisions,4);
  assert.ok(element('ds1104zplusScreen').innerHTML.includes(`aria-label="CH${channel} 0 V" transform="translate(66 32)"`));
  for(let i=0;i<90;i++) positionKnob.fire('keydown',{key:'ArrowLeft'});
  assert.equal(controller.getSettings().channels[channel].positionDivisions,-4);
  assert.ok(element('ds1104zplusScreen').innerHTML.includes(`aria-label="CH${channel} 0 V" transform="translate(66 416)"`));
}
element('ds1104zplusCH4').click();
positionKnob.fire('keydown',{key:'ArrowRight'});
assert.equal(controller.getSettings().channels[4].positionDivisions,-4,'hidden channels cannot move vertically');
controller.actions.auto();panel.render();
const firstPointX = channel => Number(element('ds1104zplusScreen').innerHTML.match(new RegExp(`<path d="M([^ ,]+),[^"\\n]+" stroke="[^"]+" data-trace-channel="${channel}"`))[1]);
horizontalPositionKnob.fire('pointerdown',{clientX:50,clientY:0});
horizontalPositionKnob.fire('pointermove',{clientX:75,clientY:6.698729810778069});
horizontalPositionKnob.fire('pointerup');
assert.equal(controller.getSettings().horizontalPositionDivisions,.1,'clockwise shifts both traces and the trigger marker right');
assert.equal(timeMarkerX(),376.8);
assert.equal(firstPointX(1),84);assert.equal(firstPointX(2),84);
assert.equal(controller.getSettings().channels[1].positionDivisions,-3);
assert.equal(controller.getSettings().channels[2].positionDivisions,-3);
for(let i=0;i<110;i++) horizontalPositionKnob.fire('keydown',{key:'ArrowRight'});
assert.equal(controller.getSettings().horizontalPositionDivisions,5);
assert.equal(timeMarkerX(),612);
for(let i=0;i<110;i++) horizontalPositionKnob.fire('keydown',{key:'ArrowLeft'});
assert.equal(controller.getSettings().horizontalPositionDivisions,-5);
assert.equal(timeMarkerX(),132);
panel.renderScreen(preview,{idPrefix:'positionPreview',showMenus:false});
assert.ok(preview.innerHTML.includes('data-time-zero-label="true" x="132"'));
assert.ok(preview.innerHTML.includes('data-time-zero="true"'));
assert.equal(practice.oscilloscope.horizontalPositionDivisions,0);
controller.actions.auto();panel.render();
assert.equal(timeMarkerX(),372);
assert.equal(controller.getSettings().horizontalPositionDivisions,0);
console.log('Plus position knobs: all four vertical references, shared horizontal movement, orange temporal-zero marker, limits, hidden-channel guard, preview and reset.');

// Native trigger menu shares draft selection, electrical trigger analysis and timer.
controller.actions.auto();panel.render();
const triggerMenuKey = element('ds1104zplusTriggerMenuKey');
const triggerSourceKey = element('ds1104zplusTriggerSourceKey');
const triggerSlopeKey = element('ds1104zplusTriggerSlopeKey');
const triggerLevelKnob = element('ds1104zplusTriggerLevelKnob');
const display = () => element('ds1104zplusScreen').innerHTML;
assert.ok(display().includes('data-trigger-marker="true" transform="translate(680 368)"'));
assert.ok(!display().includes('data-trigger-level-line'));
element('ds1104zplusCH1').click();probeKey.click();
triggerMenuKey.click();
assert.equal(controller.getSettings().menuChannel,null);
assert.equal(controller.getSettings().submenu,null);
assert.equal(triggerMenuKey.attributes['aria-expanded'],'true');
assert.ok(display().includes('aria-label="Trigger"'));
for(const label of ['Type','Edge','Source','Slope','Sweep','Auto','Setting']) assert.ok(display().includes(label));
triggerSourceKey.click();triggerSourceKey.click();
assert.equal(controller.getSettings().submenuSelection,2);
assert.equal(controller.getSettings().trigger.source,1);
assert.equal(indicator.attributes['data-active'],'true');
knob.click();
assert.equal(controller.getSettings().trigger.source,2);
assert.equal(controller.getSettings().selectedChannel,1);
assert.equal(indicator.attributes['data-active'],'false');
controller.getSettings().trigger.level=1.5;panel.render();
assert.equal(controller.getAcquisition().locked,true);
const risingAcquisition = controller.getAcquisition().time;
triggerSlopeKey.click();triggerSlopeKey.click();
assert.equal(controller.getSettings().submenuSelection,'falling');
assert.equal(controller.getSettings().trigger.slope,'rising');
knob.fire('keydown',{key:'Enter'});
assert.equal(controller.getSettings().trigger.slope,'falling');
assert.notEqual(controller.getAcquisition().time,risingAcquisition);
triggerSlopeKey.click();triggerSlopeKey.click();knob.click();
assert.equal(controller.getSettings().trigger.slope,'either');
assert.equal(controller.getAcquisition().locked,true);
triggerSourceKey.click();triggerSourceKey.click();knob.click();
assert.equal(controller.getSettings().trigger.source,3);
assert.equal(controller.getAcquisition().locked,false,'unconnected CH3 cannot trigger');
assert.ok(!/NaN|undefined|Infinity/.test(display()));
triggerSourceKey.click();triggerSourceKey.click();knob.click();
assert.equal(controller.getSettings().trigger.source,4);
assert.equal(controller.getAcquisition().locked,false,'unconnected CH4 cannot trigger');
triggerSourceKey.click();triggerSourceKey.click();knob.click();
assert.equal(controller.getSettings().trigger.source,1,'blue source key wraps CH4 to CH1');
controller.getSettings().trigger.level=0;panel.render();
triggerLevelKnob.fire('pointerdown',{clientX:50,clientY:0});
triggerLevelKnob.fire('pointermove',{clientX:75,clientY:6.698729810778069});
triggerLevelKnob.fire('pointerup');
assert.equal(controller.getSettings().trigger.level,.05);
assert.equal(triggerDelay,3000);
assert.ok(display().includes('data-trigger-level-line="true"'));
assert.ok(display().includes('data-trigger-marker="true" transform="translate(680 363.2)"'));
assert.ok(display().includes('TRIG LVL= 0.05V'));
const priorTimer = triggerTimer;
triggerLevelKnob.fire('keydown',{key:'ArrowRight'});
assert.equal(controller.getSettings().trigger.level,.1);
assert.notEqual(triggerTimer,priorTimer,'turning restarts the three second timer');
const expireTriggerLine = triggerTimer;triggerTimer=null;expireTriggerLine();
assert.equal(controller.getSettings().trigger.showLevel,false);
assert.ok(!display().includes('data-trigger-level-line'));
assert.ok(!display().includes('data-trigger-readout'));
assert.ok(display().includes('data-trigger-marker="true" transform="translate(680 358.4)"'),'arrow persists after the line expires');
panel.renderScreen(preview,{idPrefix:'triggerPreview',showMenus:false});
assert.ok(preview.innerHTML.includes('data-trigger-marker="true"'));
assert.ok(!preview.innerHTML.includes('aria-label="Trigger"'));
triggerSourceKey.click();element('ds1104zplusCH2').click();
assert.equal(controller.getSettings().triggerMenuOpen,false);
assert.equal(controller.getSettings().submenu,null);
assert.equal(triggerSourceKey.hidden,true);
assert.equal(controller.getSettings().trigger.source,1);
controller.actions.auto();panel.render();
assert.equal(triggerTimer,null);
assert.equal(controller.getSettings().trigger.level,0);
assert.equal(controller.getSettings().trigger.slope,'rising');
assert.ok(display().includes('data-trigger-marker="true"'));
assert.ok(!display().includes('data-trigger-level-line'));
console.log('Plus Trigger: source CH1–CH4, rising/falling/either, shared selection and level, 3000ms line timer, permanent right arrow, preview and reset.');

assert.match(display(), /data-trigger-marker="true"[^>]*><path[^>]*\/><text[^>]*>T<\/text><\/g>/, "persistent horizontal trigger arrow contains T");

'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let clock = 0, timerId = 0;
const timers = new Map();
const context = vm.createContext({ window: {
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, time: clock + delay }); return id; },
  clearTimeout(id) { timers.delete(id); }
} });
for (const file of ['circuits.js', 'oscilloscope.js', 'oscilloscope-controller.js', 'translations.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app', file), 'utf8'), context);
const app = context.window.InstrumentLab, scope = app.oscilloscope, circuit = app.circuits.rc, parameters = circuit.defaults;
const close = (a, b, eps = 1e-10) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const analyze = (settings, generator) => scope.analyzeTrigger(circuit, parameters, generator, settings);
const render = (settings, generator, divisions = 10, cellWidth = 56.8) => scope.render(circuit, parameters, generator, key => app.translations.en[key], String, 'test', divisions, settings, { cellWidth });
const traces = svg => Array.from(svg.matchAll(/<path d="([^"]+)" stroke="(#[^"]+)"/g), m => m[1]);
const initial = scope.createState();
assert.equal(initial.trigger.source, 1); assert.equal(initial.trigger.level, 0);
for (const waveform of ['square', 'sine']) for (const source of [1, 2]) {
  const generator = { ...app.generatorDefaults, waveform, offset: .2 };
  for (const coupling of ['DC', 'AC']) for (const probe of [1, 5]) {
    const state = scope.createState({ trigger: { source, level: .15 }, channels: { [source]: { coupling, probe, visible: false } } });
    const signals = scope.createSignals(circuit, parameters, generator, state);
    const result = analyze(state, generator);
    assert.equal(result.locked, true);
    if (!(source === 1 && waveform === 'square')) close(signals.sample(result.time, source), .15, 1e-8);
    const [min, max] = signals.range(source);
    assert.equal(analyze(scope.createState({ ...state, trigger: { source, level: max } }), generator).locked, true);
    assert.equal(analyze(scope.createState({ ...state, trigger: { source, level: min } }), generator).locked, true);
    assert.equal(analyze(scope.createState({ ...state, trigger: { source, level: max + .1 } }), generator).locked, false);
    assert.equal(analyze(scope.createState({ ...state, trigger: { source, level: min - .1 } }), generator).locked, false);
  }
}
const sine = { ...app.generatorDefaults, waveform: 'sine' };
close(analyze(scope.createState({ trigger: { source: 1, level: .5 } }), sine).time, 1 / 12000);
const source2 = scope.createState({ trigger: { source: 2, level: .25, showLevel: true } });
const crossing = analyze(source2, sine);
assert.equal(crossing.locked, true);
for (const [divisions, cellWidth] of [[10, 56.8], [12, 40]]) {
  const svg = render(source2, sine, divisions, cellWidth), zeroX = 36 + divisions * cellWidth / 2;
  // BOTH traces sample the same physical time at t=0, preserving their RC phase difference.
  for (const [channel, key] of ['input', 'output'].entries()) {
    const voltage = circuit.sample(crossing.time, parameters, sine)[key];
    assert.ok(traces(svg)[channel].includes(`L${zeroX.toFixed(3)},${(204 - voltage / .5 * 40).toFixed(3)}`));
  }
  assert.ok(Math.abs(circuit.sample(crossing.time, parameters, sine).input - .25) > .1);
  for (const position of [-5, 5]) {
    const moved = render(scope.createState({ horizontalPositionDivisions: position }), app.generatorDefaults, divisions, cellWidth);
    const x = Number(moved.match(/data-time-zero="true" d="M([0-9.]+)/)[1]) + 6;
    assert.ok(x >= 36 && x <= 36 + divisions * cellWidth);
  }
}
const reference = scope.createState({ selectedChannel: 1, trigger: { source: 2, level: .25, showLevel: true }, channels: { 1: { positionDivisions: 2 }, 2: { positionDivisions: -1, voltsPerDivision: .5 } } });
const marked = render(reference, app.generatorDefaults);
assert.ok(marked.includes('data-trigger-marker="true" transform="translate(18 224)"'));
assert.ok(marked.includes('y1="224"'));
assert.ok(marked.includes('TRIG LVL= 0.25V'));
assert.ok(marked.includes('data-trigger-readout="true"'));
assert.ok(marked.includes('data-time-zero-label="true"'));
assert.ok(!marked.includes('T CH2'));
assert.ok(render(scope.createState({ trigger: { level: 1.24, showLevel: true } }), sine).includes('TRIG LVL= 1.24V'));
assert.ok(render(scope.createState({ trigger: { level: .001, showLevel: true } }), sine).includes('TRIG LVL= 0.001V'));
assert.equal(analyze(scope.createState({ channels: { 1: { coupling: 'GND' } } }), sine).locked, false);
assert.equal(analyze(initial, { ...sine, output1Enabled: false }).locked, false);
// Timer resets on each LEVEL adjustment; hiding indicators must retain trigger behaviour.
let settings = scope.createState();
let changes = 0;
const controller = app.createOscilloscopeController({ getSettings: () => settings, setSettings: value => { settings = value; }, onChange: () => changes++, onAuto: () => { settings = scope.createState(); }, getExperiment: () => ({ circuit, parameters, generator: sine }), t: key => app.translations.en[key], format: String });
const tick = milliseconds => {
  clock += milliseconds;
  for (const [id, timer] of Array.from(timers)) if (timer.time <= clock) { timers.delete(id); timer.callback(); }
};
controller.actions.triggerLevel(1); close(settings.trigger.level, .05);
assert.equal(settings.trigger.showLevel, true);
tick(2000); controller.actions.triggerLevel(1); tick(2999);
assert.equal(settings.trigger.showLevel, true);
assert.ok(controller.getDisplay().includes('data-trigger-marker'));
tick(1);
assert.equal(settings.trigger.showLevel, false); close(settings.trigger.level, .1);
assert.ok(!controller.getDisplay().includes('data-trigger-marker'));
assert.ok(!controller.getDisplay().includes('data-trigger-readout'));
assert.ok(controller.getDisplay().includes('data-time-zero-label'));
assert.equal(controller.getAcquisition().locked, true);
// Free running moves BOTH traces with one phase, in both displays, and locks again immediately.
for (let n = 0; n < 20; n++) controller.actions.triggerLevel(1);
assert.equal(controller.needsAnimation(), true);
const first = traces(controller.getDisplay());
controller.advance(.2);
const second = traces(controller.getDisplay());
assert.notEqual(first[0], second[0]); assert.notEqual(first[1], second[1]);
assert.equal(controller.getDisplay(), controller.getDisplay());
tick(3000);
assert.equal(settings.trigger.showLevel, false);
assert.equal(controller.needsAnimation(), true);
controller.actions.auto();
assert.equal(controller.needsAnimation(), false);
assert.equal(settings.trigger.source, 1); assert.equal(settings.trigger.level, 0);
assert.equal(timers.size, 0);
assert.deepEqual(traces(controller.getDisplay()), traces(render(initial, sine)));
console.log('Trigger crossings, shared time axis, source-relative level marker, visible t=0 bounds, 3-second timer, free-running animation and AUTO passed.');

// Both slope directions use one physical crossing and the correct signal derivative.
for (const waveform of ['sine', 'square']) for (const source of [1, 2]) for (const slope of ['rising', 'falling']) {
  for (const coupling of ['DC', 'AC']) for (const probe of [1, 5]) {
    const generator = { ...app.generatorDefaults, waveform, offset: .2 };
    const settings = scope.createState({ trigger: { source, slope, level: .15 }, channels: { [source]: { coupling, probe } } });
    const signals = scope.createSignals(circuit, parameters, generator, settings);
    const acquisition = analyze(settings, generator);
    assert.equal(acquisition.locked, true);
    const epsilon = 1 / generator.frequency * 1e-6;
    const before = signals.sample(acquisition.time - epsilon, source), after = signals.sample(acquisition.time + epsilon, source);
    assert.ok(slope === 'rising' ? after > before : after < before);
    assert.ok(slope === 'rising' ? before < .15 && after >= .15 : before > .15 && after <= .15);
    // Numerical fallback for another model honours the same chosen slope.
    const fallback = { ...circuit, triggerCrossing: undefined };
    const numerical = scope.analyzeTrigger(fallback, parameters, generator, settings);
    assert.equal(numerical.locked, true);
    close(numerical.time, acquisition.time, 1e-10);
    const svg = render(settings, generator), zeroX = 320;
    for (const [index, key] of ['input', 'output'].entries()) {
      if (source === 1 && waveform === 'square' && slope === 'falling') continue;
      // Compare actual displayed values using the shared sample transformation.
      const expected = signals.sample(acquisition.time, index + 1);
      assert.ok(traces(svg)[index].includes(`L${zeroX.toFixed(3)},${(204 - expected / .5 * 40).toFixed(3)}`));
    }
  }
}
const fallingSine = analyze(scope.createState({ trigger: { source: 1, level: .5, slope: 'falling' } }), sine);
close(fallingSine.time, 5 / 12000);
const orangeLabel = render(scope.createState({ trigger: { showLevel: true, level: 1.24 } }), sine);
assert.ok(/y="357" fill="#ff9e3d"[^>]+>TRIG LVL= 1.24V/.test(orangeLabel));
// Free running now advances by divisions per second, shared by both traces.
settings = scope.createState({ trigger: { level: 2 } });
controller.resetTransient(); controller.advance(.25);
const accelerated = traces(controller.getDisplay());
const startTime = -initial.timePerDivision * 10 / 2 - .25 * scope.freeRunDivisionsPerSecond * initial.timePerDivision;
for (const [index, key] of ['input', 'output'].entries()) {
  const y = 204 - circuit.sample(startTime, parameters, sine)[key] / .5 * 40;
  assert.ok(accelerated[index].startsWith(`M36.000,${y.toFixed(3)}`));
}
console.log('Rising/Falling analytical and fallback crossings, shared alignment, orange level readout and division-based free-run speed passed.');

// Constant divisions/second at different frequencies, timebases and screen widths.
assert.equal(scope.freeRunDivisionsPerSecond, 16);
for (const frequency of [500, 1000, 5000]) for (const timePerDivision of [10e-6, 200e-6, 1e-3]) {
  const source = { ...sine, frequency };
  let localState = scope.createState({ timePerDivision, trigger: { level: 2 } });
  const motion = app.createOscilloscopeController({ getSettings: () => localState, setSettings: value => { localState = value; }, onChange() {}, onAuto() {}, getExperiment: () => ({ circuit, parameters, generator: source }), t: key => app.translations.en[key], format: String });
  const elapsed = .037;
  motion.advance(elapsed);
  for (const [horizontalDivisions, cellWidth] of [[10, 56.8], [12, 40]]) {
    // Avoid dense bands in this timing test: both widths have the same left physical time.
    const svg = motion.getDisplay({ horizontalDivisions, cellWidth });
    if (horizontalDivisions * timePerDivision * frequency > horizontalDivisions * cellWidth / 4) continue;
    const time = -timePerDivision * horizontalDivisions / 2 - elapsed * 16 * timePerDivision;
    for (const [index, key] of ['input', 'output'].entries()) {
      const y = 204 - circuit.sample(time, parameters, source)[key] / .5 * 40;
      assert.ok(traces(svg)[index].startsWith(`M36.000,${y.toFixed(3)}`));
    }
  }
  // One long step and several short steps must represent the same elapsed time.
  const once = motion.getDisplay(); motion.resetTransient();
  for (let i = 0; i < 10; i++) motion.advance(elapsed / 10);
  assert.deepEqual(traces(motion.getDisplay()), traces(once));
  // A delayed frame still uses the full elapsed time, rather than slowing the motion.
  motion.resetTransient(); motion.advance(.43);
  const first = traces(motion.getDisplay())[0];
  if (first) {
    const time = -timePerDivision * 10 / 2 - .43 * 16 * timePerDivision;
    const y = 204 - circuit.sample(time, parameters, source).input / .5 * 40;
    assert.ok(first.startsWith(`M36.000,${y.toFixed(3)}`));
  }
}
console.log('16 div/s verified across frequencies, timebases, screen widths and delayed frames; both channels share the same motion.');

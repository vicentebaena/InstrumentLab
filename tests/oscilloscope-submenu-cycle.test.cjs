'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: { InstrumentLab: {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/oscilloscope.js'), 'utf8'), context);
const scope = context.window.InstrumentLab.oscilloscope;
for (const [name, definition] of Object.entries(scope.submenus)) {
  let state = scope.createState({}, 4);
  state = definition.target === 'measure' ? scope.openMeasureMenu(state)
    : definition.target === 'cursors' ? scope.pressCursors(state)
    : definition.target === 'trigger' ? scope.openTriggerMenu(state) : scope.pressChannel(state, 1);
  state = scope.openSubmenu(state, name);
  const start = definition.options.indexOf(state.submenuSelection);
  for (let step = 1; step <= definition.options.length * 2; step++) {
    state = scope.openSubmenu(state, name);
    assert.equal(state.submenuSelection, definition.options[(start + step) % definition.options.length], name);
    assert.equal(scope.submenuTarget(state, definition)[definition.property], state.submenuSelection, 'blue key applies the option immediately');
    if (definition.target === 'measure') assert.equal(state.measurements.at(-1).parameter, state.submenuSelection);
    assert.equal(state.submenu, name);
    if (definition.pageSize) {
      const page = scope.submenuPage(definition.options, state.submenuSelection, definition.pageSize, state.submenuPageStart, definition.pageStarts);
      assert.ok(page.values.includes(state.submenuSelection), 'highlight must stay on the visible page');
      if (state.submenuSelection === definition.options[0]) assert.equal(page.start, 0);
    }
  }
  // Knob navigation retains its existing bounds and confirms a blue-key selection.
  for (let step = 0; step < definition.options.length + 1; step++) state = scope.stepSelection(state, 1);
  assert.equal(state.submenuSelection, definition.options.at(-1));
  state = scope.openSubmenu(state, name);
  assert.equal(state.submenuSelection, definition.options[0]);
  state = scope.openSubmenu(state, name);
  const selected = state.submenuSelection;
  state = scope.confirmSubmenu(state);
  assert.equal(state.submenu, null);
  assert.equal(scope.submenuTarget(state, definition)[definition.property], selected);
  if (definition.target === 'measure') assert.equal(state.measurements.at(-1).parameter, selected);
}
console.log('All submenu keys apply selections immediately and wrap pages; knob bounds, confirmation and measurements are preserved.');

// The Plus applies rotary navigation immediately; the DS1102E retains drafts.
for (const [name, definition] of Object.entries(scope.submenus)) {
  let state = scope.createState({}, 4);
  state = definition.target === 'measure' ? scope.openMeasureMenu(state)
    : definition.target === 'cursors' ? scope.pressCursors(state)
    : definition.target === 'trigger' ? scope.openTriggerMenu(state) : scope.pressChannel(state, 1);
  state = scope.openSubmenu(state, name);
  const original = scope.submenuTarget(state, definition)[definition.property];
  const direction = definition.options.indexOf(original) === definition.options.length - 1 ? -1 : 1;
  const pending = scope.stepSelection(state, direction);
  assert.equal(scope.submenuTarget(pending, definition)[definition.property], original, 'DS1102E rotation needs confirmation');
  const immediate = scope.stepSelection(state, direction, { applyImmediately: true });
  assert.equal(scope.submenuTarget(immediate, definition)[definition.property], immediate.submenuSelection, 'Plus rotation applies immediately');
  assert.notEqual(immediate.submenuSelection, original);
  assert.equal(immediate.submenu, name, 'Plus keeps the submenu open after selection');
}

// Plus probe compensation changes the displayed scale and its full adjustment range.
for (const factor of scope.submenus.probePlus.options) {
  let state = scope.pressChannel(scope.createState({ channels: {1:{voltsPerDivision:1}} }, 4), 1);
  const second = JSON.stringify(state.channels[2]);
  state = scope.openSubmenu(state, 'probePlus');
  state = scope.applySubmenuSelection({ ...state, submenuSelection: factor });
  assert.equal(state.channels[1].voltsPerDivision, factor, '1 V/div at X1 becomes factor V/div');
  const scales = scope.channelVerticalScales(state, scope.verticalScalesPlus);
  assert.ok(Math.abs(scales[0] - .001 * factor) < 1e-12);
  assert.equal(scales.at(-1), 10 * factor);
  assert.equal(scales.indexOf(state.channels[1].voltsPerDivision), 9);
  for (let i = 0; i < 20; i++) state = scope.stepVerticalScale(state, -1, scope.verticalScalesPlus);
  assert.equal(state.channels[1].voltsPerDivision, scales[0]);
  for (let i = 0; i < 20; i++) state = scope.stepVerticalScale(state, 1, scope.verticalScalesPlus);
  assert.equal(state.channels[1].voltsPerDivision, scales.at(-1));
  assert.equal(JSON.stringify(state.channels[2]), second);
  state = scope.applySubmenuSelection({ ...state, submenuSelection: 1 });
  assert.equal(state.channels[1].voltsPerDivision, 10, 'returning to X1 preserves the underlying hardware scale');
}
let oldScope = scope.pressChannel(scope.createState({channels:{1:{voltsPerDivision:1}}}), 1);
oldScope = scope.openSubmenu(oldScope, 'probe');
oldScope = scope.applySubmenuSelection({...oldScope, submenuSelection:10});
assert.equal(oldScope.channels[1].voltsPerDivision, 1, 'DS1102E keeps its existing scale behavior');
assert.equal(scope.formatVerticalScale(.00001), '0.01mV');

'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: { InstrumentLab: {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/oscilloscope.js'), 'utf8'), context);
const scope = context.window.InstrumentLab.oscilloscope;
for (const [name, definition] of Object.entries(scope.submenus)) {
  let state = scope.createState();
  state = definition.target === 'measure' ? scope.openMeasureMenu(state)
    : definition.target === 'cursors' ? scope.pressCursors(state)
    : definition.target === 'trigger' ? scope.openTriggerMenu(state) : scope.pressChannel(state, 1);
  const original = JSON.stringify(scope.submenuTarget(state, definition));
  state = scope.openSubmenu(state, name);
  const start = definition.options.indexOf(state.submenuSelection);
  for (let step = 1; step <= definition.options.length * 2; step++) {
    state = scope.openSubmenu(state, name);
    assert.equal(state.submenuSelection, definition.options[(start + step) % definition.options.length], name);
    assert.equal(JSON.stringify(scope.submenuTarget(state, definition)), original, 'blue key must not commit');
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
console.log('All submenu keys wrap drafts and pages; knob bounds, confirmation and measurements are preserved.');

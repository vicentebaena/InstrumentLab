'use strict';
(() => {
  // Instrument scales never change automatically with the circuit or generator.
  const defaults = { timePerDivision: 200e-6, voltsPerDivision: 0.5 };
  window.InstrumentLab.oscilloscope = {
    defaults,
    horizontalPositionLimit: 5,
    freeRunDivisionsPerSecond: 16,
    submenus: {
      measureTime: { pageSize: 4, pageStarts: [0, 4, 6, 8], target: 'measure', property: 'time', options: ['Period', 'Freq', 'Rise Time', 'Fall Time', '+Width', '-Width', '+Duty', '-Duty', 'DelayRise', 'DelayFall', 'PhaseRise', 'PhaseFall'] },
      measureVoltage: { pageSize: 4, target: 'measure', property: 'voltage', options: ['Vmax', 'Vmin', 'Vpp', 'Vtop', 'Vbase', 'Vamp', 'Vavg', 'Vrms', 'Overshoot', 'Preshoot'] },
      coupling: { property: 'coupling', options: ['DC', 'AC', 'GND'] },
      probe: { property: 'probe', options: [1, 5, 10, 20, 50, 100, 200, 500, 1000] },
      probePlus: { property: 'probe', options: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000] },
      cursorSourcePlus: { target: 'cursors', property: 'source', options: [1, 2, 3, 4] },
      cursorSource: { target: 'cursors', property: 'source', options: [1, 2] },
      triggerSourcePlus: { target: 'trigger', property: 'source', options: [1, 2, 3, 4] },
      triggerSlopePlus: { target: 'trigger', property: 'slope', options: ['rising', 'falling', 'either'] },
      triggerSource: { target: 'trigger', property: 'source', options: [1, 2] },
      triggerSlope: { target: 'trigger', property: 'slope', options: ['rising', 'falling'] }
    },
    timeMeasurementsPlus: ['Period', 'Freq', 'Rise Time', 'Fall Time', '+Width', '-Width', '+Duty', '-Duty', '+Pulses', '-Pulses', '+Edges', '-Edges', 'tVmax', 'tVmin', '+Rate', '-Rate', 'DelayRise', 'DelayFall', 'PhaseRise', 'PhaseFall'],
    voltageMeasurementsPlus: ['Vmax', 'Vmin', 'Vpp', 'Vtop', 'Vbase', 'Vamp', 'Vupper', 'Vmid', 'Vlower', 'Vavg', 'Vrms', 'Overshoot', 'Preshoot', 'Variance', 'Area', 'Per.Area'],
    verticalScales: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
    verticalScalesPlus: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
    horizontalScalesPlus: [5e-9, 1e-8, 2e-8, 5e-8, 1e-7, 2e-7, 5e-7, 1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 1e-1, 2e-1, 5e-1, 1, 2, 5, 10, 20, 50],
    horizontalScales: [10e-6, 20e-6, 50e-6, 100e-6, 200e-6, 500e-6, 1e-3, 2e-3, 5e-3, 10e-3],
    formatTimeScale(value) {
      const labels = ['10.00us', '20.00us', '50.00us', '100.0us', '200.0us', '500.0us', '1.000ms', '2.000ms', '5.000ms', '10.00ms'];
      return labels[this.horizontalScales.indexOf(value)] ?? this.formatCursorValue(value);
    },
    stepHorizontalPosition(state, direction) {
      const current = state.horizontalPositionDivisions ?? 0;
      const next = Math.max(-this.horizontalPositionLimit, Math.min(this.horizontalPositionLimit, Math.round((current + Math.sign(direction) * 0.1) * 10) / 10));
      return next === current ? state : { ...state, horizontalPositionDivisions: next };
    },
    stepHorizontalScale(state, direction, scales = this.horizontalScales) {
      const index = scales.indexOf(state.timePerDivision ?? defaults.timePerDivision);
      const next = Math.max(0, Math.min(scales.length - 1, index + Math.sign(direction)));
      if (index === next) return state;
      return { ...state, timePerDivision: scales[next] };
    },
    formatCursorValue(value, frequency = false) {
      if (!Number.isFinite(value)) return frequency ? '∞Hz' : '∞s';
      const units = frequency ? [[1e9, 'GHz'], [1e6, 'MHz'], [1e3, 'kHz'], [1, 'Hz']]
        : [[1, 's'], [1e-3, 'ms'], [1e-6, 'us'], [1e-9, 'ns']];
      const [factor, unit] = units.find(([factor]) => Math.abs(value) >= factor * (1 - 1e-10)) ?? units[units.length - 1];
      if (value === 0) return frequency ? '0Hz' : '0s';
      return `${(value / factor).toPrecision(3)}${unit}`;
    },
    formatVerticalScale(value) {
      return value < 1 ? `${Math.round(value * 1000)}mV` : `${value.toFixed(2)}V`;
    },
    createState(overrides = {}, channelCount = 2) {
      const state = {
        trigger: { source: 1, level: 0, slope: 'rising', showLevel: false },
        oneKey: { kind: 'voltage', page: 0, measurements: [] },
        measurements: [],
        measure: { source: 1, voltage: 'Vmax', time: 'Period', displayAll: false }, measureEnabled: false, measureMenuOpen: false,
        cursors: { type: 'X', positionYA: 1 / 3, positionYB: 2 / 3, source: 1, selectedA: false, selectedB: false, positionA: 1 / 3, positionB: 2 / 3 }, cursorsEnabled: false, cursorsMenuOpen: false, acquisitionRunning: true, selectedChannel: 1, menuChannel: null, triggerMenuOpen: false, submenu: null, submenuSelection: null, horizontalPositionDivisions: 0, timePerDivision: defaults.timePerDivision,
        channels: { 1: { visible: true, coupling: 'DC', probe: 1, inverted: false, voltsPerDivision: defaults.voltsPerDivision, positionDivisions: 0 }, 2: { visible: true, coupling: 'DC', probe: 1, inverted: false, voltsPerDivision: defaults.voltsPerDivision, positionDivisions: 0 } }
      };
      for (let channel = 3; channel <= channelCount; channel++) {
        state.channels[channel] = { ...state.channels[1], visible: false };
      }
      return { ...state, ...overrides, oneKey: { kind: overrides.oneKey?.kind ?? 'voltage', page: overrides.oneKey?.page ?? 0, measurements: (overrides.oneKey?.measurements ?? []).map(item => ({ ...item })) }, measurements: (overrides.measurements ?? []).map(item => ({ ...item })), measure: { ...state.measure, ...overrides.measure }, cursors: { ...state.cursors, ...overrides.cursors }, trigger: { ...state.trigger, ...overrides.trigger }, channels: Object.fromEntries(Object.entries(state.channels).map(([channel, defaults]) =>
        [channel, { ...defaults, ...overrides.channels?.[channel] }])) };
    },
    hideTriggerLevel(state) {
      return { ...state, trigger: { ...state.trigger, showLevel: false } };
    },
    setTriggerLevel(state, level) {
      if (!Number.isFinite(level)) return state;
      return { ...state, trigger: { ...state.trigger, level: Number(level.toPrecision(12)), showLevel: true } };
    },
    stepTriggerLevel(state, direction) {
      const trigger = state.trigger || { source: 1, level: 0 };
      const scale = state.channels[trigger.source].voltsPerDivision ?? defaults.voltsPerDivision;
      const level = Math.max(-1e6, Math.min(1e6, Number((trigger.level + Math.sign(direction) * scale * 0.1).toPrecision(12))));
      return { ...state, trigger: { ...trigger, level, showLevel: true } };
    },
    createSignals(circuit, parameters, generator, settings, probes = {}) {
      const period = 1 / generator.frequency;
      let mean = { input: 0, output: 0 };
      if ([1, 2].some(channel => settings.channels[channel].coupling === 'AC')) {
        if (circuit.mean) mean = circuit.mean(parameters, generator);
        else for (let i = 0; i < 2048; i++) {
          const point = circuit.sample((i + 0.5) * period / 2048, parameters, generator);
          mean.input += point.input / 2048; mean.output += point.output / 2048;
        }
      }
      const key = channel => channel === 1 ? 'input' : 'output';
      const gain = channel => (settings.channels[channel].inverted ? -1 : 1) * (settings.channels[channel].probe ?? 1) / (probes[channel] ?? 1);
      const transform = (voltage, channel) => settings.channels[channel].coupling === 'GND' ? 0
        : (voltage - (settings.channels[channel].coupling === 'AC' ? (mean[key(channel)] ?? 0) : 0)) * gain(channel);
      const toRaw = (level, channel) => level / gain(channel) + (settings.channels[channel].coupling === 'AC' ? (mean[key(channel)] ?? 0) : 0);
      return {
        transform, toRaw,
        sample: (time, channel) => channel > 2 ? 0 : transform(circuit.sample(time, parameters, generator)[key(channel)], channel),
        range(channel) {
          if (channel > 2 || settings.channels[channel].coupling === 'GND') return [0, 0];
          let bounds = circuit.range?.(parameters, generator)?.[key(channel)];
          if (!bounds) {
            bounds = [Infinity, -Infinity];
            for (let i = 0; i < 2048; i++) {
              const value = circuit.sample(i * period / 2048, parameters, generator)[key(channel)];
              bounds[0] = Math.min(bounds[0], value); bounds[1] = Math.max(bounds[1], value);
            }
          }
          return bounds.map(value => transform(value, channel)).sort((a, b) => a - b);
        }
      };
    },
    analyzeTrigger(circuit, parameters, generator, settings, signals = this.createSignals(circuit, parameters, generator, settings)) {
      const { source, level, slope = 'rising' } = settings.trigger || { source: 1, level: 0 };
      if (slope === 'either') {
        const results = ['rising', 'falling'].map(edge => this.analyzeTrigger(circuit, parameters, generator,
          { ...settings, trigger: { ...settings.trigger, slope: edge } }, signals));
        return results.filter(result => result.locked).sort((a, b) => a.time - b.time)[0] ?? results[0];
      }
      const range = signals.range(source), amplitude = range[1] - range[0];
      const tolerance = Math.max(Math.abs(range[0]), Math.abs(range[1]), amplitude) * 1e-12;
      if (!(amplitude > 0) || level < range[0] - tolerance || level > range[1] + tolerance) return { locked: false, time: 0, range };
      if (circuit.triggerCrossing) {
        const time = circuit.triggerCrossing(parameters, generator, source, signals.toRaw(level, source), settings.channels[source].inverted ? (slope === 'rising' ? 'falling' : 'rising') : slope);
        return { locked: Number.isFinite(time), time: Number.isFinite(time) ? time : 0, range };
      }
      const period = 1 / generator.frequency;
      const polarity = slope === 'falling' ? -1 : 1;
      let previousTime = -period / 4, previous = (signals.sample(previousTime, source) - level) * polarity;
      for (let i = 1; i <= 2048; i++) {
        const time = -period / 4 + i * period / 2048, value = (signals.sample(time, source) - level) * polarity;
        if (previous < 0 && value >= 0) {
          let low = previousTime, high = time;
          for (let j = 0; j < 40; j++) {
            const middle = (low + high) / 2;
            if ((signals.sample(middle, source) - level) * polarity < 0) low = middle; else high = middle;
          }
          return { locked: true, time: (low + high) / 2, range };
        }
        previous = value; previousTime = time;
      }
      return { locked: false, time: 0, range };
    },
    stepVerticalPosition(state, direction) {
      const channel = state.selectedChannel;
      if (!state.channels[channel]?.visible) return state;
      const current = state.channels[channel].positionDivisions ?? 0;
      const next = Math.max(-4, Math.min(4, Math.round((current + Math.sign(direction) * 0.1) * 10) / 10));
      if (next === current) return state;
      return { ...state, channels: { ...state.channels,
        [channel]: { ...state.channels[channel], positionDivisions: next }
      } };
    },
    toggleInvert(state) {
      const channel = state.menuChannel;
      if (channel === null || !state.channels[channel]?.visible) return state;
      return { ...state, submenu: null, submenuSelection: null, channels: { ...state.channels,
        [channel]: { ...state.channels[channel], inverted: !state.channels[channel].inverted }
      } };
    },
    stepVerticalScale(state, direction, scales = this.verticalScales) {
      const channel = state.selectedChannel;
      if (!state.channels[channel].visible) return state;
      const value = state.channels[channel].voltsPerDivision ?? defaults.voltsPerDivision;
      const index = scales.indexOf(value);
      const next = Math.max(0, Math.min(scales.length - 1, index + Math.sign(direction)));
      if (next === index) return state;
      return { ...state, channels: { ...state.channels,
        [channel]: { ...state.channels[channel], voltsPerDivision: scales[next] }
      } };
    },
    submenuPage(options, selection, pageSize = 4, currentStart = null, pageStarts = null) {
      const index = Math.max(0, options.indexOf(selection));
      const starts = pageStarts ?? [...new Set(Array.from({ length: Math.ceil(options.length / pageSize) }, (_, page) => Math.min(page * pageSize, Math.max(0, options.length - pageSize))))];
      let page = starts.indexOf(currentStart);
      if (page < 0) page = Math.min(Math.floor(index / pageSize), starts.length - 1);
      while (page > 0 && index < starts[page]) page--;
      while (page < starts.length - 1 && index >= starts[page] + pageSize) page++;
      const start = starts[page] ?? 0;
      return { start, values: options.slice(start, start + pageSize), previous: page > 0, next: page < starts.length - 1 };
    },
    submenuActive(state, definition) {
      return definition.target === 'trigger' ? Boolean(state.triggerMenuOpen)
        : definition.target === 'cursors' ? Boolean(state.cursorsMenuOpen)
        : definition.target === 'measure' ? Boolean(state.measureMenuOpen) : state.menuChannel !== null;
    },
    submenuTarget(state, definition) {
      return definition.target === 'trigger' ? state.trigger
        : definition.target === 'cursors' ? state.cursors
        : definition.target === 'measure' ? state.measure : state.channels[state.menuChannel ?? state.selectedChannel];
    },
    openSubmenu(state, name) {
      const definition = this.submenus[name];
      if (!definition) throw new RangeError('Unknown oscilloscope submenu.');
      if (!this.submenuActive(state, definition)) return state;
      // Repeating the owning blue key advances the draft and wraps; the knob clamps.
      if (state.submenu === name) return this.stepSubmenu(state, 1, true);
      const target = this.submenuTarget(state, definition);
      return { ...state, submenu: name, submenuSelection: target[definition.property],
        submenuPageStart: definition.pageSize ? this.submenuPage(definition.options, target[definition.property], definition.pageSize, null, definition.pageStarts).start : null };
    },
    stepSubmenu(state, direction, wrap = false) {
      const definition = this.submenus[state.submenu];
      if (!definition || !this.submenuActive(state, definition)) return state;
      const index = definition.options.indexOf(state.submenuSelection);
      const offset = index + Math.sign(direction);
      const next = wrap ? (offset + definition.options.length) % definition.options.length
        : Math.max(0, Math.min(definition.options.length - 1, offset));
      return { ...state, submenuSelection: definition.options[next],
        submenuPageStart: definition.pageSize ? this.submenuPage(definition.options, definition.options[next], definition.pageSize, state.submenuPageStart, definition.pageStarts).start : null };
    },
    confirmSubmenu(state) {
      const definition = this.submenus[state.submenu];
      if (!definition || !this.submenuActive(state, definition) || !definition.options.includes(state.submenuSelection)) return state;
      if (definition.target === 'measure') {
        const entry = { channel: state.measure.source, parameter: state.submenuSelection };
        const measurements = [...state.measurements.filter(item => item.channel !== entry.channel || item.parameter !== entry.parameter), entry].slice(-3);
        return { ...state, submenu: null, submenuSelection: null, measurements, measure: { ...state.measure, [definition.property]: state.submenuSelection } };
      }
      if (definition.target === 'cursors') return { ...state, submenu: null, submenuSelection: null, cursors: { ...state.cursors, [definition.property]: state.submenuSelection } };
      if (definition.target === 'trigger') return { ...state, submenu: null, submenuSelection: null, trigger: { ...state.trigger, [definition.property]: state.submenuSelection } };
      const channel = state.menuChannel;
      return { ...state, submenu: null, submenuSelection: null, channels: { ...state.channels,
        [channel]: { ...state.channels[channel], [definition.property]: state.submenuSelection }
      } };
    },
    canMoveCursors(state, allowHidden = false) {
      return Boolean(state.cursorsEnabled && state.cursorsMenuOpen && (allowHidden || state.channels[state.cursors.source]?.visible) && (state.cursors.selectedA || state.cursors.selectedB));
    },
    canStepSelection(state) {
      const definition = this.submenus[state.submenu];
      return state.submenu !== null ? Boolean(definition && this.submenuActive(state, definition)) : this.canMoveCursors(state);
    },
    stepSelection(state, direction, { allowHiddenCursors = false } = {}) {
      // An open submenu always owns the knob, even at the end of its list.
      if (state.submenu !== null) return this.stepSubmenu(state, direction);
      if (!this.canMoveCursors(state, allowHiddenCursors)) return state;
      const keys = ['A', 'B'].filter(cursor => state.cursors[`selected${cursor}`]).map(cursor => `position${state.cursors.type === 'Y' ? 'Y' : ''}${cursor}`);
      const delta = Math.max(-Math.min(...keys.map(key => state.cursors[key])),
        Math.min(1 - Math.max(...keys.map(key => state.cursors[key])), Math.sign(direction) * (state.cursors.type === 'Y' ? -1 : 1) / 120));
      const cursors = { ...state.cursors };
      for (const key of keys) cursors[key] += delta;
      return { ...state, cursors };
    },
    toggleCursorType(state) {
      if (!state.cursorsMenuOpen) return state;
      return { ...state, submenu: null, submenuSelection: null,
        cursors: { ...state.cursors, type: state.cursors.type === 'Y' ? 'X' : 'Y' } };
    },
    selectCursorGroup(state, group) {
      if (!['A', 'B', 'AB'].includes(group) || !state.cursorsMenuOpen || !state.cursorsEnabled) return state;
      return { ...state, submenu: null, submenuSelection: null, cursors: { ...state.cursors,
        selectedA: group !== 'B', selectedB: group !== 'A' } };
    },
    cursorReadings(state, horizontalDivisions = 12) {
      const cursors = state.cursors, channel = state.channels[cursors.source];
      const x = position => ((position - .5) * horizontalDivisions - state.horizontalPositionDivisions) * state.timePerDivision;
      const y = position => (4 - channel.positionDivisions - position * 8) * channel.voltsPerDivision;
      const AX = x(cursors.positionA), BX = x(cursors.positionB), AY = y(cursors.positionYA), BY = y(cursors.positionYB);
      return { AX, AY, BX, BY, deltaX: BX - AX, deltaY: AY - BY, inverseDeltaX: 1 / Math.abs(BX - AX) };
    },
    renderManualCursors(state, { left, top, width, height }, horizontalDivisions) {
      const c = state.cursors, readings = this.cursorReadings(state, horizontalDivisions);
      const rows = [['AX', this.formatCursorValue(readings.AX)], ['AY', this.formatMeasurement(readings.AY)],
        ['BX', this.formatCursorValue(readings.BX)], ['BY', this.formatMeasurement(readings.BY)],
        ['BX-AX', this.formatCursorValue(readings.deltaX)], ['AY-BY', this.formatMeasurement(readings.deltaY)],
        ['1/|dX|', this.formatCursorValue(readings.inverseDeltaX, true)]];
      return `<g data-cursors="XY" data-cursor-source="${c.source}" fill="none" stroke="#9cdfff" stroke-width="1.5">
        ${['A','B'].map(cursor => `<line data-cursor="X${cursor}" x1="${left + width * c[`position${cursor}`]}" x2="${left + width * c[`position${cursor}`]}" y1="${top}" y2="${top + height}"${cursor === 'B' ? ' stroke-dasharray="6 4"' : ''}/><line data-cursor="Y${cursor}" x1="${left}" x2="${left + width}" y1="${top + height * c[`positionY${cursor}`]}" y2="${top + height * c[`positionY${cursor}`]}"${cursor === 'B' ? ' stroke-dasharray="6 4"' : ''}/>`).join('')}
        <g data-cursor-readings="true" transform="translate(${left + 6} ${top + 6})" font-family="Arial,sans-serif" font-size="13" font-weight="700" stroke="none" fill="#a8dcff"><rect width="164" height="114" rx="2" fill="#102744" fill-opacity=".94"/>
          ${rows.map(([label,value], index) => `<text data-cursor-reading="${label}" x="5" y="${15 + index * 16}">${label}: ${value}</text>`).join('')}
        </g></g>`;
    },
    toggleCursorSelection(state, cursor) {
      if (!['A', 'B'].includes(cursor) || !state.cursorsMenuOpen || !state.cursorsEnabled) return state;
      const property = `selected${cursor}`;
      return { ...state, cursors: { ...state.cursors, [property]: !state.cursors[property] } };
    },
    pressMeasure(state) {
      const enabled = !(state.measureEnabled && state.measureMenuOpen);
      return { ...this.openMeasureMenu(state), measureEnabled: enabled, measureMenuOpen: enabled };
    },
    openMeasureMenu(state) {
      return { ...state, measureMenuOpen: true, menuChannel: null, triggerMenuOpen: false,
        cursorsMenuOpen: false, submenu: null, submenuSelection: null };
    },
    clearMeasurements(state) {
      if (!state.measureMenuOpen) return state;
      return { ...state, measurements: [] };
    },
    toggleDisplayAll(state) {
      if (!state.measureMenuOpen) return state;
      return { ...state, measure: { ...state.measure, displayAll: !state.measure.displayAll } };
    },
    toggleMeasureSource(state) {
      if (!state.measureMenuOpen) return state;
      return { ...state, measure: { ...state.measure, source: state.measure.source === 1 ? 2 : 1 } };
    },
    pressCursors(state) {
      const enabled = !(state.cursorsEnabled && state.cursorsMenuOpen);
      return { ...state, cursorsEnabled: enabled, cursorsMenuOpen: enabled, measureMenuOpen: false,
        cursors: enabled ? state.cursors : { ...state.cursors, selectedA: false, selectedB: false },
        menuChannel: null, triggerMenuOpen: false, submenu: null, submenuSelection: null };
    },
    openTriggerMenu(state) {
      return { ...state, triggerMenuOpen: true, measureMenuOpen: false, cursorsMenuOpen: false, menuChannel: null, submenu: null, submenuSelection: null };
    },
    toggleChannelMenu(state) {
      return { ...state, menuChannel: state.measureMenuOpen || state.cursorsMenuOpen || state.triggerMenuOpen || state.menuChannel !== null ? null : state.selectedChannel, measureMenuOpen: false, cursorsMenuOpen: false, triggerMenuOpen: false, submenu: null, submenuSelection: null };
    },
    pressChannel(state, channel) {
      if (!Number.isInteger(channel) || !Object.hasOwn(state.channels, channel)) throw new RangeError('Unknown oscilloscope channel.');
      const hide = state.menuChannel === channel && state.selectedChannel === channel && state.channels[channel].visible;
      return {
        ...state, selectedChannel: channel, menuChannel: hide ? null : channel, measureMenuOpen: false, cursorsMenuOpen: false, triggerMenuOpen: false, submenu: null, submenuSelection: null,
        channels: { ...state.channels, [channel]: { ...state.channels[channel], visible: !hide } }
      };
    },
    oneKeyParameters(state) {
      return state.oneKey.kind === 'time' ? this.timeMeasurementsPlus : this.voltageMeasurementsPlus;
    },
    toggleOneKeyType(state) {
      return { ...state, oneKey: { ...state.oneKey, kind: state.oneKey.kind === 'time' ? 'voltage' : 'time', page: 0 } };
    },
    stepOneKeyPage(state, direction) {
      const page = Math.max(0, Math.min(Math.ceil(this.oneKeyParameters(state).length / 6) - 1, state.oneKey.page + Math.sign(direction)));
      return page === state.oneKey.page ? state : { ...state, oneKey: { ...state.oneKey, page } };
    },
    addOneKeyMeasurement(state, slot) {
      const parameter = Number.isInteger(slot) && slot >= 0 && slot < 6 ? this.oneKeyParameters(state)[state.oneKey.page * 6 + slot] : null;
      if (!parameter) return state;
      const channel = state.selectedChannel;
      const measurements = [...state.oneKey.measurements.filter(item => item.channel !== channel || item.parameter !== parameter), { channel, parameter }].slice(-5);
      return { ...state, oneKey: { ...state.oneKey, measurements } };
    },
    voltageStatistics(circuit, parameters, generator, settings, probes, start, duration, channel) {
      if (!settings.channels[channel]?.visible || duration * generator.frequency > 128) return null;
      const signals = this.createSignals(circuit, parameters, generator, settings, probes);
      const count = 4096, dt = duration / count;
      const values = Array.from({ length: count }, (_, i) => signals.sample(start + (i + 0.5) * dt, channel));
      const min = Math.min(...values), max = Math.max(...values), span = max - min;
      const scale = settings.channels[channel].voltsPerDivision ?? defaults.voltsPerDivision;
      const position = settings.channels[channel].positionDivisions ?? 0;
      const tolerance = scale * 1e-5;
      if (![min, max].every(Number.isFinite) || max > (4 - position) * scale + tolerance || min < (-4 - position) * scale - tolerance) return null;
      const average = values.reduce((sum, value) => sum + value, 0) / count;
      const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / count);
      const result = { Vmax: max, Vmin: min, tVmax: start + (values.indexOf(max) + .5) * dt, tVmin: start + (values.indexOf(min) + .5) * dt, Vpp: span, Vavg: average, Vrms: rms, Variance: values.reduce((sum, value) => sum + (value - average) ** 2, 0) / count };
      // Only infer top/base where a sustained flat region is visible. The manual
      // defines these as flat pulse levels, not as arbitrary waveform extrema.
      if (span > 1e-12) {
        const high = [], low = [];
        for (let i = 1; i < count - 1; i++) {
          const slope = Math.abs(values[i + 1] - values[i - 1]) / (2 * dt);
          if (slope <= span * generator.frequency * 0.02) {
            if (values[i] > min + span * 0.75) high.push(values[i]);
            if (values[i] < min + span * 0.25) low.push(values[i]);
          }
        }
        if (high.length >= count * 0.05 && low.length >= count * 0.05) {
          const top = high.reduce((a, b) => a + b, 0) / high.length;
          const base = low.reduce((a, b) => a + b, 0) / low.length;
          const amplitude = top - base;
          Object.assign(result, { Vtop: top, Vbase: base, Vamp: amplitude, Vupper: base + .9 * amplitude, Vmid: base + .5 * amplitude, Vlower: base + .1 * amplitude,
            Overshoot: 100 * (max - top) / amplitude, Preshoot: 100 * (min - base) / amplitude });
        }
      }
      result.Area = average * duration;
      const period = 1 / generator.frequency;
      if (duration < period * (1 - 1e-10)) result['Per.Area'] = 0;
      else if (channel > 2) result['Per.Area'] = 0;
      else if (circuit.mean) result['Per.Area'] = signals.transform(circuit.mean(parameters, generator)[channel === 1 ? 'input' : 'output'], channel) * period;
      else result['Per.Area'] = Array.from({length:count}, (_,i) => signals.sample(start + (i + .5) * period / count, channel)).reduce((sum,value) => sum + value, 0) / count * period;
      return result;
    },
    timeStatistics(circuit, parameters, generator, settings, probes, start, duration, channel, voltage) {
      if (!voltage || voltage.Vpp <= 1e-12) return null;
      const signals = this.createSignals(circuit, parameters, generator, settings, probes);
      const sample = time => signals.sample(time, channel), count = 4096;
      const levels = [0.1, 0.5, 0.9].map(fraction => voltage.Vmin + voltage.Vpp * fraction);
      const up = [[], [], []], down = [[], [], []];
      let previous = sample(start), positiveCount = 0, negativeCount = 0;
      let positiveArmed = previous <= levels[0], negativeArmed = previous >= levels[2];
      for (let i = 1; i <= count; i++) {
        const time = start + duration * i / count, value = sample(time);
        for (let j = 0; j < levels.length; j++) {
          const level = levels[j], rising = previous < level && value >= level, falling = previous > level && value <= level;
          if (!rising && !falling) continue;
          let a = time - duration / count, b = time;
          for (let k = 0; k < 35; k++) {
            const middle = (a + b) / 2;
            if (rising ? sample(middle) < level : sample(middle) > level) a = middle; else b = middle;
          }
          (rising ? up[j] : down[j]).push((a + b) / 2);
        }
        if (value <= levels[0]) positiveArmed = true;
        if (value >= levels[2]) negativeArmed = true;
        if (positiveArmed && value >= levels[2]) { positiveCount++; positiveArmed = false; }
        if (negativeArmed && value <= levels[0]) { negativeCount++; negativeArmed = false; }
        previous = value;
      }
      const interval = edges => edges.length >= 2 ? edges[1] - edges[0] : undefined;
      const period = interval(up[1]) ?? interval(down[1]);
      const between = (first, second) => {
        for (const a of first) {
          const b = second.find(time => time >= a - duration * 1e-12);
          if (b !== undefined) return Math.max(0, b - a) < duration * 1e-10 ? 0 : b - a;
        }
      };
      const positive = between(up[1], down[1]), negative = between(down[1], up[1]);
      const rise = between(up[0], up[2]), fall = between(down[2], down[0]);
      return { tVmax: voltage.tVmax - (start + duration / 2 + (settings.horizontalPositionDivisions ?? 0) * settings.timePerDivision),
        tVmin: voltage.tVmin - (start + duration / 2 + (settings.horizontalPositionDivisions ?? 0) * settings.timePerDivision), Period: period, Freq: period > 0 ? 1 / period : undefined,
        'Rise Time': rise, 'Fall Time': fall,
        '+Pulses': positiveCount, '-Pulses': negativeCount, '+Edges': positiveCount, '-Edges': negativeCount,
        '+Rate': rise > 0 ? .8 * voltage.Vpp / rise : undefined, '-Rate': fall > 0 ? -.8 * voltage.Vpp / fall : undefined,
        '+Width': positive, '-Width': negative,
        '+Duty': period > 0 && positive !== undefined ? positive / period * 100 : undefined,
        '-Duty': period > 0 && negative !== undefined ? negative / period * 100 : undefined,
        rising: up[1], falling: down[1] };
    },
    channelDelay(first, second, falling = false, phase = false) {
      if (!first || !second) return undefined;
      const edge = falling ? 'falling' : 'rising';
      if (!first[edge].length || !second[edge].length) return undefined;
      const origin = first[edge][0];
      const target = second[edge].reduce((best, time) => Math.abs(time - origin) < Math.abs(best - origin) ? time : best);
      const delay = target - origin;
      return phase ? first.Period > 0 ? delay / first.Period * 360 : undefined : delay;
    },
    timeMeasurementLabel(name) {
      return { DelayRise: 'Delay1→2↑', DelayFall: 'Delay1→2↓', PhaseRise: 'Phas1→2↑', PhaseFall: 'Phas1→2↓' }[name] ?? name;
    },
    formatTimeMeasurement(value, name) {
      if (!Number.isFinite(value)) return '*****';
      if (['+Pulses','-Pulses','+Edges','-Edges'].includes(name)) return String(Math.round(value));
      if (name === '+Rate' || name === '-Rate') {
        const [factor,unit] = Math.abs(value) >= 1e9 ? [1e9,'GV/s'] : Math.abs(value) >= 1e6 ? [1e6,'MV/s'] : Math.abs(value) >= 1e3 ? [1e3,'kV/s'] : [1,'V/s'];
        return `${(value/factor).toPrecision(3)}${unit}`;
      }
      if (name.includes('Duty')) return `${value.toFixed(2)}%`;
      if (name.startsWith('Phase')) return `${value.toFixed(2)}°`;
      return this.formatCursorValue(value, name === 'Freq');
    },
    formatVoltageMeasurement(value, parameter) {
      if (parameter === 'Area' || parameter === 'Per.Area') {
        if (!Number.isFinite(value)) return '*****';
        const magnitude = Math.abs(value), [factor,unit] = magnitude >= 1 || value === 0 ? [1,'Vs'] : magnitude >= 1e-3 ? [1e-3,'mVs'] : magnitude >= 1e-6 ? [1e-6,'uVs'] : [1e-9,'nVs'];
        return `${(value / factor).toPrecision(3)}${unit}`;
      }
      if (parameter !== 'Variance') return this.formatMeasurement(value, ['Overshoot','Preshoot'].includes(parameter));
      if (!Number.isFinite(value)) return '*****';
      const [factor, unit] = Math.abs(value) >= 1 || value === 0 ? [1, 'V²'] : Math.abs(value) >= 1e-6 ? [1e-6, 'mV²'] : [1e-12, 'uV²'];
      return `${(value / factor).toPrecision(3)}${unit}`;
    },
    formatMeasurement(value, percentage = false) {
      if (!Number.isFinite(value)) return '*****';
      if (Math.abs(value) < 1e-12) value = 0;
      if (percentage) return `${value.toFixed(2)}%`;
      const magnitude = Math.abs(value);
      const [factor, unit] = magnitude >= 1 ? [1, 'V'] : magnitude >= 1e-3 ? [1e-3, 'mV'] : magnitude > 0 ? [1e-6, 'uV'] : [1, 'V'];
      return `${(value / factor).toPrecision(3)}${unit}`;
    },
    render(circuit, parameters, generator, t, format, idPrefix = 'scope', horizontalDivisions = 10, scopeState = null, presentation = {}) {
      const settings = scopeState || this.createState();
      const scale = channel => settings.channels[channel].voltsPerDivision ?? defaults.voltsPerDivision;
      const show1 = settings.channels[1].visible, show2 = settings.channels[2].visible;
      const instrumentFooter = presentation.footerScales ?? false;
      const left = presentation.plotGeometry?.left ?? 36, top = presentation.plotGeometry?.top ?? 44;
      const width = presentation.plotGeometry?.width ?? (presentation.cellWidth ?? 56.8) * horizontalDivisions;
      const height = presentation.plotGeometry?.height ?? 320;
      const viewWidth = presentation.plotGeometry?.viewWidth ?? width + 2 * left;
      const channelNumbers = presentation.channelNumbers ?? [1, 2];
      const channelColor = channel => presentation.channelColors?.[channel] ?? (channel === 1 ? '#f4d35e' : '#6ecbff');
      const timePerDivision = settings.timePerDivision ?? defaults.timePerDivision;
      const timeScaleLabel = this.formatTimeScale(timePerDivision);
      const timeLabel = instrumentFooter ? `Time ${timeScaleLabel}` : `H ${timeScaleLabel}/div`;
      const duration = horizontalDivisions * timePerDivision;
      const period = 1 / generator.frequency;
      const activeSignals = [1, 2].some(channel => settings.channels[channel].visible && settings.channels[channel].coupling !== 'GND');
      const dense = activeSignals && generator.output1Enabled !== false && duration * generator.frequency > width / 4;
      // Positive position shifts the common time reference and both traces to the right.
      const signals = this.createSignals(circuit, parameters, generator, settings, presentation.probes);
      const acquisition = presentation.triggerAnalysis ?? this.analyzeTrigger(circuit, parameters, generator, settings, signals);
      const horizontalPosition = Math.max(-this.horizontalPositionLimit, Math.min(this.horizontalPositionLimit, settings.horizontalPositionDivisions ?? 0));
      const start = acquisition.time - duration / 2 - horizontalPosition * timePerDivision + (acquisition.locked ? 0 : presentation.freeRunTime ?? 0);
      const timeZeroX = left + width / 2 + horizontalPosition * (presentation.cellWidth ?? 56.8);
      const times = new Set(Array.from({ length: 1201 }, (_, i) => start + duration * i / 1200));
      // Include each side of every square-wave edge, and resolve fast RC responses.
      const half = period / 2;
      const tau = circuit.characteristics(parameters).tau;
      for (let k = Math.floor(start / half); !dense && activeSignals && generator.output1Enabled !== false && generator.waveform === 'square' && k <= Math.ceil((start + duration) / half); k++) {
        const edge = k * half;
        for (const dt of [-period * 1e-10, 0, period * 1e-10, ...[0.02, 0.1, 0.25, 0.5, 1, 2, 4, 8].map(v => v * tau)]) {
          const time = edge + dt;
          if (time >= start && time <= start + duration) times.add(time);
        }
      }
      const samples = dense || !activeSignals ? [] : [...times].sort((a, b) => a - b).map(time => ({ time, ...circuit.sample(time, parameters, generator) }));
      const x = time => left + (time - start) / duration * width;
      const zeroY = channel => top + height / 2 - (settings.channels[channel].positionDivisions ?? 0) * height / 8;
      const y = (voltage, channel) => zeroY(channel) - signals.transform(voltage, channel) / scale(channel) * height / 8;
      const levelY = settings.trigger ? zeroY(settings.trigger.source) - settings.trigger.level / scale(settings.trigger.source) * height / 8 : top + height / 2;
      const triggerLabel = settings.trigger ? `TRIG LVL= ${settings.trigger.level.toFixed(Math.abs(settings.trigger.level) > 0 && Math.abs(settings.trigger.level) < 0.01 ? 3 : 2)}V` : '';
      const levelMarkerY = Math.max(top, Math.min(top + height, levelY));
      const trace = key => samples.map((sample, i) => `${i ? 'L' : 'M'}${x(sample.time).toFixed(3)},${y(sample[key], key === 'input' ? 1 : 2).toFixed(3)}`).join(' ');
      // At unresolved frequencies show the actual range, not a false aliased trace.
      function band(peak, color, channel) {
        const bounds = [y(generator.offset + peak, channel), y(generator.offset - peak, channel)].sort((a, b) => a - b);
        const upper = Math.max(top, Math.min(top + height, bounds[0]));
        const lower = Math.max(top, Math.min(top + height, bounds[1]));
        if (bounds[0] > top + height || bounds[1] < top) return '';
        return `<rect x="${left}" y="${upper}" width="${width}" height="${Math.max(1, lower - upper)}" fill="${color}" fill-opacity="0.3" data-trace-channel="${channel}"/>`;
      }
      const channelTrace = channel => {
        if (!settings.channels[channel].visible) return '';
        const color = channelColor(channel);
        // The RC practice wires only CH1/CH2. Extra, unconnected channels stay at 0 V.
        if (channel > 2 || settings.channels[channel].coupling === 'GND') return `<path d="M${left} ${zeroY(channel)}H${left + width}" stroke="${color}" data-trace-channel="${channel}"/>`;
        if (!dense) return `<path d="${trace(channel === 1 ? 'input' : 'output')}" stroke="${color}" data-trace-channel="${channel}"/>`;
        const peak = generator.amplitudeVpp / 2 * (channel === 1 ? 1 : generator.waveform === 'sine'
          ? 1 / Math.hypot(1, 2 * Math.PI * generator.frequency * tau) : Math.tanh(period / (4 * tau)));
        return band(peak, color, channel);
      };
      const traces = channelNumbers.map(channelTrace).join('');
      const channelScale = (channel, position) => {
        const visible = settings.channels[channel].visible;
        const color = visible ? (channel === 1 ? '#f4d35e' : '#6ecbff') : '#526066';
        const selected = visible && settings.selectedChannel === channel;
        const value = this.formatVerticalScale(scale(channel));
        return `<g aria-label="CH${channel} ${value}">
          ${selected ? `<rect x="${position}" y="380" width="50" height="27" rx="2" fill="${color}"/>` : ''}
          <text x="${position + 25}" y="400" text-anchor="middle" fill="${selected ? '#030709' : color}">CH${channel}</text>
          <text x="${position + 56}" y="400" fill="${color}">${value}</text>
        </g>`;
      }
      // Draw the selected channel last, so its ground marker wins any overlap.
      const groundMarker = channel => {
        if (!settings.channels[channel].visible) return '';
        const color = channelColor(channel);
        const x = left - 18, y0 = zeroY(channel);
        return `<g data-ground-channel="${channel}" aria-label="CH${channel} 0 V" transform="translate(${x} ${y0})">
          <path d="M0 -10h9l7 10-7 10H0z" fill="${color}"/>
          <text x="6" y="4" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#030709">${channel}</text>
        </g>`;
      };
      const timeZeroMarker = `<path data-time-zero="true" d="M${timeZeroX - 6} ${top - 20}h12v11l-6 8-6-8z" fill="#ff9e3d"/><text data-time-zero-label="true" x="${timeZeroX}" y="${top - 10}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#030709">T</text>`;
      const manualCursors = presentation.cursorAxes === 'both' && presentation.showCursors !== false && settings.cursorsEnabled
        ? this.renderManualCursors(settings, { left, top, width, height }, horizontalDivisions) : '';
      if (presentation.traceLayerOnly) {
        const clip = `${idPrefix}TraceClip`;
        const oneKeyStatistics = {};
        const oneKeyTime = channel => {
          if (!(channel in oneKeyStatistics)) oneKeyStatistics[channel] = { voltage: channel > 2 || generator.output1Enabled === false ? null
            : this.voltageStatistics(circuit, parameters, generator, settings, presentation.probes, start, duration, channel) };
          const statistics = oneKeyStatistics[channel];
          if (!('time' in statistics)) statistics.time = this.timeStatistics(circuit, parameters, generator, settings, presentation.probes, start, duration, channel, statistics.voltage);
          return statistics.time;
        };
        const oneKeyReadings = !presentation.oneKeyMeasurements ? '' : `<g data-one-key-results="true" font-family="Arial,sans-serif" font-size="13" font-weight="700">${settings.oneKey.measurements.map((item, index) => {
          const temporal = this.timeMeasurementsPlus.includes(item.parameter), cross = item.parameter.startsWith('Delay') || item.parameter.startsWith('Phase');
          let value;
          if (cross) value = this.formatTimeMeasurement(this.channelDelay(oneKeyTime(1), oneKeyTime(2), item.parameter.endsWith('Fall'), item.parameter.startsWith('Phase')), item.parameter);
          else if (temporal) value = this.formatTimeMeasurement(oneKeyTime(item.channel)?.[item.parameter], item.parameter);
          else {
            if (!(item.channel in oneKeyStatistics)) oneKeyStatistics[item.channel] = { voltage: item.channel > 2 || generator.output1Enabled === false ? null
              : this.voltageStatistics(circuit, parameters, generator, settings, presentation.probes, start, duration, item.channel) };
            value = this.formatVoltageMeasurement(oneKeyStatistics[item.channel].voltage?.[item.parameter], item.parameter);
          }
          const text = `${this.timeMeasurementLabel(item.parameter)}=${value}`, slot = width / 5;
          return `<text data-one-key-parameter="${item.parameter}" data-one-key-channel="${item.channel}" x="${left + index * slot + 2}" y="${top + height + 17}" fill="${channelColor(item.channel)}" textLength="${Math.min(slot - 5, text.length * 7)}" lengthAdjust="spacingAndGlyphs">${text}</text>`;
        }).join('')}</g>`;
        const levelOverlay = !presentation.persistentTriggerMarker ? '' : `<g data-trigger-level="${settings.trigger.level}" fill="#ff9e3d">
          ${settings.trigger.showLevel && levelY >= top && levelY <= top + height ? `<line data-trigger-level-line="true" x1="${left}" x2="${left + width}" y1="${levelY}" y2="${levelY}" stroke="#ff9e3d" stroke-width="1.5" stroke-dasharray="6 4"/>` : ''}
          <g data-trigger-marker="true" transform="translate(${left + width + 20} ${levelMarkerY})"><path d="M0 -7h-10l-8 7 8 7H0Z"/><text x="-7" y="4" text-anchor="middle" fill="#030709" font-family="Arial,sans-serif" font-size="11" font-weight="700">T</text></g>
          ${settings.trigger.showLevel ? `<text data-trigger-readout="true" x="${left + 4}" y="${top + height - 8}" font-family="Arial,sans-serif" font-size="15">${triggerLabel}</text>` : ''}
        </g>`;
        const order = [...channelNumbers.filter(channel => channel !== settings.selectedChannel), settings.selectedChannel].filter(channel => channelNumbers.includes(channel));
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${presentation.plotGeometry?.viewHeight ?? 420}" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="${clip}"><rect x="${left}" y="${top}" width="${width}" height="${height}"/></clipPath></defs><g fill="none" clip-path="url(#${clip})" stroke-width="2" stroke-linejoin="round">${traces}</g>${order.map(groundMarker).join('')}${timeZeroMarker}${manualCursors}${levelOverlay}${oneKeyReadings}</svg>`;
      }
      const cursorSource = settings.cursors?.source ?? 1;
      const showCursors = presentation.showCursors !== false && settings.cursorsEnabled && settings.channels[cursorSource]?.visible;
      const cursorType = settings.cursors?.type === 'Y' ? 'Y' : 'X';
      const cursorPositions = cursorType === 'Y'
        ? [settings.cursors?.positionYA ?? 1 / 3, settings.cursors?.positionYB ?? 2 / 3]
        : [settings.cursors?.positionA ?? 1 / 3, settings.cursors?.positionB ?? 2 / 3];
      const cursorVoltages = cursorPositions.map(fraction => (zeroY(cursorSource) - (top + fraction * height)) / height * 8 * scale(cursorSource));
      const voltageText = value => value === 0 ? '0V' : `${(Math.abs(value) >= 1 ? value : value * 1000).toPrecision(3)}${Math.abs(value) >= 1 ? 'V' : 'mV'}`;
      const cursorTimes = cursorPositions.map(fraction => ((fraction - 0.5) * horizontalDivisions - horizontalPosition) * timePerDivision);
      const cursorDelta = Math.abs(cursorTimes[1] - cursorTimes[0]);
      const cursorReadoutWidth = Math.min(160, width / 2);
      const cursorReadoutX = viewWidth * (1 - (presentation.menuWidthRatio ?? 0)) - 8 - cursorReadoutWidth;
      const cursorReadings = cursorType === 'Y' ? [
        `CurA:${voltageText(cursorVoltages[0])}`,
        `CurB:${voltageText(cursorVoltages[1])}`,
        `|ΔY|:${voltageText(Math.abs(cursorVoltages[1] - cursorVoltages[0]))}`
      ] : [
        `CurA:${this.formatCursorValue(cursorTimes[0])}`,
        `CurB:${this.formatCursorValue(cursorTimes[1])}`,
        `|ΔX|:${this.formatCursorValue(cursorDelta)}`,
        `|1/ΔX|:${this.formatCursorValue(1 / cursorDelta, true)}`
      ];
      const cursors = !showCursors ? '' : `<g data-cursors="${cursorType}" data-cursor-source="${cursorSource}">
        ${cursorPositions.map((fraction, index) => `<line data-cursor="${index === 0 ? 'A' : 'B'}" ${cursorType === 'Y' ? `x1="${left}" x2="${left + width}" y1="${top + height * fraction}" y2="${top + height * fraction}"` : `x1="${left + width * fraction}" x2="${left + width * fraction}" y1="${top}" y2="${top + height}"`} stroke="${index === 0 ? '#ffffff' : '#f4d35e'}" stroke-width="1.5" stroke-dasharray="6 5"/>`).join('')}
        <g data-cursor-readings="true" font-family="monospace" font-size="14" font-weight="700" fill="#eef5ff">
          ${cursorReadings.map((reading, index) => `<g><rect x="${cursorReadoutX}" y="${top + 5 + index * 18}" width="${cursorReadoutWidth}" height="18" rx="3" fill="#102744" stroke="#4388ff" stroke-width="1"/><text x="${cursorReadoutX + 5}" y="${top + 19 + index * 18}">${reading}</text></g>`).join('')}
        </g>
      </g>`;
      const statistics = {}, timing = {};
      const voltageFor = channel => {
        if (!(channel in statistics)) statistics[channel] = this.voltageStatistics(circuit, parameters, generator, settings, presentation.probes, start, duration, channel);
        return statistics[channel];
      };
      const timeFor = channel => {
        if (!(channel in timing)) timing[channel] = this.timeStatistics(circuit, parameters, generator, settings, presentation.probes, start, duration, channel, voltageFor(channel));
        return timing[channel];
      };
      const resultText = (parameter, channel) => {
        const isTime = this.submenus.measureTime.options.includes(parameter);
        const crossChannel = parameter.startsWith('Delay') || parameter.startsWith('Phase');
        const value = crossChannel ? this.channelDelay(timeFor(1), timeFor(2), parameter.endsWith('Fall'), parameter.startsWith('Phase'))
          : isTime ? timeFor(channel)?.[parameter] : voltageFor(channel)?.[parameter];
        return isTime ? this.formatTimeMeasurement(value, parameter) : this.formatMeasurement(value, ['Overshoot', 'Preshoot'].includes(parameter));
      };
      const measurementRight = presentation.showMenus !== false && (settings.menuChannel !== null || settings.triggerMenuOpen || settings.cursorsMenuOpen || settings.measureMenuOpen)
        ? Math.min(left + width, viewWidth * (1 - (presentation.menuWidthRatio ?? 0))) : left + width;
      const measurementSlot = (measurementRight - left) / 3;
      const measurementMarkup = (settings.measurements ?? []).map((item, index) => {
        const formatted = resultText(item.parameter, item.channel);
        const text = `${this.timeMeasurementLabel(item.parameter)}(${item.channel})=${formatted}`;
        return `<text data-measurement="${item.parameter}" data-measurement-channel="${item.channel}" x="${left + index * measurementSlot + 2}" y="358" fill="${item.channel === 1 ? '#f4d35e' : '#6ecbff'}" textLength="${Math.min(measurementSlot - 6, text.length * 9.6)}" lengthAdjust="spacingAndGlyphs">${text}</text>`;
      }).join('');
      const allColumns = [
        [['Vmax','Vmax'],['Vmin','Vmin'],['Vpp','Vpp'],['Vtop','Vtop'],['Vbase','Vbase'],['Vamp','Vamp']],
        [['Vavg','Vavg'],['Vrms','Vrms'],['Overshoot','Vovr'],['Preshoot','Vpre'],['Period','Prd'],['Freq','Freq']],
        [['Rise Time','Rise'],['Fall Time','Fall'],['+Width','+Wid'],['-Width','-Wid'],['+Duty','+Duty'],['-Duty','-Duty']]
      ];
      const allChannel = settings.measure.source;
      const allMarkup = !settings.measure.displayAll ? '' : `<g data-display-all="true" data-source="${allChannel}" font-family="monospace" font-size="16" font-weight="700" fill="${allChannel === 1 ? '#f4d35e' : '#6ecbff'}">
        ${Array.from({ length:6 }, (_, row) => `<rect x="${left}" y="${top + height - 144 + row * 24}" width="${measurementRight-left}" height="24" rx="3" fill="#203354" fill-opacity=".92" stroke="#8b9dc3" stroke-width="1"/>`).join('')}
        ${[1,2].map(column=>`<line x1="${left+column*measurementSlot}" x2="${left+column*measurementSlot}" y1="${top+height-144}" y2="${top+height}" stroke="#8b9dc3"/>`).join('')}
        ${allColumns.map((column,index)=>column.map(([parameter,label],row)=>{
          const text = `${label}=${resultText(parameter,allChannel)}`;
          return `<text data-all-measurement="${parameter}" x="${left+index*measurementSlot+3}" y="${top+height-144+row*24+18}" textLength="${Math.min(measurementSlot-6,text.length*9.6)}" lengthAdjust="spacingAndGlyphs">${text}</text>`;
        }).join('')).join('')}
      </g>`;
      const grid = [];
      for (let i = 0; i <= horizontalDivisions; i++) grid.push(`<path d="M${left + width * i / horizontalDivisions} ${top}v${height}"/>`);
      for (let i = 0; i <= 8; i++) grid.push(`<path d="M${left} ${top + height * i / 8}h${width}"/>`);
      return `<svg viewBox="0 0 ${viewWidth} 420" role="img" aria-labelledby="${idPrefix}DisplayTitle ${idPrefix}DisplayDescription">
        <title id="${idPrefix}DisplayTitle">${t('scope')}</title><desc id="${idPrefix}DisplayDescription">${t('scopeDescription')}</desc>
        <defs><clipPath id="${idPrefix}TraceClip"><rect x="${left}" y="${top}" width="${width}" height="${height}"/></clipPath></defs>
        <rect width="${viewWidth}" height="420" rx="8" fill="#030709"/>
        <g fill="#a7bbb7" font-family="system-ui,sans-serif" font-size="22">${instrumentFooter ? '' : `<text x="36" y="29">${timeLabel}</text>`}<text x="${left + width}" y="29" text-anchor="end">${format(Number((duration * 1000).toPrecision(12)))} ms</text></g>
        <g fill="none" stroke="#203038" stroke-width="1">${grid.join('')}</g>
        <path d="M${left} ${top + height / 2}h${width} M${timeZeroX} ${top}v${height}" fill="none" stroke="#40525b" stroke-dasharray="3 5"/>
        ${timeZeroMarker}

        <g fill="none" clip-path="url(#${idPrefix}TraceClip)" stroke-width="2.4" stroke-linejoin="round">
          ${traces}
        </g>
        ${(settings.selectedChannel === 1 ? [2, 1] : [1, 2]).map(groundMarker).join('')}
        ${cursors}
        ${settings.trigger?.showLevel ? `<g data-trigger-level="${settings.trigger.level}" fill="#ff9e3d" font-family="system-ui,sans-serif" font-size="17">
          <g data-trigger-readout="true"><rect x="${left}" y="337" width="${Math.max(190, triggerLabel.length * 10 + 14)}" height="27" rx="4" fill="#102744" stroke="#4388ff" stroke-width="1.5"/>
            <text x="${left + 7}" y="357" fill="#ff9e3d" font-size="19" font-weight="600">${triggerLabel}</text></g>
          ${levelY >= top && levelY <= top + height ? `<line x1="${left}" x2="${left + width}" y1="${levelY}" y2="${levelY}" stroke="#ff9e3d" stroke-width="1.5" stroke-dasharray="6 4"/>` : ''}
          <g data-trigger-marker="true" transform="translate(18 ${levelMarkerY})"><path d="M0 -10h9l7 10-7 10H0z"/>
            <text x="6" y="4" text-anchor="middle" fill="#030709" font-size="12" font-weight="700">T</text></g>
        </g>` : ''}
        <g data-measurement-results="true" font-family="monospace" font-size="16" font-weight="700">${settings.measure.displayAll ? '' : measurementMarkup}</g>
        ${allMarkup}
        ${dense ? `<text x="${viewWidth / 2}" y="348" fill="#a7bbb7" font-family="system-ui,sans-serif" font-size="21" text-anchor="middle">${t('scopeDense')}</text>` : ''}
        <g font-family="system-ui,sans-serif" font-size="22">
          ${channelScale(1, left)}
          ${channelScale(2, instrumentFooter ? left + width * 0.31 : left + width - 148)}
          ${instrumentFooter ? `<text x="${left + width}" y="400" text-anchor="end" fill="#a7bbb7">${timeLabel}</text>` : ''}
        </g>
      </svg>`;
    }
  };
})();

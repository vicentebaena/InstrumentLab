'use strict';
(() => {
  // Instrument scales never change automatically with the circuit or generator.
  const defaults = { timePerDivision: 200e-6, voltsPerDivision: 0.5 };
  window.InstrumentLab.oscilloscope = {
    defaults,
    submenus: {
      coupling: { property: 'coupling', options: ['DC', 'AC', 'GND'] },
      probe: { property: 'probe', options: [1, 5, 10, 20, 50, 100, 200, 500, 1000] }
    },
    verticalScales: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
    horizontalScales: [10e-6, 20e-6, 50e-6, 100e-6, 200e-6, 500e-6, 1e-3, 2e-3, 5e-3, 10e-3],
    formatTimeScale(value) {
      const labels = ['10.00us', '20.00us', '50.00us', '100.0us', '200.0us', '500.0us', '1.000ms', '2.000ms', '5.000ms', '10.00ms'];
      return labels[this.horizontalScales.indexOf(value)];
    },
    stepHorizontalPosition(state, direction) {
      const current = state.horizontalPositionDivisions ?? 0;
      const next = Math.max(-12, Math.min(12, Math.round((current + Math.sign(direction) * 0.1) * 10) / 10));
      return next === current ? state : { ...state, horizontalPositionDivisions: next };
    },
    stepHorizontalScale(state, direction) {
      const index = this.horizontalScales.indexOf(state.timePerDivision ?? defaults.timePerDivision);
      const next = Math.max(0, Math.min(this.horizontalScales.length - 1, index + Math.sign(direction)));
      if (index === next) return state;
      return { ...state, timePerDivision: this.horizontalScales[next] };
    },
    formatVerticalScale(value) {
      return value < 1 ? `${Math.round(value * 1000)}mV` : `${value.toFixed(2)}V`;
    },
    createState(overrides = {}) {
      const state = {
        selectedChannel: 1, menuChannel: null, submenu: null, submenuSelection: null, horizontalPositionDivisions: 0, timePerDivision: defaults.timePerDivision,
        channels: { 1: { visible: true, coupling: 'DC', probe: 1, voltsPerDivision: defaults.voltsPerDivision, positionDivisions: 0 }, 2: { visible: true, coupling: 'DC', probe: 1, voltsPerDivision: defaults.voltsPerDivision, positionDivisions: 0 } }
      };
      return { ...state, ...overrides, channels: {
        1: { ...state.channels[1], ...overrides.channels?.[1] },
        2: { ...state.channels[2], ...overrides.channels?.[2] }
      } };
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
    stepVerticalScale(state, direction) {
      const channel = state.selectedChannel;
      if (!state.channels[channel].visible) return state;
      const value = state.channels[channel].voltsPerDivision ?? defaults.voltsPerDivision;
      const index = this.verticalScales.indexOf(value);
      const next = Math.max(0, Math.min(this.verticalScales.length - 1, index + Math.sign(direction)));
      if (next === index) return state;
      return { ...state, channels: { ...state.channels,
        [channel]: { ...state.channels[channel], voltsPerDivision: this.verticalScales[next] }
      } };
    },
    openSubmenu(state, name) {
      const definition = this.submenus[name];
      if (!definition) throw new RangeError('Unknown oscilloscope submenu.');
      if (state.menuChannel === null) return state;
      return { ...state, submenu: name, submenuSelection: state.channels[state.menuChannel][definition.property] };
    },
    stepSubmenu(state, direction) {
      const definition = this.submenus[state.submenu];
      if (state.menuChannel === null || !definition) return state;
      const index = definition.options.indexOf(state.submenuSelection);
      const next = Math.max(0, Math.min(definition.options.length - 1, index + Math.sign(direction)));
      return { ...state, submenuSelection: definition.options[next] };
    },
    confirmSubmenu(state) {
      const definition = this.submenus[state.submenu];
      if (state.menuChannel === null || !definition || !definition.options.includes(state.submenuSelection)) return state;
      const channel = state.menuChannel;
      return { ...state, submenu: null, submenuSelection: null, channels: { ...state.channels,
        [channel]: { ...state.channels[channel], [definition.property]: state.submenuSelection }
      } };
    },
    toggleChannelMenu(state) {
      return { ...state, menuChannel: state.menuChannel === null ? state.selectedChannel : null, submenu: null, submenuSelection: null };
    },
    pressChannel(state, channel) {
      if (![1, 2].includes(channel)) throw new RangeError('Unknown oscilloscope channel.');
      const hide = state.menuChannel === channel && state.selectedChannel === channel && state.channels[channel].visible;
      return {
        ...state, selectedChannel: channel, menuChannel: hide ? null : channel, submenu: null, submenuSelection: null,
        channels: { ...state.channels, [channel]: { ...state.channels[channel], visible: !hide } }
      };
    },
    render(circuit, parameters, generator, t, format, idPrefix = 'scope', horizontalDivisions = 10, scopeState = null, presentation = {}) {
      const settings = scopeState || this.createState();
      const scale = channel => settings.channels[channel].voltsPerDivision ?? defaults.voltsPerDivision;
      const show1 = settings.channels[1].visible, show2 = settings.channels[2].visible;
      const instrumentFooter = presentation.footerScales ?? false;
      const left = 36, top = 44, width = (presentation.cellWidth ?? 56.8) * horizontalDivisions, height = 320;
      const viewWidth = width + 2 * left;
      const timePerDivision = settings.timePerDivision ?? defaults.timePerDivision;
      const timeScaleLabel = this.formatTimeScale(timePerDivision);
      const timeLabel = instrumentFooter ? `Time ${timeScaleLabel}` : `H ${timeScaleLabel}/div`;
      const duration = horizontalDivisions * timePerDivision;
      const period = 1 / generator.frequency;
      const activeSignals = [1, 2].some(channel => settings.channels[channel].visible && settings.channels[channel].coupling !== 'GND');
      const dense = activeSignals && generator.output1Enabled !== false && duration * generator.frequency > width / 4;
      // Positive position shifts the common time reference and both traces to the right.
      const start = -duration / 2 - (settings.horizontalPositionDivisions ?? 0) * timePerDivision;
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
      // Remove the mean over the complete periodic signal, not the visible time window.
      let means = { input: 0, output: 0 };
      if ([1, 2].some(channel => settings.channels[channel].visible && settings.channels[channel].coupling === 'AC')) {
        if (circuit.mean) means = circuit.mean(parameters, generator);
        else {
          for (let i = 0; i < 2048; i++) {
            const sample = circuit.sample((i + 0.5) * period / 2048, parameters, generator);
            means.input += sample.input / 2048;
            means.output += sample.output / 2048;
          }
        }
      }
      const displayedVoltage = (voltage, channel) => settings.channels[channel].coupling === 'GND' ? 0
        : (voltage - (settings.channels[channel].coupling === 'AC' ? means[channel === 1 ? 'input' : 'output'] : 0)) * (settings.channels[channel].probe ?? 1);
      const y = (voltage, channel) => zeroY(channel) - displayedVoltage(voltage, channel) / scale(channel) * height / 8;
      const trace = key => samples.map((sample, i) => `${i ? 'L' : 'M'}${x(sample.time).toFixed(3)},${y(sample[key], key === 'input' ? 1 : 2).toFixed(3)}`).join(' ');
      // At unresolved frequencies show the actual range, not a false aliased trace.
      function band(peak, color, channel) {
        const upper = Math.max(top, Math.min(top + height, y(generator.offset + peak, channel)));
        const lower = Math.max(top, Math.min(top + height, y(generator.offset - peak, channel)));
        if (y(generator.offset + peak, channel) > top + height || y(generator.offset - peak, channel) < top) return '';
        return `<rect x="${left}" y="${upper}" width="${width}" height="${Math.max(1, lower - upper)}" fill="${color}" fill-opacity="0.3"/>`;
      }
      const channelTrace = channel => {
        if (!settings.channels[channel].visible) return '';
        const color = channel === 1 ? '#f4d35e' : '#6ecbff';
        if (settings.channels[channel].coupling === 'GND') return `<path d="M${left} ${zeroY(channel)}H${left + width}" stroke="${color}"/>`;
        if (!dense) return `<path d="${trace(channel === 1 ? 'input' : 'output')}" stroke="${color}"/>`;
        const peak = generator.amplitudeVpp / 2 * (channel === 1 ? 1 : generator.waveform === 'sine'
          ? 1 / Math.hypot(1, 2 * Math.PI * generator.frequency * tau) : Math.tanh(period / (4 * tau)));
        return band(peak, color, channel);
      };
      const traces = channelTrace(1) + channelTrace(2);
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
        const color = channel === 1 ? '#f4d35e' : '#6ecbff';
        const x = 18, y0 = zeroY(channel);
        return `<g data-ground-channel="${channel}" aria-label="CH${channel} 0 V" transform="translate(${x} ${y0})">
          <path d="M0 -10h9l7 10-7 10H0z" fill="${color}"/>
          <text x="6" y="4" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#030709">${channel}</text>
        </g>`;
      };
      const grid = [];
      for (let i = 0; i <= horizontalDivisions; i++) grid.push(`<path d="M${left + width * i / horizontalDivisions} ${top}v${height}"/>`);
      for (let i = 0; i <= 8; i++) grid.push(`<path d="M${left} ${top + height * i / 8}h${width}"/>`);
      return `<svg viewBox="0 0 ${viewWidth} 420" role="img" aria-labelledby="${idPrefix}DisplayTitle ${idPrefix}DisplayDescription">
        <title id="${idPrefix}DisplayTitle">${t('scope')}</title><desc id="${idPrefix}DisplayDescription">${t('scopeDescription')}</desc>
        <defs><clipPath id="${idPrefix}TraceClip"><rect x="${left}" y="${top}" width="${width}" height="${height}"/></clipPath></defs>
        <rect width="${viewWidth}" height="420" rx="8" fill="#030709"/>
        <g fill="#a7bbb7" font-family="system-ui,sans-serif" font-size="22">${instrumentFooter ? '' : `<text x="36" y="29">${timeLabel}</text>`}<text x="${left + width}" y="29" text-anchor="end">${format(Number((duration * 1000).toPrecision(12)))} ms</text></g>
        <g fill="none" stroke="#203038" stroke-width="1">${grid.join('')}</g>
        <path d="M${left} ${top + height / 2}h${width} M${left + width / 2} ${top}v${height}" fill="none" stroke="#40525b" stroke-dasharray="3 5"/>
        <g fill="none" clip-path="url(#${idPrefix}TraceClip)" stroke-width="2.4" stroke-linejoin="round">
          ${traces}
        </g>
        ${(settings.selectedChannel === 1 ? [2, 1] : [1, 2]).map(groundMarker).join('')}
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

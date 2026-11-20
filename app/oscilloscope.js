'use strict';
(() => {
  // Fixed scales: changes to R and C never trigger an automatic rescale.
  const defaults = { timePerDivision: 250e-6, voltsPerDivision: 0.5 };
  window.InstrumentLab.oscilloscope = {
    defaults,
    verticalScales: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
    formatVerticalScale(value) {
      return value < 1 ? `${Math.round(value * 1000)}mV` : `${value.toFixed(2)}V`;
    },
    createState() {
      return {
        selectedChannel: 1, menuChannel: null,
        channels: { 1: { visible: true, coupling: 'DC', probe: 1 }, 2: { visible: true, coupling: 'DC', probe: 1 } }
      };
    },
    toggleChannelMenu(state) {
      return { ...state, menuChannel: state.menuChannel === null ? state.selectedChannel : null };
    },
    pressChannel(state, channel) {
      if (![1, 2].includes(channel)) throw new RangeError('Unknown oscilloscope channel.');
      const hide = state.menuChannel === channel && state.selectedChannel === channel && state.channels[channel].visible;
      return {
        ...state, selectedChannel: channel, menuChannel: hide ? null : channel,
        channels: { ...state.channels, [channel]: { ...state.channels[channel], visible: !hide } }
      };
    },
    render(circuit, parameters, generator, t, format, idPrefix = 'scope', horizontalDivisions = 10, scopeState = null) {
      const settings = scopeState || this.createState();
      const verticalScaleLabel = this.formatVerticalScale(defaults.voltsPerDivision);
      const show1 = settings.channels[1].visible, show2 = settings.channels[2].visible;
      const instrumentFooter = idPrefix === 'ds1102e';
      const left = 36, top = 44, width = (instrumentFooter ? 40 : 56.8) * horizontalDivisions, height = 320;
      const viewWidth = width + 2 * left;
      const timeLabel = instrumentFooter ? `Time ${format(defaults.timePerDivision * 1e6)}us` : `H ${format(defaults.timePerDivision * 1e6)} µs/div`;
      const duration = horizontalDivisions * defaults.timePerDivision;
      const period = 1 / generator.frequency;
      const dense = (show1 || show2) && generator.output1Enabled !== false && duration * generator.frequency > width / 4;
      const start = -period / 4;
      const times = new Set(Array.from({ length: 1201 }, (_, i) => start + duration * i / 1200));
      // Include each side of every square-wave edge, and resolve fast RC responses.
      const half = period / 2;
      const tau = circuit.characteristics(parameters).tau;
      for (let k = Math.floor(start / half); !dense && (show1 || show2) && generator.output1Enabled !== false && generator.waveform === 'square' && k <= Math.ceil((start + duration) / half); k++) {
        const edge = k * half;
        for (const dt of [-period * 1e-10, 0, period * 1e-10, ...[0.02, 0.1, 0.25, 0.5, 1, 2, 4, 8].map(v => v * tau)]) {
          const time = edge + dt;
          if (time >= start && time <= start + duration) times.add(time);
        }
      }
      const samples = dense ? [] : [...times].sort((a, b) => a - b).map(time => ({ time, ...circuit.sample(time, parameters, generator) }));
      const x = time => left + (time - start) / duration * width;
      const y = voltage => top + height / 2 - voltage / defaults.voltsPerDivision * height / 8;
      const trace = key => samples.map((sample, i) => `${i ? 'L' : 'M'}${x(sample.time).toFixed(3)},${y(sample[key]).toFixed(3)}`).join(' ');
      // At unresolved frequencies show the actual range, not a false aliased trace.
      function band(peak, color) {
        const upper = Math.max(top, Math.min(top + height, y(generator.offset + peak)));
        const lower = Math.max(top, Math.min(top + height, y(generator.offset - peak)));
        if (lower === upper && (generator.offset + peak < -2 || generator.offset - peak > 2)) return '';
        return `<rect x="${left}" y="${upper}" width="${width}" height="${Math.max(1, lower - upper)}" fill="${color}" fill-opacity="0.3"/>`;
      }
      const traces = dense
        ? (show1 ? band(generator.amplitudeVpp / 2, '#f4d35e') : '') + (show2 ? band(generator.amplitudeVpp / 2 * (generator.waveform === 'sine' ? 1 / Math.hypot(1, 2 * Math.PI * generator.frequency * tau) : Math.tanh(period / (4 * tau))), '#6ecbff') : '')
        : (show1 ? `<path d="${trace('input')}" stroke="#f4d35e"/>` : '') + (show2 ? `<path d="${trace('output')}" stroke="#6ecbff"/>` : '');
      function channelScale(channel, position) {
        const visible = settings.channels[channel].visible;
        const color = visible ? (channel === 1 ? '#f4d35e' : '#6ecbff') : '#526066';
        const selected = visible && settings.selectedChannel === channel;
        const value = verticalScaleLabel;
        return `<g aria-label="CH${channel} ${value}">
          ${selected ? `<rect x="${position}" y="380" width="50" height="27" rx="2" fill="${color}"/>` : ''}
          <text x="${position + 25}" y="400" text-anchor="middle" fill="${selected ? '#030709' : color}">CH${channel}</text>
          <text x="${position + 56}" y="400" fill="${color}">${value}</text>
        </g>`;
      }
      const grid = [];
      for (let i = 0; i <= horizontalDivisions; i++) grid.push(`<path d="M${left + width * i / horizontalDivisions} ${top}v${height}"/>`);
      for (let i = 0; i <= 8; i++) grid.push(`<path d="M${left} ${top + height * i / 8}h${width}"/>`);
      return `<svg viewBox="0 0 ${viewWidth} 420" role="img" aria-labelledby="${idPrefix}DisplayTitle ${idPrefix}DisplayDescription">
        <title id="${idPrefix}DisplayTitle">${t('scope')}</title><desc id="${idPrefix}DisplayDescription">${t('scopeDescription')}</desc>
        <defs><clipPath id="${idPrefix}TraceClip"><rect x="${left}" y="${top}" width="${width}" height="${height}"/></clipPath></defs>
        <rect width="${viewWidth}" height="420" rx="8" fill="#030709"/>
        <g fill="#a7bbb7" font-family="system-ui,sans-serif" font-size="22">${instrumentFooter ? '' : `<text x="36" y="29">${timeLabel}</text>`}<text x="${left + width}" y="29" text-anchor="end">${format(duration * 1000)} ms</text></g>
        <g fill="none" stroke="#203038" stroke-width="1">${grid.join('')}</g>
        <path d="M${left} ${top + height / 2}h${width} M${left + width / 2} ${top}v${height}" fill="none" stroke="#40525b" stroke-dasharray="3 5"/>
        <g fill="none" clip-path="url(#${idPrefix}TraceClip)" stroke-width="2.4" stroke-linejoin="round">
          ${traces}
        </g>
        ${show1 || show2 ? `<path d="M24 198l10 6-10 6z" fill="${show1 ? '#f4d35e' : '#6ecbff'}"/>` : ''}
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

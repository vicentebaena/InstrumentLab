'use strict';
(() => {
  // Fixed scales: changes to R and C never trigger an automatic rescale.
  const defaults = { timePerDivision: 250e-6, voltsPerDivision: 0.5 };
  window.InstrumentLab.oscilloscope = {
    defaults,
    render(circuit, parameters, generator, t, format, idPrefix = 'scope', horizontalDivisions = 10) {
      const left = 36, top = 44, width = 568 * horizontalDivisions / 10, height = 320;
      const viewWidth = width + 2 * left;
      const instrumentFooter = idPrefix === 'ds1202ze';
      const timeLabel = `H ${format(defaults.timePerDivision * 1e6)} µs/div`;
      const duration = horizontalDivisions * defaults.timePerDivision;
      const period = 1 / generator.frequency;
      const dense = generator.output1Enabled !== false && duration * generator.frequency > width / 4;
      const start = -period / 4;
      const times = new Set(Array.from({ length: 1201 }, (_, i) => start + duration * i / 1200));
      // Include each side of every square-wave edge, and resolve fast RC responses.
      const half = period / 2;
      const tau = circuit.characteristics(parameters).tau;
      for (let k = Math.floor(start / half); !dense && generator.output1Enabled !== false && generator.waveform === 'square' && k <= Math.ceil((start + duration) / half); k++) {
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
        ? band(generator.amplitudeVpp / 2, '#f4d35e') + band(generator.amplitudeVpp / 2 * (generator.waveform === 'sine' ? 1 / Math.hypot(1, 2 * Math.PI * generator.frequency * tau) : Math.tanh(period / (4 * tau))), '#6ecbff')
        : `<path d="${trace('input')}" stroke="#f4d35e"/><path d="${trace('output')}" stroke="#6ecbff"/>`;
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
        <path d="M24 198l10 6-10 6z" fill="#f4d35e"/>
        ${dense ? `<text x="${viewWidth / 2}" y="348" fill="#a7bbb7" font-family="system-ui,sans-serif" font-size="21" text-anchor="middle">${t('scopeDense')}</text>` : ''}
        <g font-family="system-ui,sans-serif" font-size="22"><text x="36" y="400" fill="#f4d35e">CH1 ${format(defaults.voltsPerDivision)} V/div</text>
          ${instrumentFooter
            ? `<text x="248" y="400" fill="#6ecbff">CH2 ${format(defaults.voltsPerDivision)} V/div</text><text x="${left + width}" y="400" text-anchor="end" fill="#a7bbb7">${timeLabel}</text>`
            : `<text x="${left + width}" y="400" text-anchor="end" fill="#6ecbff">CH2 ${format(defaults.voltsPerDivision)} V/div</text>`}
        </g>
      </svg>`;
    }
  };
})();

'use strict';
(() => {
  // Fixed scales: changes to R and C never trigger an automatic rescale.
  const defaults = { timePerDivision: 250e-6, voltsPerDivision: 0.5 };
  window.InstrumentLab.oscilloscope = {
    defaults,
    render(circuit, parameters, generator, t, format) {
      const left = 36, top = 44, width = 568, height = 320;
      const duration = 10 * defaults.timePerDivision;
      const period = 1 / generator.frequency;
      const start = -period / 4;
      const times = new Set(Array.from({ length: 1201 }, (_, i) => start + duration * i / 1200));
      // Include each side of every square-wave edge, and resolve fast RC responses.
      const half = period / 2;
      const tau = circuit.characteristics(parameters).tau;
      for (let k = Math.floor(start / half); k <= Math.ceil((start + duration) / half); k++) {
        const edge = k * half;
        for (const dt of [-period * 1e-10, 0, period * 1e-10, ...[0.02, 0.1, 0.25, 0.5, 1, 2, 4, 8].map(v => v * tau)]) {
          const time = edge + dt;
          if (time >= start && time <= start + duration) times.add(time);
        }
      }
      const samples = [...times].sort((a, b) => a - b).map(time => ({ time, ...circuit.sample(time, parameters, generator) }));
      const x = time => left + (time - start) / duration * width;
      const y = voltage => top + height / 2 - voltage / defaults.voltsPerDivision * height / 8;
      const trace = key => samples.map((sample, i) => `${i ? 'L' : 'M'}${x(sample.time).toFixed(3)},${y(sample[key]).toFixed(3)}`).join(' ');
      const grid = [];
      for (let i = 0; i <= 10; i++) grid.push(`<path d="M${left + width * i / 10} ${top}v${height}"/>`);
      for (let i = 0; i <= 8; i++) grid.push(`<path d="M${left} ${top + height * i / 8}h${width}"/>`);
      return `<svg viewBox="0 0 640 420" role="img" aria-labelledby="scopeDisplayTitle scopeDisplayDescription">
        <title id="scopeDisplayTitle">${t('scope')}</title><desc id="scopeDisplayDescription">${t('scopeDescription')}</desc>
        <defs><clipPath id="scopeTraceClip"><rect x="${left}" y="${top}" width="${width}" height="${height}"/></clipPath></defs>
        <rect width="640" height="420" rx="8" fill="#030709"/>
        <g fill="#a7bbb7" font-family="system-ui,sans-serif" font-size="22"><text x="36" y="29">H ${format(defaults.timePerDivision * 1e6)} µs/div</text><text x="604" y="29" text-anchor="end">${format(duration * 1000)} ms</text></g>
        <g fill="none" stroke="#203038" stroke-width="1">${grid.join('')}</g>
        <path d="M${left} ${top + height / 2}h${width} M${left + width / 2} ${top}v${height}" fill="none" stroke="#40525b" stroke-dasharray="3 5"/>
        <g fill="none" clip-path="url(#scopeTraceClip)" stroke-width="2.4" stroke-linejoin="round">
          <path d="${trace('input')}" stroke="#f4d35e"/><path d="${trace('output')}" stroke="#6ecbff"/>
        </g>
        <path d="M24 198l10 6-10 6z" fill="#f4d35e"/>
        <g font-family="system-ui,sans-serif" font-size="22"><text x="36" y="400" fill="#f4d35e">CH1 ${format(defaults.voltsPerDivision)} V/div</text><text x="604" y="400" text-anchor="end" fill="#6ecbff">CH2 ${format(defaults.voltsPerDivision)} V/div</text></g>
      </svg>`;
    }
  };
})();

'use strict';
// Circuit definitions own their parameters, fixed wiring and diagram renderer.
window.InstrumentLab = {
  circuits: {
    rc: {
      titleKey: 'rcTitle',
      defaults: { resistance: 1000, capacitance: 100e-9 },
      parameters: {
        resistance: { labelKey: 'resistance', unit: 'kΩ', scale: 1000, min: 0.001, max: 10000 },
        capacitance: { labelKey: 'capacitance', unit: 'nF', scale: 1e-9, min: 0.001, max: 1000000 }
      },
      connections: { generator: ['input', 'ground'], ch1: ['input', 'ground'], ch2: ['output', 'ground'] },
      characteristics({ resistance, capacitance }) {
        const tau = resistance * capacitance;
        return { tau, cutoff: 1 / (2 * Math.PI * tau) };
      },
      // Exact periodic steady-state responses for sine and symmetrical square waves.
      sample(time, { resistance, capacitance }, { frequency, amplitudeVpp, offset, waveform = 'square', output1Enabled = true }) {
        if (!output1Enabled) return { input: 0, output: 0 };
        const period = 1 / frequency;
        const half = period / 2;
        const phase = ((time % period) + period) % period;
        const tau = resistance * capacitance;
        const amplitude = amplitudeVpp / 2;
        if (waveform === 'sine') {
          const angle = 2 * Math.PI * phase / period;
          const omegaTau = 2 * Math.PI * frequency * tau;
          return {
            input: offset + amplitude * Math.sin(angle),
            output: offset + amplitude / Math.hypot(1, omegaTau) * Math.sin(angle - Math.atan(omegaTau))
          };
        }
        const peak = amplitude * Math.tanh(half / (2 * tau));
        const high = phase < half;
        const elapsed = high ? phase : phase - half;
        const change = (amplitude + peak) * -Math.expm1(-elapsed / tau);
        return {
          input: offset + (high ? amplitude : -amplitude),
          output: offset + (high ? -peak + change : peak - change)
        };
      },
      diagram({ resistanceLabel, capacitanceLabel }, t) {
        return `<svg viewBox="0 -30 940 510" role="group" aria-labelledby="diagramTitle diagramDescription">
          <title id="diagramTitle">${t('rcTitle')}</title><desc id="diagramDescription">${t('diagramDescription')}</desc>
          <defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#21363b"/></pattern></defs>
          <rect y="-30" width="940" height="510" fill="url(#dots)"/>
          <g fill="none" stroke="#afc4c5" stroke-width="3" stroke-linejoin="round">
            <path d="M190 320H275V205H395 M505 205H710V285 M710 310V400H175V345 M710 400V421 M688 421H732 M695 431H725 M704 441H716"/>
            <rect x="395" y="189" width="110" height="32" fill="#11272c"/>
            <path d="M679 285H741 M679 310H741" stroke-width="5"/>
          </g>
          <g fill="none" stroke-width="2.5" stroke-dasharray="7 6" stroke-linejoin="round">
            <path d="M325 177V160H562V116" stroke="#f4d35e"/>
            <path d="M655 177V160H587V116" stroke="#6ecbff"/>
          </g>
          <g stroke-linejoin="round">
            <g fill="#142b31" stroke-width="2.5">
              <rect x="319" y="177" width="12" height="18" rx="3" stroke="#f4d35e"/>
              <rect x="649" y="177" width="12" height="18" rx="3" stroke="#6ecbff"/>
            </g>
            <g fill="none" stroke-width="2.5">
              <path d="M325 195V205" stroke="#f4d35e"/>
              <path d="M655 195V205" stroke="#6ecbff"/>
              <path d="M331 182H365V186 M355 186H375 M359 191H371 M363 196H367 M661 182H695V186 M685 186H705 M689 191H701 M693 196H697" stroke="#afc4c5"/>
            </g>
          </g>
          <g><circle cx="325" cy="205" r="6" fill="#f4d35e"/><circle cx="655" cy="205" r="6" fill="#6ecbff"/></g>
          <g class="instrument-target" data-instrument="dg822" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${t('openDg822')}">
            <image href="${window.InstrumentLabImages.generator}" x="35" y="238" width="220" height="110" preserveAspectRatio="xMidYMid meet" aria-hidden="true"/>
            <rect class="instrument-focus" x="31" y="234" width="228" height="118" rx="6" fill="transparent" stroke="transparent"/>
          </g>
          <g class="instrument-target" data-instrument="ds1202ze" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${t('openRigolScope')}">
            <image href="${window.InstrumentLabImages.scope}" x="410" y="15" width="230" height="120" preserveAspectRatio="xMidYMid meet" aria-hidden="true"/>
            <rect class="instrument-focus" x="406" y="11" width="238" height="128" rx="6" fill="transparent" stroke="transparent"/>
          </g>
          <g fill="#eef8f6" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20">
            <text x="450" y="251" class="editable-value" data-parameter="resistance" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${t('editResistance')}: ${resistanceLabel}">R = ${resistanceLabel}</text><text x="810" y="304" class="editable-value" data-parameter="capacitance" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${t('editCapacitance')}: ${capacitanceLabel}">C = ${capacitanceLabel}</text>
            <text x="145" y="220" fill="#48d6c8">${t('generator')}</text>
            <text x="525" y="-8" fill="#48d6c8">${t('scope')}</text>
          </g>
          <g font-family="system-ui,sans-serif" font-size="17">
            <text x="305" y="145" text-anchor="end" fill="#f4d35e">CH1 · ${t('input')}</text>
            <text x="675" y="145" text-anchor="start" fill="#6ecbff">CH2 · ${t('capacitor')}</text>
            <text x="470" y="468" text-anchor="middle" fill="#a7bbb7" font-size="16">${t('fixedDiagram')}</text>
          </g>
        </svg>`;
      }
    }
  },
  generatorDefaults: { waveform: 'square', frequency: 1000, offset: 0, amplitudeVpp: 2, output1Enabled: true, output2Enabled: false }
};

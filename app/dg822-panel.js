'use strict';
// DG822 adapter: faceplate mapping and its English display/number conventions.
window.InstrumentLab.DG822Panel = {
  // The DG822 groups fractional digits in threes, independently of app language.
  formatNumber(value, decimals) {
    const [integer, fraction] = Number(value).toFixed(decimals).split('.');
    return fraction ? `${integer}.${fraction.match(/.{1,3}/g).join(',')}` : integer;
  },
  presentation() {
    const format = this.formatNumber;
    const labels = { frequency: 'Freq', amplitude: 'Ampl', offset: 'Offset' };
    return {
      readingText: (parameter, { value, unit }) => `${format(value, parameter === 'frequency' ? 9 : 4)} ${unit}`,
      readingLabel: (parameter, text) => `Edit ${labels[parameter]}: ${text}`,
      editorTitle: parameter => `DG822 · ${labels[parameter]}`,
      phaseText: () => `${format(0, 3)}º`,
      rmsNote: waveform => waveform === 'sine'
        ? 'Sine: Vpp = 2 × √2 × Vrms. DC offset is separate.'
        : 'Square: Vpp = 2 × Vrms. DC offset is separate.',
      previewPath: waveform => waveform === 'sine'
        ? 'M2 50C12 15 20 15 30 50S48 85 58 50S76 15 86 50S104 85 118 50'
        : 'M2 76H20V24H58V76H96V24H118',
      outputLabel: (channel, enabled) => `Output${channel} (CH${channel}): ${enabled ? 'ON' : 'OFF'}`,
      channelText: settings => `CH1 · ${settings.waveform === 'sine' ? 'Sine' : 'Square'} · ${settings.output1Enabled ? 'ON' : 'OFF'}`
    };
  },
  create({ controller }) {
    const $ = id => document.getElementById(id);
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'dg822Dialog', handleId: 'dg822WindowBar', closeId: 'dg822Close',
      triggerSelector: '[data-instrument="dg822"]'
    });
    $('dg822Faceplate').src = window.InstrumentLabImages.generator;
    return window.InstrumentLab.createGeneratorPanel({
      controller, presentation: this.presentation(), openWindow: () => frame.open(),
      elements: {
        menu: $('dg822Menu'), body: $('dg822Body'), parameters: $('dg822Parameters'), waveMenu: $('dg822WaveMenu'),
        waveButtons: { sine: $('dg822SelectSine'), square: $('dg822SelectSquare') },
        outputButtons: { 1: $('dg822Output1'), 2: $('dg822Output2') },
        readings: { frequency: $('dg822Frequency'), amplitude: $('dg822Amplitude'), offset: $('dg822Offset') },
        phase: $('dg822Phase'), preview: $('dg822PreviewTrace'), channel: $('dg822Channel'),
        editor: { dialog: $('dg822EditDialog'), input: $('dg822EditValue'), units: $('dg822EditUnit'),
          title: $('dg822EditTitle'), note: $('dg822RmsNote'), form: $('dg822EditForm'), cancel: $('dg822EditCancel') }
      }
    });
  }
};

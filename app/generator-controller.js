'use strict';
// Common commands always read the current experiment settings, including after reset.
window.InstrumentLab.createGeneratorController = ({ getSettings, onChange }) => {
  const generator = window.InstrumentLab.generator;
  return {
    getSettings,
    reading: parameter => generator.reading(getSettings(), parameter),
    actions: {
      parameter: (parameter, value, unit) => onChange(generator.change(parameter, value, unit, getSettings())),
      waveform: waveform => onChange(generator.waveformChange(getSettings(), waveform)),
      output: channel => onChange(generator.toggleOutput(getSettings(), channel))
    }
  };
};

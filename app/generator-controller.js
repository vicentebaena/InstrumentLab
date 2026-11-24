'use strict';
// Common commands always read the current experiment settings, including after reset.
window.InstrumentLab.createGeneratorController = ({ getSettings, onChange }) => {
  const generator = window.InstrumentLab.generator;
  const updateChannel = change => {
    const settings = getSettings();
    onChange(generator.channelChange(settings, change(generator.channelSettings(settings))));
  };
  return {
    getSettings,
    getChannel: channel => generator.channelSettings(getSettings(), channel),
    reading: (parameter, channel) => generator.reading(generator.channelSettings(getSettings(), channel), parameter),
    actions: {
      parameter: (parameter, value, unit) => updateChannel(settings => generator.change(parameter, value, unit, settings)),
      waveform: waveform => updateChannel(settings => generator.waveformChange(settings, waveform)),
      channel: channel => onChange(generator.selectChannel(channel)),
      output: channel => onChange(generator.toggleOutput(getSettings(), channel))
    }
  };
};

'use strict';
// Shared function-generator settings, units and waveform-dependent AC RMS conversion.
window.InstrumentLab.generator = {
  parameters: {
    frequency: { property: 'frequency', unitProperty: 'frequencyUnit', defaultUnit: 'kHz', units: { MHz: 1e6, kHz: 1e3, Hz: 1, mHz: 1e-3, uHz: 1e-6 } },
    amplitude: { property: 'amplitudeVpp', unitProperty: 'amplitudeUnit', defaultUnit: 'Vpp', units: { Vpp: 1, mVpp: 1e-3, Vrms: 2, mVrms: 2e-3 } },
    offset: { property: 'offset', unitProperty: 'offsetUnit', defaultUnit: 'Vdc', units: { Vdc: 1, mVdc: 1e-3 } }
  },
  // CH1 stays at the root because it is the fixed circuit source; CH2 is independent.
  channelSettings(generator, channel = generator.selectedChannel || 1) {
    if (![1, 2].includes(channel)) throw new RangeError('Unknown generator channel.');
    return channel === 1 ? generator : generator.channel2 || window.InstrumentLab.generatorDefaults.channel2;
  },
  selectChannel(channel) {
    if (![1, 2].includes(channel)) throw new RangeError('Unknown generator channel.');
    return { selectedChannel: channel };
  },
  channelChange(generator, change) {
    return (generator.selectedChannel || 1) === 1 ? change : { channel2: { ...this.channelSettings(generator, 2), ...change } };
  },
  amplitudeScale(unit, waveform = 'square') {
    const rmsFactor = waveform === 'sine' ? 2 * Math.SQRT2 : 2;
    return { Vpp: 1, mVpp: 1e-3, Vrms: rmsFactor, mVrms: rmsFactor * 1e-3 }[unit];
  },
  waveformChange(generator, waveform) {
    if (!['sine', 'square'].includes(waveform)) throw new RangeError('Waveform not implemented.');
    const amplitude = this.reading(generator, 'amplitude');
    return { waveform, ...this.change('amplitude', amplitude.value, amplitude.unit, { ...generator, waveform }) };
  },
  // RMS units refer to the waveform's AC component, excluding the DC offset.
  reading(generator, parameter) {
    const definition = this.parameters[parameter];
    const unit = generator[definition.unitProperty] || definition.defaultUnit;
    const scale = parameter === 'amplitude' ? this.amplitudeScale(unit, generator.waveform) : definition.units[unit];
    return { value: generator[definition.property] / scale, unit };
  },
  change(parameter, value, unit, generator = { waveform: 'square' }) {
    const definition = this.parameters[parameter];
    if (!definition || !Object.hasOwn(definition.units, unit)) throw new RangeError('Invalid unit.');
    const scale = parameter === 'amplitude' ? this.amplitudeScale(unit, generator.waveform) : definition.units[unit];
    const base = Number(value) * scale;
    if (!Number.isFinite(base) || (parameter !== 'offset' && base <= 0) || (parameter === 'frequency' && !Number.isFinite(1 / base))) {
      throw new RangeError(parameter === 'offset' ? 'Enter a finite offset.' : 'Enter a positive, finite value.');
    }
    return { [definition.property]: base, [definition.unitProperty]: unit };
  },
  toggleOutput(generator, channel) {
    if (![1, 2].includes(channel)) throw new RangeError('Unknown generator channel.');
    const property = `output${channel}Enabled`;
    return { [property]: !generator[property] };
  }
};

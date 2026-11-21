'use strict';
// Rigol DG822-specific presentation. Experiment state stays in the main application.
window.InstrumentLab.DG822Panel = {
  // The DG822 groups fractional digits in threes, independently of app language.
  formatNumber(value, decimals) {
    const [integer, fraction] = Number(value).toFixed(decimals).split('.');
    return fraction ? `${integer}.${fraction.match(/.{1,3}/g).join(',')}` : integer;
  },
  parameters: {
    frequency: { label: 'Freq', property: 'frequency', unitProperty: 'frequencyUnit', defaultUnit: 'kHz', decimals: 9, units: { MHz: 1e6, kHz: 1e3, Hz: 1, mHz: 1e-3, uHz: 1e-6 } },
    amplitude: { label: 'Ampl', property: 'amplitudeVpp', unitProperty: 'amplitudeUnit', defaultUnit: 'Vpp', decimals: 4, units: { Vpp: 1, mVpp: 1e-3, Vrms: 2, mVrms: 2e-3 } },
    offset: { label: 'Offset', property: 'offset', unitProperty: 'offsetUnit', defaultUnit: 'Vdc', decimals: 4, units: { Vdc: 1, mVdc: 1e-3 } }
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
  create({ getGenerator, onChange }) {
    const api = window.InstrumentLab.DG822Panel;
    const format = window.InstrumentLab.DG822Panel.formatNumber;
    const $ = id => document.getElementById(id);
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'dg822Dialog', handleId: 'dg822WindowBar', closeId: 'dg822Close',
      triggerSelector: '[data-instrument="dg822"]'
    });
    $('dg822Faceplate').src = window.InstrumentLabImages.generator;
    for (const channel of [1, 2]) {
      $(`dg822Output${channel}`).addEventListener('click', () => {
        const key = `output${channel}Enabled`;
        onChange({ [key]: !getGenerator()[key] });
      });
    }
    let editing = null;
    let menuOpen = false;
    function showMenu(open) {
      menuOpen = open;
      $('dg822Parameters').hidden = open;
      $('dg822WaveMenu').hidden = !open;
      $('dg822Menu').setAttribute('aria-expanded', String(open));
    }
    $('dg822Menu').addEventListener('click', () => {
      showMenu(!menuOpen);
      $('dg822Body').scrollLeft = 0;
      if (menuOpen) $(getGenerator().waveform === 'sine' ? 'dg822SelectSine' : 'dg822SelectSquare').focus({ preventScroll: true });
    });
    for (const waveform of ['sine', 'square']) {
      $(waveform === 'sine' ? 'dg822SelectSine' : 'dg822SelectSquare').addEventListener('click', () => {
        onChange(api.waveformChange(getGenerator(), waveform));
        showMenu(false);
        $('dg822Frequency').focus({ preventScroll: true });
      });
    }
    const editor = $('dg822EditDialog');
    const input = $('dg822EditValue');
    const units = $('dg822EditUnit');
    const ids = { frequency: 'dg822Frequency', amplitude: 'dg822Amplitude', offset: 'dg822Offset' };
    for (const [parameter, id] of Object.entries(ids)) {
      api.parameters[parameter].element = id;
      $(id).addEventListener('click', () => {
        editing = parameter;
        const definition = api.parameters[parameter];
        const reading = api.reading(getGenerator(), parameter);
        $('dg822EditTitle').textContent = `DG822 · ${definition.label}`;
        input.value = Number(reading.value.toPrecision(12));
        input.setCustomValidity('');
        units.replaceChildren(...Object.keys(definition.units).map(unit => new Option(unit, unit, false, unit === reading.unit)));
        $('dg822RmsNote').hidden = parameter !== 'amplitude';
        $('dg822RmsNote').textContent = getGenerator().waveform === 'sine'
          ? 'Sine: Vpp = 2 × √2 × Vrms. DC offset is separate.'
          : 'Square: Vpp = 2 × Vrms. DC offset is separate.';
        editor.showModal();
        input.focus();
        input.select();
      });
    }
    const clearError = () => input.setCustomValidity('');
    input.addEventListener('input', clearError);
    units.addEventListener('change', clearError);
    $('dg822EditForm').addEventListener('submit', event => {
      event.preventDefault();
      if (!editing || !input.reportValidity()) return;
      try {
        const change = api.change(editing, input.value, units.value, getGenerator());
        onChange(change);
        editor.close();
      } catch (error) {
        input.setCustomValidity(error.message);
        input.reportValidity();
      }
    });
    $('dg822EditCancel').addEventListener('click', () => editor.close());
    editor.addEventListener('close', () => { $(ids[editing])?.focus(); editing = null; });
    function render() {
      const generator = getGenerator();
      for (const parameter of Object.keys(api.parameters)) {
        const reading = api.reading(generator, parameter);
        const button = $(api.parameters[parameter].element);
        button.textContent = `${format(reading.value, api.parameters[parameter].decimals)} ${reading.unit}`;
        button.setAttribute('aria-label', `Edit ${api.parameters[parameter].label}: ${button.textContent}`);
      }
      $('dg822Phase').textContent = `${format(0, 3)}º`;
      $('dg822PreviewTrace').setAttribute('d', generator.waveform === 'sine'
        ? 'M2 50C12 15 20 15 30 50S48 85 58 50S76 15 86 50S104 85 118 50'
        : 'M2 76H20V24H58V76H96V24H118');
      for (const channel of [1, 2]) {
        const enabled = Boolean(generator[`output${channel}Enabled`]);
        const button = $(`dg822Output${channel}`);
        button.setAttribute('aria-pressed', String(enabled));
        button.setAttribute('aria-label', `Output${channel} (CH${channel}): ${enabled ? 'ON' : 'OFF'}`);
      }
      $('dg822Channel').textContent = `CH1 · ${generator.waveform === 'sine' ? 'Sine' : 'Square'} · ${generator.output1Enabled ? 'ON' : 'OFF'}`;
      $('dg822Channel').setAttribute('data-output', generator.output1Enabled ? 'on' : 'off');
      $('dg822SelectSine').setAttribute('aria-pressed', String(generator.waveform === 'sine'));
      $('dg822SelectSquare').setAttribute('aria-pressed', String(generator.waveform === 'square'));
    }
    return {
      render,
      reset() { showMenu(false); },
      open() {
        showMenu(false);
        render();
        frame.open();
      }
    };
  }
};

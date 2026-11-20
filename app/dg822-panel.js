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
  // Amplitude RMS units refer to the AC component of the current square waveform.
  reading(generator, parameter) {
    const definition = this.parameters[parameter];
    const unit = generator[definition.unitProperty] || definition.defaultUnit;
    return { value: generator[definition.property] / definition.units[unit], unit };
  },
  change(parameter, value, unit) {
    const definition = this.parameters[parameter];
    if (!definition || !Object.hasOwn(definition.units, unit)) throw new RangeError('Invalid unit.');
    const base = Number(value) * definition.units[unit];
    if (!Number.isFinite(base) || (parameter !== 'offset' && base <= 0) || (parameter === 'frequency' && !Number.isFinite(1 / base))) {
      throw new RangeError(parameter === 'offset' ? 'Enter a finite offset.' : 'Enter a positive, finite value.');
    }
    return { [definition.property]: base, [definition.unitProperty]: unit };
  },
  create({ getGenerator, onChange }) {
    const api = window.InstrumentLab.DG822Panel;
    const format = window.InstrumentLab.DG822Panel.formatNumber;
    const $ = id => document.getElementById(id);
    const dialog = $('dg822Dialog');
    const handle = $('dg822WindowBar');
    $('dg822Faceplate').src = window.InstrumentLabImages.generator;
    let drag = null;
    let editing = null;
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
        const change = api.change(editing, input.value, units.value);
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
        $(api.parameters[parameter].element).textContent = `${format(reading.value, api.parameters[parameter].decimals)} ${reading.unit}`;
      }
      $('dg822Phase').textContent = `${format(0, 3)}º`;
    }
    function close() { dialog.close(); }
    $('dg822Close').addEventListener('click', close);
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    });
    dialog.addEventListener('close', () => {
      document.querySelector('[data-instrument="dg822"]')?.focus();
    });
    // Drag only the title bar, keeping the close button and page scroll usable.
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const bounds = dialog.getBoundingClientRect();
      drag = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      dialog.style.left = `${bounds.left}px`;
      dialog.style.top = `${bounds.top}px`;
      dialog.style.transform = 'none';
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (!drag) return;
      dialog.style.left = `${Math.max(0, Math.min(window.innerWidth - dialog.offsetWidth, event.clientX - drag.x))}px`;
      dialog.style.top = `${Math.max(0, Math.min(window.innerHeight - handle.offsetHeight, event.clientY - drag.y))}px`;
    });
    const endDrag = () => { drag = null; };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('lostpointercapture', endDrag);
    window.addEventListener('resize', () => {
      dialog.style.removeProperty('left');
      dialog.style.removeProperty('top');
      dialog.style.removeProperty('transform');
    });
    return {
      render,
      open() {
        render();
        if (!dialog.open) dialog.show();
        $('dg822Close').focus({ preventScroll: true });
      }
    };
  }
};

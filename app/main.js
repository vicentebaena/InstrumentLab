'use strict';
(() => {
  const { circuits, translations, generatorDefaults } = window.InstrumentLab;
  const $ = id => document.getElementById(id);
  let language = 'en';
  try { language = localStorage.getItem('instrumentlab-language') === 'es' ? 'es' : 'en'; } catch {}
  const state = { circuitId: 'rc', parameters: { ...circuits.rc.defaults }, generator: { ...generatorDefaults } };
  const t = key => translations[language][key];
  const number = value => new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(value);
  let editing = null;
  const dg822Panel = window.InstrumentLab.DG822Panel.create({ getGenerator: () => state.generator, onChange: change => { Object.assign(state.generator, change); render(); } });
  function render() {
    document.documentElement.lang = language;
    $('language').value = language;
    for (const [parameter, id] of [['frequency', 'generatorFrequency'], ['amplitude', 'generatorAmplitude'], ['offset', 'generatorOffset']]) {
      const reading = window.InstrumentLab.DG822Panel.reading(state.generator, parameter);
      $(id).textContent = `${number(reading.value)} ${reading.unit}`;
    }
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $('generatorWaveform').textContent = t(state.generator.waveform);
    $('generatorOutputState').textContent = t(state.generator.output1Enabled ? 'outputOn' : 'outputOff');
    $('rcObservation').textContent = t(state.generator.waveform === 'sine' ? 'observeSine' : 'observe');
    dg822Panel.render();
    const circuit = circuits[state.circuitId];
    $('circuit').replaceChildren(...Object.entries(circuits).map(([id, item]) => new Option(t(item.titleKey), id, false, id === state.circuitId)));
    $('circuitTitle').textContent = t(circuit.titleKey);
    $('diagram').innerHTML = circuit.diagram({ resistanceLabel: `${number(state.parameters.resistance / 1000)} kΩ`, capacitanceLabel: `${number(state.parameters.capacitance * 1e9)} nF` }, t);
    $('scopeDisplay').innerHTML = window.InstrumentLab.oscilloscope.render(circuit, state.parameters, state.generator, t, number);
    const { tau, cutoff } = circuit.characteristics(state.parameters);
    $('tau').textContent = tau < 0.001 ? `${number(tau * 1e6)} µs` : `${number(tau * 1000)} ms`;
    $('cutoff').textContent = cutoff >= 1000 ? `${number(cutoff / 1000)} kHz` : `${number(cutoff)} Hz`;
  }
  function openEditor(parameter) {
    const definition = circuits[state.circuitId].parameters[parameter];
    if (!definition) return;
    editing = parameter;
    $('componentTitle').textContent = t(definition.labelKey);
    $('componentUnit').textContent = definition.unit;
    const input = $('componentValue');
    input.min = definition.min;
    input.max = definition.max;
    input.value = Number((state.parameters[parameter] / definition.scale).toPrecision(12));
    $('componentDialog').showModal();
    input.focus();
    input.select();
  }
  $('diagram').addEventListener('click', event => {
    if (event.target.closest('[data-instrument="dg822"]')) { dg822Panel.open(); return; }
    const target = event.target.closest('[data-parameter]');
    if (target) openEditor(target.dataset.parameter);
  });
  $('diagram').addEventListener('keydown', event => {
    if (event.target.closest('[data-instrument="dg822"]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); dg822Panel.open(); return;
    }
    const target = event.target.closest('[data-parameter]');
    if (target && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openEditor(target.dataset.parameter);
    }
  });
  $('componentForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!editing || !$('componentValue').reportValidity()) return;
    const definition = circuits[state.circuitId].parameters[editing];
    state.parameters[editing] = Number($('componentValue').value) * definition.scale;
    render();
    $('componentDialog').close();
  });
  $('cancelComponent').addEventListener('click', () => $('componentDialog').close());
  $('componentDialog').addEventListener('close', () => {
    $('diagram').querySelector(`[data-parameter="${editing}"]`)?.focus();
    editing = null;
  });
  $('resetCircuit').addEventListener('click', () => {
    state.parameters = { ...circuits[state.circuitId].defaults };
    state.generator = { ...generatorDefaults };
    render();
  });
  $('circuit').addEventListener('change', event => {
    state.circuitId = event.target.value;
    state.parameters = { ...circuits[state.circuitId].defaults };
    render();
  });
  $('language').addEventListener('change', event => {
    language = event.target.value;
    try { localStorage.setItem('instrumentlab-language', language); } catch {}
    render();
  });
  render();
})();

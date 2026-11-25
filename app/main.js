'use strict';
(() => {
  const { circuits, translations } = window.InstrumentLab;
  const $ = id => document.getElementById(id);
  let language = 'es';
  try { language = localStorage.getItem('instrumentlab-language') === 'en' ? 'en' : 'es'; } catch {}
  const state = window.InstrumentLab.createPracticeState('rc');
  const t = key => translations[language][key];
  const number = value => new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(value);
  let editing = null;
  const generatorController = window.InstrumentLab.createGeneratorController({ getSettings: () => state.generator, onChange: change => { Object.assign(state.generator, change); render(); } });
  const dg822Panel = window.InstrumentLab.DG822Panel.create({ controller: generatorController });
  const scopeController = window.InstrumentLab.createOscilloscopeController({
    getSettings: () => state.oscilloscope,
    setSettings: settings => { state.oscilloscope = settings; },
    getExperiment: () => ({ circuit: circuits[state.circuitId], parameters: state.parameters, generator: state.generator, probes: state.probes }),
    t, format: number, onChange: render, onAuto: () => restorePractice()
  });
  const rigolScopePanel = window.InstrumentLab.DS1102EPanel.create({ controller: scopeController, t });
  const plusScopeController = window.InstrumentLab.createOscilloscopeController({
    getSettings: () => state.oscilloscopePlus,
    setSettings: settings => { state.oscilloscopePlus = settings; },
    getExperiment: () => ({ circuit: circuits[state.circuitId], parameters: state.parameters, generator: state.generator, probes: state.probes }),
    t, format: number, onChange: render, onAuto: () => restorePractice()
  });
  const ds1104zPlusPanel = window.InstrumentLab.DS1104ZPlusPanel.create({ controller: plusScopeController, t });
  let selectedScopeModel = 'ds1102e';
  const scopeModels = {
    ds1102e: { id: 'ds1102e', name: 'Rigol DS1102E', image: window.InstrumentLabImages.scope, labelKey: 'openRigolScope', dialogId: 'ds1102eDialog', panel: rigolScopePanel },
    ds1104zplus: { id: 'ds1104zplus', name: 'Rigol DS1104Z Plus', image: window.InstrumentLabImages.ds1104zplusPhoto, labelKey: 'openDs1104zPlus', dialogId: 'ds1104zplusDialog', panel: ds1104zPlusPanel }
  };
  const selectedScope = () => scopeModels[selectedScopeModel];
  const activeScopeController = () => selectedScopeModel === 'ds1102e' ? scopeController : plusScopeController;
  const probePanel = window.InstrumentLab.createProbePanel({
    getProbes: () => state.probes, t,
    onToggle: channel => { state.probes[channel] = state.probes[channel] === 10 ? 1 : 10; render(); }
  });
  let animationFrame = null, animationTime = null;
  function renderScopes() {
    selectedScope().panel.renderScreen($('scopeDisplay'), { idPrefix: 'mainScope', showMenus: false, showCursors: false });
  }
  function syncAnimation() {
    if (!activeScopeController().needsAnimation()) {
      if (animationFrame !== null) window.cancelAnimationFrame?.(animationFrame);
      animationFrame = null; animationTime = null;
    } else if (animationFrame === null && window.requestAnimationFrame) {
      animationFrame = window.requestAnimationFrame(animate);
    }
  }
  function animate(now) {
    animationFrame = null;
    if (!activeScopeController().needsAnimation()) { animationTime = null; return; }
    if (animationTime === null) animationTime = now;
    if (now - animationTime >= 50) {
      activeScopeController().advance((now - animationTime) / 1000);
      animationTime = now;
      renderScopes();
    }
    syncAnimation();
  }
  function render() {
    document.documentElement.lang = language;
    $('language').value = language;
    $('scopeModel').value = selectedScopeModel;
    for (const [parameter, id] of [['frequency', 'generatorFrequency'], ['amplitude', 'generatorAmplitude'], ['offset', 'generatorOffset']]) {
      const reading = generatorController.reading(parameter, 1);
      $(id).textContent = `${number(reading.value)} ${reading.unit}`;
    }
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $('generatorWaveform').textContent = t(state.generator.waveform);
    $('generatorOutputState').textContent = t(state.generator.output1Enabled ? 'outputOn' : 'outputOff');
    $('rcObservation').textContent = t(state.generator.waveform === 'sine' ? 'observeSine' : 'observe');
    dg822Panel.render();
    probePanel.render();
    const circuit = circuits[state.circuitId];
    $('circuit').replaceChildren(...Object.entries(circuits).map(([id, item]) => new Option(t(item.titleKey), id, false, id === state.circuitId)));
    $('circuitTitle').textContent = t(circuit.titleKey);
    $('diagram').innerHTML = circuit.diagram({ scopeModel: { ...selectedScope(), openLabel: t(selectedScope().labelKey) }, probes: state.probes, resistanceLabel: `${number(state.parameters.resistance / 1000)} kΩ`, capacitanceLabel: `${number(state.parameters.capacitance * 1e9)} nF` }, t);
    renderScopes();
    syncAnimation();
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
    const probe = event.target.closest('[data-probe]');
    if (probe) { probePanel.open(Number(probe.dataset.probe)); return; }
    if (event.target.closest('[data-instrument="dg822"]')) { dg822Panel.open(); return; }
    if (event.target.closest('[data-instrument="ds1102e"], [data-instrument="ds1104zplus"]')) { selectedScope().panel.open(); return; }
    const target = event.target.closest('[data-parameter]');
    if (target) openEditor(target.dataset.parameter);
  });
  $('diagram').addEventListener('keydown', event => {
    const probe = event.target.closest('[data-probe]');
    if (probe && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); probePanel.open(Number(probe.dataset.probe)); return; }
    if (event.target.closest('[data-instrument="dg822"]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); dg822Panel.open(); return;
    }
    if (event.target.closest('[data-instrument="ds1102e"], [data-instrument="ds1104zplus"]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); selectedScope().panel.open(); return;
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
  function restorePractice(circuitId = state.circuitId) {
    scopeController.resetTransient();
    plusScopeController.resetTransient();
    Object.assign(state, window.InstrumentLab.createPracticeState(circuitId));
    dg822Panel.reset();
    render();
  }
  $('resetCircuit').addEventListener('click', () => restorePractice());
  $('circuit').addEventListener('change', event => restorePractice(event.target.value));
  $('scopeModel').addEventListener('change', event => {
    if (!Object.hasOwn(scopeModels, event.target.value)) return;
    if (event.target.value !== selectedScopeModel) {
      const previousWindow = $(selectedScope().dialogId);
      if (previousWindow.open) previousWindow.close();
    }
    selectedScopeModel = event.target.value;
    render();
  });
  $('language').addEventListener('change', event => {
    language = event.target.value;
    try { localStorage.setItem('instrumentlab-language', language); } catch {}
    render();
  });
  render();
})();

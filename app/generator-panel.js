'use strict';
// Reusable numeric editor, waveform menu and output controls; no faceplate IDs or number format.
window.InstrumentLab.createGeneratorPanel = ({ elements, controller, presentation, openWindow }) => {
  const { getSettings, actions, reading } = controller;
  const { menu, body, parameters, waveMenu, waveButtons, outputButtons, readings, phase, preview, channel, editor } = elements;
  const model = window.InstrumentLab.generator;
  let editing = null, menuOpen = false;
  function showMenu(open) {
    menuOpen = open;
    parameters.hidden = open;
    waveMenu.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
  }
  for (const [channel, button] of Object.entries(outputButtons)) {
    button.addEventListener('click', () => actions.output(Number(channel)));
  }
  menu.addEventListener('click', () => {
    showMenu(!menuOpen);
    body.scrollLeft = 0;
    if (menuOpen) waveButtons[getSettings().waveform]?.focus({ preventScroll: true });
  });
  for (const [waveform, button] of Object.entries(waveButtons)) {
    button.addEventListener('click', () => {
      actions.waveform(waveform);
      showMenu(false);
      readings.frequency.focus({ preventScroll: true });
    });
  }
  for (const [parameter, button] of Object.entries(readings)) {
    button.addEventListener('click', () => {
      editing = parameter;
      const definition = model.parameters[parameter];
      const value = reading(parameter);
      editor.title.textContent = presentation.editorTitle(parameter);
      editor.input.value = Number(value.value.toPrecision(12));
      editor.input.setCustomValidity('');
      editor.units.replaceChildren(...Object.keys(definition.units).map(unit => new Option(unit, unit, false, unit === value.unit)));
      editor.note.hidden = parameter !== 'amplitude';
      editor.note.textContent = presentation.rmsNote(getSettings().waveform);
      editor.dialog.showModal();
      editor.input.focus();
      editor.input.select();
    });
  }
  const clearError = () => editor.input.setCustomValidity('');
  editor.input.addEventListener('input', clearError);
  editor.units.addEventListener('change', clearError);
  editor.form.addEventListener('submit', event => {
    event.preventDefault();
    if (!editing || !editor.input.reportValidity()) return;
    try {
      actions.parameter(editing, editor.input.value, editor.units.value);
      editor.dialog.close();
    } catch (error) {
      editor.input.setCustomValidity(error.message);
      editor.input.reportValidity();
    }
  });
  editor.cancel.addEventListener('click', () => editor.dialog.close());
  editor.dialog.addEventListener('close', () => { readings[editing]?.focus(); editing = null; });
  function render() {
    const settings = getSettings();
    for (const [parameter, button] of Object.entries(readings)) {
      const value = reading(parameter);
      button.textContent = presentation.readingText(parameter, value);
      button.setAttribute('aria-label', presentation.readingLabel(parameter, button.textContent));
    }
    phase.textContent = presentation.phaseText();
    preview.setAttribute('d', presentation.previewPath(settings.waveform));
    for (const [output, button] of Object.entries(outputButtons)) {
      const enabled = Boolean(settings[`output${output}Enabled`]);
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', presentation.outputLabel(output, enabled));
    }
    channel.textContent = presentation.channelText(settings);
    channel.setAttribute('data-output', settings.output1Enabled ? 'on' : 'off');
    for (const [waveform, button] of Object.entries(waveButtons)) button.setAttribute('aria-pressed', String(settings.waveform === waveform));
  }
  return { render, reset() { showMenu(false); }, open() { showMenu(false); render(); openWindow(); } };
};

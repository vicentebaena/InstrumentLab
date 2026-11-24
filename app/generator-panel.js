'use strict';
// Reusable numeric editor, waveform menu and output controls; no faceplate IDs or number format.
window.InstrumentLab.createGeneratorPanel = ({ elements, controller, presentation, openWindow }) => {
  const { getSettings, getChannel, actions, reading } = controller;
  const { menu, body, parameters, waveMenu, waveButtons, outputButtons, readings, phase, preview, channelButtons, channelWaves, editor } = elements;
  const model = window.InstrumentLab.generator;
  let editing = null, editingChannel = null, menuOpen = false;
  function closeEditor(restoreFocus = true) {
    const previous = editing;
    editing = null;
    editingChannel = null;
    editor.container.hidden = true;
    parameters.inert = false;
    if (restoreFocus && previous) readings[previous]?.focus({ preventScroll: true });
  }
  function clearError() {
    editor.input.setCustomValidity('');
    editor.error.textContent = '';
    editor.input.setAttribute('aria-invalid', 'false');
  }
  function showMenu(open) {
    closeEditor(false);
    menuOpen = open;
    parameters.hidden = open;
    waveMenu.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
  }
  for (const [channel, button] of Object.entries(channelButtons)) {
    button.addEventListener('click', () => {
      closeEditor(false);
      actions.channel(Number(channel));
    });
  }
  for (const [channel, button] of Object.entries(outputButtons)) {
    button.addEventListener('click', () => actions.output(Number(channel)));
  }
  menu.addEventListener('click', () => {
    showMenu(!menuOpen);
    body.scrollLeft = 0;
    if (menuOpen) waveButtons[getChannel().waveform]?.focus({ preventScroll: true });
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
      editingChannel = getSettings().selectedChannel || 1;
      const definition = model.parameters[parameter];
      const value = reading(parameter);
      editor.title.textContent = presentation.editorTitle(parameter);
      editor.input.value = presentation.editorValue?.(parameter, value.value) ?? String(Number(value.value.toPrecision(12)));
      clearError();
      editor.units.replaceChildren(...Object.keys(definition.units).map(unit => new Option(unit, unit, false, unit === value.unit)));
      for (const key of editor.keys) {
        if (key.getAttribute('data-edit-key') === 'sign') key.disabled = parameter !== 'offset';
      }
      editor.note.hidden = true;
      editor.note.textContent = presentation.rmsNote(getChannel().waveform);
      editor.input.title = parameter === 'amplitude' ? editor.note.textContent : '';
      editor.container.hidden = false;
      parameters.inert = true;
      editor.input.focus();
      editor.input.select();
    });
  }
  editor.input.addEventListener('input', clearError);
  editor.units.addEventListener('change', clearError);
  editor.form.addEventListener('submit', event => {
    event.preventDefault();
    if (!editing) return;
    try {
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(editor.input.value).trim())) throw new RangeError('Enter a valid number.');
      actions.parameter(editing, editor.input.value, editor.units.value);
      closeEditor();
    } catch (error) {
      editor.input.setCustomValidity(error.message);
      editor.error.textContent = error.message;
      editor.input.setAttribute('aria-invalid', 'true');
    }
  });
  editor.cancel.addEventListener('click', () => closeEditor());
  editor.container.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeEditor();
    }
  });
  for (const key of editor.keys) {
    // Keep the input selection when tapping the touchscreen keys.
    key.addEventListener('pointerdown', event => event.preventDefault());
    key.addEventListener('click', () => {
      if (key.disabled) return;
      const action = key.getAttribute('data-edit-key');
      const input = editor.input;
      let value = input.value;
      let start = input.selectionStart ?? value.length;
      let end = input.selectionEnd ?? start;
      if (action === 'sign') {
        const negative = value.startsWith('-');
        value = negative ? value.slice(1) : `-${value}`;
        start = Math.max(0, start + (negative ? -1 : 1));
        end = Math.max(0, end + (negative ? -1 : 1));
      } else {
        if (action === 'backspace' && start === end) start = Math.max(0, start - 1);
        const inserted = action === 'backspace' ? '' : action;
        const next = value.slice(0, start) + inserted + value.slice(end);
        if (action === '.' && (next.match(/\./g) || []).length > 1) return;
        value = next;
        start += inserted.length;
        end = start;
      }
      input.value = value;
      clearError();
      input.focus({ preventScroll: true });
      input.setSelectionRange(start, end);
    });
  }
  function render() {
    const settings = getSettings();
    const active = getChannel();
    if (editing && editingChannel !== (settings.selectedChannel || 1)) closeEditor(false);
    for (const [parameter, button] of Object.entries(readings)) {
      const value = reading(parameter);
      button.textContent = presentation.readingText(parameter, value);
      button.setAttribute('aria-label', presentation.readingLabel(parameter, button.textContent));
    }
    phase.textContent = presentation.phaseText();
    preview.setAttribute('d', presentation.previewPath(active.waveform));
    for (const [output, button] of Object.entries(outputButtons)) {
      const enabled = Boolean(settings[`output${output}Enabled`]);
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', presentation.outputLabel(output, enabled));
    }
    for (const [channel, button] of Object.entries(channelButtons)) {
      const selected = (settings.selectedChannel || 1) === Number(channel);
      const waveform = getChannel(Number(channel)).waveform;
      channelWaves[channel].textContent = presentation.waveformText(waveform);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', presentation.channelLabel(channel, waveform));
    }
    for (const [waveform, button] of Object.entries(waveButtons)) button.setAttribute('aria-pressed', String(active.waveform === waveform));
  }
  return { render, reset() { showMenu(false); }, open() { showMenu(false); render(); openWindow(); } };
};

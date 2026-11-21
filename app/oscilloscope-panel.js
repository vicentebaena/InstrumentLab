'use strict';
// Reusable front-panel bindings and channel-menu presentation, independent of DOM IDs/model.
window.InstrumentLab.createOscilloscopePanel = ({ elements, controller, display, t, openWindow }) => {
  const { getSettings, actions } = controller;
  const { auto, runStop, menuToggle, channelButtons, scale, timeScale, position, horizontalPosition, screen, menu, menuTitle, triggerButton, triggerMenu, triggerLevel, submenuViews = {}, submenuIndicator, selectionKnob, probeConnectors = {} } = elements;
  const scope = window.InstrumentLab.oscilloscope;
  auto.addEventListener('click', actions.auto);
  runStop?.addEventListener('click', actions.runStop);
  menuToggle.addEventListener('click', actions.menu);
  triggerButton?.addEventListener('click', actions.triggerMenu);
  for (const [name, view] of Object.entries(submenuViews)) view.button.addEventListener('click', () => actions.submenu(name));
  for (const [channel, button] of Object.entries(channelButtons)) {
    button.addEventListener('click', () => actions.channel(Number(channel)));
  }
  const selectedVisible = () => Boolean(getSettings().channels[getSettings().selectedChannel]?.visible);
  window.InstrumentLab.bindRotaryControl(scale, { onStep: actions.scale, enabled: selectedVisible });
  window.InstrumentLab.bindRotaryControl(timeScale, { onStep: actions.timeScale });
  window.InstrumentLab.bindRotaryControl(position, { onStep: direction => actions.position(-direction), enabled: selectedVisible });
  if (triggerLevel) window.InstrumentLab.bindRotaryControl(triggerLevel, { onStep: direction => actions.triggerLevel(-direction) });
  if (horizontalPosition) window.InstrumentLab.bindRotaryControl(horizontalPosition, { onStep: direction => actions.horizontalPosition(-direction) });
  if (selectionKnob) window.InstrumentLab.bindRotaryControl(selectionKnob, {
    onStep: actions.submenuStep, onPress: actions.submenuConfirm,
    enabled: () => (getSettings().menuChannel !== null || getSettings().triggerMenuOpen) && getSettings().submenu !== null,
    clockwiseStep: 1, keyDirections: { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  });
  function slider(element, { min, max, value, text, disabled = false, label, help }) {
    for (const [name, content] of Object.entries({ valuemin: min, valuemax: max, valuenow: value, valuetext: text, disabled, label: t(label) })) {
      element.setAttribute(`aria-${name}`, String(content));
    }
    element.title = t(help);
  }
  function render() {
    screen.innerHTML = controller.getDisplay(display);
    const settings = getSettings();
    if (runStop) {
      const stopped = settings.acquisitionRunning === false;
      runStop.setAttribute('aria-pressed', String(stopped));
      runStop.setAttribute('aria-label', t(stopped ? 'scopeResume' : 'scopeStop'));
    }
    const connections = controller.getConnections();
    for (const [channel, connector] of Object.entries(probeConnectors)) {
      connector.hidden = !connections[channel];
      connector.alt = t('scopeProbeConnected').replace('{channel}', channel);
    }
    for (const [channel, button] of Object.entries(channelButtons)) {
      const selected = settings.selectedChannel === Number(channel);
      const visible = settings.channels[channel].visible;
      button.setAttribute('aria-pressed', String(visible));
      button.setAttribute('data-selected', String(selected));
      button.setAttribute('aria-label', `CH${channel}: ${visible ? 'visible' : 'hidden'}${selected ? ', selected' : ''}`);
    }
    const channel = settings.selectedChannel;
    const selected = settings.channels[channel];
    slider(scale, { min: 0, max: scope.verticalScales.length - 1,
      value: selected ? scope.verticalScales.indexOf(selected.voltsPerDivision) : 0,
      text: selected ? `CH${channel} ${scope.formatVerticalScale(selected.voltsPerDivision)}` : '',
      disabled: !selected?.visible, label: 'scopeVerticalScale', help: 'scopeVerticalHelp' });
    slider(timeScale, { min: 0, max: scope.horizontalScales.length - 1,
      value: scope.horizontalScales.indexOf(settings.timePerDivision), text: scope.formatTimeScale(settings.timePerDivision),
      label: 'scopeHorizontalScale', help: 'scopeHorizontalHelp' });
    slider(position, { min: -4, max: 4, value: selected?.positionDivisions ?? 0,
      text: selected ? `CH${channel} ${selected.positionDivisions.toFixed(1)} div` : '',
      disabled: !selected?.visible, label: 'scopeVerticalPosition', help: 'scopePositionHelp' });
    if (horizontalPosition) slider(horizontalPosition, { min: -scope.horizontalPositionLimit, max: scope.horizontalPositionLimit,
      value: settings.horizontalPositionDivisions ?? 0, text: `${(settings.horizontalPositionDivisions ?? 0).toFixed(1)} div`,
      label: 'scopeHorizontalPosition', help: 'scopeHorizontalPositionHelp' });
    if (triggerLevel) slider(triggerLevel, { min: -1e6, max: 1e6,
      value: settings.trigger.level, text: `${settings.trigger.level} V · CH${settings.trigger.source}`,
      label: 'scopeTriggerLevel', help: 'scopeTriggerLevelHelp' });
    menu.hidden = settings.menuChannel === null;
    menuToggle.setAttribute('aria-expanded', String(settings.menuChannel !== null || Boolean(settings.triggerMenuOpen)));
    if (triggerMenu) triggerMenu.hidden = !settings.triggerMenuOpen;
    if (triggerButton) triggerButton.setAttribute('aria-expanded', String(Boolean(settings.triggerMenuOpen)));
    menu.setAttribute('data-channel', String(settings.menuChannel));
    menuTitle.textContent = settings.menuChannel ? `CH${settings.menuChannel}` : '';
    const submenuOpen = (settings.menuChannel !== null || settings.triggerMenuOpen) && settings.submenu !== null;
    if (submenuIndicator) submenuIndicator.hidden = !submenuOpen;
    if (selectionKnob) {
      selectionKnob.setAttribute('aria-disabled', String(settings.submenu === null));
      selectionKnob.setAttribute('aria-label', t('scopeMenuSelect'));
      selectionKnob.title = t('scopeMenuSelectHelp');
    }
    for (const [name, view] of Object.entries(submenuViews)) {
      const open = submenuOpen && settings.submenu === name;
      const definition = scope.submenus[name];
      const target = definition.target === 'trigger' ? settings.trigger : settings.channels[settings.menuChannel ?? settings.selectedChannel];
      const committed = target?.[definition.property] ?? definition.options[0];
      view.menu.hidden = !open;
      view.menu.setAttribute('aria-label', t(view.labelKey));
      view.button.setAttribute('aria-expanded', String(open));
      const activeMainMenu = definition.target === 'trigger' ? Boolean(settings.triggerMenuOpen) : settings.menuChannel !== null;
      view.button.hidden = !activeMainMenu;
      view.button.setAttribute('aria-label', t(view.labelKey));
      if (view.value) {
        if (view.renderValue) view.renderValue(view.value, committed);
        else view.value.textContent = view.formatValue ? view.formatValue(committed) : String(committed);
      }
      const highlighted = open ? settings.submenuSelection : committed;
      for (const [value, option] of Object.entries(view.options)) {
        option.setAttribute('data-selected', String(value === String(highlighted)));
        option.setAttribute('aria-current', String(value === String(highlighted)));
      }
    }
  }
  return { render, open() { render(); openWindow(); } };
};

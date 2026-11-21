'use strict';
// Reusable front-panel bindings and channel-menu presentation, independent of DOM IDs/model.
window.InstrumentLab.createOscilloscopePanel = ({ elements, controller, display, t, openWindow }) => {
  const { getSettings, actions } = controller;
  const { auto, menuToggle, channelButtons, scale, timeScale, position, screen, menu, menuTitle, couplingButton, couplingSubmenu, couplingOptions, couplingValue, submenuIndicator } = elements;
  const scope = window.InstrumentLab.oscilloscope;
  auto.addEventListener('click', actions.auto);
  menuToggle.addEventListener('click', actions.menu);
  couplingButton?.addEventListener('click', actions.couplingMenu);
  for (const [channel, button] of Object.entries(channelButtons)) {
    button.addEventListener('click', () => actions.channel(Number(channel)));
  }
  const selectedVisible = () => Boolean(getSettings().channels[getSettings().selectedChannel]?.visible);
  window.InstrumentLab.bindRotaryControl(scale, { onStep: actions.scale, enabled: selectedVisible });
  window.InstrumentLab.bindRotaryControl(timeScale, { onStep: actions.timeScale });
  window.InstrumentLab.bindRotaryControl(position, { onStep: direction => actions.position(-direction), enabled: selectedVisible });
  function slider(element, { min, max, value, text, disabled = false, label, help }) {
    for (const [name, content] of Object.entries({ valuemin: min, valuemax: max, valuenow: value, valuetext: text, disabled, label: t(label) })) {
      element.setAttribute(`aria-${name}`, String(content));
    }
    element.title = t(help);
  }
  function render() {
    screen.innerHTML = controller.getDisplay(display);
    const settings = getSettings();
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
    menu.hidden = settings.menuChannel === null;
    menuToggle.setAttribute('aria-expanded', String(settings.menuChannel !== null));
    menu.setAttribute('data-channel', String(settings.menuChannel));
    menuTitle.textContent = settings.menuChannel ? `CH${settings.menuChannel}` : '';
    const submenuOpen = settings.menuChannel !== null && settings.submenu === 'coupling';
    if (couplingSubmenu) { couplingSubmenu.hidden = !submenuOpen; couplingSubmenu.setAttribute('aria-label', t('scopeCoupling')); }
    if (submenuIndicator) submenuIndicator.hidden = !submenuOpen;
    if (couplingButton) {
      couplingButton.setAttribute('aria-expanded', String(submenuOpen));
      couplingButton.setAttribute('aria-label', t('scopeCoupling'));
    }
    const coupling = settings.channels[settings.menuChannel]?.coupling ?? 'DC';
    if (couplingValue) couplingValue.textContent = coupling;
    for (const [value, option] of Object.entries(couplingOptions || {})) {
      option.setAttribute('data-selected', String(value === coupling));
      option.setAttribute('aria-current', String(value === coupling));
    }
  }
  return { render, open() { render(); openWindow(); } };
};

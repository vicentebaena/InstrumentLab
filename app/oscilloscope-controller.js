'use strict';
// Shared commands/state access. A front panel only maps its controls to these actions.
window.InstrumentLab.createOscilloscopeController = ({ getSettings, setSettings, onChange, onAuto, getExperiment, t, format }) => {
  const scope = window.InstrumentLab.oscilloscope;
  const update = (operation, ...args) => {
    setSettings(scope[operation](getSettings(), ...args));
    onChange();
  };
  return {
    getSettings,
    actions: {
      channel: channel => update('pressChannel', channel),
      menu: () => update('toggleChannelMenu'),
      couplingMenu: () => update('openCouplingSubmenu'),
      scale: direction => update('stepVerticalScale', direction),
      timeScale: direction => update('stepHorizontalScale', direction),
      position: direction => update('stepVerticalPosition', direction),
      auto: () => onAuto()
    },
    getDisplay({ idPrefix = 'scope', horizontalDivisions = 10, ...presentation } = {}) {
      const { circuit, parameters, generator } = getExperiment();
      return scope.render(circuit, parameters, generator, t, format, idPrefix, horizontalDivisions, getSettings(), presentation);
    }
  };
};

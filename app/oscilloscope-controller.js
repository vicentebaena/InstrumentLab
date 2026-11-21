'use strict';
// Shared commands/state access. A front panel only maps its controls to these actions.
window.InstrumentLab.createOscilloscopeController = ({ getSettings, setSettings, onChange, onAuto, getExperiment, t, format }) => {
  let freeRunOffset = 0, levelTimer = null;
  const clearLevelTimer = () => {
    if (levelTimer !== null) window.clearTimeout?.(levelTimer);
    levelTimer = null;
  };
  const scope = window.InstrumentLab.oscilloscope;
  const update = (operation, ...args) => {
    setSettings(scope[operation](getSettings(), ...args));
    onChange();
  };
  return {
    getSettings,
    resetTransient() { clearLevelTimer(); freeRunOffset = 0; },
    getAcquisition() {
      const { circuit, parameters, generator } = getExperiment();
      return scope.analyzeTrigger(circuit, parameters, generator, getSettings());
    },
    needsAnimation() {
      const settings = getSettings(), { generator } = getExperiment();
      return generator.output1Enabled !== false && Object.values(settings.channels).some(channel => channel.visible && channel.coupling !== 'GND') && !this.getAcquisition().locked;
    },
    advance(seconds) {
      if (this.getAcquisition().locked) freeRunOffset = 0;
      else {
        const period = 1 / getExperiment().generator.frequency;
        const timePerDivision = getSettings().timePerDivision ?? scope.defaults.timePerDivision;
        freeRunOffset = (freeRunOffset + Math.max(0, seconds) * scope.freeRunDivisionsPerSecond * timePerDivision) % period;
      }
    },
    actions: {
      channel: channel => update('pressChannel', channel),
      menu: () => update('toggleChannelMenu'),
      triggerMenu: () => update('openTriggerMenu'),
      triggerLevel: direction => {
        clearLevelTimer();
        update('stepTriggerLevel', direction);
        if (window.setTimeout) levelTimer = window.setTimeout(() => {
          levelTimer = null;
          update('hideTriggerLevel');
        }, 3000);
      },
      submenu: name => update('openSubmenu', name),
      submenuStep: direction => update('stepSubmenu', direction),
      submenuConfirm: () => update('confirmSubmenu'),
      scale: direction => update('stepVerticalScale', direction),
      timeScale: direction => update('stepHorizontalScale', direction),
      position: direction => update('stepVerticalPosition', direction),
      horizontalPosition: direction => update('stepHorizontalPosition', direction),
      auto: () => { clearLevelTimer(); freeRunOffset = 0; onAuto(); }
    },
    getDisplay({ idPrefix = 'scope', horizontalDivisions = 10, ...presentation } = {}) {
      const { circuit, parameters, generator } = getExperiment();
      const acquisition = this.getAcquisition();
      if (acquisition.locked) freeRunOffset = 0;
      return scope.render(circuit, parameters, generator, t, format, idPrefix, horizontalDivisions, getSettings(),
        { ...presentation, triggerAnalysis: acquisition, freeRunTime: -(freeRunOffset % (1 / generator.frequency)) });
    }
  };
};

'use strict';
// Shared commands/state access. A front panel only maps its controls to these actions.
window.InstrumentLab.createOscilloscopeController = ({ getSettings, setSettings, onChange, onAuto, getExperiment, t, format }) => {
  let freeRunOffset = 0, levelTimer = null, capture = null;
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
    getConnections() {
      const { circuit } = getExperiment();
      return Object.fromEntries(Object.keys(getSettings().channels).map(channel => {
        const wiring = circuit.connections?.[`ch${channel}`];
        return [channel, Array.isArray(wiring) && wiring.length > 0];
      }));
    },
    resetTransient() { clearLevelTimer(); freeRunOffset = 0; capture = null; },
    getAcquisition() {
      const { circuit, parameters, generator, probes } = getExperiment();
      const settings = getSettings();
      return scope.analyzeTrigger(circuit, parameters, generator, settings, scope.createSignals(circuit, parameters, generator, settings, probes));
    },
    needsAnimation() {
      const settings = getSettings(), { generator } = getExperiment();
      return settings.acquisitionRunning !== false && generator.output1Enabled !== false && Object.values(settings.channels).some(channel => channel.visible && channel.coupling !== 'GND') && !this.getAcquisition().locked;
    },
    advance(seconds) {
      if (getSettings().acquisitionRunning === false) return;
      if (this.getAcquisition().locked) freeRunOffset = 0;
      else {
        const period = 1 / getExperiment().generator.frequency;
        const timePerDivision = getSettings().timePerDivision ?? scope.defaults.timePerDivision;
        freeRunOffset = (freeRunOffset + Math.max(0, seconds) * scope.freeRunDivisionsPerSecond * timePerDivision) % period;
      }
    },
    actions: {
      runStop: () => {
        const settings = getSettings();
        if (settings.acquisitionRunning === false) {
          capture = null;
          setSettings({ ...settings, acquisitionRunning: true });
        } else {
          const experiment = getExperiment();
          // Snapshot the ideal waveform inputs, never its SVG or display settings.
          // Display controls can then reproject both frozen signals on one time axis.
          const parameters = JSON.parse(JSON.stringify(experiment.parameters));
          const generator = JSON.parse(JSON.stringify(experiment.generator));
          const circuit = { ...experiment.circuit };
          const probes = { ...experiment.probes };
          const acquisition = scope.analyzeTrigger(circuit, parameters, generator, settings, scope.createSignals(circuit, parameters, generator, settings, probes));
          capture = { circuit, parameters, generator, probes, acquisition: {
            ...acquisition, locked: true,
            time: acquisition.time + (acquisition.locked ? 0 : -(freeRunOffset % (1 / generator.frequency)))
          } };
          setSettings({ ...settings, acquisitionRunning: false });
        }
        onChange();
      },
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
      auto: () => { clearLevelTimer(); freeRunOffset = 0; capture = null; onAuto(); }
    },
    getDisplay({ idPrefix = 'scope', horizontalDivisions = 10, ...presentation } = {}) {
      const frozen = getSettings().acquisitionRunning === false ? capture : null;
      const { circuit, parameters, generator, probes } = frozen ?? getExperiment();
      const acquisition = frozen?.acquisition ?? this.getAcquisition();
      if (!frozen && acquisition.locked) freeRunOffset = 0;
      return scope.render(circuit, parameters, generator, t, format, idPrefix, horizontalDivisions, getSettings(),
        { ...presentation, probes, triggerAnalysis: acquisition, freeRunTime: -(freeRunOffset % (1 / generator.frequency)) });
    }
  };
};

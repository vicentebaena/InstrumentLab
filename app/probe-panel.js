'use strict';
// Physical probe switch: independent of the oscilloscope's compensation setting.
window.InstrumentLab.createProbePanel = ({ getProbes, onToggle, t }) => {
  const $ = id => document.getElementById(id);
  let channel = 1;
  const frame = window.InstrumentLab.createInstrumentWindow({
    dialogId: 'probeDialog', handleId: 'probeWindowBar', closeId: 'probeClose',
    triggerSelector: '[data-probe]'
  });
  $('probePhoto').src = window.InstrumentLabImages.probeBody;
  for (const id of ['probeAttenuation', 'probeSwitch']) $(id).addEventListener('click', () => onToggle(channel));
  $('probeDialog').addEventListener('close', () => document.querySelector(`[data-probe="${channel}"]`)?.focus());
  function render() {
    const factor = getProbes()[channel] ?? 1;
    $('probeTitle').textContent = t('physicalProbe').replace('{channel}', channel);
    $('probePhoto').alt = t('probePhoto');
    $('probeAttenuation').textContent = `X${factor}`;
    for (const id of ['probeAttenuation', 'probeSwitch']) {
      $(id).setAttribute('aria-pressed', String(factor === 10));
      $(id).setAttribute('aria-label', t('toggleProbe').replace('{factor}', factor).replace('{next}', factor === 10 ? 1 : 10));
    }
    $('probeDialog').setAttribute('data-channel', channel);
  }
  return { render, open(value) { channel = value; render(); frame.open(); } };
};

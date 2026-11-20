'use strict';
// Rigol DS1102E faceplate. Both scope views use the same experiment and renderer.
window.InstrumentLab.DS1102EPanel = {
  create({ getDisplay, getSettings, onChannel, onMenu }) {
    const $ = id => document.getElementById(id);
    $('ds1102eFaceplate').src = window.InstrumentLabImages.scope;
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'ds1102eDialog', handleId: 'ds1102eWindowBar', closeId: 'ds1102eClose',
      triggerSelector: '[data-instrument="ds1102e"]'
    });
    $('ds1102eMenuToggle').addEventListener('click', onMenu);
    for (const channel of [1, 2]) {
      $(`ds1102eCH${channel}`).addEventListener('click', () => onChannel(channel));
    }
    function render() {
      $('ds1102eDisplay').innerHTML = getDisplay();
      const settings = getSettings();
      for (const channel of [1, 2]) {
        const button = $(`ds1102eCH${channel}`);
        button.setAttribute('aria-pressed', String(settings.channels[channel].visible));
        button.setAttribute('data-selected', String(settings.selectedChannel === channel));
        button.setAttribute('aria-label', `CH${channel}: ${settings.channels[channel].visible ? 'visible' : 'hidden'}${settings.selectedChannel === channel ? ', selected' : ''}`);
      }
      const menu = $('ds1102eChannelMenu');
      menu.hidden = settings.menuChannel === null;
      $('ds1102eMenuToggle').setAttribute('aria-expanded', String(settings.menuChannel !== null));
      menu.setAttribute('data-channel', String(settings.menuChannel));
      $('ds1102eMenuTitle').textContent = settings.menuChannel ? `CH${settings.menuChannel}` : '';
    }
    return { render, open() { render(); frame.open(); } };
  }
};

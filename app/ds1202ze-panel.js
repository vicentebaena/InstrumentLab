'use strict';
// Rigol DS1202Z-E faceplate. Both scope views use the same experiment and renderer.
window.InstrumentLab.DS1202ZEPanel = {
  create({ getDisplay, getSettings, onChannel }) {
    const $ = id => document.getElementById(id);
    $('ds1202zeFaceplate').src = window.InstrumentLabImages.scope;
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'ds1202zeDialog', handleId: 'ds1202zeWindowBar', closeId: 'ds1202zeClose',
      triggerSelector: '[data-instrument="ds1202ze"]'
    });
    for (const channel of [1, 2]) {
      $(`ds1202zeCH${channel}`).addEventListener('click', () => onChannel(channel));
    }
    function render() {
      $('ds1202zeDisplay').innerHTML = getDisplay();
      const settings = getSettings();
      for (const channel of [1, 2]) {
        const button = $(`ds1202zeCH${channel}`);
        button.setAttribute('aria-pressed', String(settings.channels[channel].visible));
        button.setAttribute('data-selected', String(settings.selectedChannel === channel));
        button.setAttribute('aria-label', `CH${channel}: ${settings.channels[channel].visible ? 'visible' : 'hidden'}${settings.selectedChannel === channel ? ', selected' : ''}`);
      }
      const menu = $('ds1202zeChannelMenu');
      menu.hidden = settings.menuChannel === null;
      menu.setAttribute('data-channel', String(settings.menuChannel));
      $('ds1202zeMenuTitle').textContent = settings.menuChannel ? `CH${settings.menuChannel}` : '';
    }
    return { render, open() { render(); frame.open(); } };
  }
};

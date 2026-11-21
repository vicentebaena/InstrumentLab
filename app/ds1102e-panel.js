'use strict';
// DS1102E adapter: photograph, DOM mapping, window and screen geometry only.
window.InstrumentLab.DS1102EPanel = {
  create({ controller, t }) {
    const $ = id => document.getElementById(id);
    $('ds1102eFaceplate').src = window.InstrumentLabImages.scope;
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'ds1102eDialog', handleId: 'ds1102eWindowBar', closeId: 'ds1102eClose',
      triggerSelector: '[data-instrument="ds1102e"]'
    });
    return window.InstrumentLab.createOscilloscopePanel({
      controller, t, openWindow: () => frame.open(),
      display: { idPrefix: 'ds1102e', horizontalDivisions: 12, footerScales: true, cellWidth: 40 },
      elements: {
        auto: $('ds1102eAuto'), menuToggle: $('ds1102eMenuToggle'),
        channelButtons: { 1: $('ds1102eCH1'), 2: $('ds1102eCH2') },
        scale: $('ds1102eVerticalScale'), timeScale: $('ds1102eHorizontalScale'), position: $('ds1102eVerticalPosition'),
        screen: $('ds1102eDisplay'), menu: $('ds1102eChannelMenu'), menuTitle: $('ds1102eMenuTitle')
      }
    });
  }
};

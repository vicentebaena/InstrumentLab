'use strict';
// Rigol DS1202Z-E faceplate. Both scope views use the same experiment and renderer.
window.InstrumentLab.DS1202ZEPanel = {
  create({ getDisplay }) {
    const $ = id => document.getElementById(id);
    $('ds1202zeFaceplate').src = window.InstrumentLabImages.scope;
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'ds1202zeDialog', handleId: 'ds1202zeWindowBar', closeId: 'ds1202zeClose',
      triggerSelector: '[data-instrument="ds1202ze"]'
    });
    function render() { $('ds1202zeDisplay').innerHTML = getDisplay(); }
    return { render, open() { render(); frame.open(); } };
  }
};

'use strict';
// Rigol DS1102E faceplate. Both scope views use the same experiment and renderer.
window.InstrumentLab.DS1102EPanel = {
  create({ getDisplay, getSettings, onChannel, onMenu, onScale, t }) {
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
    const knob = $('ds1102eVerticalScale');
    let drag = null, rotation = 0, wheel = 0;
    const angle = event => {
      const box = knob.getBoundingClientRect();
      return Math.atan2(event.clientY - box.top - box.height / 2, event.clientX - box.left - box.width / 2) * 180 / Math.PI;
    };
    knob.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !getSettings().channels[getSettings().selectedChannel].visible) return;
      event.preventDefault(); knob.focus(); knob.setPointerCapture(event.pointerId);
      drag = { angle: angle(event), remainder: 0 };
    });
    knob.addEventListener('pointermove', event => {
      if (!drag) return;
      const next = angle(event);
      const delta = (next - drag.angle + 540) % 360 - 180;
      drag.angle = next; drag.remainder += delta;
      rotation += delta; knob.style.setProperty('--rotation', `${rotation}deg`);
      while (Math.abs(drag.remainder) >= 20) {
        const clockwise = Math.sign(drag.remainder);
        drag.remainder -= clockwise * 20;
        onScale(-clockwise);
      }
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) knob.addEventListener(event, () => { drag = null; });
    knob.addEventListener('keydown', event => {
      const direction = { ArrowRight: -1, ArrowUp: -1, ArrowLeft: 1, ArrowDown: 1 }[event.key];
      if (!direction) return;
      event.preventDefault(); onScale(direction);
    });
    knob.addEventListener('wheel', event => {
      event.preventDefault();
      wheel += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      while (Math.abs(wheel) >= 40) { const direction = Math.sign(wheel); wheel -= direction * 40; onScale(direction); }
    }, { passive: false });
    function render() {
      $('ds1102eDisplay').innerHTML = getDisplay();
      const settings = getSettings();
      for (const channel of [1, 2]) {
        const button = $(`ds1102eCH${channel}`);
        button.setAttribute('aria-pressed', String(settings.channels[channel].visible));
        button.setAttribute('data-selected', String(settings.selectedChannel === channel));
        button.setAttribute('aria-label', `CH${channel}: ${settings.channels[channel].visible ? 'visible' : 'hidden'}${settings.selectedChannel === channel ? ', selected' : ''}`);
      }
      const channel = settings.selectedChannel;
      const value = settings.channels[channel].voltsPerDivision;
      knob.setAttribute('aria-valuemin', '0');
      knob.setAttribute('aria-valuemax', '9');
      knob.setAttribute('aria-valuenow', String(window.InstrumentLab.oscilloscope.verticalScales.indexOf(value)));
      knob.setAttribute('aria-valuetext', `CH${channel} ${window.InstrumentLab.oscilloscope.formatVerticalScale(value)}`);
      knob.setAttribute('aria-disabled', String(!settings.channels[channel].visible));
      knob.setAttribute('aria-label', t('scopeVerticalScale'));
      knob.title = t('scopeVerticalHelp');
      const menu = $('ds1102eChannelMenu');
      menu.hidden = settings.menuChannel === null;
      $('ds1102eMenuToggle').setAttribute('aria-expanded', String(settings.menuChannel !== null));
      menu.setAttribute('data-channel', String(settings.menuChannel));
      $('ds1102eMenuTitle').textContent = settings.menuChannel ? `CH${settings.menuChannel}` : '';
    }
    return { render, open() { render(); frame.open(); } };
  }
};

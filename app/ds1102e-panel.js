'use strict';
// DS1102E adapter: photograph, DOM mapping, window and screen geometry only.
window.InstrumentLab.DS1102EPanel = {
  create({ controller, t }) {
    const $ = id => document.getElementById(id);
    const slopePaths = { rising: 'M4 24h14V5h17M12 11l6-6 6 6', falling: 'M4 5h14v19h17M12 18l6 6 6-6' };
    $('ds1102eFaceplate').src = window.InstrumentLabImages.scope;
    for (const channel of [1, 2]) $(`ds1102eProbeConnector${channel}`).src = window.InstrumentLabImages.probeConnector;
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'ds1102eDialog', handleId: 'ds1102eWindowBar', closeId: 'ds1102eClose',
      triggerSelector: '[data-instrument="ds1102e"]'
    });
    return window.InstrumentLab.createOscilloscopePanel({
      controller, t, openWindow: () => frame.open(),
      display: { idPrefix: 'ds1102e', horizontalDivisions: 12, footerScales: true, cellWidth: 40 },
      elements: {
        probeConnectors: { 1: $('ds1102eProbeConnector1'), 2: $('ds1102eProbeConnector2') },
        triggerLevel: $('ds1102eTriggerLevel'),
        triggerButton: $('ds1102eTriggerMenuKey'), triggerMenu: $('ds1102eTriggerMenu'),
        selectionKnob: $('ds1102eSelectionKnob'),
        submenuIndicator: $('ds1102eSubmenuIndicator'),
        submenuViews: {
          triggerSlope: {
            button: $('ds1102eTriggerSlopeKey'), menu: $('ds1102eTriggerSlopeSubmenu'), value: $('ds1102eTriggerSlopeIcon'), labelKey: 'scopeTriggerSlope',
            options: { rising: $('ds1102eTriggerRising'), falling: $('ds1102eTriggerFalling') },
            renderValue: (element, slope) => {
              element.setAttribute('aria-label', slope === 'falling' ? 'Falling edge' : 'Rising edge');
              $('ds1102eTriggerSlopePath').setAttribute('d', slopePaths[slope]);
            }
          },
          triggerSource: {
            button: $('ds1102eTriggerSourceKey'), menu: $('ds1102eTriggerSourceSubmenu'), value: $('ds1102eTriggerSourceValue'), labelKey: 'scopeTriggerSource',
            options: { 1: $('ds1102eTriggerSource1'), 2: $('ds1102eTriggerSource2') }, formatValue: value => `CH${value}`
          },
          coupling: {
            button: $('ds1102eCouplingKey'), menu: $('ds1102eCouplingSubmenu'), value: $('ds1102eCouplingValue'), labelKey: 'scopeCoupling',
            options: { DC: $('ds1102eCouplingDC'), AC: $('ds1102eCouplingAC'), GND: $('ds1102eCouplingGround') },
            formatValue: value => value === 'GND' ? t('scopeGroundCoupling') : value
          },
          probe: {
            button: $('ds1102eProbeKey'), menu: $('ds1102eProbeSubmenu'), value: $('ds1102eProbeValue'), labelKey: 'scopeProbe',
            options: Object.fromEntries(window.InstrumentLab.oscilloscope.submenus.probe.options.map(factor => [factor, $(`ds1102eProbe${factor}`)])),
            formatValue: factor => `${factor}X`
          }
        },
        auto: $('ds1102eAuto'), menuToggle: $('ds1102eMenuToggle'),
        channelButtons: { 1: $('ds1102eCH1'), 2: $('ds1102eCH2') },
        scale: $('ds1102eVerticalScale'), timeScale: $('ds1102eHorizontalScale'), position: $('ds1102eVerticalPosition'), horizontalPosition: $('ds1102eHorizontalPosition'),
        screen: $('ds1102eDisplay'), menu: $('ds1102eChannelMenu'), menuTitle: $('ds1102eMenuTitle')
      }
    });
  }
};

'use strict';
// DS1102E adapter: photograph, DOM mapping, window and screen geometry only.
window.InstrumentLab.DS1102EPanel = {
  create({ controller, t }) {
    const $ = id => document.getElementById(id);
    const slopePaths = { rising: 'M4 24h14V5h17M12 11l6-6 6 6', falling: 'M4 5h14v19h17M12 18l6 6 6-6' };
    const voltageNames = window.InstrumentLab.oscilloscope.submenus.measureVoltage.options;
    const voltageIcon = name => {
      const transient = ['Overshoot', 'Preshoot'].includes(name);
      const sine = ['Vavg', 'Vrms'].includes(name);
      const wave = transient
        ? (name === 'Overshoot' ? 'M18 31h13v-23l3 20 3-12 3 8 4-4h35' : 'M18 31h11l3-6 3 13 3-21 3 7V10h38')
        : sine ? 'M18 23C24 5 28 5 34 23S44 41 50 23S60 5 66 23S76 41 82 23'
        : 'M18 30h9V12h12v18h12V12h12v18h17';
      const reference = ['Vmin', 'Vbase'].includes(name) ? 32 : sine ? 23 : 9;
      const double = ['Vpp', 'Vamp', 'Overshoot', 'Preshoot'].includes(name);
      return `<svg viewBox="0 0 90 44" aria-hidden="true"><path d="M18 ${reference}H84" stroke-dasharray="2 2"/><path d="${wave}"/><path d="M8 35V9m-4 5 4-5 4 5${double ? 'M4 30l4 5 4-5' : ''}"/></svg>`;
    };
    $('ds1102eVoltageOptions').innerHTML = voltageNames.map(name => `<div id="ds1102eVoltage${name}" class="ds1102e-measurement-option">${voltageIcon(name)}<span>${name}</span></div>`).join('');
    const timeNames = window.InstrumentLab.oscilloscope.submenus.measureTime.options;
    const timeIcon = name => {
      const falling = name.includes('Fall') || name.startsWith('-');
      let path = falling ? 'M8 10h22v20h24V10h22' : 'M8 30h22V10h24v20h22';
      if (name === 'Rise Time' || name === 'Fall Time') path = falling ? 'M8 10h23l25 22h25' : 'M8 32h23L56 10h25';
      if (name.startsWith('Delay') || name.startsWith('Phase')) path = falling ? 'M8 10h24v20h48M8 14h45v20h27' : 'M8 30h24V10h48M8 34h45V14h27';
      return `<svg viewBox="0 0 90 44" aria-hidden="true"><path d="${path}"/><path d="M30 37h24m-20-4-4 4 4 4m16-8 4 4-4 4"/></svg>`;
    };
    $('ds1102eTimeOptions').innerHTML = timeNames.map((name, index) => `<div id="ds1102eTime${index}" class="ds1102e-measurement-option">${timeIcon(name)}<span>${window.InstrumentLab.oscilloscope.timeMeasurementLabel(name)}</span></div>`).join('');
    $('ds1102eFaceplate').src = window.InstrumentLabImages.scope;
    for (const channel of [1, 2]) $(`ds1102eProbeConnector${channel}`).src = window.InstrumentLabImages.probeConnector;
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'ds1102eDialog', handleId: 'ds1102eWindowBar', closeId: 'ds1102eClose',
      triggerSelector: '[data-instrument="ds1102e"]'
    });
    return window.InstrumentLab.createOscilloscopePanel({
      controller, t, openWindow: () => frame.open(),
      display: { idPrefix: 'ds1102e', horizontalDivisions: 12, footerScales: true, cellWidth: 40, menuWidthRatio: 0.21 },
      elements: {
        measure: { clearButton: $('ds1102eMeasureClearKey'), allButton: $('ds1102eMeasureAllKey'), allValue: $('ds1102eMeasureAllValue'), button: $('ds1102eMeasure'), menu: $('ds1102eMeasureMenu'), sourceButton: $('ds1102eMeasureSourceKey'), sourceValue: $('ds1102eMeasureSourceValue') },
        cursorTypeButton: $('ds1102eCursorTypeKey'), cursorTypeValue: $('ds1102eCursorTypeValue'),
        cursorSelections: { A: { button: $('ds1102eCursorAKey'), label: $('ds1102eCursorARotate') }, B: { button: $('ds1102eCursorBKey'), label: $('ds1102eCursorBRotate') } },
        cursorsButton: $('ds1102eCursors'), cursorsMenu: $('ds1102eCursorsMenu'),
        probeConnectors: { 1: $('ds1102eProbeConnector1'), 2: $('ds1102eProbeConnector2') },
        triggerLevel: $('ds1102eTriggerLevel'), triggerMidpoint: $('ds1102eTriggerMidpoint'),
        triggerButton: $('ds1102eTriggerMenuKey'), triggerMenu: $('ds1102eTriggerMenu'),
        selectionKnob: $('ds1102eSelectionKnob'),
        submenuIndicator: $('ds1102eSubmenuIndicator'),
        submenuViews: {
          measureTime: {
            button: $('ds1102eMeasureTimeKey'), menu: $('ds1102eMeasureTimeSubmenu'), labelKey: 'scopeMeasureTime',
            pageSize: 4, previousPage: $('ds1102eTimePrevious'), nextPage: $('ds1102eTimeNext'),
            options: Object.fromEntries(timeNames.map((name, index) => [name, $(`ds1102eTime${index}`)]))
          },
          measureVoltage: {
            button: $('ds1102eMeasureVoltageKey'), menu: $('ds1102eMeasureVoltageSubmenu'), labelKey: 'scopeMeasureVoltage',
            pageSize: 4, previousPage: $('ds1102eVoltagePrevious'), nextPage: $('ds1102eVoltageNext'),
            options: Object.fromEntries(voltageNames.map(name => [name, $(`ds1102eVoltage${name}`)]))
          },
          cursorSource: {
            button: $('ds1102eCursorSourceKey'), menu: $('ds1102eCursorSourceSubmenu'), value: $('ds1102eCursorSourceValue'), labelKey: 'scopeCursorSource',
            options: { 1: $('ds1102eCursorSource1'), 2: $('ds1102eCursorSource2') }, formatValue: value => `CH${value}`
          },
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
        runStop: $('ds1102eRunStop'), auto: $('ds1102eAuto'), menuToggle: $('ds1102eMenuToggle'),
        channelButtons: { 1: $('ds1102eCH1'), 2: $('ds1102eCH2') },
        scale: $('ds1102eVerticalScale'), timeScale: $('ds1102eHorizontalScale'), position: $('ds1102eVerticalPosition'), horizontalPosition: $('ds1102eHorizontalPosition'),
        screenRoot: $('ds1102eScreen'), screen: $('ds1102eDisplay'), menu: $('ds1102eChannelMenu'), menuTitle: $('ds1102eMenuTitle')
      }
    });
  }
};

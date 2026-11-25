'use strict';
// DS1104Z Plus channel keys and menu; signal/state transitions reuse the shared engine.
window.InstrumentLab.DS1104ZPlusPanel = {
  // Manual PDF page 46, Figure 1-12: 800 × 480 LCD, wider right menu margin.
  geometry: Object.freeze({ width: 800, height: 480, left: 84, top: 32, columns: 12, rows: 8, cell: 48 }),
  renderGrid(label) {
    const { width, height, left, top, columns, rows, cell } = this.geometry;
    const plotWidth = columns * cell, plotHeight = rows * cell;
    const vertical = Array.from({ length: columns + 1 }, (_, i) => `<path data-grid-column="${i}" d="M${left + i * cell} ${top}v${plotHeight}"/>`).join('');
    const horizontal = Array.from({ length: rows + 1 }, (_, i) => `<path data-grid-row="${i}" d="M${left} ${top + i * cell}h${plotWidth}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${label}"><rect width="${width}" height="${height}" fill="#000"/><g fill="none" stroke="#34383a" stroke-width="1">${vertical}${horizontal}</g><path d="M${left + plotWidth / 2} ${top}v${plotHeight}M${left} ${top + plotHeight / 2}h${plotWidth}" fill="none" stroke="#727576" stroke-width="1.1" stroke-dasharray="2 2"/></svg>`;
  },
  colors: Object.freeze({ 1: '#f4d35e', 2: '#6ecbff', 3: '#f06acb', 4: '#588cff' }),
  renderHeader(settings) {
    const value = settings.timePerDivision;
    const [unit, suffix] = value >= 1 ? [1, 's'] : value >= 1e-3 ? [1e-3, 'ms'] : value >= 1e-6 ? [1e-6, 'us'] : [1e-9, 'ns'];
    const scale = `${Number((value / unit).toPrecision(12))}${suffix}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" preserveAspectRatio="none"><text x="8" y="23" fill="#f4d35e" font-family="Georgia,serif" font-size="24" font-weight="700">RIGOL</text><text data-time-scale="${value}" x="145" y="22" fill="#a8dcff" font-family="Arial,sans-serif" font-size="17" font-weight="700" role="img" aria-label="H ${scale}/div">H ${scale}</text></svg>`;
  },
  renderChannelFooter(settings, label) {
    const scope = window.InstrumentLab.oscilloscope;
    const readings = [1, 2, 3, 4].map(channel => {
      const state = settings.channels[channel];
      const selected = state.visible && settings.menuChannel === channel && settings.selectedChannel === channel;
      const color = state.visible ? this.colors[channel] : '#59616d';
      const scale = scope.formatVerticalScale(state.voltsPerDivision);
      const symbol = state.coupling === 'AC'
        ? '<path d="M0 4C2-2 4-2 6.5 4S11 10 13 4"/>'
        : state.coupling === 'GND'
          ? '<path d="M6.5-2V3M0 3H13M2.5 6H10.5M5 9H8"/>'
          : '<path d="M0 1H13"/><path d="M0 7H13" stroke-dasharray="2 2"/>';
      return `<g data-channel-reading="${channel}" data-visible="${state.visible}" data-selected="${selected}" role="img" aria-label="CH${channel} ${state.coupling} ${scale} ${state.visible ? 'ON' : 'OFF'}" transform="translate(${8 + (channel - 1) * 116} 438)" fill="${color}">
        ${selected ? `<path data-channel-frame="${channel}" d="M12 0H116L104 30H0Z" fill="${color}" fill-opacity=".15" stroke="${color}" stroke-width="2"/><path d="M12 0H38L26 30H0Z" fill="${color}"/>` : ''}
        <text x="17" y="23" text-anchor="middle" font-family="Arial,sans-serif" font-size="23" font-weight="700"${selected ? ' fill="#071015"' : ''}>${channel}</text>
        <g data-coupling="${state.coupling}" transform="translate(39 10)" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round">${symbol}</g>
        <text data-channel-scale="${channel}" x="55" y="22" font-family="Arial,sans-serif" font-size="15" font-weight="700">${scale}</text>
      </g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" preserveAspectRatio="none" role="group" aria-label="${label}">${readings}</svg>`;
  },

  create({ controller, t }) {
    const $ = id => document.getElementById(id);
    const frame = window.InstrumentLab.createInstrumentWindow({
      dialogId: 'ds1104zplusDialog', handleId: 'ds1104zplusWindowBar', closeId: 'ds1104zplusClose',
      triggerSelector: '[data-instrument="ds1104zplus"]'
    });
    $('ds1104zplusFaceplate').src = window.InstrumentLabImages.ds1104zplus;
    const scope = window.InstrumentLab.oscilloscope;
    const buttons = Object.fromEntries([1, 2, 3, 4].map(channel => [channel, $(`ds1104zplusCH${channel}`)]));
    for (const [channel, button] of Object.entries(buttons)) {
      button.style.setProperty('--channel-color', this.colors[channel]);
      button.addEventListener('click', () => controller.actions.channel(Number(channel)));
    }
    const triggerMenuKey = $('ds1104zplusTriggerMenuKey');
    const triggerLevelKnob = $('ds1104zplusTriggerLevelKnob');
    const triggerSourceKey = $('ds1104zplusTriggerSourceKey');
    const triggerSlopeKey = $('ds1104zplusTriggerSlopeKey');
    triggerMenuKey.addEventListener('click', controller.actions.triggerMenu);
    triggerSourceKey.addEventListener('click', () => controller.actions.submenu('triggerSourcePlus'));
    triggerSlopeKey.addEventListener('click', () => controller.actions.submenu('triggerSlopePlus'));
    window.InstrumentLab.bindRotaryControl(triggerLevelKnob, { onStep: direction => controller.actions.triggerLevel(-direction) });
    const couplingKey = $('ds1104zplusCouplingKey');
    const probeKey = $('ds1104zplusProbeKey');
    const invertKey = $('ds1104zplusInvertKey');
    const positionKnob = $('ds1104zplusPositionKnob');
    const horizontalPositionKnob = $('ds1104zplusHorizontalPositionKnob');
    window.InstrumentLab.bindRotaryControl(positionKnob, {
      onStep: direction => controller.actions.position(-direction),
      enabled: () => Boolean(controller.getSettings().channels[controller.getSettings().selectedChannel]?.visible)
    });
    window.InstrumentLab.bindRotaryControl(horizontalPositionKnob, {
      onStep: direction => controller.actions.horizontalPosition(-direction)
    });
    const scaleKnob = $('ds1104zplusScaleKnob');
    const timeScaleKnob = $('ds1104zplusTimeScaleKnob');
    window.InstrumentLab.bindRotaryControl(timeScaleKnob, {
      onStep: direction => controller.actions.timeScale(direction, scope.horizontalScalesPlus)
    });
    invertKey.addEventListener('click', controller.actions.invert);
    window.InstrumentLab.bindRotaryControl(scaleKnob, {
      onStep: direction => controller.actions.scale(direction, scope.verticalScalesPlus),
      enabled: () => Boolean(controller.getSettings().channels[controller.getSettings().selectedChannel]?.visible)
    });
    const selectionKnob = $('ds1104zplusSelectionKnob');
    const selectionIndicator = $('ds1104zplusSelectionIndicator');
    const couplingOpen = settings => settings.menuChannel !== null && settings.submenu === 'coupling';
    const probeOpen = settings => settings.menuChannel !== null && settings.submenu === 'probePlus';
    const triggerSelectionOpen = settings => settings.triggerMenuOpen && ['triggerSourcePlus', 'triggerSlopePlus'].includes(settings.submenu);
    const selectionOpen = settings => couplingOpen(settings) || probeOpen(settings) || triggerSelectionOpen(settings);
    couplingKey.addEventListener('click', () => controller.actions.submenu('coupling'));
    probeKey.addEventListener('click', () => controller.actions.submenu('probePlus'));
    window.InstrumentLab.bindRotaryControl(selectionKnob, {
      onStep: controller.actions.selectionStep, onPress: controller.actions.submenuConfirm,
      enabled: () => selectionOpen(controller.getSettings()), clockwiseStep: 1,
      keyDirections: { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    });
    const couplingSubmenu = settings => !couplingOpen(settings) ? ''
      : `<aside class="ds1104zplus-coupling-submenu" aria-label="Coupling"><span class="ds1104zplus-submenu-arrow" aria-hidden="true">↻</span>${scope.submenus.coupling.options.map(value => `<div data-coupling-option="${value}" data-selected="${settings.submenuSelection === value}" aria-current="${settings.submenuSelection === value}">${value}</div>`).join('')}</aside>`;
    const probeSubmenu = settings => !probeOpen(settings) ? ''
      : `<aside class="ds1104zplus-coupling-submenu ds1104zplus-probe-submenu" aria-label="Probe"><span class="ds1104zplus-submenu-arrow" aria-hidden="true">↻</span>${scope.submenus.probePlus.options.map(value => `<div data-probe-option="${value}" data-selected="${settings.submenuSelection === value}" aria-current="${settings.submenuSelection === value}">${value}X</div>`).join('')}</aside>`;
    const menu = settings => {
      const channel = settings.menuChannel;
      if (channel === null) return '';
      const selected = settings.channels[channel];
      const rows = [['Coupling', selected.coupling, true], ['BW Limit', 'OFF'], ['Probe', `${selected.probe}X`, true], ['Invert', selected.inverted ? 'ON' : 'OFF'], ['Volts/Div', 'Coarse'], ['Unit', '[V]', true]];
      return `<aside class="ds1104zplus-channel-menu" aria-label="CH${channel}"><span class="ds1104zplus-menu-channel">CH${channel}</span><dl>${rows.map(([label, value, arrow]) => `<div><dt>${label}</dt><dd${arrow ? ' class="has-arrow"' : ''}>${value}</dd></div>`).join('')}</dl></aside>`;
    };
    const slopeIcon = slope => `<svg class="ds1104zplus-slope-icon" viewBox="0 0 42 24" role="img" aria-label="${slope === 'either' ? 'Either edge' : slope === 'falling' ? 'Falling edge' : 'Rising edge'}"><path d="${slope === 'falling' ? 'M4 5H21V19H38M16 14l5 5 5-5' : slope === 'either' ? 'M2 19H12V5H28V19H40M7 10l5-5 5 5M23 14l5 5 5-5' : 'M4 19H21V5H38M16 10l5-5 5 5'}"/></svg>`;
    const triggerMenu = settings => !settings.triggerMenuOpen ? '' : `<aside class="ds1104zplus-channel-menu ds1104zplus-trigger-menu" aria-label="Trigger"><span class="ds1104zplus-menu-channel">Trigger</span><dl>${[['Type', 'Edge'], ['Source', `CH${settings.trigger.source}`], ['Slope', slopeIcon(settings.trigger.slope)], ['Sweep', 'Auto'], ['Setting', '▼']].map(([label, value], index) => `<div><dt>${label}</dt><dd${index < 4 ? ' class="has-arrow"' : ''}>${value}</dd></div>`).join('')}</dl></aside>`;
    const triggerSubmenu = settings => {
      if (!triggerSelectionOpen(settings)) return '';
      const source = settings.submenu === 'triggerSourcePlus';
      return `<aside class="ds1104zplus-coupling-submenu" aria-label="${source ? 'Source' : 'Slope'}"><span class="ds1104zplus-submenu-arrow" aria-hidden="true">↻</span>${scope.submenus[settings.submenu].options.map(value => `<div data-trigger-option="${value}" data-selected="${settings.submenuSelection === value}" aria-current="${settings.submenuSelection === value}">${source ? `CH${value}` : slopeIcon(value)}</div>`).join('')}</aside>`;
    };
    const screenMarkup = ({ idPrefix = 'ds1104zplus', showMenus = true } = {}) => {
      const settings = controller.getSettings();
      const g = this.geometry;
      const traces = controller.getDisplay({ idPrefix, horizontalDivisions: g.columns, cellWidth: g.cell, traceLayerOnly: true, persistentTriggerMarker: true,
        channelNumbers: [1, 2, 3, 4], channelColors: this.colors,
        plotGeometry: { left: g.left, top: g.top, width: g.columns * g.cell, height: g.rows * g.cell, viewWidth: g.width, viewHeight: g.height } });
      return this.renderGrid(t('scopePlusDescription')) + `<div class="ds1104zplus-screen-header">${this.renderHeader(settings)}</div>` + `<div class="ds1104zplus-traces">${traces}</div>` + `<div class="ds1104zplus-channel-footer">${this.renderChannelFooter(settings, t('scopeChannelReadings'))}</div>` + (showMenus ? menu(settings) + couplingSubmenu(settings) + probeSubmenu(settings) + triggerMenu(settings) + triggerSubmenu(settings) : '');
    };
    const renderScreen = (target, options = {}) => {
      render();
      target.innerHTML = `<section class="ds1104zplus-screen-preview">${screenMarkup({ idPrefix: 'scopePreview', ...options })}</section>`;
    };
    const render = () => {
      const settings = controller.getSettings();
      for (const [channel, button] of Object.entries(buttons)) {
        const visible = settings.channels[channel].visible;
        button.setAttribute('aria-pressed', String(visible));
        button.setAttribute('aria-label', `CH${channel}: ${visible ? 'ON' : 'OFF'}`);
      }
      triggerMenuKey.setAttribute('aria-expanded', String(Boolean(settings.triggerMenuOpen)));
      for (const [key, submenu, label] of [[triggerSourceKey, 'triggerSourcePlus', 'scopeTriggerSource'], [triggerSlopeKey, 'triggerSlopePlus', 'scopeTriggerSlope']]) {
        key.hidden = !settings.triggerMenuOpen;
        key.setAttribute('aria-expanded', String(settings.submenu === submenu));
        key.setAttribute('aria-label', t(label));
      }
      triggerLevelKnob.title = t('scopeTriggerLevelHelp');
      for (const [name, value] of Object.entries({ label: t('scopeTriggerLevel'), valuemin: -1e6, valuemax: 1e6,
        valuenow: settings.trigger.level, valuetext: `${settings.trigger.level} V · CH${settings.trigger.source}` })) triggerLevelKnob.setAttribute(`aria-${name}`, String(value));
      const selected = settings.channels[settings.selectedChannel];
      positionKnob.title = t('scopePositionHelp');
      horizontalPositionKnob.title = t('scopeHorizontalPositionHelp');
      for (const [knob, values] of [[positionKnob, { label: t('scopeVerticalPosition'), valuemin: -4, valuemax: 4,
        valuenow: selected.positionDivisions, valuetext: `CH${settings.selectedChannel} ${selected.positionDivisions.toFixed(1)} div`, disabled: !selected.visible }],
        [horizontalPositionKnob, { label: t('scopeHorizontalPosition'), valuemin: -scope.horizontalPositionLimit, valuemax: scope.horizontalPositionLimit,
          valuenow: settings.horizontalPositionDivisions, valuetext: `${settings.horizontalPositionDivisions.toFixed(1)} div` }]]) {
        for (const [name, value] of Object.entries(values)) knob.setAttribute(`aria-${name}`, String(value));
      }
      timeScaleKnob.title = t('scopeHorizontalHelp');
      for (const [name, value] of Object.entries({ label: t('scopeHorizontalScale'), valuemin: 0, valuemax: scope.horizontalScalesPlus.length - 1,
        valuenow: scope.horizontalScalesPlus.indexOf(settings.timePerDivision), valuetext: `${scope.formatTimeScale(settings.timePerDivision)}/div` })) {
        timeScaleKnob.setAttribute(`aria-${name}`, String(value));
      }
      scaleKnob.title = t('scopeVerticalHelp');
      for (const [name, value] of Object.entries({ label: t('scopeVerticalScale'), valuemin: 0, valuemax: scope.verticalScalesPlus.length - 1,
        valuenow: scope.verticalScalesPlus.indexOf(selected.voltsPerDivision), valuetext: `CH${settings.selectedChannel} ${scope.formatVerticalScale(selected.voltsPerDivision)}/div`, disabled: !selected.visible })) {
        scaleKnob.setAttribute(`aria-${name}`, String(value));
      }
      invertKey.hidden = settings.menuChannel === null;
      invertKey.setAttribute('aria-label', 'Invert');
      invertKey.setAttribute('aria-pressed', String(Boolean(settings.channels[settings.menuChannel]?.inverted)));
      couplingKey.hidden = settings.menuChannel === null;
      couplingKey.setAttribute('aria-label', t('scopeCoupling'));
      couplingKey.setAttribute('aria-expanded', String(couplingOpen(settings)));
      probeKey.hidden = settings.menuChannel === null;
      probeKey.setAttribute('aria-label', t('scopeProbe'));
      probeKey.setAttribute('aria-expanded', String(probeOpen(settings)));
      selectionKnob.setAttribute('aria-label', t('scopeMenuSelect'));
      selectionKnob.setAttribute('aria-disabled', String(!selectionOpen(settings)));
      selectionKnob.title = t('scopeSubmenuSelectHelp');
      selectionIndicator.setAttribute('data-active', String(selectionOpen(settings)));
      $('ds1104zplusScreen').innerHTML = screenMarkup();
    };
    return { render, renderScreen, open() { render(); frame.open(); } };
  }
};

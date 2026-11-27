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

  renderMeasurementMenu(settings) {
    const scope = window.InstrumentLab.oscilloscope, color = this.colors[settings.selectedChannel];
    const temporal = settings.oneKey.kind === 'time';
    const groupCount = Math.ceil(scope.oneKeyParameters(settings).length / 6);
    const entries = scope.oneKeyParameters(settings).slice(settings.oneKey.page * 6, settings.oneKey.page * 6 + 6);
    const icon = parameter => {
      if (temporal || scope.timeMeasurementsPlus.includes(parameter)) {
        if (parameter.startsWith('Phase')) return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="M2 20C7 0 12 0 17 20S27 40 32 20S42 0 47 20M2 27C7 7 12 7 17 27S27 47 32 27S42 7 47 27" fill="none" stroke="#eef8ff"/><path d="M12 6H22m-3-3 3 3-3 3M15 3l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
        if (parameter.startsWith('Delay')) {
          const falling = parameter.endsWith('Fall');
          return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="${falling ? 'M3 7H17V20H44M3 17H29V31H44' : 'M3 20H17V7H44M3 31H29V17H44'}" fill="none" stroke="#eef8ff" stroke-width="1.5"/><path d="M17 35H29m-3-3 3 3-3 3M20 32l-3 3 3 3" fill="none" stroke="currentColor"/></svg>`;
        }
        if (parameter.includes('Pulses') || parameter.includes('Edges')) {
          const negative = parameter.startsWith('-');
          return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="${negative ? 'M2 7H7V23H14V7H22V23H29V7H37V23H44V7H47' : 'M2 23H7V7H14V23H22V7H29V23H37V7H44V23H47'}" fill="none" stroke="#eef8ff" stroke-width="1.4"/><text x="5" y="36" fill="currentColor" font-family="Arial,sans-serif" font-size="9">1   2   n</text>${parameter.includes('Edges') ? '<path d="M7 4V26M22 4V26M37 4V26" stroke="currentColor" stroke-dasharray="2 2"/>' : ''}</svg>`;
        }
        if (parameter === 'tVmax' || parameter === 'tVmin') return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="M3 25H15L19 7H28L32 25H45" fill="none" stroke="#eef8ff" stroke-width="1.7"/><path d="M4 33H${parameter === 'tVmax' ? 19 : 10}m-3-3 3 3-3 3M7 30l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
        const edge = ['Rise Time','Fall Time','+Rate','-Rate'].includes(parameter);
        const signal = edge ? (['Rise Time','+Rate'].includes(parameter) ? 'M4 31H12L33 7H44' : 'M4 7H12L33 31H44') : 'M3 30H10V8H22V30H34V8H45';
        const ends = parameter === '-Width' || parameter === '-Duty' ? [22,34] : parameter === 'Period' || parameter === 'Freq' ? [10,34] : [10,22];
        return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="${signal}" fill="none" stroke="#eef8ff" stroke-width="1.7"/><path d="M${ends[0]} 34H${ends[1]}m-3-3 3 3-3 3M${ends[0]+3} 31l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.5"/>${edge ? '<path d="M5 12H43M5 26H43" stroke="currentColor" stroke-dasharray="2 2"/>' : ''}</svg>`;
      }
      if (['Vavg', 'Vrms', 'Per.Vrms', 'AC.Vrms'].includes(parameter)) return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="M13 19C18 1 23 1 28 19S38 37 43 19" fill="none" stroke="#eef8ff" stroke-width="1.7"/><path d="M5 31V${parameter === 'Vavg' ? 19 : 14}m-3 3 3-3 3 3M2 28l3 3 3-3M5 ${parameter === 'Vavg' ? 19 : 14}H45" fill="none" stroke="currentColor" stroke-dasharray="2 1"/>${parameter === 'AC.Vrms' ? '' : `<text x="39" y="8" fill="#eef8ff" font-size="8">${parameter === 'Per.Vrms' ? 1 : 'n'}</text>`}</svg>`;
      if (parameter === 'Overshoot' || parameter === 'Preshoot') return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="${parameter === 'Overshoot' ? 'M3 29H15V12L18 5L21 12H33V29H45' : 'M3 11H15V26L18 33L21 26H33V11H45'}" fill="none" stroke="#eef8ff" stroke-width="1.7"/><path d="${parameter === 'Overshoot' ? 'M5 5V12M2 5H22M2 12H35' : 'M5 26V33M2 26H35M2 33H22'}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
      if (parameter === 'Area' || parameter === 'Per.Area') return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="M6 30H14V10H31V30H43Z" fill="currentColor" fill-opacity=".35"/><path d="M3 30H14V10H31V30H45" fill="none" stroke="#eef8ff" stroke-width="1.7"/><path d="M3 31H45" stroke="currentColor"/>${parameter === 'Per.Area' ? '<path d="M8 3H38M8 1V6M38 1V6" stroke="currentColor"/><text x="19" y="23" fill="currentColor" font-size="9">T</text>' : ''}</svg>`;
      const levels = { Vmax: 7, Vmin: 31, Vpp: 7, Vtop: 10, Vbase: 28, Vamp: 10, Vupper: 12, Vmid: 19, Vlower: 26, Vavg: 19, Vrms: 15, Overshoot: 5, Preshoot: 33, Variance: 19 };
      const y = levels[parameter];
      return `<svg viewBox="0 0 48 38" aria-hidden="true"><path d="M13 30H20V10H34V30H44" fill="none" stroke="#eef8ff" stroke-width="1.7"/><path d="M6 ${y}H45" stroke="currentColor" stroke-dasharray="2 2"/><path d="M8 31V${y}m-3 3 3-3 3 3M5 28l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/>${['Vpp','Vamp'].includes(parameter) ? '<path d="M39 10V30m-3-3 3 3 3-3M36 13l3-3 3 3" fill="none" stroke="currentColor"/>' : ''}</svg>`;
    };
    const caption = parameter => ({ DelayRise: 'Delay↗<br>1→2', DelayFall: 'Delay↘<br>1→2', PhaseRise: 'Phase↗<br>1→2', PhaseFall: 'Phase↘<br>1→2' }[parameter] ?? parameter);
    return `<aside class="ds1104zplus-voltage-menu" style="color:${color}" aria-label="${temporal ? 'Horizontal' : 'Vertical'} measurements"><header>${temporal ? 'Horizontal' : 'Vertical'}</header><div class="ds1104zplus-voltage-entries">${Array.from({length:6}, (_,slot) => entries[slot] ? `<div data-${temporal ? 'time' : 'voltage'}-measurement="${entries[slot]}" data-label-lines="${/^(Delay|Phase)/.test(entries[slot]) ? 2 : 1}"><span class="ds1104zplus-voltage-icon">${icon(entries[slot])}</span><span>${caption(entries[slot])}</span></div>` : '<div aria-hidden="true"></div>').join('')}</div><svg class="ds1104zplus-measure-page-dots" style="--group-count:${groupCount}" viewBox="0 0 8 ${groupCount * 8}" aria-hidden="true">${Array.from({length:groupCount}, (_,index) => `<circle data-measurement-group="${index}" data-active="${settings.oneKey.page === index}" cx="4" cy="${4 + index * 8}" r="${settings.oneKey.page === index ? 2.7 : 1.4}"/>`).join('')}</svg></aside>`;
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
      button.addEventListener('click', () => controller.actions.channel(Number(channel)));
    }
    $('ds1104zplusOneKeyMenuKey').addEventListener('click', controller.actions.oneKeyType);
    const measurementKeys = Array.from({length:6}, (_,slot) => $(`ds1104zplusMeasurement${slot + 1}Key`));
    measurementKeys.forEach((key,slot) => key.addEventListener('click', () => controller.actions.oneKeyMeasurement(slot)));
    const measurementPageUp = $('ds1104zplusMeasurementPageUp');
    const measurementPageDown = $('ds1104zplusMeasurementPageDown');
    measurementPageUp.addEventListener('click', () => controller.actions.oneKeyPage(-1));
    measurementPageDown.addEventListener('click', () => controller.actions.oneKeyPage(1));
    const cursorsKey = $('ds1104zplusCursorsKey');
    const runStop = $('ds1104zplusRunStop');
    runStop.addEventListener('click', controller.actions.runStop);
    const cursorModeKey = $('ds1104zplusCursorModeKey');
    const cursorSelectKey = $('ds1104zplusCursorSelectKey');
    const cursorSourceKey = $('ds1104zplusCursorSourceKey');
    const cursorKeys = Object.fromEntries(['A','B','AB'].map(group => [group, $(`ds1104zplusCursor${group}Key`)]));
    cursorsKey.addEventListener('click', controller.actions.cursorsPlus);
    cursorModeKey.addEventListener('click', () => controller.actions.submenu('cursorModePlus'));
    cursorSelectKey.addEventListener('click', controller.actions.cursorType);
    cursorSourceKey.addEventListener('click', () => controller.actions.submenu('cursorSourcePlus'));
    for (const [group, key] of Object.entries(cursorKeys)) key.addEventListener('click', () => controller.actions.cursorGroup(group));
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
    const selectionOpen = settings => couplingOpen(settings) || probeOpen(settings) || triggerSelectionOpen(settings) || (settings.cursorsMenuOpen && ['cursorSourcePlus', 'cursorModePlus'].includes(settings.submenu));
    const knobActive = settings => selectionOpen(settings) || scope.canMoveCursors(settings, true);
    couplingKey.addEventListener('click', () => controller.actions.submenu('coupling'));
    probeKey.addEventListener('click', () => controller.actions.submenu('probePlus'));
    window.InstrumentLab.bindRotaryControl(selectionKnob, {
      onStep: direction => controller.actions.selectionStep(direction, { allowHiddenCursors: true, applyImmediately: true }), onPress: controller.actions.submenuConfirm,
      enabled: () => knobActive(controller.getSettings()), clockwiseStep: 1,
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
    const cursorMenu = settings => {
      if (!settings.cursorsMenuOpen) return '';
      if (settings.cursors.mode !== 'Manual') return `<aside class="ds1104zplus-channel-menu ds1104zplus-cursor-menu" aria-label="Cursor"><span class="ds1104zplus-menu-channel">Cursor</span><dl><div><dt>Mode</dt><dd class="has-arrow">OFF</dd></div></dl></aside>`;
      const c = settings.cursors, values = scope.cursorReadings(settings, this.geometry.columns);
      const group = c.selectedA && c.selectedB ? 'AB' : c.selectedA ? 'A' : c.selectedB ? 'B' : null;
      const axis = c.type === 'Y' ? 'Y' : 'X';
      const value = cursor => axis === 'X' ? scope.formatCursorValue(values[`${cursor}X`]) : scope.formatMeasurement(values[`${cursor}Y`]);
      const selectIcon = `<svg class="ds1104zplus-cursor-axis-icon" viewBox="0 0 42 24" role="img" aria-label="${axis === 'X' ? 'Vertical cursors' : 'Horizontal cursors'}">${axis === 'X' ? '<path d="M14 2V22"/><path d="M28 2V22" stroke-dasharray="3 2"/>' : '<path d="M2 7H40"/><path d="M2 17H40" stroke-dasharray="3 2"/>'}</svg>`;
      return `<aside class="ds1104zplus-channel-menu ds1104zplus-cursor-menu" aria-label="Cursor"><span class="ds1104zplus-menu-channel">Cursor</span><dl>${[['Mode','Manual',null],['Select',selectIcon,null],['Source',`CH${c.source}`,null],['CursorA',value('A'),'A'],['CursorB',value('B'),'B'],['CursorAB','↻','AB']].map(([label, text, entry]) => `<div><dt>${label}</dt><dd${label === 'Mode' ? ' class="has-arrow"' : ''}${entry ? ` data-cursor-selection="${entry}" data-selected="${group === entry}"` : ''}>${text}</dd></div>`).join('')}</dl></aside>`;
    };
    const cursorModeSubmenu = settings => !settings.cursorsMenuOpen || settings.submenu !== 'cursorModePlus' ? '' : `<aside class="ds1104zplus-coupling-submenu" aria-label="Cursor mode"><span class="ds1104zplus-submenu-arrow" aria-hidden="true">↻</span>${['OFF', 'Manual', 'Track', 'Auto'].map(value => `<div data-cursor-mode-option="${value}" data-selected="${settings.submenuSelection === value}"${['Track', 'Auto'].includes(value) ? ' aria-disabled="true"' : ''}>${value}</div>`).join('')}</aside>`;
    const cursorSourceSubmenu = settings => !settings.cursorsMenuOpen || settings.submenu !== 'cursorSourcePlus' ? '' : `<aside class="ds1104zplus-coupling-submenu" aria-label="Cursor source"><span class="ds1104zplus-submenu-arrow" aria-hidden="true">↻</span>${scope.submenus.cursorSourcePlus.options.map(value => `<div data-cursor-source-option="${value}" data-selected="${settings.submenuSelection === value}">CH${value}</div>`).join('')}</aside>`;
    const screenMarkup = ({ idPrefix = 'ds1104zplus', showMenus = true, showCursors = true } = {}) => {
      const settings = controller.getSettings();
      const g = this.geometry;
      const traces = controller.getDisplay({ idPrefix, horizontalDivisions: g.columns, cellWidth: g.cell, traceLayerOnly: true, persistentTriggerMarker: true, cursorAxes: 'both', showCursors, oneKeyMeasurements: true,
        channelNumbers: [1, 2, 3, 4], channelColors: this.colors,
        plotGeometry: { left: g.left, top: g.top, width: g.columns * g.cell, height: g.rows * g.cell, viewWidth: g.width, viewHeight: g.height } });
      return this.renderGrid(t('scopePlusDescription')) + `<div class="ds1104zplus-screen-header">${this.renderHeader(settings)}</div>` + `<div class="ds1104zplus-traces">${traces}</div>` + `<div class="ds1104zplus-channel-footer">${this.renderChannelFooter(settings, t('scopeChannelReadings'))}</div>` + (showMenus ? this.renderMeasurementMenu(settings) + menu(settings) + couplingSubmenu(settings) + probeSubmenu(settings) + triggerMenu(settings) + triggerSubmenu(settings) + cursorMenu(settings) + cursorSourceSubmenu(settings) + cursorModeSubmenu(settings) : '');
    };
    const renderScreen = (target, options = {}) => {
      render();
      target.innerHTML = `<section class="ds1104zplus-screen-preview">${screenMarkup({ idPrefix: 'scopePreview', ...options })}</section>`;
    };
    const render = () => {
      const settings = controller.getSettings();
      runStop.setAttribute('aria-pressed', String(settings.acquisitionRunning === false));
      runStop.setAttribute('aria-label', t(settings.acquisitionRunning === false ? 'scopeResume' : 'scopeStop'));
      for (const [channel, button] of Object.entries(buttons)) {
        const visible = settings.channels[channel].visible;
        button.setAttribute('aria-pressed', String(visible));
        button.setAttribute('aria-label', `CH${channel}: ${visible ? 'ON' : 'OFF'}`);
      }
      measurementKeys.forEach((key, slot) => {
        const parameter = scope.oneKeyParameters(settings)[settings.oneKey.page * 6 + slot];
        key.disabled = !parameter;
        key.setAttribute('aria-label', parameter ? `${parameter} · CH${settings.selectedChannel}` : '—');
      });
      measurementPageUp.setAttribute('aria-label', 'Previous measurement group');
      measurementPageDown.setAttribute('aria-label', 'Next measurement group');
      measurementPageUp.disabled = settings.oneKey.page === 0;
      measurementPageDown.disabled = settings.oneKey.page === Math.ceil(scope.oneKeyParameters(settings).length / 6) - 1;
      cursorsKey.setAttribute('aria-expanded', String(Boolean(settings.cursorsMenuOpen)));
      cursorModeKey.hidden = !settings.cursorsMenuOpen;
      cursorModeKey.setAttribute('aria-expanded', String(settings.submenu === 'cursorModePlus'));
      const manualMenu = settings.cursorsMenuOpen && settings.cursors.mode === 'Manual';
      cursorSelectKey.hidden = !manualMenu;
      cursorSelectKey.setAttribute('aria-label', t(settings.cursors.type === 'X' ? 'scopeCursorSelectVertical' : 'scopeCursorSelectHorizontal'));
      cursorSourceKey.hidden = !manualMenu;
      cursorSourceKey.setAttribute('aria-label', t('scopeCursorSource'));
      cursorSourceKey.setAttribute('aria-expanded', String(settings.submenu === 'cursorSourcePlus'));
      for (const [group, key] of Object.entries(cursorKeys)) {
        key.hidden = !manualMenu;
        const selected = group === 'AB' ? settings.cursors.selectedA && settings.cursors.selectedB
          : settings.cursors[`selected${group}`] && !settings.cursors[`selected${group === 'A' ? 'B' : 'A'}`];
        key.setAttribute('aria-pressed', String(Boolean(selected)));
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
        valuenow: scope.channelVerticalScales(settings, scope.verticalScalesPlus).indexOf(selected.voltsPerDivision), valuetext: `CH${settings.selectedChannel} ${scope.formatVerticalScale(selected.voltsPerDivision)}/div`, disabled: !selected.visible })) {
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
      selectionKnob.setAttribute('aria-disabled', String(!knobActive(settings)));
      selectionKnob.title = t(selectionOpen(settings) || !settings.cursorsMenuOpen ? 'scopeSubmenuSelectHelp' : 'scopeCursorMoveHelp');
      selectionIndicator.setAttribute('data-active', String(knobActive(settings)));
      $('ds1104zplusScreen').innerHTML = screenMarkup();
    };
    return { render, renderScreen, open() { render(); frame.open(); } };
  }
};

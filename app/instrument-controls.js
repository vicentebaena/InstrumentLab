'use strict';
// Physical input gestures shared by instrument models; no instrument state lives here.
(() => {
  window.InstrumentLab.bindRotaryControl = (knob, { onStep, onPress, enabled = () => true, clockwiseStep = -1, keyDirections = { ArrowRight: -1, ArrowUp: -1, ArrowLeft: 1, ArrowDown: 1 } }) => {
    let drag = null, rotation = 0, wheel = 0, suppressClick = false;
    const angle = event => {
      const box = knob.getBoundingClientRect();
      return Math.atan2(event.clientY - box.top - box.height / 2, event.clientX - box.left - box.width / 2) * 180 / Math.PI;
    };
      knob.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !enabled()) return;
        event.preventDefault(); knob.focus(); knob.setPointerCapture(event.pointerId);
        suppressClick = false;
        drag = { angle: angle(event), remainder: 0, distance: 0 };
      });
      knob.addEventListener('pointermove', event => {
        if (!drag) return;
        const next = angle(event);
        const delta = (next - drag.angle + 540) % 360 - 180;
        drag.angle = next; drag.remainder += delta; drag.distance += Math.abs(delta);
        if (drag.distance >= 6) suppressClick = true;
        rotation += delta; knob.style.setProperty('--rotation', `${rotation}deg`);
        while (Math.abs(drag.remainder) >= 20) {
          const clockwise = Math.sign(drag.remainder);
          drag.remainder -= clockwise * 20;
          onStep(clockwise * clockwiseStep);
        }
      });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) knob.addEventListener(event, () => { drag = null; });
      knob.addEventListener('keydown', event => {
        if (onPress && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); if (enabled()) onPress(); return; }
        const direction = keyDirections[event.key];
        if (!direction) return;
        event.preventDefault(); if (enabled()) onStep(direction);
      });
      knob.addEventListener('wheel', event => {
        event.preventDefault();
        if (!enabled()) return;
        wheel += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
        while (Math.abs(wheel) >= 40) { const direction = Math.sign(wheel); wheel -= direction * 40; onStep(direction); }
      }, { passive: false });
      if (onPress) knob.addEventListener('click', () => { if (!suppressClick && enabled()) onPress(); suppressClick = false; });
      return knob;
  };
})();

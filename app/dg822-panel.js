'use strict';
// Rigol DG822-specific presentation. Experiment state stays in the main application.
window.InstrumentLab.DG822Panel = {
  // The DG822 groups fractional digits in threes, independently of app language.
  formatNumber(value, decimals) {
    const [integer, fraction] = Number(value).toFixed(decimals).split('.');
    return fraction ? `${integer}.${fraction.match(/.{1,3}/g).join(',')}` : integer;
  },
  create({ getGenerator }) {
    const format = window.InstrumentLab.DG822Panel.formatNumber;
    const $ = id => document.getElementById(id);
    const dialog = $('dg822Dialog');
    const handle = $('dg822WindowBar');
    $('dg822Faceplate').src = window.InstrumentLabImages.generator;
    let drag = null;
    function render() {
      const generator = getGenerator();
      $('dg822Frequency').textContent = `${format(generator.frequency / 1000, 9)} kHz`;
      $('dg822Amplitude').textContent = `${format(generator.amplitudeVpp, 4)} Vpp`;
      $('dg822Offset').textContent = `${format(generator.offset, 4)} Vdc`;
      $('dg822Phase').textContent = `${format(0, 3)}º`;
    }
    function close() { dialog.close(); }
    $('dg822Close').addEventListener('click', close);
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    });
    dialog.addEventListener('close', () => {
      document.querySelector('[data-instrument="dg822"]')?.focus();
    });
    // Drag only the title bar, keeping the close button and page scroll usable.
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const bounds = dialog.getBoundingClientRect();
      drag = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      dialog.style.left = `${bounds.left}px`;
      dialog.style.top = `${bounds.top}px`;
      dialog.style.transform = 'none';
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (!drag) return;
      dialog.style.left = `${Math.max(0, Math.min(window.innerWidth - dialog.offsetWidth, event.clientX - drag.x))}px`;
      dialog.style.top = `${Math.max(0, Math.min(window.innerHeight - handle.offsetHeight, event.clientY - drag.y))}px`;
    });
    const endDrag = () => { drag = null; };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('lostpointercapture', endDrag);
    window.addEventListener('resize', () => {
      dialog.style.removeProperty('left');
      dialog.style.removeProperty('top');
      dialog.style.removeProperty('transform');
    });
    return {
      render,
      open() {
        render();
        if (!dialog.open) dialog.show();
        $('dg822Close').focus({ preventScroll: true });
      }
    };
  }
};

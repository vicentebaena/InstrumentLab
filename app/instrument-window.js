'use strict';
(() => {
  let topLayer = 20;
  window.InstrumentLab.createInstrumentWindow = ({ dialogId, handleId, closeId, triggerSelector }) => {
    const dialog = document.getElementById(dialogId);
    const handle = document.getElementById(handleId);
    const closeButton = document.getElementById(closeId);
    const raise = () => { dialog.style.zIndex = String(++topLayer); };
    let drag = null;
    closeButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
    });
    dialog.addEventListener('close', () => document.querySelector(triggerSelector)?.focus());
    dialog.addEventListener('pointerdown', raise);
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
      open() {
        if (!dialog.open) dialog.show();
        raise();
        closeButton.focus({ preventScroll: true });
      }
    };
  };
})();

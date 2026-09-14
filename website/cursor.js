(() => {
  'use strict';

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const coarsePointer = window.matchMedia('(any-pointer: coarse)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = window.matchMedia('(forced-colors: active)');
  const interactive = 'a[href], button, summary, select, label[for], ' +
    '[role="button"], [role="link"], [role="tab"], [tabindex]:not([tabindex="-1"])';
  const content = '.feature-card, .error-card, .builtin-card, .stdlib-card, ' +
    '.code-window, .code-block-wrapper, pre, code, section';
  const nativeOnly = 'input, textarea, [contenteditable]:not([contenteditable="false"]), ' +
    'iframe, :disabled, [aria-disabled="true"], [data-cursor="native"]';
  let cleanup;

  function enable() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);

    let frame = 0;
    let x = 0;
    let y = 0;
    let currentX = 0;
    let currentY = 0;
    let visible = false;
    const listeners = [];
    function listen(target, event, handler) {
      target.addEventListener(event, handler, { passive: true });
      listeners.push(() => target.removeEventListener(event, handler));
    }
    function hide() {
      visible = false;
      document.documentElement.classList.remove('has-custom-cursor');
      cursor.classList.remove('is-visible', 'is-pressed');
      cancelAnimationFrame(frame);
      frame = 0;
    }
    function draw() {
      currentX += (x - currentX) * 0.4;
      currentY += (y - currentY) * 0.4;
      const settled = Math.abs(x - currentX) + Math.abs(y - currentY) < 0.1;
      if (settled) { currentX = x; currentY = y; }
      // Both SVGs use the same tip hotspot, even when the hover artwork scales.
      cursor.style.transform = `translate3d(${currentX - 12}px, ${currentY - 4.5}px, 0)`;
      frame = settled ? 0 : requestAnimationFrame(draw);
    }
    function updateTarget(target) {
      if (!(target instanceof Element) || target.closest(nativeOnly)) {
        hide();
        return false;
      }
      cursor.dataset.state = target.closest(interactive) ? 'interactive' :
        target.closest(content) ? 'content' : 'default';
      return true;
    }
    listen(document, 'pointermove', event => {
      if (event.pointerType !== 'mouse') { hide(); return; }
      if (!updateTarget(event.target)) return;
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        currentX = x;
        currentY = y;
        visible = true;
        cursor.classList.add('is-visible');
        document.documentElement.classList.add('has-custom-cursor');
      }
      if (!frame) frame = requestAnimationFrame(draw);
    });
    listen(document, 'pointerover', event => updateTarget(event.target));
    listen(document, 'pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button === 0 && visible) {
        cursor.classList.add('is-pressed');
      }
    });
    listen(window, 'pointerup', () => cursor.classList.remove('is-pressed'));
    listen(document, 'pointercancel', hide);
    listen(document, 'pointerout', event => { if (!event.relatedTarget) hide(); });
    listen(document, 'keydown', hide);
    listen(document, 'visibilitychange', hide);
    listen(window, 'blur', hide);
    listen(document, 'dragstart', hide);
    // Re-evaluate what is beneath a stationary pointer after scrolling.
    listen(window, 'scroll', () => {
      if (visible) updateTarget(document.elementFromPoint(x, y));
    });

    return () => {
      hide();
      listeners.forEach(remove => remove());
      cursor.remove();
    };
  }

  function sync() {
    const allowed = finePointer.matches && !coarsePointer.matches &&
      !reducedMotion.matches && !forcedColors.matches && navigator.maxTouchPoints === 0;
    if (allowed && !cleanup) cleanup = enable();
    if (!allowed && cleanup) { cleanup(); cleanup = undefined; }
  }
  [finePointer, coarsePointer, reducedMotion, forcedColors].forEach(query => {
    query.addEventListener('change', sync);
  });
  sync();
})();

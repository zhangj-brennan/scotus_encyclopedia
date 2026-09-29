// Scroll bridge for embedding this page in a pinned iframe (see embed-snippet.html).
// The host page scrolls a tall wrapper and posts {type:"tl-progress", progress:0..1};
// we scroll this document to match, so the sticky figure + IntersectionObserver
// work exactly as they do standalone. Wheel/touch/key scrolling inside the iframe
// is forwarded to the host so the reader always scrolls the host page.
// Does nothing unless a host sends a tl-progress message.
(function () {
  if (window.parent === window) return;

  let embedded = false;
  let lastHeight = 0;

  function post(msg) {
    window.parent.postMessage(msg, "*");
  }

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  function reportHeight() {
    const h = document.documentElement.scrollHeight;
    if (h === lastHeight) return;
    lastHeight = h;
    post({ type: "tl-height", height: h });
  }

  function enable() {
    embedded = true;
    document.documentElement.style.overflow = "hidden";
    reportHeight();
    new ResizeObserver(reportHeight).observe(document.body);
    window.addEventListener("resize", reportHeight);
  }

  window.addEventListener("message", e => {
    if (e.source !== window.parent || !e.data || e.data.type !== "tl-progress") return;
    if (!embedded) enable();
    const p = Math.min(1, Math.max(0, +e.data.progress || 0));
    window.scrollTo(0, p * maxScroll());
  });

  // Mouse wheel / trackpad
  window.addEventListener("wheel", e => {
    if (!embedded || e.ctrlKey) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    post({ type: "tl-scroll", dy: e.deltaY * unit });
  }, { passive: false });

  // Touch (d3.drag stops propagation on its own touchmoves, so threshold dragging still works)
  let lastY = null;
  let lastT = 0;
  let velocity = 0;

  window.addEventListener("touchstart", e => {
    if (!embedded || e.touches.length !== 1) return;
    lastY = e.touches[0].clientY;
    lastT = performance.now();
    velocity = 0;
    post({ type: "tl-scroll", dy: 0 }); // stops any fling in progress
  }, { passive: true });

  window.addEventListener("touchmove", e => {
    if (!embedded || lastY === null || e.defaultPrevented || e.touches.length !== 1) return;
    if (e.target.closest && e.target.closest(".drag-hit")) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const now = performance.now();
    const dy = lastY - y;
    velocity = dy / Math.max(1, now - lastT);
    lastY = y;
    lastT = now;
    post({ type: "tl-scroll", dy });
  }, { passive: false });

  window.addEventListener("touchend", () => {
    if (!embedded || lastY === null) return;
    lastY = null;
    if (performance.now() - lastT < 100 && Math.abs(velocity) > 0.2) {
      post({ type: "tl-fling", v: velocity });
    }
  });

  // Keyboard scrolling when focus is inside the iframe
  const KEY_DY = {
    ArrowDown: 60, ArrowUp: -60,
    PageDown: 0.9, PageUp: -0.9, " ": 0.9
  };

  window.addEventListener("keydown", e => {
    if (!embedded || !(e.key in KEY_DY)) return;
    if (e.target.closest && e.target.closest("button, input, select, textarea")) return;
    e.preventDefault();
    let dy = KEY_DY[e.key];
    if (Math.abs(dy) < 1) dy *= window.innerHeight;
    if (e.key === " " && e.shiftKey) dy = -dy;
    post({ type: "tl-scroll", dy });
  });
})();

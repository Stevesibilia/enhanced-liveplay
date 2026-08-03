// Shared player display renderer.
//
// Renders a `displayState` (layers with geometry, z-order, and fades) into the
// fixed 16:9 canvas. Loaded by both the local Electron player window and the
// remote browser viewer so layer/fade logic lives in one place and cannot
// drift between the two outputs.
//
// The environment supplies a `window.PlayerTransport` shim before this script
// runs. Contract:
//   mediaUrl(absolutePath) -> string          // how an image path becomes a src
//   onDisplayState(callback)                   // subscribe to displayState pushes
//   signalReady()                              // tell the source we're listening
//   onToggleFullscreen?(callback)              // optional: source-driven FS class
//   requestToggleFullscreen?()                 // optional: ask source to toggle FS
(function () {
  const transport = window.PlayerTransport;

  // Layers mount inside the fixed 16:9 canvas, not the raw window, so layer
  // percentages map identically to the composition workspace canvas.
  const display = document.getElementById('canvas');

  // F11 fullscreen toggle (no-op where the transport doesn't support it).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      transport.requestToggleFullscreen?.();
    }
  });

  // Track fullscreen state for CSS (source-driven, optional).
  transport.onToggleFullscreen?.(() => {
    document.body.classList.toggle('fullscreen');
  });

  function mediaUrl(absolutePath) {
    return transport.mediaUrl(absolutePath);
  }

  // Cache of currently-mounted layer DOM nodes by layer id.
  // Tracking lets us animate adds/removes individually instead of
  // re-rendering the whole stack on every push.
  const mountedLayers = new Map();

  function clearDisplay() {
    display.innerHTML = '';
    mountedLayers.clear();
  }

  function makeImageLayer(layer) {
    const el = document.createElement('div');
    el.className = 'layer';
    el.dataset.layerId = layer.id;
    el.style.left = layer.x + '%';
    el.style.top = layer.y + '%';
    el.style.width = layer.width + '%';
    el.style.height = layer.height + '%';
    el.style.zIndex = String(layer.zIndex);

    const img = document.createElement('img');
    img.src = mediaUrl(layer.mediaPath);
    img.alt = '';
    img.draggable = false;
    img.onerror = () => {
      // Fallback to file:// if the primary media source fails (Electron only;
      // a remote browser cannot load file:// and simply renders nothing).
      img.onerror = null;
      img.src = 'file://' + layer.mediaPath;
    };
    el.appendChild(img);
    return el;
  }

  function updateLayerPosition(el, layer) {
    el.style.left = layer.x + '%';
    el.style.top = layer.y + '%';
    el.style.width = layer.width + '%';
    el.style.height = layer.height + '%';
    el.style.zIndex = String(layer.zIndex);
  }

  function addLayerWithFade(layer) {
    const el = makeImageLayer(layer);
    const fadeIn = Number(layer.fadeIn) > 0 ? Number(layer.fadeIn) : 0;
    if (fadeIn > 0) {
      el.classList.add('entering');
      el.style.transition = 'opacity ' + fadeIn + 's linear';
    } else {
      el.style.transition = '';
    }
    display.appendChild(el);
    mountedLayers.set(layer.id, { el, fadeOut: Number(layer.fadeOut) || 0 });

    if (fadeIn > 0) {
      // Trigger transition on next frame so the 0 → 1 change is animated.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.classList.remove('entering');
      }));
    }
  }

  function removeLayerWithFade(id) {
    const entry = mountedLayers.get(id);
    if (!entry) return;
    const { el, fadeOut } = entry;
    mountedLayers.delete(id);
    if (fadeOut > 0) {
      el.style.transition = 'opacity ' + fadeOut + 's linear';
      // Force layout so the upcoming opacity change actually animates.
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add('leaving');
      const cleanup = () => { if (el.parentNode) el.parentNode.removeChild(el); };
      el.addEventListener('transitionend', cleanup, { once: true });
      // Safety net in case transitionend doesn't fire (e.g. interrupted).
      setTimeout(cleanup, fadeOut * 1000 + 100);
    } else {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  }

  function renderState(state) {
    console.log('[Player] Received display state:', state);

    // Backwards compatibility: legacy single-item payload (image only — PDF deferred)
    if (state && typeof state.type === 'string') {
      clearDisplay();
      if (state.type !== 'image' || !state.mediaPath) return;
      const synthetic = {
        id: 'legacy',
        type: 'image',
        mediaPath: state.mediaPath,
        x: 0, y: 0, width: 100, height: 100, zIndex: 1,
      };
      state = { layers: [synthetic] };
    }

    const incoming = Array.isArray(state?.layers) ? state.layers : [];
    const incomingById = new Map();
    for (const layer of incoming) {
      if (layer.type === 'image') incomingById.set(layer.id, layer);
    }

    // Remove layers that no longer appear in the incoming state.
    for (const id of Array.from(mountedLayers.keys())) {
      if (!incomingById.has(id)) removeLayerWithFade(id);
    }

    // Add or update each incoming layer.
    const sorted = [...incomingById.values()].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of sorted) {
      const existing = mountedLayers.get(layer.id);
      if (existing) {
        updateLayerPosition(existing.el, layer);
        existing.fadeOut = Number(layer.fadeOut) || 0;
      } else {
        addLayerWithFade(layer);
      }
    }
  }

  transport.onDisplayState(renderState);

  // Start in black state
  clearDisplay();

  // Tell the source we're loaded and listening, so it can flush the last
  // display state (fixes the first-publish-black race).
  transport.signalReady();
})();

/**
 * Encapsulates resize-handle logic for the cart/playlist split panel.
 */
export const useResizablePanel = () => {
  const cartWidth = ref(500);
  const isResizing = ref(false);
  const cartClosed = ref(false);
  const cartFullscreen = ref(false);

  const startResize = (e: MouseEvent) => {
    isResizing.value = true;
    e.preventDefault();

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.value) return;

      const container = document.querySelector('.workspace-content');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;

      const snapThreshold = 100;
      const minWidth = 300;
      const maxWidth = rect.width * 0.95;

      if (newWidth < snapThreshold) {
        cartClosed.value = true;
        cartFullscreen.value = false;
        return;
      }

      if (newWidth > rect.width - snapThreshold) {
        cartFullscreen.value = true;
        cartClosed.value = false;
        return;
      }

      cartClosed.value = false;
      cartFullscreen.value = false;
      cartWidth.value = Math.max(minWidth, Math.min(maxWidth, newWidth));
    };

    const handleMouseUp = () => {
      isResizing.value = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return {
    cartWidth,
    cartClosed,
    cartFullscreen,
    startResize,
  };
};

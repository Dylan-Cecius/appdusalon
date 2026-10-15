type Viewport = EventTarget & Pick<VisualViewport, 'height' | 'offsetTop' | 'scale'>;
type ViewportWindow = EventTarget & Pick<Window, 'innerHeight' | 'requestAnimationFrame' | 'cancelAnimationFrame'> & {
  visualViewport: Viewport | null;
};
type Style = Pick<CSSStyleDeclaration, 'getPropertyValue' | 'getPropertyPriority' | 'setProperty' | 'removeProperty'>;

/** Install once at the root. CSS updates avoid re-rendering the agenda on scroll. */
export function installViewportMetrics(host: ViewportWindow, style: Style): () => void {
  const viewport = host.visualViewport;
  const properties = ['--app-viewport-height', '--app-viewport-top'] as const;
  const previous = properties.map(name => [name, style.getPropertyValue(name), style.getPropertyPriority(name)]);
  let frame: number | null = null;
  let disposed = false;

  const update = () => {
    frame = null;
    if (disposed) return;
    // Keep the dialog still while the user zooms/pans to inspect its contents.
    if (viewport && viewport.scale > 1.01) return;
    const height = viewport && Number.isFinite(viewport.height) && viewport.height > 0
      ? viewport.height : host.innerHeight;
    if (!Number.isFinite(height) || height <= 0) return;
    const top = viewport && Number.isFinite(viewport.offsetTop) ? Math.max(0, viewport.offsetTop) : 0;
    style.setProperty(properties[0], `${height}px`);
    style.setProperty(properties[1], `${top}px`);
  };
  const schedule = () => {
    if (!disposed && frame === null) frame = host.requestAnimationFrame(update);
  };
  update();
  host.addEventListener('resize', schedule, { passive: true });
  viewport?.addEventListener('resize', schedule, { passive: true });
  viewport?.addEventListener('scroll', schedule, { passive: true });

  return () => {
    if (disposed) return;
    disposed = true;
    if (frame !== null) host.cancelAnimationFrame(frame);
    host.removeEventListener('resize', schedule);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    for (const [name, value, priority] of previous) {
      if (value) style.setProperty(name, value, priority);
      else style.removeProperty(name);
    }
  };
}

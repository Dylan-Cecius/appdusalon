import { describe, expect, it } from 'vitest';
import { installViewportMetrics } from './viewportMetrics';

function fixture(withViewport = true) {
  const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0, scale: 1 });
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  const host = Object.assign(new EventTarget(), {
    innerHeight: 900,
    visualViewport: withViewport ? viewport : null,
    requestAnimationFrame(callback: FrameRequestCallback) { frames.set(++id, callback); return id; },
    cancelAnimationFrame(frame: number) { frames.delete(frame); },
  });
  const values = new Map<string, [string, string]>();
  const style = {
    getPropertyValue: (name: string) => values.get(name)?.[0] ?? '',
    getPropertyPriority: (name: string) => values.get(name)?.[1] ?? '',
    setProperty(name: string, value: string, priority = '') { values.set(name, [value, priority]); },
    removeProperty(name: string) { const old = this.getPropertyValue(name); values.delete(name); return old; },
  };
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0)); };
  return { host, viewport, frames, style, flush };
}

describe('mobile visual viewport', () => {
  it('tracks keyboard resize and pan together without rerendering on each event', () => {
    const f = fixture(); const stop = installViewportMetrics(f.host, f.style);
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('800px');
    f.viewport.height = 350; f.viewport.offsetTop = 120;
    f.viewport.dispatchEvent(new Event('resize'));
    f.viewport.dispatchEvent(new Event('scroll'));
    f.host.dispatchEvent(new Event('resize'));
    expect(f.frames.size).toBe(1);
    f.flush();
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('350px');
    expect(f.style.getPropertyValue('--app-viewport-top')).toBe('120px');
    f.viewport.height = 800; f.viewport.offsetTop = 0;
    f.viewport.dispatchEvent(new Event('resize')); f.flush();
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('800px');
    expect(f.style.getPropertyValue('--app-viewport-top')).toBe('0px'); stop();
  });

  it('falls back to window height without VisualViewport', () => {
    const f = fixture(false); const stop = installViewportMetrics(f.host, f.style);
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('900px');
    f.host.innerHeight = 450; f.host.dispatchEvent(new Event('resize')); f.flush();
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('450px'); stop();
  });

  it('does not write invalid geometry during transient viewport states', () => {
    const f = fixture(); const stop = installViewportMetrics(f.host, f.style);
    f.viewport.height = NaN; f.viewport.offsetTop = -20;
    f.viewport.dispatchEvent(new Event('resize')); f.flush();
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('900px');
    expect(f.style.getPropertyValue('--app-viewport-top')).toBe('0px');
    f.viewport.height = 0; f.host.innerHeight = 0; f.viewport.offsetTop = Infinity;
    f.viewport.dispatchEvent(new Event('resize')); f.flush();
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('900px'); stop();
  });

  it('keeps the dialog stable while pinch zooming and resumes after zoom', () => {
    const f = fixture(); const stop = installViewportMetrics(f.host, f.style);
    f.viewport.scale = 2; f.viewport.height = 400; f.viewport.offsetTop = 200;
    f.viewport.dispatchEvent(new Event('resize')); f.flush();
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('800px');
    expect(f.style.getPropertyValue('--app-viewport-top')).toBe('0px');
    f.viewport.scale = 1; f.viewport.height = 700; f.viewport.offsetTop = 0;
    f.viewport.dispatchEvent(new Event('resize')); f.flush();
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('700px'); stop();
  });

  it('restores CSS and cancels queued updates across unmount and StrictMode remount', () => {
    const f = fixture(); f.style.setProperty('--app-viewport-height', '80vh', 'important');
    const stop = installViewportMetrics(f.host, f.style);
    f.viewport.dispatchEvent(new Event('resize'));
    const stale = [...f.frames.values()][0];
    stop(); stop(); stale(0);
    expect(f.frames.size).toBe(0);
    expect(f.style.getPropertyValue('--app-viewport-height')).toBe('80vh');
    expect(f.style.getPropertyPriority('--app-viewport-height')).toBe('important');
    expect(f.style.getPropertyValue('--app-viewport-top')).toBe('');
    f.host.dispatchEvent(new Event('resize')); f.viewport.dispatchEvent(new Event('scroll'));
    expect(f.frames.size).toBe(0);
    const stopAgain = installViewportMetrics(f.host, f.style);
    f.viewport.dispatchEvent(new Event('resize')); expect(f.frames.size).toBe(1);
    stopAgain();
  });
});

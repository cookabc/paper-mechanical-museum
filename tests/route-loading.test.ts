import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app/app';
import type { ExhibitMount } from '../src/app/exhibit-loaders';
import type { SceneController } from '../src/app/contracts';

let root: HTMLElement;
const cleanups: Array<() => void> = [];
beforeEach(() => {
  history.replaceState(null, '', '#/');
  localStorage.clear();document.documentElement.lang = 'en';
  root = document.createElement('div');document.body.append(root);
});
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn());root.remove();vi.restoreAllMocks(); });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes;reject = no; });
  return { promise, resolve, reject };
}
function mount(label: string) {
  const controller: SceneController = { pause: vi.fn(), resume: vi.fn(), reset: vi.fn(), dispose: vi.fn() };
  const start = vi.fn<ExhibitMount>(({ root }) => { root.textContent = label;return controller; });
  return { start, controller };
}
it('does not load exhibits at the entrance and shares a pending request for the same route', async () => {
  const request = deferred<ExhibitMount>(), exhibit = mount('coffee');
  const load = vi.fn(() => request.promise);
  const app = createApp(root, { coffee: load });cleanups.push(() => app.dispose());
  expect(load).not.toHaveBeenCalled();
  const first = app.navigate('coffee'), second = app.navigate('coffee');
  expect(first).toBe(second);expect(load).toHaveBeenCalledTimes(1);
  expect(root.querySelector('[aria-busy="true"]')).not.toBeNull();
  expect(root.querySelector('[role="status"]')?.textContent).toContain('Opening');
  request.resolve(exhibit.start);await first;
  expect(exhibit.start).toHaveBeenCalledTimes(1);expect(app.current).toBe(exhibit.controller);
  expect(root.querySelector('[aria-busy]')).toBeNull();
});
it('ignores a slow older import and a rejected import after navigation', async () => {
  const slow = deferred<ExhibitMount>(), coffee = mount('coffee'), fan = mount('fan');
  const app = createApp(root, { coffee: () => slow.promise, fan: async () => fan.start });cleanups.push(() => app.dispose());
  const old = app.navigate('coffee');await app.navigate('fan');
  slow.resolve(coffee.start);await old;
  expect(coffee.start).not.toHaveBeenCalled();expect(app.current).toBe(fan.controller);
  const rejected = deferred<ExhibitMount>();
  const other = createApp(root, { coffee: () => rejected.promise });cleanups.push(() => other.dispose());
  const pending = other.navigate('coffee');await other.navigate('');rejected.reject(new Error('offline'));await pending;
  expect(root.querySelector('[role="alert"]')).toBeNull();
});
it('shows recovery, disposes partial resources, and retries a failed mount', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const cleaned = vi.fn(), exhibit = mount('coffee');let attempts = 0;
  const app = createApp(root, { coffee: async () => {
    if (++attempts === 1) return ({ scope }) => { scope.onCleanup(cleaned);throw new Error('mount failed'); };
    return exhibit.start;
  } });cleanups.push(() => app.dispose());
  await app.navigate('coffee');expect(cleaned).toHaveBeenCalledExactlyOnceWith();
  expect(root.querySelector('[role="alert"]')?.textContent).toContain('Try again');
  root.querySelector<HTMLButtonElement>('.scene-status button')!.click();
  await app.navigate('coffee');expect(attempts).toBe(2);expect(app.current).toBe(exhibit.controller);
});
it('never mounts or changes the DOM when a pending import completes after disposal', async () => {
  const request = deferred<ExhibitMount>(), exhibit = mount('coffee');
  const app = createApp(root, { coffee: () => request.promise });
  const pending = app.navigate('coffee');app.dispose();request.resolve(exhibit.start);await pending;
  await app.navigate('coffee');
  expect(root.childElementCount).toBe(0);expect(exhibit.start).not.toHaveBeenCalled();
  expect(app.diagnostics().app).toMatchObject({ active: false, frames: 0, timers: 0, listeners: 0 });
});
it('mounts hidden exhibits paused and rejects prototype names as routes', async () => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  const exhibit = mount('coffee');
  const app = createApp(root, { coffee: async () => exhibit.start });cleanups.push(() => app.dispose());
  await app.navigate('coffee');expect(exhibit.controller.pause).toHaveBeenCalledWith('hidden');
  await app.navigate('constructor');expect(root.textContent).toContain('This exhibit was not found');
  expect(app.current).toBeNull();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

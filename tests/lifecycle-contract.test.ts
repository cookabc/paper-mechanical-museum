// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceScope } from '../src/app/scope';
import { scopedDocument } from '../src/app/scoped-dom';
import type { SceneController } from '../src/app/contracts';

/** Only the browser clock/layout are doubled. Product renderers are not replaced. */
class ControlledClock {
  private serial = 0;
  frames = new Map<number, FrameRequestCallback>();
  history: FrameRequestCallback[] = [];
  install() {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++this.serial;
      this.frames.set(id, callback);
      this.history.push(callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => this.frames.delete(id));
  }
  advance(milliseconds: number, render = true) {
    const end = performance.now() + milliseconds;
    while (performance.now() < end) {
      vi.advanceTimersByTime(Math.min(20, end - performance.now()));
      if (render) {
        const pending = [...this.frames.entries()];
        this.frames.clear();
        for (const [, callback] of pending) callback(performance.now());
      }
    }
  }
}

let clock: ControlledClock;
let cleanups: Array<() => void>;

beforeEach(() => {
  cleanups = [];
  document.body.replaceChildren();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  clock = new ControlledClock();
  clock.install();
  vi.stubGlobal('CSS', { ...globalThis.CSS, escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&') });
});

afterEach(() => {
  for (const cleanup of cleanups.reverse()) {
    try { cleanup(); } catch { /* Tests assert cleanup failures at their source. */ }
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.replaceChildren();
});

function trackedScope() {
  const scope = new ResourceScope();
  cleanups.push(() => scope.dispose());
  return scope;
}

function click(root: ParentNode, selector: string) {
  const control = root.querySelector(selector);
  expect(control, `real control ${selector} must exist`).not.toBeNull();
  control!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
  return control!;
}

function snapshot(controller: SceneController) {
  expect(controller.snapshot, 'the actual controller exposes a read-only diagnostic snapshot').toBeTypeOf('function');
  return controller.snapshot!();
}

async function mountActual(id: 'coffee' | 'fan') {
  const [{ createAudioService }, { createObservation }, module] = await Promise.all([
    import('../src/shared/audio'),
    import('../src/shared/observation.js'),
    id === 'coffee' ? import('../src/exhibits/coffee') : import('../src/exhibits/fan/index.js'),
  ]);
  const root = document.createElement('main');
  root.dataset.testScene = id;
  document.body.append(root);
  const audioScope = trackedScope(), scope = trackedScope();
  const audio = createAudioService(audioScope), observation = createObservation(root, scope);
  cleanups.push(() => audio.dispose());
  const mount = 'mountCoffee' in module ? module.mountCoffee : module.mountFan;
  const controller: SceneController = mount({ root, scope, audio, observation });
  cleanups.push(() => controller.dispose());
  return { root, scope, audio, controller };
}

describe('owned scheduling boundary used by the real scene adapters', () => {
  it('pauses clocks without consuming remaining timeout duration or duplicating RAF on resume', () => {
    const scope = trackedScope();
    const timeout = vi.fn(), frame = vi.fn();
    scope.timeout(timeout, 100);
    scope.raf(frame);
    clock.advance(40, false);
    scope.pause();
    scope.pause();
    expect(clock.frames.size).toBe(0);
    clock.advance(10_000);
    expect(timeout).not.toHaveBeenCalled();
    expect(frame).not.toHaveBeenCalled();
    scope.resume();
    scope.resume();
    expect(clock.frames.size).toBe(1);
    clock.advance(59);
    expect(frame).toHaveBeenCalledTimes(1);
    expect(timeout).not.toHaveBeenCalled();
    clock.advance(1);
    expect(timeout).toHaveBeenCalledTimes(1);
    expect(scope.diagnostics()).toMatchObject({ frames: 0, timers: 0 });
  });

  it('makes disposal terminal even for already retained native callback references', () => {
    const scope = trackedScope();
    const callback = vi.fn();
    scope.listen(document, 'visibilitychange', callback);
    scope.timeout(callback, 40);
    scope.raf(callback);
    const oldFrame = clock.history.at(-1)!;
    scope.dispose();
    scope.dispose();
    scope.resume();
    document.dispatchEvent(new Event('visibilitychange'));
    oldFrame(100);
    clock.advance(100);
    expect(callback).not.toHaveBeenCalled();
    expect(scope.raf(callback)).toBe(0);
    expect(scope.timeout(callback, 1)).toBe(0);
    expect(scope.diagnostics()).toMatchObject({ active: false, frames: 0, timers: 0, listeners: 0 });
  });

  it('finishes all resource cleanup even if one exhibit cleanup fails', () => {
    const scope = trackedScope();
    const listener = vi.fn(), finalCleanup = vi.fn();
    scope.listen(window, 'pageshow', listener);
    scope.onCleanup(finalCleanup);
    scope.onCleanup(() => { throw new Error('one scene cleanup failed'); });
    // Whether the error is rethrown or reported is a host policy. Leaking is not.
    try { scope.dispose(); } catch { /* Assert the terminal resource state below. */ }
    window.dispatchEvent(new Event('pageshow'));
    expect(finalCleanup).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
    expect(scope.diagnostics()).toMatchObject({ active: false, frames: 0, timers: 0, listeners: 0 });
  });

  it('keeps control and query ownership inside its root', () => {
    const scope = trackedScope();
    const outside = document.createElement('div'), root = document.createElement('main');
    outside.innerHTML = '<button id="same">outside</button>';
    root.innerHTML = '<button id="same">owned</button>';
    document.body.append(outside, root);
    const doc = scopedDocument(root, scope);
    expect(doc.body).toBe(root);
    expect(doc.getElementById('same')?.textContent).toBe('owned');
    expect(doc.querySelectorAll('button')).toHaveLength(1);
    doc.body.innerHTML = '<svg id="new-owned-model"></svg>';
    expect(outside.querySelector('button')?.textContent).toBe('outside');
  });

  it('removes the exact event registration when a listener is reused across types', () => {
    const scope = trackedScope();
    const root = document.createElement('main');
    document.body.append(root);
    const doc = scopedDocument(root, scope), listener = vi.fn();
    doc.addEventListener('keydown', listener);
    doc.addEventListener('visibilitychange', listener);
    doc.removeEventListener('keydown', listener);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(listener).not.toHaveBeenCalled();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(scope.diagnostics().listeners).toBe(1);
  });

  it('preserves capture identity and native duplicate-listener semantics', () => {
    const scope = trackedScope();
    const root = document.createElement('main');
    document.body.append(root);
    const doc = scopedDocument(root, scope), listener = vi.fn();
    doc.addEventListener('keydown', listener, true);
    doc.addEventListener('keydown', listener, false);
    doc.addEventListener('keydown', listener, false);
    doc.removeEventListener('keydown', listener, true);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(listener).toHaveBeenCalledTimes(1);
    doc.removeEventListener('keydown', listener, false);
    expect(scope.diagnostics().listeners).toBe(0);
  });

  it('retains native function-listener this and object-listener handleEvent ownership', () => {
    const scope = trackedScope(), button = document.createElement('button');
    let functionCalls = 0;
    scope.listen(button, 'click', function (this: EventTarget, event: Event) {
      expect(this).toBe(button);
      expect(event.currentTarget).toBe(button);
      functionCalls++;
    });
    const objectListener = { count: 0, handleEvent() { this.count++; } };
    scope.listen(button, 'click', objectListener);
    button.click();
    expect(functionCalls).toBe(1);
    expect(objectListener.count).toBe(1);
  });
});

describe('real coffee and fan adapters with actual shared services', () => {
  for (const id of ['coffee', 'fan'] as const) {
    it(`${id}: mounts substantial original geometry without replacing the surrounding application`, async () => {
      const shell = document.createElement('nav');
      shell.textContent = 'Museum navigation';
      document.body.append(shell);
      const { root, scope, audio, controller } = await mountActual(id);
      expect(shell.isConnected).toBe(true);
      expect(root.querySelectorAll('svg path').length).toBeGreaterThan(50);
      expect(root.querySelector('iframe')).toBeNull();
      expect(root.querySelectorAll('.mechanical-audio')).toHaveLength(1);
      expect(audio.enabled).toBe(false);
      controller.dispose();
      expect(shell.isConnected).toBe(true);
      expect(scope.diagnostics()).toMatchObject({ active: false, frames: 0, timers: 0, listeners: 0 });
    });

    it(`${id}: freezes physical motion and input for overlapping pause reasons, then resumes only once`, async () => {
      const { root, scope, audio, controller } = await mountActual(id);
      click(root, id === 'coffee' ? '[data-act="beans"]' : '#power');
      clock.advance(80);
      expect(Number(snapshot(controller)[id === 'coffee' ? 'beans' : 'velocity'])).toBeGreaterThan(0);
      controller.pause('manual');
      controller.pause('hidden');
      const physicalKey = id === 'coffee' ? 'beans' : 'angle';
      const before = snapshot(controller)[physicalKey];
      const physicalInputKey = id === 'coffee' ? 'phase' : 'speed';
      const beforeInput = snapshot(controller)[physicalInputKey];
      click(root, id === 'coffee' ? '.act[data-action-label="重新准备"]' : '[data-speed="3"]');
      expect(snapshot(controller)[physicalInputKey]).toEqual(beforeInput);
      clock.advance(10_000);
      expect(snapshot(controller)[physicalKey]).toEqual(before);
      expect(clock.frames.size).toBe(0);
      controller.resume('manual');
      expect(clock.frames.size).toBe(0);
      controller.resume('hidden');
      controller.resume('hidden');
      expect(clock.frames.size).toBeLessThanOrEqual(1);
      clock.advance(20);
      const delta = Number(snapshot(controller)[physicalKey]) - Number(before);
      expect(delta).toBeGreaterThanOrEqual(0);
      expect(delta).toBeLessThan(0.2);
      expect(audio.enabled).toBe(false);
      expect(scope.diagnostics().frames).toBeLessThanOrEqual(1);
    }, 20_000);

    it(`${id}: reset cancels old state work, and disposed DOM input cannot resurrect it`, async () => {
      const { root, scope, controller } = await mountActual(id);
      const oldControl = click(root, id === 'coffee' ? '[data-act="beans"]' : '#power');
      clock.advance(60);
      controller.reset();
      clock.advance(200);
      expect(snapshot(controller)).toMatchObject(id === 'coffee'
        ? { phase: 'empty', beans: 0, fill: 0 }
        : { on: false, speed: 1, velocity: 0, angle: 0 });
      controller.dispose();
      const after = snapshot(controller);
      controller.dispose();
      controller.resume('manual');
      controller.reset();
      oldControl.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
      oldControl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));
      window.dispatchEvent(new Event('blur'));
      clock.advance(3_000);
      expect(snapshot(controller)).toEqual(after);
      expect(scope.diagnostics()).toMatchObject({ active: false, frames: 0, timers: 0, listeners: 0 });
      expect(clock.frames.size).toBe(0);
    }, 20_000);
  }

  it('scope-only disposal makes the retained coffee controller terminal without muting another scene', async () => {
    const {controller,scope,audio}=await mountActual('coffee');scope.dispose();
    const before=snapshot(controller),changed=vi.fn(),off=audio.onChange(changed);
    controller.pause('manual');controller.reset();controller.resume('manual');
    expect(snapshot(controller)).toEqual(before);expect(before.disposed).toBe(true);expect(changed).not.toHaveBeenCalled();off();
  });

  it('releases ordinary model drag capture on pause, reset and scope-only disposal', async () => {
    const { root, controller, scope } = await mountActual('coffee');
    const svg = root.querySelector('svg#fig')!;
    let captured: number | null = null;
    svg.setPointerCapture = id => { captured = id; };
    svg.hasPointerCapture = id => captured === id;
    svg.releasePointerCapture = () => { captured = null; };
    const down = () => { const event = new Event('pointerdown', {bubbles:true}); Object.assign(event,{pointerId:8,button:0,isPrimary:true,clientX:20,clientY:30}); svg.dispatchEvent(event); expect(captured).toBe(8); };
    down(); controller.pause('manual'); expect(captured).toBeNull(); controller.resume('manual');
    down(); controller.reset(); expect(captured).toBeNull();
    down(); scope.dispose(); expect(captured).toBeNull();
  });

  it('cancels a captured fan pointer before resume, so the old pointerup never toggles power', async () => {
    const { root, controller } = await mountActual('fan');
    const svg = root.querySelector('svg')!, target = root.querySelector('#scene-power')!;
    let captured: number | null = null;
    svg.setPointerCapture = (id: number) => { captured = id; };
    svg.hasPointerCapture = (id: number) => captured === id;
    svg.releasePointerCapture = () => { captured = null; };
    const pointer = (type: string) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      for (const [key, value] of Object.entries({ pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10 })) {
        Object.defineProperty(event, key, { value });
      }
      target.dispatchEvent(event);
    };
    pointer('pointerdown');
    expect(captured).toBe(7);
    controller.pause('manual');
    expect(captured).toBeNull();
    controller.resume('manual');
    pointer('pointerup');
    expect(snapshot(controller).on).toBe(false);
    click(root, '#scene-power');
    expect(snapshot(controller).on).toBe(true);
  });

  it('makes real observation controls inert while paused and after disposal', async () => {
    const { root, controller } = await mountActual('fan');
    const panel = root.querySelector<HTMLDetailsElement>('.mechanism-observer')!;
    panel.open = true;
    panel.dispatchEvent(new Event('toggle'));
    const slow = click(root, '[data-rate="0.25"]');
    expect(snapshot(controller).observationRate).toBe(0.25);
    controller.pause('manual');
    slow.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
    expect(snapshot(controller).observationRate).toBe(1);
    controller.dispose();
    const after = snapshot(controller);
    slow.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
    panel.dispatchEvent(new Event('toggle'));
    expect(snapshot(controller)).toEqual(after);
    expect(clock.frames.size).toBe(0);
  });

  it('coffee reset immediately clears transient feedback rather than waiting for its old timer', async () => {
    const { root, controller } = await mountActual('coffee');
    click(root, '.act[data-action-label="研磨咖啡豆"]');
    expect(root.querySelector('#toast')?.classList.contains('show')).toBe(true);
    controller.reset();
    expect(root.querySelector('#toast')?.classList.contains('show')).toBe(false);
    expect(root.querySelector('#readout')?.textContent).toBe(snapshot(controller).message);
    clock.advance(2_000);
    expect(root.querySelector('#readout')?.textContent).toBe(snapshot(controller).message);
  });

  for (const id of ['coffee', 'fan'] as const) {
    it(`${id}: releases held-key ownership across pause → keyup → resume`, async () => {
      const { root, controller } = await mountActual(id);
      const selector = id === 'coffee' ? '[data-act="beans"]' : '#scene-power';
      const control = root.querySelector(selector)!;
      control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      controller.pause('manual');
      control.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      controller.resume('manual');
      controller.reset();
      click(root, selector);
      expect(snapshot(controller)).toMatchObject(id === 'coffee' ? { phase: 'adding' } : { on: true });
    });
  }
});

describe('real unified host route lifecycle', () => {
  async function app() {
    const { createApp } = await import('../src/app/app');
    const root = document.createElement('div');
    document.body.append(root);
    const instance = createApp(root);
    cleanups.push(() => instance.dispose());
    return { root, instance };
  }

  it('switches coffee → fan → coffee with fresh state and inert outgoing controllers', async () => {
    const { root, instance } = await app();
    const outside = document.createElement('nav');
    outside.textContent = 'Outside application';
    document.body.append(outside);
    await instance.navigate('coffee');
    const first = instance.current!;
    const oldControl = click(root, '[data-act="beans"]');
    clock.advance(60);
    await instance.navigate('fan');
    expect(root.isConnected).toBe(true);
    expect(outside.isConnected).toBe(true);
    expect(root.querySelectorAll('header')).toHaveLength(1);
    expect(root.querySelector('#figure')).not.toBeNull();
    expect(root.querySelector('#fig')).toBeNull();
    expect(root.querySelectorAll('.mechanical-audio')).toHaveLength(1);
    const afterLeave = snapshot(first);
    oldControl.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
    first.resume('manual');
    first.reset();
    window.dispatchEvent(new Event('pageshow'));
    clock.advance(60);
    expect(snapshot(first)).toEqual(afterLeave);
    click(root, '#power');
    clock.advance(40);
    const fan = instance.current!;
    await instance.navigate('coffee');
    expect(instance.current).not.toBe(first);
    expect(instance.current).not.toBe(fan);
    expect(snapshot(instance.current!)).toMatchObject({ phase: 'empty', beans: 0, fill: 0 });
    expect(root.querySelectorAll('.mechanical-audio')).toHaveLength(1);
    fan.dispose();
    expect(root.querySelectorAll('.mechanical-audio')).toHaveLength(1);
    expect(root.querySelector('iframe')).toBeNull();
  }, 20_000);

  it('keeps the final requested scene after rapid consecutive navigation', async () => {
    const { root, instance } = await app();
    const stale = instance.navigate('fan');
    const newest = instance.navigate('coffee');
    await Promise.all([stale, newest]);
    expect(instance.diagnostics().id).toBe('coffee');
    expect(root.querySelector('#fig')).not.toBeNull();
    expect(root.querySelector('#figure')).toBeNull();
    expect(root.querySelectorAll('.mechanical-audio')).toHaveLength(1);
  });

  it('leaves focus in the current scene instead of restoring an outgoing lesson summary', async () => {
    const { root, instance } = await app();
    await instance.navigate('coffee');
    const observer = root.querySelector<HTMLDetailsElement>('.mechanism-observer')!;
    observer.open = true;
    observer.dispatchEvent(new Event('toggle'));
    const lesson = root.querySelector<HTMLDetailsElement>('.mechanism-lesson')!;
    lesson.open = true;
    lesson.dispatchEvent(new Event('toggle'));
    const oldSummary = lesson.querySelector('summary')!;
    lesson.querySelector<HTMLButtonElement>('.mechanism-lesson-go')!.focus();
    const oldFocus = vi.spyOn(oldSummary, 'focus');
    await instance.navigate('fan');
    expect(oldFocus).not.toHaveBeenCalled();
    expect(document.activeElement?.isConnected).toBe(true);
    expect(root.contains(document.activeElement)).toBe(true);
    expect(lesson.contains(document.activeElement)).toBe(false);
  });

  it('returns to a stable owned-resource baseline over repeated real adapter switches', async () => {
    const { root, instance } = await app();
    const baselines = new Map<string, unknown>();
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const id of ['coffee', 'fan']) {
        await instance.navigate(id);
        clock.advance(240);
        const resources = instance.diagnostics().scope;
        if (!baselines.has(id)) baselines.set(id, resources);
        else expect(resources).toEqual(baselines.get(id));
        expect(root.querySelectorAll('.mechanical-audio')).toHaveLength(1);
        expect(clock.frames.size).toBe(0);
      }
    }
    instance.dispose();
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pageshow'));
    clock.advance(100);
    expect(clock.frames.size).toBe(0);
  }, 20_000);
});

describe('actual audio service ownership across route changes', () => {
  class AudioParamFixture {
    value = 0;
    cancelScheduledValues() { /* Browser audio automation is not simulated. */ }
    setValueAtTime(value: number) { this.value = value; }
    linearRampToValueAtTime(value: number) { this.value = value; }
    exponentialRampToValueAtTime(value: number) { this.value = value; }
  }
  class AudioNodeFixture {
    gain = new AudioParamFixture();
    frequency = new AudioParamFixture();
    threshold = new AudioParamFixture();
    knee = new AudioParamFixture();
    ratio = new AudioParamFixture();
    attack = new AudioParamFixture();
    release = new AudioParamFixture();
    connect() { /* The fixture owns no hardware audio graph. */ }
    disconnect() { /* The fixture owns no hardware audio graph. */ }
  }

  it('cancels a real sound-toggle resume that resolves after coffee has been replaced by fan', async () => {
    const contexts: DeferredContext[] = [];
    class DeferredContext {
      state = 'suspended';
      currentTime = 0;
      sampleRate = 8;
      destination = {};
      onstatechange: (() => void) | null = null;
      finishResume = () => {};
      close = vi.fn(() => { this.state = 'closed'; return Promise.resolve(); });
      constructor() { contexts.push(this); }
      createGain() { return new AudioNodeFixture(); }
      createDynamicsCompressor() { return new AudioNodeFixture(); }
      createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
      resume() { return new Promise<void>(resolve => { this.finishResume = () => { if (this.state !== 'closed') this.state = 'running'; resolve(); }; }); }
    }
    vi.stubGlobal('AudioContext', DeferredContext);
    const clickHandlers = new Map<EventTarget, EventListenerOrEventListenerObject>();
    const nativeAdd = EventTarget.prototype.addEventListener;
    vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (this: EventTarget, type, handler, options) {
      if (type === 'click' && handler && this instanceof Element && this.matches('.mechanical-audio button')) clickHandlers.set(this, handler);
      nativeAdd.call(this, type, handler, options);
    });
    const { createApp } = await import('../src/app/app');
    const root = document.createElement('div');
    document.body.append(root);
    const app = createApp(root);
    cleanups.push(() => app.dispose());
    await app.navigate('coffee');
    const button = root.querySelector<HTMLButtonElement>('.mechanical-audio button')!;
    button.click();
    expect(contexts).toHaveLength(0);
    const listener = clickHandlers.get(button)!;
    expect(listener).toBeTypeOf('function');
    // Only the event's browser trust flag and the hardware graph are fixtures.
    // The captured production callback, its pending epoch, and route teardown run unchanged.
    const pending = Reflect.apply(listener as EventListener, button, [{ isTrusted: true }]);
    expect(contexts).toHaveLength(1);
    expect(root.querySelector<HTMLElement>('.mechanical-audio')?.dataset.audioState).toBe('pending');
    await app.navigate('fan');
    expect(contexts[0].close).toHaveBeenCalledTimes(1);
    contexts[0].finishResume();
    await pending;
    expect(root.querySelectorAll('.mechanical-audio')).toHaveLength(1);
    expect(root.querySelector<HTMLElement>('.mechanical-audio')?.dataset.audioState).toBe('off');
    expect(root.querySelector<HTMLElement>('.mechanical-audio')?.dataset.audioVoices).toBe('0');
    expect(contexts[0].state).toBe('closed');
    expect(contexts).toHaveLength(1);
  });

  it('does not let an old attachment disposer or an unrelated hash event remove the current panel', async () => {
    const { createAudioService } = await import('../src/shared/audio');
    const scope = trackedScope(), audio = createAudioService(scope);
    const old = document.createElement('div'), current = document.createElement('div');
    document.body.append(old, current);
    const detachOld = audio.attach('coffee', old);
    const detachCurrent = audio.attach('fan', current);
    detachOld();
    window.dispatchEvent(new Event('hashchange'));
    expect(current.querySelectorAll('.mechanical-audio')).toHaveLength(1);
    expect(audio.enabled).toBe(false);
    detachCurrent();
    expect(document.querySelectorAll('.mechanical-audio')).toHaveLength(0);
  });

  it('makes retained old audio toggle and volume controls inert after a real route switch', async () => {
    const audioCreated = vi.fn();
    class UnexpectedContext {
      constructor() { audioCreated(); throw new Error('A detached toggle must not request a new audio context'); }
    }
    vi.stubGlobal('AudioContext', UnexpectedContext);
    const handlers = new Map<EventTarget, EventListenerOrEventListenerObject>();
    const nativeAdd = EventTarget.prototype.addEventListener;
    vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (this: EventTarget, type, handler, options) {
      if (handler && this instanceof Element && ((type === 'click' && this.matches('.mechanical-audio button')) || (type === 'input' && this.matches('.mechanical-audio input')))) handlers.set(this, handler);
      nativeAdd.call(this, type, handler, options);
    });
    const { createApp } = await import('../src/app/app');
    const root = document.createElement('div');
    document.body.append(root);
    const app = createApp(root);
    cleanups.push(() => app.dispose());
    await app.navigate('coffee');
    const oldButton = root.querySelector<HTMLButtonElement>('.mechanical-audio button')!;
    const oldVolume = root.querySelector<HTMLInputElement>('.mechanical-audio input')!;
    const oldToggleHandler = handlers.get(oldButton)!;
    const oldVolumeHandler = handlers.get(oldVolume)!;
    await app.navigate('fan');
    const currentPanel = root.querySelector<HTMLElement>('.mechanical-audio')!;
    const baseline = currentPanel.innerHTML;
    expect(oldButton.isConnected).toBe(false);
    expect(oldVolume.isConnected).toBe(false);
    oldVolume.value = '100';
    oldVolume.dispatchEvent(new Event('input', { bubbles: true }));
    // Also emulate already-retained queued callbacks: removal alone is insufficient.
    Reflect.apply(oldVolumeHandler as EventListener, oldVolume, [{ target: oldVolume }]);
    expect.soft(currentPanel.querySelector('input')?.value).toBe('40');
    expect.soft(currentPanel.querySelector('output')?.textContent).toBe('40%');
    await Reflect.apply(oldToggleHandler as EventListener, oldButton, [{ isTrusted: true }]);
    expect.soft(audioCreated).not.toHaveBeenCalled();
    expect(currentPanel.innerHTML).toBe(baseline);
  });
});

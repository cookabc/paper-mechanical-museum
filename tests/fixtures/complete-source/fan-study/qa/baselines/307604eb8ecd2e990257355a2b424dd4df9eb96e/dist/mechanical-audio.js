/* Shared, opt-in mechanical Foley. No media files, network, microphone or autoplay.
 * attach(profile, root?) => disposer; update(profile, state); pulse(kind);
 * reset(); dispose(); enabled; context/getContext(); output/getOutput(); onChange(fn).
 * External instruments must connect to getOutput(), never context.destination, and
 * stop their own notes on every onChange event whose reason is reset or !enabled.
 */
(function (global) {
  'use strict';
  if (global.MechanicalAudio) return;
  const doc = global.document, MAX_VOICES = 12, listeners = new Set(), voices = new Set(), releaseTails = new Set();
  let context = null, master = null, limiter = null, noise = null, panel = null;
  let profile = '', snapshot = null, loop = null, enabled = false, pending = false;
  let playbackRate = 1;
  let volume = .4, epoch = 0, attached = false, resetBlocked = false, peakVoices = 0;
  const pulseTimes = new Map();
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));
  const aliases = [
    [/coffee|咖啡/, 'coffee'], [/toaster|面包/, 'toaster'], [/elevator|电梯/, 'elevator'],
    [/camera|拍立得|相机/, 'camera'], [/vending|售货/, 'vending'], [/washer|洗衣/, 'washer'],
    [/fan|风扇/, 'fan'], [/claw|抓娃娃|抓物/, 'claw'], [/musicbox|八音/, 'musicbox'],
    [/turntable|唱片/, 'turntable']
  ];
  const nameOf = value => aliases.find(([re]) => re.test(String(value).toLowerCase()))?.[1] || String(value || '');
  const audible = () => enabled && !pending && attached && !doc.hidden && volume > 0 && context?.state === 'running';
  const getContext = () => audible() ? context : null;
  const getOutput = () => audible() ? master : null;
  function notify(reason) {
    const event = { enabled: audible(), context: getContext(), output: getOutput(), reason };
    for (const fn of [...listeners]) { try { fn(event); } catch (_) {} }
  }
  function hold(p, t) {
    const value = p.value;
    if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(t);
    else { p.cancelScheduledValues(t); p.setValueAtTime(value, t); }
  }
  function param(p, value, seconds = .035) {
    if (!p || !context) return;
    const t = context.currentTime;
    hold(p, t);
    p.linearRampToValueAtTime(value, t + seconds);
  }
  function diagnostics() {
    if (!panel) return;
    peakVoices = Math.max(peakVoices, voices.size + releaseTails.size);
    panel.dataset.audioState = pending ? 'pending' : audible() ? 'running' : 'off';
    panel.dataset.audioVoices = String(voices.size);
    panel.dataset.audioReleaseVoices = String(releaseTails.size);
    panel.dataset.audioPeakVoices = String(peakVoices);
    panel.dataset.audioLoop = loop?.key || 'none';
    panel.dataset.audioGain = String(enabled ? +(volume * .7).toFixed(3) : 0);
    panel.dataset.audioVoiceLimit = String(MAX_VOICES);
  }
  function cleanVoice(v) {
    const active = voices.delete(v), releasing = releaseTails.delete(v);
    if (!active && !releasing) return;
    for (const n of v.nodes) { try { n.disconnect(); } catch (_) {} }
    diagnostics();
  }
  function stopVoice(v, immediate = false) {
    if (!v || (v.stopped && (!immediate || v.fastRelease))) return;
    v.stopped = true; v.fastRelease = immediate;
    const t = context?.currentTime || 0, release = immediate ? .010 : .035;
    // Logical cancellation is synchronous. The small, bounded tail only fades
    // existing samples; it cannot schedule new sounds or restart a scene.
    voices.delete(v); releaseTails.add(v); diagnostics();
    try {
      hold(v.gain.gain, t);
      v.gain.gain.linearRampToValueAtTime(0, t + release);
      v.source.stop(t + release + (immediate ? .002 : .005));
    } catch (_) { cleanVoice(v); }
  }
  function stopLoop(immediate = false) {
    if (loop) for (const v of loop.voices) stopVoice(v, immediate);
    loop = null; diagnostics();
  }
  function silence(immediate = true) {
    stopLoop(immediate);
    for (const v of [...voices, ...releaseTails]) stopVoice(v, immediate);
    pulseTimes.clear();
  }
  function syncUI(message = '') {
    if (!panel) return;
    diagnostics();
    const button = panel.querySelector('button');
    button.textContent = pending ? '音效：准备中' : enabled ? '音效：开' : '音效：关';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-busy', String(pending));
    panel.querySelector('input').value = String(Math.round(volume * 100));
    panel.querySelector('output').textContent = Math.round(volume * 100) + '%';
    const status = panel.querySelector('[role="status"]');
    status.textContent = message || (enabled ? '机械音效已开启' : '机械音效已关闭，点击开启');
  }
  function mute(reason = 'mute') {
    epoch++; enabled = false; pending = false; resetBlocked = false;
    if (master && context) param(master.gain, 0, .010);
    silence(true); syncUI(); notify(reason);
  }
  function ensureContext() {
    if (context && context.state !== 'closed') return context;
    const Audio = global.AudioContext || global.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio unavailable');
    context = new Audio();
    master = context.createGain(); master.gain.value = 0;
    limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -18; limiter.knee.value = 18; limiter.ratio.value = 8;
    limiter.attack.value = .006; limiter.release.value = .18;
    master.connect(limiter); limiter.connect(context.destination);
    noise = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
    const data = noise.getChannelData(0); let last = 0;
    for (let i = 0; i < data.length; i++) { last = .65 * last + .35 * (Math.random() * 2 - 1); data[i] = last; }
    const ownContext = context;
    context.onstatechange = () => {
      if (ownContext === context && enabled && !pending && context.state !== 'running') mute('interrupted');
    };
    return context;
  }
  async function toggle(event) {
    // Only the explicit, trusted sound toggle may create or resume an AudioContext.
    if (!event?.isTrusted || doc.hidden || !attached) return;
    if (enabled || pending) { mute('mute'); return; }
    const request = ++epoch; pending = true; syncUI();
    try {
      const audio = ensureContext();
      await audio.resume();
      if (request !== epoch || doc.hidden || !attached || audio !== context) return;
      if (audio.state !== 'running') throw new Error('Web Audio suspended');
      pending = false; enabled = true; resetBlocked = false;
      param(master.gain, volume * .7, .06);
      syncUI(); notify('enabled'); reconcile();
    } catch (_) {
      if (request !== epoch) return;
      mute('unavailable'); syncUI('当前浏览器无法播放音效，机械动作仍可正常体验');
    } finally { if (request === epoch) { pending = false; diagnostics(); } }
  }
  function voice({ type = 'sine', frequency = 160, endFrequency, level = .07, duration = .15, delay = 0, filter = 1000, looped = false }) {
    if (!audible() || voices.size + releaseTails.size >= MAX_VOICES) return null;
    const t = context.currentTime + delay, source = type === 'noise' ? context.createBufferSource() : context.createOscillator();
    const gain = context.createGain(), nodes = [source, gain];
    if (type === 'noise') {
      source.buffer = noise; source.loop = looped;
      const band = context.createBiquadFilter(); band.type = 'lowpass'; band.frequency.value = filter;
      source.connect(band); band.connect(gain); nodes.push(band);
    } else {
      source.type = type; source.frequency.setValueAtTime(frequency, t);
      if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, t + duration);
      source.connect(gain);
    }
    gain.connect(master); gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(Math.min(.14, level), t + Math.min(.045, duration * .15));
    if (!looped) { gain.gain.exponentialRampToValueAtTime(.0001, t + duration); gain.gain.setValueAtTime(0, t + duration + .01); }
    const v = { source, gain, nodes, stopped: false }; voices.add(v); diagnostics();
    source.onended = () => cleanVoice(v); source.start(t);
    if (!looped) source.stop(t + duration + .025);
    return v;
  }
  function pulse(kind = 'click') {
    if (!audible()) return;
    const now = context.currentTime, previous = pulseTimes.get(kind);
    if (previous != null && now - previous < (kind === 'tick' ? .07 : .15)) return;
    pulseTimes.set(kind, now);
    switch (kind) {
      case 'bell': voice({ frequency: 880, level: .095, duration: .65 }); voice({ frequency: 1320, level: .025, duration: .5 }); break;
      case 'prize': [660, 825, 990].forEach((f, i) => voice({ frequency: f, level: .065, duration: .32, delay: i * .12 })); break;
      case 'coin': voice({ type: 'triangle', frequency: 1850, endFrequency: 1100, level: .07, duration: .15 }); voice({ type: 'noise', filter: 2600, level: .035, duration: .08, delay: .07 }); break;
      case 'pop': voice({ type: 'triangle', frequency: 130, endFrequency: 520, level: .11, duration: .15 }); voice({ type: 'noise', filter: 1800, level: .07, duration: .12 }); voice({ frequency: 1397, level: .055, duration: .3, delay: .1 }); break;
      case 'shutter': voice({ type: 'noise', filter: 3500, level: .11, duration: .07 }); voice({ type: 'triangle', frequency: 340, endFrequency: 90, level: .1, duration: .07, delay: .055 }); break;
      case 'drop': voice({ type: 'triangle', frequency: 100, endFrequency: 45, level: .13, duration: .2 }); voice({ type: 'noise', filter: 600, level: .06, duration: .1 }); break;
      case 'latch': voice({ type: 'noise', filter: 1400, level: .065, duration: .09 }); voice({ type: 'triangle', frequency: 280, endFrequency: 80, level: .08, duration: .1 }); break;
      case 'cue': voice({ type: 'noise', filter: 1800, level: .025, duration: .11 }); break;
      case 'tick': voice({ type: 'triangle', frequency: 700, endFrequency: 310, level: .035, duration: .045 }); break;
      default: voice({ type: 'triangle', frequency: 460, endFrequency: 140, level: .045, duration: .07 });
    }
  }
  function phaseLoop(p, s) {
    const phase = s.phase;
    if (p === 'coffee') return ({ grinding: ['grinder', 115, .105, 1900], brewing: ['pump', 75, .06, 750], milk: ['steam', 0, .10, 3400] })[phase] || null;
    if (p === 'camera') return phase === 'ejecting' ? ['roller', 220, .045, 850] : null;
    if (p === 'elevator') return phase === 'moving' ? ['lift', 65, .055, 430] : /^(opening|closing|manualClose)$/.test(phase) ? ['door', 180, .035, 700] : null;
    if (p === 'vending') return phase === 'drop' ? ['vend', 130, .055, 900] : phase === 'deliver' ? ['chute', 0, .055, 700] : null;
    if (p === 'fan') { const speed = clamp(s.velocity, 0, 13); return speed > .06 ? ['fan', 43 + speed * 4, .015 + speed * .0045, 450 + speed * 120] : null; }
    if (p === 'washer') {
      if (!s.run || s.paused) return null;
      return ({ fill: ['water', 0, .09, 2400], wash: ['wash', 65, .045, 900], drain: ['drain', 90, .055, 600], spin: ['spin', 145, .075, 1300] })[phase] || null;
    }
    if (p === 'claw') return /^(down|up|travel)$/.test(phase) || s.moving ? ['claw', phase === 'travel' ? 185 : 140, .045, 650] : null;
    return null;
  }
  function reconcile() {
    const spec = snapshot && phaseLoop(profile, snapshot);
    if (!audible() || resetBlocked || !spec) { stopLoop(); return; }
    const [key, rawFrequency, level, rawFilter] = spec;
    const rateTone=Math.sqrt(playbackRate),frequency=rawFrequency*rateTone,filter=rawFilter*rateTone;
    if (loop?.key === key) {
      if (loop.tone) { param(loop.tone.source.frequency, frequency, .09); param(loop.tone.gain.gain, level * .48, .09); }
      if (loop.air) { param(loop.air.gain.gain, level, .09); param(loop.air.nodes[2].frequency, filter, .09); }
      else {
        // A full voice budget may initially admit only the tone. Retry the
        // missing layer on the next snapshot, without replacing the live tone.
        const air = voice({ type: 'noise', filter, level, duration: .4, looped: true });
        if (air) { loop.air = air; loop.voices.push(air); diagnostics(); }
      }
      return;
    }
    stopLoop();
    const tone = frequency ? voice({ type: key === 'grinder' ? 'triangle' : 'sine', frequency, level: level * .48, duration: .4, looped: true }) : null;
    const air = voice({ type: 'noise', filter, level, duration: .4, looped: true });
    loop = tone || air ? { key, tone, air, voices: [tone, air].filter(Boolean) } : null; diagnostics();
  }
  function transitions(p, before, after) {
    const changed = before.phase !== after.phase;
    if (p === 'coffee' && changed) {
      if (['adding', 'beans', 'placing', 'taking'].includes(after.phase)) pulse('click');
      if (after.phase === 'locking' || (after.phase === 'locked' && before.phase !== 'locking')) pulse('latch');
    } else if (p === 'toaster') {
      if (changed && after.phase === 'lowering') pulse('latch');
      if (changed && after.phase === 'popping') pulse('pop');
      if (before.level !== after.level) pulse('tick');
    } else if (p === 'elevator') {
      if (changed && before.phase === 'moving' && after.phase === 'opening') pulse('bell');
      if (changed && after.phase === 'moving') pulse('latch');
      if ((after.queue?.length || 0) > (before.queue?.length || 0)) pulse('click');
    } else if (p === 'camera') {
      if (changed && after.phase === 'flash') pulse('shutter');
      if (before.frames < after.frames) pulse('latch');
    } else if (p === 'vending') {
      if (changed && after.phase === 'coin') pulse('coin');
      if (after.tokens > before.tokens && before.phase !== 'coin') pulse('coin');
      if (changed && after.phase === 'deliver') pulse('drop');
      if (changed && after.phase === 'returning') pulse('coin');
    } else if (p === 'fan') {
      if (before.on !== after.on || before.speed !== after.speed || before.oscillate !== after.oscillate) pulse('click');
    } else if (p === 'washer') {
      if (before.door > .001 && after.door <= .001) pulse('latch');
      if (before.doorT !== after.doorT || before.drawerT !== after.drawerT || before.paused !== after.paused) pulse('click');
      if (!before.done && after.done) pulse('bell');
    } else if (p === 'claw' && changed) {
      if (['close', 'release', 'reopen'].includes(after.phase)) pulse('latch');
      if (after.phase === 'eject') pulse('drop');
      if (after.phase === 'prize') pulse('prize');
    }
  }
  function copyState(s) {
    // A shallow, immutable audio snapshot: mutable scene arrays must not erase edges.
    const copy = {};
    for (const [key, value] of Object.entries(s || {})) {
      if (Array.isArray(value)) copy[key] = value.slice();
      else if (value == null || typeof value !== 'object') copy[key] = value;
    }
    return copy;
  }
  function update(which, state) {
    if (!attached) return;
    const nextProfile = nameOf(which);
    if (nextProfile !== profile) { mute('scene'); profile = nextProfile; snapshot = null; }
    const next = copyState(state), before = snapshot;
    snapshot = next;
    if (resetBlocked) {
      const freshTransition = before && (before.phase !== next.phase || before.on !== next.on || before.run !== next.run);
      if (!phaseLoop(profile, next) || freshTransition) resetBlocked = false;
      else { stopLoop(true); return; }
    }
    if (before && audible()) transitions(profile, before, next);
    reconcile();
  }
  function setRate(value) { const next=value===.25?.25:1;if(playbackRate===next)return;playbackRate=next;reconcile(); }
  function reset() {
    epoch++; pending = false; silence(true); snapshot = null; resetBlocked = true;
    // Keep the opt-in choice, but instrument owners must cancel their scheduled notes.
    notify('reset'); syncUI();
  }
  function dispose() {
    mute('dispose'); attached = false; snapshot = null; profile = ''; resetBlocked = false;
    panel?.remove(); panel = null; listeners.clear();
    releaseContext();
  }
  function releaseContext() {
    const old = context;
    // Full document disposal still destroys its graph immediately.
    for (const v of [...voices, ...releaseTails]) { try { v.source.stop(old?.currentTime || 0); } catch (_) {} cleanVoice(v); }
    context = master = limiter = noise = null;
    if (old) { old.onstatechange = null; try { Promise.resolve(old.close()).catch(() => {}); } catch (_) {} }
  }
  function attach(which, root) {
    if (attached) dispose();
    profile = nameOf(which); playbackRate=1; attached = true; snapshot = null; enabled = pending = false;
    const host = typeof root === 'string' ? doc.querySelector(root) : root;
    const target = host || doc.querySelector('.actions') || doc.querySelector('.controls') || doc.body;
    if (!doc.getElementById('mechanical-audio-style')) {
      const style = doc.createElement('style'); style.id = 'mechanical-audio-style';
      style.textContent = '.mechanical-audio{grid-column:1/-1;display:flex;align-items:center;gap:9px;flex-wrap:wrap;width:100%;padding:8px 0 2px;color:var(--muted,#766d5f);font:inherit;font-size:11px;line-height:1.4}.mechanical-audio button{min-height:34px;flex:0 0 auto;padding:6px 10px;background:#fffdf8;border:1px solid var(--rule,#d8d1c3);border-radius:8px;color:var(--ink,#231e16);font:inherit}.mechanical-audio button[aria-pressed=true]{background:var(--accent,#93d3b0)}.mechanical-audio label{display:flex;align-items:center;gap:5px;flex:1;min-width:90px}.mechanical-audio input{width:65px;min-width:40px;max-width:95px;flex:1;accent-color:var(--ink,#231e16)}.mechanical-audio output{min-width:3em;font-variant-numeric:tabular-nums}.mechanical-audio .audio-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}';
      doc.head.append(style);
    }
    panel = doc.createElement('div'); panel.className = 'mechanical-audio'; panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', '可选机械音效');
    panel.innerHTML = '<button type="button" aria-pressed="false" title="默认静音，点击开启合成机械音效">音效：关</button><label>音量<input type="range" min="0" max="100" step="5" value="40" aria-label="机械音效音量"><output>40%</output></label><span class="audio-status" role="status" aria-live="polite"></span>';
    panel.querySelector('button').addEventListener('click', toggle);
    panel.querySelector('input').addEventListener('input', event => {
      volume = clamp(event.target.value, 0, 100) / 100;
      if (master) param(master.gain, enabled ? volume * .7 : 0, volume ? .035 : .010);
      if (!volume) silence(true);
      syncUI(); notify('volume'); reconcile();
    });
    target.append(panel); syncUI();
    const mountedPanel = panel;
    return () => { if (panel === mountedPanel) dispose(); };
  }
  global.MechanicalAudio = Object.freeze({
    attach, update, pulse, reset, dispose, setRate, getContext, getOutput,
    get enabled() { return audible(); }, get context() { return getContext(); }, get output() { return getOutput(); },
    onChange(fn) { if (typeof fn !== 'function') return () => {}; listeners.add(fn); return () => listeners.delete(fn); }
  });
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) mute('hidden'); });
  // Some embedded/cloud browsers keep document.hidden false after switching tabs.
  // Losing the window focus is therefore an additional conservative stop signal.
  // Focus returning never resumes the graph without another explicit toggle.
  global.addEventListener('blur', () => mute('blur'));
  // Preserve controls and instrument subscriptions across BFCache restoration.
  // The graph is still destroyed, and returning always requires a fresh toggle.
  global.addEventListener('pagehide', () => { mute('pagehide'); releaseContext(); });
  global.addEventListener('hashchange', () => { if (attached) dispose(); });
})(window);

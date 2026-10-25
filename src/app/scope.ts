/** Each mounted exhibit owns exactly one resource scope. No prototype monkey-patching. */
export class ResourceScope {
  private live = true;
  private stopped = false;
  private sequence = 0;
  private cleanups: Array<() => void> = [];
  private frames = new Map<number, { callback: FrameRequestCallback; native: number | null }>();
  private timers = new Map<number, { callback: () => void; native: number | null; due: number; remaining: number }>();
  private events = 0;
  get active(): boolean { return this.live; }
  get paused(): boolean { return this.stopped; }
  now = (): number => performance.now();
  listen(target: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): () => void {
    if (!this.live) return () => {};
    const guard: EventListener = event => { if (this.live && !(this.stopped && /^(click|dblclick|pointer|mouse|touch|key|input|change)/.test(type))) { if (typeof handler === 'function') Reflect.apply(handler,event.currentTarget||target,[event]); else handler.handleEvent(event); } };
    target.addEventListener(type, guard, options); this.events++;
    let listening = true;
    const off = () => { if (!listening) return; listening = false; target.removeEventListener(type, guard, options); this.events--; };
    this.onCleanup(off); return off;
  }
  bindProperty(target: object, key: string, callback: ((...args: unknown[]) => unknown) | null): void {
    const guard = callback ? (...args: unknown[]) => {
      if (!this.live || (this.stopped && /^on(click|dblclick|pointer|mouse|touch|key|input|change)/.test(key))) return;
      return Reflect.apply(callback, target, args);
    } : null;
    Reflect.set(target, key, guard);
    this.onCleanup(() => { if (Reflect.get(target, key) === guard) Reflect.set(target, key, null); });
  }
  onCleanup(fn: () => void): void { if (!this.live) fn(); else this.cleanups.push(fn); }
  raf = (callback: FrameRequestCallback): number => {
    if (!this.live) return 0;
    const id = ++this.sequence;
    this.frames.set(id, {callback, native: null}); this.queueFrame(id); return id;
  };
  private queueFrame(id: number): void {
    const frame = this.frames.get(id); if (!frame || !this.live || this.stopped) return;
    frame.native = requestAnimationFrame(now => { if (!this.live || this.stopped || !this.frames.has(id)) return; this.frames.delete(id); frame.callback(now); });
  }
  cancelRaf = (id: number): void => { const frame=this.frames.get(id); if(frame?.native != null) cancelAnimationFrame(frame.native); this.frames.delete(id); };
  timeout = (callback: () => void, ms = 0): number => {
    if (!this.live) return 0; const id=++this.sequence, remaining=Math.max(0,ms);
    this.timers.set(id,{callback,native:null,due:this.now()+remaining,remaining}); this.queueTimer(id); return id;
  };
  private queueTimer(id: number): void {
    const timer=this.timers.get(id); if(!timer || !this.live || this.stopped) return;
    timer.due=this.now()+timer.remaining;
    timer.native=window.setTimeout(()=>{if(!this.live || this.stopped || !this.timers.has(id))return;this.timers.delete(id);timer.callback();},timer.remaining);
  }
  clearTimeout = (id:number):void => {const timer=this.timers.get(id);if(timer?.native!=null)window.clearTimeout(timer.native);this.timers.delete(id);};
  pause():void {
    if(!this.live || this.stopped)return;this.stopped=true;
    for(const frame of this.frames.values()){if(frame.native!=null)cancelAnimationFrame(frame.native);frame.native=null;}
    for(const timer of this.timers.values()){if(timer.native!=null)window.clearTimeout(timer.native);timer.native=null;timer.remaining=Math.max(0,timer.due-this.now());}
  }
  resume():void {
    if(!this.live || !this.stopped)return;this.stopped=false;
    for(const id of this.frames.keys())this.queueFrame(id);
    for(const id of this.timers.keys())this.queueTimer(id);
  }
  dispose():void {
    if(!this.live)return;this.live=false;
    for(const id of [...this.frames.keys()])this.cancelRaf(id);
    for(const id of [...this.timers.keys()])this.clearTimeout(id);
    const errors: unknown[]=[];
    for(const cleanup of this.cleanups.splice(0).reverse()){try{cleanup();}catch(error){errors.push(error);}}
    if(errors.length)throw new AggregateError(errors,'Scene cleanup failed');
  }
  diagnostics(){return {active:this.live,paused:this.stopped,frames:this.frames.size,timers:this.timers.size,listeners:this.events};}
}

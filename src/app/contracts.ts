import type { ResourceScope } from './scope';
export type PauseReason = 'hidden' | 'navigation' | 'manual';
export interface SceneController {
  pause(reason: PauseReason): void;
  resume(reason: PauseReason): void;
  reset(): void;
  dispose(): void;
  snapshot?(): Readonly<Record<string, unknown>>;
}
export interface AudioService {
  attach(profile: string, root: HTMLElement): () => void;
  update(profile: string, state: object): void;
  pulse(kind: string): void;
  setRate(rate: number): void;
  reset(): void;
  dispose(): void;
  suspend(reason?: string): void;
  readonly enabled: boolean;
}
export interface SceneContext {
  root: HTMLElement;
  scope: ResourceScope;
  audio: AudioService;
  observation: ReturnType<typeof import('../shared/observation.js').createObservation>;
}
export interface ExhibitDefinition {id:string;name:string;mount(context:SceneContext):SceneController;}

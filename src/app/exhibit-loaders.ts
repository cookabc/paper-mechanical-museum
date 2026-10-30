import type { SceneContext, SceneController } from './contracts';
import type { CatalogEntry } from './catalog';

export type ExhibitMount = (context: SceneContext) => SceneController;
export type ExhibitLoader = () => Promise<ExhibitMount>;

/** Literal imports keep the collection light and make every exhibit a build chunk. */
export const exhibitLoaders = {
  washer: () => import('../exhibits/washer/index.js').then(module => module.mountWasher),
  fan: () => import('../exhibits/fan/index.js').then(module => module.mountFan),
  claw: () => import('../exhibits/claw/index.js').then(module => module.mountClaw),
  coffee: () => import('../exhibits/coffee/index.js').then(module => module.mountCoffee),
  musicbox: () => import('../exhibits/musicbox/index.js').then(module => module.mountMusicbox),
  vending: () => import('../exhibits/vending/index.js').then(module => module.mountVending),
  toaster: () => import('../exhibits/toaster/index.js').then(module => module.mountToaster),
  turntable: () => import('../exhibits/turntable/index.js').then(module => module.mountTurntable),
  camera: () => import('../exhibits/camera/index.js').then(module => module.mountCamera),
  elevator: () => import('../exhibits/elevator/index.js').then(module => module.mountElevator),
  bicycle: () => import('../exhibits/bicycle').then(module => module.mountBicycle),
  generator: () => import('../exhibits/generator').then(module => module.mountGenerator),
} satisfies Record<CatalogEntry['id'], ExhibitLoader>;

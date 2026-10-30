# Unified museum: architecture and acceptance boundary

## 1. Goals, and what is explicitly out of scope

Progressively migrate the original seven-piece main hall plus the washing machine, electric fan and claw machine — three standalone pages — into one application. Keep the paper texture, hand-drawn lines, SVG projection, colours, mechanism state and the default free play; solve the engineering boundary and verifiable resource ownership first, rather than redesigning the art direction or replacing different mechanism models with one generic animation.

The current unified home page and all ten exhibits have real static ES module adapters. The migration ran in four batches of 2 → 5 → 8 → 10, each preserving the original state/render comparison and performing real browser acceptance. The existence of a home-page card or of the old source is not by itself evidence that the migration is complete. This round does not deploy to production, does not change permissions, and does not claim that performance has improved.

## 2. Traceable baseline

- Repository: `cookabc/little-claw-arcade`.
- Remote `main` baseline adopted for this round: `ae56905eaae8a83764589d65dc96d54d4e922c38`, tree `61de7f271760a4f831249ad941c2e4d5236c8de5`.
- The complete source was merged into `main` via PR #1 and the original delivery branch was deleted. Baseline facts are bounded by that commit; `main` is not promised to stop changing.
- The refactor used a separate `refactor/unified-museum` branch. The local import commit that made a copy is not a remote Git ancestor and cannot be used to force-push over remote history.
- The original `SOURCE-PROVENANCE.json`, `FILE-MANIFEST.json` and old tools are kept in `archive/`. Their hashes describe the original source package and cannot be read as content hashes of the new `src/` or the new `dist/`.

The four original entry points were not equivalent. `CORE-DIFFERENCES.md` records the commonalities, the geometry/control/focus/time-integration differences and the lifecycle risks; it is the basis for adapting each exhibit, not a substitute for passing acceptance.

## 3. Engineering structure and runtime boundary

```text
index.html → src/main.ts → src/app/app.ts
                           ├─ home / hash routes
                           ├─ application ResourceScope + shared audio service
                           └─ current scene root + ResourceScope + observation binding
                              ├─ the seven-piece main hall → shared Colorfigures runtime + independent mechanism models
                              ├─ fan → Paper3D + the original fan mechanism model
                              ├─ washer → explicitly retained washer renderer + washing model
                              └─ claw → explicitly retained claw renderer + grabbing model
```

Vite handles development, the ES module build and `dist/` output. `src/app/contracts.ts` defines the controller, context and audio service boundaries; `src/app/scope.ts` manages resources; `src/app/scoped-dom.ts` constrains the original DOM access to the scene root. TypeScript is currently set to `allowJs: true` and `checkJs: false`, so type checking covers the host and the declared boundaries, which is not the same as having statically verified all JavaScript internals.

Adapters are real ES module imports; they do not use iframes, `eval`, `new Function`, script-text replacement or browser prototype overriding. The application controls the URL and the shared navigation; the old HTML pages are not runtime sub-applications.

### Resource ownership

| Owner | Responsibility | Must not own |
| --- | --- | --- |
| App host | Routing, browser history, current controller, shared navigation, page hide/restore entry | Physics state internal to an exhibit |
| App ResourceScope | Host events and shared service lifecycle | Clocks of scenes it has left |
| Scene ResourceScope | RAF, timeouts, events, attribute-style input handlers and cleanup | Other scenes' DOM and audio attachments |
| Exhibit controller | Actual model state, local geometry, pause reasons, reset and termination | `document.body` overlays, global debug state |
| Audio service | One current attachment, explicit user opt-in, sound updates and destruction | Routing decisions, automatically re-enabling sound |
| Observation binding | Markers and explanations inside the current root, one shared simulation rate | A second independent clock advancing mechanical motion |

"Shared" means unified code and ownership; it does not force Colorfigures and Paper3D projection into one engine. The coffee machine's and fan's mechanism formulas, time integration, input strategy and geometry are still kept according to their own semantics. The washing machine's and claw machine's historical cores are kept as explicit static factories because their input/layering/camera semantics differ; they were not overwritten just because the files share a name. They no longer own a standalone page entry, audio service or routing.

### Controller lifecycle acceptance requirements

- `mount(context)`: writes only to the designated root and creates fresh state. On failure or replacement it releases the resources already acquired and does not break host navigation.
- `pause(reason)`: may be called repeatedly; pauses the simulation/resources, cancels press, drag and pointer capture, and mutes while retaining physical progress. Different pause reasons must not cancel each other.
- `resume(reason)`: only a controller that is still active with all pause reasons cleared may resume. It continues from a new timestamp, must not back-fill elapsed background time, must not add a duplicate RAF chain, and must not re-enable sound automatically.
- `reset()`: cancels the current round according to that exhibit's original semantics, and old async callbacks must not write again. The claimed counts that coffee and toast originally retained are still retained, while the claw machine's full-round trial reset clears that round's count; "reset view" in a scene still resets only the camera and is not conflated with a whole-machine reset.
- `dispose()`: terminal and idempotent. Releases audio attachments, observation bindings, clocks, events, input and texture async callbacks; removes only DOM it owns and does not pull focus back into the old scene.
- `snapshot()`: for read-only diagnostics; must not leak internal mutable array/object references and must not write global state such as `window.__st`.

Exiting and re-entering the principle observation card does not destroy the scene and keeps the current physical progress; leaving the exhibit route disposes it, and coming back creates the initial state. There is no cross-exhibit progress persistence, and the two behaviours must not be conflated.

The above are contracts to be satisfied by the actual implementation and tests, not a pass merely because the methods exist. Detailed failure scenarios are in the red-test list of the core differences audit.

## 4. Principles for migrating visuals, interaction and services

1. The original SVG geometry, previews and hand-drawn textures may be reused; global styles are progressively constrained to the host or the corresponding exhibit. Shared tokens are not a reason to unintentionally change proportions, colours or occlusion order.
2. Focus and keys are handled per exhibit semantics. The claw machine's ordinary arrow keys, for example, are used for aiming and must not be swallowed by a unified camera shortcut. Redraws restore focus to logical controls; navigation destruction does not restore old focus.
3. The original observation implementations are the same and suit sharing, but DOM queries and rate callbacks must be owned by the current scene. The original audio had two valid versions, and the coffee pause/milk and camera pause fixes must not be lost when merging.
4. Sound is always opt-in. Switching, hiding, leaving or losing focus mutes it; a stale `resume()` promise and the destruction of an old attachment must not affect a new one.
5. Any un-migrated exhibit is explicitly shown as pending; the old pages are not embedded to "fill up" the ten, and external links are not treated as a completed unified runtime.

## 5. Source baseline and test layering

`tests/fixtures/complete-source/` keeps the original four projects' runtime source, QA and necessary historical input. They are a read-only comparison baseline, are not imported by the app entry and do not go into `public/`. The build must not copy these directories into `dist/`.

The current commands follow the root `package.json`. Use Node 22.13+ (22.x) or 24.x, recommending 24.x to match CI. The minimum also accounts for Vite/Vitest and ESLint; do not read the version range the dependencies allow as evidence that every version has been tested:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
# the four above, in order:
npm run check
```

Current tests import the ten real modules and the host directly; forged controllers or spliced-out old script text are not treated as the new implementation. Clocks, layout, pointer capture and audio nodes may use test-environment stand-ins; physical state changes and real render functions may not. Coverage focuses on switching, repeated entry and exit, pause/resume, reset, interrupted input, stale DOM/callback inertness, focus and audio attachment isolation.

The legacy baseline runs separately:

```sh
npm run test:legacy
npm run test:legacy -- --list
```

This invokes `tests/legacy/run.cjs`, running the preserved source's default baseline suite in a temporary copy; it is not an integration test of the new adapters. "legacy" here is a directory/script classification and does not mean a same-named command in the original package: the original package's known legacy assertion entry corresponds to `npm run test:legacy -- --legacy`, which has explicit historical incompatibilities, cannot count as currently passing, and whose assertions must not be deleted just to get green.

New module tests passing, the legacy baseline passing and real browser acceptance are different kinds of evidence. Historical pass numbers, screenshots or benchmarks of the old source do not carry over to the new application. This file does not pin pass counts that go stale with every change; each delivery is judged by the final commit's logs. Automated tests alone cannot yet support claiming that all ten are complete, that visuals are consistent on all devices, that assistive technology passes, that sound is correct or that performance improved.

### CI reproducibility and least privilege

`.github/workflows/ci.yml` runs on `pull_request` and pushes to `main` (PRs cover the refactor branch, avoiding duplicate checks):

- Checks out the full commit SHA corresponding to the event; PRs use the head SHA rather than an implicit floating branch or a synthetic merge ref; it verifies HEAD and prints commit/tree.
- Grants only `contents: read`, does not use `pull_request_target`, does not persist checkout credentials and introduces no user secrets.
- `npm ci` uses the lockfile in the commit; Node 24 runs `npm run check`, and a separate job runs the legacy baseline, so the two kinds of evidence are not mixed.
- It does not cache dependencies, upload or publish artifacts, create environments/credentials or deploy. While remote CI has not yet run, the only defensible statement is "the configuration is prepared", not "GitHub checks passed".

Actions are pinned to full commits, verified on 2026-10-25 from the official release/commit pages:

- [actions/checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1): [`3d3c42e5aac5ba805825da76410c181273ba90b1`](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1).
- [actions/setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0): [`949feb2413d6458794dcd2491c4babbbce0c15c1`](https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1).

## 6. Stepwise progress and the release gate

1. Verify representative slices — the coffee machine and fan — first, then roll out in groups of three, three and two; each batch must distinguish precisely between coded, automatically passing and browser passing.
2. Attach one real exhibit at a time, keeping its original state/geometry/input comparison and adding exit, restore, audio and focus tests under the unified host.
3. Compare visuals and performance before and after the refactor on the same device with repeatable actions; record versions, scenes, sampling method, idle and active resources, rather than inferring speed from a smaller bundle.
4. After full integration, accept desktop/mobile, touch, keyboard, screen reader, real audio and browser forward/back.
5. Have the final commit and CI reviewed independently before deciding on merge and release targets. Production deployment is not authorised for this round.

`vercel.json` explicitly sets `framework: vite`, `npm ci`, `npm run build` and `outputDirectory: dist`, and disables Git auto-deploy only for the refactor branch and the original delivery branch name. That is not a global disable, and it does not guarantee that merging into `main` will not trigger a deployment, so this round must not merge or release. Keep the existing access settings and add no authorisation.

## 7. Historical documents and licences

`MIGRATION-HISTORY.md` and `PATH-ADAPTATIONS.json` describe the original complete static source package; their old command, route and branch facts must be read in their historical context. The current project follows this file, the README, the root package scripts and the final verification logs.

Keep `THIRD_PARTY_NOTICES.md` and `licenses/Colorfigures-LICENSE.txt`. Neither the refactor nor the source move deletes the original copyright/licence. The repository code is [MIT licensed](../LICENSE), which does not reassign authorship of the upstream work.

---

中文版见 [UNIFIED-ARCHITECTURE.zh-CN.md](UNIFIED-ARCHITECTURE.zh-CN.md)。

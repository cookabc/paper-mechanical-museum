# Development and acceptance guide

This describes the current unified Vite project. Commands and constraints follow the root [`package.json`](../package.json), [`vite.config.ts`](../vite.config.ts), the source and CI; the old delivery packages' commands do not carry over. Historical records are in the [documentation index](README.md).

## Environment and commands

Node.js 24.x is recommended and matches CI; the range allowed by `engines` does not mean every version has been accepted. Run `npm ci` first to install the locked dependencies.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on `127.0.0.1:4182` by default; it errors out on a port conflict |
| `npm run lint` | Lints `src` and the top-level `tests/*.test.ts` |
| `npm run typecheck` | `tsc --noEmit`; covers the JS import boundary, which does not mean every JS file is type-checked internally |
| `npm test` / `npm run test:watch` | Current-module regression tests / watch mode |
| `npm run build` | Vite build, then verifies the release boundary |
| `npm run check` | Runs lint, typecheck, test, build in that order |
| `npm run preview` | Previews the generated `dist`; use the address the terminal prints |
| `npm run test:legacy` | Runs the preserved source's compatibility baseline in a temporary copy |
| `npm run test:legacy -- --list` | Lists the legacy baseline entries |

`tests/repository-docs.test.ts` runs as part of `npm test` / `npm run check` and checks, offline, that every inline relative link target in the current maintenance documents (root README, CONTRIBUTING, documentation index, this guide, the screenshot provenance note and the third-party notices) exists; it also checks that the root README's exhibit names, routes and order match `src/app/catalog.ts`. It does not check external availability, in-page anchors or old paths inside historical records. When you add a current entry page, add it to that list.

The app uses hash routing: `/#/` is the home page, `/#/generator` and so on are exhibits. No local backend or application key is needed.

## Code map

```text
index.html → src/main.ts → src/app/app.ts
                           ├─ catalog.ts / home.js: the collection and the home page
                           ├─ the current exhibit's controller + the scene ResourceScope
                           └─ shared audio, observation, learning entry and presentation shell
```

| Path | Responsibility |
| --- | --- |
| `src/app/` | Routing, controller contracts, resource scope, local DOM, exhibit headers and presentation adapters |
| `src/exhibits/<id>/` | Each exhibit's model, geometric drawing and interaction adapter |
| `src/engines/` | Keeps distinct projection/render implementations; mechanical models are not force-merged |
| `src/shared/` | Audio, observation, learning entry, the control dock and the object stage |
| `src/styles/` | Shared visual foundations and responsive layout |
| `public/previews/` | SVG previews of the twelve exhibits |
| `tests/*.test.ts` | Model, drawing, interaction, navigation and lifecycle tests that import current modules directly |
| `tests/fixtures/complete-source/` | Read-only comparison baseline of the original complete source; not part of the release package |
| `archive/` | Original provenance lists, hash manifests and tools; path semantics belong to the historical delivery packages |
| `docs/` | Maintenance notes, exhibit design and staged acceptance records |

The app is a mixed JavaScript ES-modules and TypeScript project, not a full TypeScript rewrite. The real boundary of `allowJs: true` and `checkJs: false` is in [`tsconfig.json`](../tsconfig.json). Scenes attach through static modules; iframes, `eval` and concatenating old scripts are not used as adapters.

## Boundaries to hold when changing things

- **State belongs to the exhibit.** Model, drawing, readouts and controls must agree; never substitute an independent animation or a preset answer for a real result. Teaching activities stay optional and cannot replace user input.
- **Resources have a clear owner.** [`SceneController`](../src/app/contracts.ts) provides `pause`, `resume`, `reset`, `dispose` and an optional read-only `snapshot`; [`ResourceScope`](../src/app/scope.ts) manages events, clocks and cleanup. An old scene must not leave RAF callbacks, audio or async callbacks behind.
- **Pausing is not leaving.** Multiple pause reasons must not cancel each other, and resuming does not back-fill background time. Closing the observation panel keeps the machine's progress; leaving the route destroys the instance and re-entering builds a fresh one. A whole-machine reset and a view reset are also different things.
- **Sound is opt-in.** Handle tab switching, hiding, blur and stale audio promises in isolation; never re-enable sound automatically.
- **Responsiveness must not rebuild machine state.** Check state, scrolling and actually visible focus across short and narrow viewports and while crossing layout boundaries back and forth — not merely that `activeElement` did not change.
- **Keep provenance.** Do not delete third-party copyright, historical sources or baselines; do not edit generated `dist/`; do not make current tests green by editing old fixtures.

## Layered acceptance

1. **Current project:** run `npm run check` on the final candidate and add regressions for the models, interactions and lifecycle you affected. `npm test` uses jsdom, which is not a real browser.
2. **Historical compatibility:** run `npm run test:legacy` separately; its result does not prove the current adapters pass. Do not mix historical test numbers with current ones.
3. **Real browser:** according to the scope of the change, check direct manipulation and panel controls, running, pause/resume, reset, leave/re-enter, forward/back, repeated clicks and interrupted input. Layout changes cover desktop, narrow and short viewports plus two-way resizing while active; mechanical changes compare occlusion and motion readouts at the default, side and back views.
4. **Record the evidence:** state the final commit, command results, browser/viewport, reproduction steps and limitations. A desktop mobile emulator is not real touch; automated tests do not mean the audio, a screen reader or cross-browser behaviour has been accepted.

[`scripts/verify-build.mjs`](../scripts/verify-build.mjs) runs with the build and checks the entry, asset references and the twelve previews; only the entry, the JS/CSS bundles and the previews may enter `dist`, and it rejects several development path leaks. This is a release-boundary check, not a full functional, security or visual audit.

## CI and release

[CI](../.github/workflows/ci.yml) checks out the exact commit for the event on PRs and pushes to `main`, then runs the current-project checks and the historical baseline on Node 24. It has only `contents: read`, does not persist checkout credentials, and has no deploy step. Check results must correspond to the final head; a configuration existing, or an old commit passing, is not this run passing.

Production targets [paper-mechanical-museum.vercel.app](https://paper-mechanical-museum.vercel.app/). [`vercel.json`](../vercel.json) configures `npm ci`, `npm run build` and the `dist` output directory, and disables Git auto-deploy **only for two historical branches** — it does not disable deploys for all branches.

Local acceptance, exact-commit CI, a merge and a production deploy are four different facts. Maintainers should review the change and the latest baseline first, then merge/release under the current authorisation and repository rules; after release, verify the production commit and re-check the affected flows. Keep the existing access settings and add no credentials, permissions or cost commitments.

---

中文版见 [DEVELOPMENT.zh-CN.md](DEVELOPMENT.zh-CN.md)。

## Browser acceptance and route loading

Exhibit modules load on demand through `src/app/exhibit-loaders.ts`; its typed registry must cover every catalog ID. The collection entry has a 100 kB uncompressed JavaScript budget, enforced by the release check. `createApp().navigate(id)` returns a promise that settles after mounting or displaying recovery. Await it in integration tests. A newer route or disposal invalidates an older pending import; failed mounts dispose their resources and expose a retry control.

```sh
npx playwright install chromium  # once per machine, after npm ci
npm run test:e2e                 # builds, then tests the actual dist output
npm run test:e2e:ui              # interactive Playwright runner
```

Browser tests start their own production preview on **127.0.0.1:4282**, separate from development at **4182**. Desktop and mobile Chromium cover all twelve routes, feature selection, language changes and resource ownership. CI installs its own Chromium; to use an existing local Chrome, run `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Traces and screenshots are retained for failures in ignored `test-results/` and uploaded by CI. These checks complement the mechanical-model tests; they do not establish physical simulation accuracy or coverage of Safari and Firefox.

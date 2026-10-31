# Exhibit 11: the bicycle derailleur

> The first-version sections below record the historical design and the acceptance numbers of that time; the drawing was rebuilt on 2026-10-25 into a dimensional scene consistent with the original ten. The current structure, tests and limits follow the source and the [development and acceptance guide](DEVELOPMENT.md).

## 2026-10-27: a comparable hill-climb experiment

"Shift — who reaches the top first?" below the stage is an experiment record card that is collapsed by default; the "Learn by doing" entry opens the same card and scrolls to its heading, without starting a climb automatically. Free pedalling still keeps the full original model and controls.

- All three gears start from the same 60 rpm, crank-torque ceiling 20 N·m, wheel-end demand 15 N·m and a 12-metre finish. Each gear's button starts a real simulation rather than filling in a preset answer.
- Only attempts that genuinely reach the top, or that clearly lack torque, are recorded. The three initial rows are all empty; shifting or interrupting produces no successful result, while completed comparisons are kept.
- Time comes from the same simulated clock that drives the gears and the wheel, integrating only the remaining distance at the finish. Pausing and background freezing do not count, and ¼ speed only slows the observation. The page labels the timing as simulated and does not present it as a real riding result.
- Under the current ideal model gear 1 reaches the top in about 5.71 simulated seconds and gear 2 in about 4.29; their exact difference rounds to about 1.43 seconds, which may differ from subtracting the two rounded values shown on the page. Gear 3 offers at most 10 N·m at the wheel, short of 15 N·m, so it cannot start.
- Collapsing the experiment pauses an unfinished climb; reopening it does not resume automatically. A full restart clears this exhibit's records; leaving the route destroys the instance, and no history carries across exhibits or browser sessions.
- The slope line in the experiment card is a progress indicator, not real terrain or gradient. The original ideal drivetrain formulas, the 3D drawing and the tooth counts are unchanged by the timing feature.

Acceptance should cover trying 3→1→2 first, retrying, pausing, collapsing and reopening, shifting mid-climb, free pedalling, resetting, slow speed and navigation destruction, plus desktop, short-screen, tablet and phone composition. The new `tests/bicycle-lab.test.ts` checks evidence generation and the shared clock; the real drawing is not verified by a stand-in. Passing tests is not acceptance of real touch, a screen reader or cross-browser behaviour.

## First-version record (historical)

A development candidate based on the merged unified `main` at `767198c7e722a33d3a605d7c4d8204c881b3f337` (tree `07b6f2cb1729a107a579db70a8c1dab21ea14258`). This does not mean it was merged or released to production.

## How to use it

Entry is `/#/bicycle`, the eleventh card on the home page; the other exhibits' catalogs use the same collection list.

- Click to start pedalling, then switch between gears 1/2/3; adjust the target cadence and watch the chainring, the closed loop of chain and the rear wheel.
- After pausing you can still shift, adjust or look at the close-up, with no RAF spinning in the background.
- "Drivetrain close-up" only changes that scene's SVG viewport; returning to the whole bike, restarting and jumping through the collection do not affect other exhibits.
- The shared principle observation includes normal speed and a ¼-speed slow look over a single simulated clock; closing the observation restores the original speed without resetting the machine.
- The small challenge fixes 60 rpm and a 12-metre equivalent climb. Gear 3 lacks torque, gear 1 can reach the top but more slowly, and gear 2 is the fastest viable gear. Shifting exits the current climb and zeroes it; pausing pedalling keeps the climb position.
- Sound is off by default and uses the existing shared sound service for button clicks and completion cues; no external audio is played.

## Physical limits

Chainring 32 teeth; the three rear sprockets have 32, 24 and 16 teeth; wheel circumference 2.10 metres.

- Ratio = chainring teeth / sprocket teeth.
- Rear-wheel rpm = crank cadence × ratio.
- Theoretical speed in km/h = rear-wheel rpm × wheel circumference × 0.06.
- Ideal wheel-end / crank torque ratio = 1 / ratio.
- This level's crank-torque ceiling is 20 N·m against a wheel-end demand of 15 N·m. The available wheel-end ceilings are 20, 15 and 10 N·m; at 60 rpm the theoretical speeds are 7.56, 10.08 and 15.12 km/h.

The "available ceiling" is not the torque actually delivered continuously. A fixed cadence is not the same as fixed effort or power. The speed is a theoretical value assuming that cadence can be held; real acceleration and fitness are not modelled. The slope threshold is a teaching setting that neither labels nor infers a real gradient, and friction, inertia, slipping, the freewheel and energy loss are not modelled.

The drawing is an original paper-style side view, not a simulation of a 3D rear-derailleur mechanism: the selected sprocket is shown in the same plane and the chain takes an equivalent closed loop tangent to the selected gear. It does not claim to show lateral derailleur travel, the tensioner path or a shifting transient. The teeth drawn on both gears match the model. The chain links are a suggestive texture, not manufacturing dimensions.

Physics reference: [OpenStax — Rolling Motion](https://openstax.org/books/university-physics-volume-1/pages/11-1-rolling-motion). This is a reference for the physical relationships only; no images, code or assets were copied.

## Engineering and acceptance

Added `src/exhibits/bicycle/{model.ts,drawing.ts,index.ts,style.css}`; reuses `SceneContext`, `ResourceScope`, the sound and observation services. The original ten renderers are unchanged. The home-page count now comes from the actual collection size, so exhibit 11 no longer shows `undefined`.

`npm run check` covers lint, typecheck, 98 tests, the Vite build and the release-boundary check. Eighteen new tests cover the ratio, speed and power relationships, the torque ceiling, challenge success and failure, chain closure and tooth counts, real adapter pause/resume/destroy, stale RAF, old DOM input, reset, snapshot isolation, single-clock slow look and cross-route switching. The whole-collection navigation regression includes the bicycle and the original ten.

Actually operated in cloud Chromium: free pedalling, shifting, starting and shifting by keyboard Enter, gear 3 failing, gear 1 reaching the top, gear 2 completing as the fastest viable, pause/reset, close-up switching, ¼-speed observation, leaving the collection while running and returning via forward/back. Browser checks found and fixed: the close-up SVG overflowing and covering the sidebar, and an old global pressed style leaving light buttons with insufficient text contrast.

Narrow-width acceptance first used 300% zoom in the same desktop Chromium to produce a 388 CSS-pixel viewport, then narrowed the real window to 485 CSS pixels and re-checked the 388 CSS-pixel layout at 125% zoom; document and body scrollWidth were both 388. The challenge and gear controls were reachable by scrolling, and the failure and optimal-success flows passed again. Screenshots of the full page at 485 pixels and of the scene and controls at 388 pixels were recorded. This is not a physical phone, touch device or screen-reader test. Animation does not play by default and is started explicitly by the user, who may pause at any time. Sound asset cleanup is covered by regression checks; no claim of listening acceptance is made.

The build contains only one app entry, hashed JS/CSS and 11 SVG previews (14 runtime files), with no tests, historical source projects or workspace files. Previews are exported from the same drawing functions; no runtime dependency was added.

---

中文版见 [BICYCLE-EXHIBIT.zh-CN.md](BICYCLE-EXHIBIT.zh-CN.md)。

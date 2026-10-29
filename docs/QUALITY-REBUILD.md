# Bicycle / generator: polish and consistency rebuild

Dated 2026-10-25. Based on the content tree `579131c263178146d3e4e512cae0896579f45ab7` of `main` at `a6467b118d5e4baf0054f7bee48bfacfa355cc93`. This records local candidate acceptance and claims neither a merge nor a release.

## What was being corrected

The two first versions used flat schematics, which is not the same visual language as the original ten rotatable dimensional machines. This was not adding gradients or decorative lines to those schematics: it uses the original hall's `createColorFiguresRuntime` directly — its orthographic projection, geometry, faceted materials, ink lines, surface grain and cobalt shadow. The original ten scenes, models and renderers were not modified.

A new shared `object-stage` is used only by these two exhibits: drag to rotate, arrow keys to rotate, Home / double-click to return to the default view, direct manipulation of the object's parts, and a collapsed colour and view section. The original sidebar controls, physics model, challenge, slow look, sound and lifecycle are kept. The stage no longer carries large slogans, formulas or a permanent waveform; explanations move into the observation area. Close-up clipping is confined to its own SVG.

## Recognisable physical structure

- Bicycle: tube frame, fork and stays, tyre thickness and tread, rims on both sides, crossed spokes, hub, cranks and pedals, a three-tier cassette, two derailleur jockey wheels, a continuous chain. A repair stand supports the rear axle and the front wheel sits on a roller cradle; the tyres are deliberately off the ground to allow an on-the-spot demonstration. The default view is from the drivetrain side. Rims and tyre sidewalls are split into locally depth-sorted sectors, fixing a whole ring wrongly covering the nearer lower jockey wheel.
- Chain: a fixed 96 links, with length `96 × 2π × 7 / 32` drawing units; each gear solves the angle of a 14-unit rigid derailleur cage to take up the slack. The three gears have the same closed-loop perimeter, and the link pitch corresponds to the chainring tooth pitch. It is still sampled contact arcs and ideal instantaneous shifting, not a spring-force or shift-transient simulation.
- Generator: base plate, feet, yoke, round poles with brackets, open windings, upper and lower bearings, a mirrored crank, two slip rings with separate brushes, a real knife switch, continuous insulated wire, lamp terminals, a threaded socket and glass with a filament. The winding leads rotate rigidly with the rotor; the pole gap accommodates a full rotation. The default rest angle is θ=π/4, and the state and the physical readouts use the same angle rather than an image rotated separately.

Both remain teaching proportions, not manufacturing drawings. The bicycle's speed and torque relationships and the challenge conditions are unchanged. The generator is still the ideal AC model with K=1 V·s and R=10 Ω; there is no rectification, storage, loss or filament thermal inertia. Lamp brightness is indicative of cycle-average power.

## Visual acceptance

First, real browser screenshots of the original coffee machine, fan and washing machine were compared. The first round was rejected: the bicycle was too small, the spokes too shallow and the shadows streaked; the generator's poles hid the coil. The second round found insufficient stand support, the derailleur covered wholesale by the ring, and wire ends not reaching their terminals. All of these were fixed structurally, not papered over with explanatory text.

Independent review finally confirmed: the bicycle's three close-ups and its default, side and back views all show a continuous chain run with no wrongly layered slices; the generator's default, moving, side and back views have correct solid occlusion. Direct pedalling, clicking the cassette to shift, clicking the crank to start and clicking the knife switch to open the circuit were all actually operated. With the circuit open, turning still produced voltage, power fell to zero, and the knife switch and the lamp changed physical state together. The original pieces and the final two were also captured in one frame for comparison.

Screenshot evidence is kept in the acceptance workspace at `quality-polish/` and does not enter the release package: `side-by-side-full.png`, `final-bicycle-default.png`, `audit-final-bike-{gear1,gear2,gear3,back,side}.png`, `audit-final-generator-{idle,active,back,side}.png`, `home-final-posters.png`.

Page zoom in desktop Chromium produced a narrow 472 CSS px viewport, where both exhibits had scrollWidth=466 with no horizontal overflow; the bicycle was also checked at 393 CSS px with scrollWidth=388. Real mouse dragging changed the projection without accidentally toggling start/stop; leaving the exhibit while running and returning produced a fresh stopped instance with the old scene nodes removed. The narrow-screen control and principle areas were reachable by scrolling. **This is not a phone, touch-device or screen-reader test**; pointercancel, wrong pointer IDs, pause interruption and stale events/RAF after disposal are covered by automated tests. No actual listening acceptance is claimed.

## Engineering acceptance

- Full regression: 10 files, 123/123 passing; the original ten regression stayed passing.
- After freezing the geometry, the drawing/chain/interaction run was repeated separately: 11/11 passing.
- The jsdom long-animation tests for the two exhibits had their wall-clock timeouts relaxed individually; no physics, challenge, pause or disposal assertion was deleted or weakened. The projection-reset comparison normalises only auto-generated clip IDs and ignores no geometry.
- Lint, TypeScript, the production build and the boundary check passed. The final aggregated `npm run check` also passed completely (123/123; build boundary 15 runtime assets).
- The release package is still 15 runtime assets: one entry, JS/CSS, and twelve previews; no tests, screenshots or workspace paths.
- The two new home SVGs are generated by `scripts/render-solid-previews.mjs` from the real drawing and object-stage, with no new dependency; the static image drops interaction attributes, is valid XML, and repeat generation produces identical SHAs. The home alt text and cache versions were updated with it.

Merge and deployment status must be checked separately against the corresponding commit and result on GitHub / Vercel; passing locally does not mean production has been updated.

---

中文版见 [QUALITY-REBUILD.zh-CN.md](QUALITY-REBUILD.zh-CN.md)。

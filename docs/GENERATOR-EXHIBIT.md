# Exhibit 12: the hand-crank generator

> This records the first design and the acceptance numbers of that time; the drawing was rebuilt on 2026-10-25 into a dimensional scene consistent with the original ten. The current structure, tests and limits follow [the polish and consistency rebuild](QUALITY-REBUILD.md).

A development candidate based on the released bicycle `main` at `fc676ad0965631aa35e3f09116a239143a2d418d`, tree `eb4477bdba7ba6b96b46b1ae544d0d932ba4cb5a`. This note records candidate acceptance and does not mean it was merged or released to production.

## Controls and model

Route `/#/generator`. Click to start cranking, choose 30 / 60 / 90 rpm, or use the 0–100 rpm slider. You can reverse direction and connect or disconnect the load. After stopping, the induced voltage and current fall to zero; reversing changes the sign of the speed at the same angle without changing the average power at that speed.

The model is an ideal single-coil AC generator, not a DC source: there is no rectifier and no energy storage. The handle and the coil are 1∶1, there is a single pole pair, `K = N B A = 1 V·s`, and the bulb is modelled as a pure `R = 10 Ω` resistor. θ is the angle between the coil normal and the field B:

- Flux linkage `λ = K cos θ`.
- `dθ/dt = ω`, induced voltage `e = -dλ/dt = K ω sin θ`.
- Closed-circuit current `i = e/R`; open-circuit current is zero, but voltage can still exist while turning.
- RMS voltage `Erms = |Kω|/√2`; cycle-average load power `P = Erms²/R`.
- Instantaneous power `p = i²R ≥ 0`; the current direction comes from the sign of the instantaneous current, not from the crank direction alone.

The lamp is driven by cycle-average power with a capped brightness; real filament thermal inertia, non-linear resistance and visual photometry are not modelled. The wires, coil and slip rings are a cut-away schematic connection, not manufacturable 3D wiring. The hand does the work; hand torque, friction, acceleration and temperature rise are not modelled, so the readings cannot be used to infer real-device efficiency.

Physics reference: [OpenStax, Electric Generators and Back Emf](https://openstax.org/books/university-physics-volume-2/pages/13-6-electric-generators-and-back-emf). The image, code and assets are original; no reference resource was copied.

## The small challenge

The goal is an average load power of 1.5–3 W for 3 continuous seconds, not a bulb's safe rating. At 30 rpm the power is about 0.49 W and at 90 rpm about 4.44 W, so neither accumulates; at 60 rpm it is about 1.97 W, which completes. Exceeding the target speed, opening the circuit, stopping or losing window focus clears the hold time being accumulated; restarting the challenge zeroes it explicitly.

The ¼-speed observation slows the same simulated clock. Voltage and speed readouts keep their original model values, so the 3-second simulated challenge takes about 12 seconds to watch. The page states this time scaling explicitly. Nothing autoplays; after the user starts explicitly they may stop at any time. No separate reduced-motion mode is claimed.

## Engineering and acceptance

Reuses the existing routing, ResourceScope, sound and principle observation; the original eleven scenes' implementations are unmodified and no dependency was added. The collection count, catalogue, home cards and build asset boundary extend to twelve exhibits.

New model and adapter tests cover the induced phase, zero output at rest and with an open circuit, reversal, doubled speed, the electrical power relationships, the continuous challenge, stacked pauses, stale reset/dispose callbacks, single-clock slow look, catalogue and cross-route cleanup. The final `npm run check` covers lint, typecheck, tests, build and 15 release-asset boundary checks.

Local Chromium on 2026-10-25: keyboard start and slider Home-to-zero, 30/60/90 rpm, reverse, open circuit, low/high/target-power challenges, ¼-speed observation, reset, returning home and browser forward/back. Re-entering the route restored the stopped state and the catalogue showed 12 items. At 388 CSS px the narrow viewport's clientWidth and scrollWidth were both 388; the scene and the controls were checked separately by screenshot, as was the desktop screenshot. The full suite was 9 test files, 114 tests and 15 release assets. Browser error logs showed an error from the extension's own metadata, which was not treated as a site fault. The narrow viewport is a CSS viewport obtained by resizing or zooming desktop Chromium, not a physical phone. Sound asset lifecycle is covered by tests; there was no listening acceptance.

---

中文版见 [GENERATOR-EXHIBIT.zh-CN.md](GENERATOR-EXHIBIT.zh-CN.md)。

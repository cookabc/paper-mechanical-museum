# Fan exhibit adapter

`mountFan({ root, scope, audio, observation })` is a real ES module. It renders only the fan's scene markup; the application owns the shared header, navigation, design tokens and service instances. Import `style.css` from the application entrypoint. Every selector is constrained to `.fan-exhibit`.

## Controller contract

- `pause(reason)` records a pause reason, cancels scene clocks and transient input, suspends audio, and preserves machine motion state.
- `resume(reason)` removes that reason. Only the final removal resumes the scope, starting from the current clock with no background catchup. Repeated resume calls are inert.
- `reset()` stops the machine and restores its initial state, view and observation rate. The existing in-scene “重置视角” button intentionally resets only the view.
- `dispose()` is idempotent. It detaches the audio mount token, observation UI, input listeners, frames, timers and pending texture images, then removes scene markup. Retained nodes and disposed controller calls are inert.
- `snapshot()` returns an independent state snapshot plus view, observation rate, pause reasons and lifecycle diagnostics. It does not publish anything on `window`.

All events and timers use the application's `ResourceScope`. `Paper3D` is imported directly, not installed globally. The original projection, geometry, depth ordering and continuous-time motion formulas are unchanged. The original once-baked hand texture is preserved with unique filter IDs and cancellation guards; it never leaves live animated SVG turbulence attached.

## Verification

Run from the project root:

    node src/exhibits/fan/regression.mjs

The regression script imports the actual module, uses the archived authoritative full-source fan as a read-only reference, and checks:

1. Byte-identical Paper3D and continuous-time mechanics formulas.
2. Exact state and SVG painter output at 30, 60 and 120 Hz, with inter-frame speed changes, slow observation, oscillation and coasting to idle.
3. Native SVG paths and projected input targets in a real JSDOM tree.
4. Keyboard, mouse, touch and pen action deduplication.
5. Multi-reason pause/resume, no catchup and cancelled drag input.
6. Full controller reset versus view-only UI reset.
7. Idempotent teardown, zero retained scope resources, inert old nodes and cancelled asynchronous texture loads.

These are deterministic source and DOM tests, not browser screenshots or audible-output verification. Shared audio, observation and navigation are additionally covered by the application's integration tests.

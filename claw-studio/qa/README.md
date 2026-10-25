# Portable regression checks

Run from the `claw-studio/` subdirectory with Node.js 20 or later:

```sh
node qa/run.cjs
```

No npm packages, installation, browser, Git history, credentials or network access are required. Tests read the adjacent `dist/` files and print results to the terminal; they do not write reports or change the product.

## Coverage

- **Source integrity: 3 groups.** SHA-256 equality for all five frozen distribution product files, the preserved root upstream license, their four HTML resource cache tokens, and JavaScript parsing. This replaces historical Git-dependent comparisons with a fixed release-byte assertion. It is not a newly performed geometry or visual comparison. Approved byte checks intentionally fail after any product change; review the change before explicitly updating the fixed hashes.
- **Input: 16 groups.** Real production input/orbit handlers execute in a small deterministic event/focus fixture. Tests cover key ownership and modifiers, press/click deduplication, pointer cancellation and capture, focus restoration after redraw, hidden controls, multi-turn camera reset, four wins, miss, and restock. The fixture executes the real core easing function, not a linear substitute.
- **Controller: 10 groups.** Real production initial state, aim/drop/collect/restock functions and easing execute in a Node VM. Equal-time snapshots agree at 20/30/60/120 Hz with a `1e-9` numeric tolerance, including success and miss, exact phase boundaries, large time steps, irregular subdivisions, repeated actions, inventory counts, stale callbacks and zero pending callbacks after completion. A separate fixture runs the real core RAF driver to verify the `0.06`-second cap and hidden/resume behavior. Production guide state/actions are compared with free play through all four wins, restock and a miss, including inert entry/exit and guarded repeated actions.

The complete command runs 29 test groups in three suites. Each suite can also run directly with `node qa/source-integrity.cjs`, `node qa/input-regression.cjs`, or `node qa/controller-regression.cjs`.

## Limits

These are source-executed regression tests, not a complete browser emulation. The input fixture uses synthetic events and a minimal DOM; the controller fixture stubs UI rendering, input release and audio calls. It checks controller sound-event invocation counts, not sound generation. The optional real RAF-driver fixture still uses a deterministic mocked clock and scheduler.

This set does **not** certify native DOM layout, SVG rendering/depth/occlusion, browser focus/event defaults, actual guide DOM relocation, touch hit testing, screen-reader behavior, Web Audio synthesis/timbre/device volume, real-device performance, hosting configuration, or deployed-site behavior. It does not claim that the old Git-dependent geometry, JSDOM integration, or audio-hardware suites passed. Those require separate validation as appropriate.

Production sections are extracted with explicit markers. A changed source structure fails loudly and may require a reviewed harness update. Large direct-controller steps deliberately bypass the RAF cap to test remainder handling; real RAF-cap behavior is asserted separately.

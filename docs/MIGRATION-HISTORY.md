# Migration history: from four entry points to one application

This document merges migration records that used to sit in seven separate files: four batched acceptances (2 → 5 → 8 → 10 exhibits) and three descriptions of the static delivery packages that predate the unified project. They describe a **completed migration**, not the current state. The current directory layout, commands and lifecycle follow the [development and acceptance guide](DEVELOPMENT.md) and the actual source.

Any repository names, branch names, paths, authorisations and test numbers that appear here apply only to their own stage.

## Stages one to four: batched integration (2 → 5 → 8 → 10)

What the four batches shared: each was based on the previous batch's remote commit, added only exhibit adapters, did not change the mechanism drawing path, was not merged into `main` and was not released to production. Each batch was operated in a real browser using the page's own buttons and keyboard, without injecting model state.

| Batch | Baseline commit | Added | Cumulative |
| --- | --- | --- | --- |
| First | `ae56905` | Coffee machine, electric fan | 2 / 10 |
| Second | `5c9636c` | Instant camera, vending machine, toaster | 5 / 10 |
| Third | `8911e87` | Music box, record player, elevator | 8 / 10 |
| Final | `2d80d2b` | Washing machine, claw machine | 10 / 10 |

The first batch also established the engineering baseline: `npm run check` (ESLint, TypeScript, current-module tests, Vite build) became the admission condition for every batch.

Key conclusions after the final batch:

- **The ten are genuinely mounted by one Vite application**, with no nested sites or iframes. The home page is `/#/`, and the exhibits are `/#/washer`, `/#/fan`, `/#/claw`, `/#/coffee`, `/#/musicbox`, `/#/vending`, `/#/toaster`, `/#/turntable`, `/#/camera` and `/#/elevator`. When switching away from the old entry points in future, the exhibit hashes must be preserved, not just the domain.
- **The two kinds of "leaving" are not the same**: exiting the principle observation only collapses the explanation, without destroying the machine, and re-entering keeps the progress and paused state; leaving the exhibit route terminates the scene and releases resources, and re-entering starts from the initial state. The latter saves no half-filled cup, half-finished run or unclaimed item.
- The washing machine and the claw machine each keep one explicit historical render adapter rather than overwriting two cores of the same name; they share the same SceneContext, ResourceScope, sound service, principle observation component and routing as the other eight.
- Fourteen new real-model comparison and lifecycle regressions were added (load laundry, add detergent, run, pause and take clothes out; a failed grab, grabbing and claiming four plush toys, counting, and multiple views). jsdom's missing `getScreenCTM` is stubbed with an explicit layout stub and is not treated as a real-browser geometry test.
- Output boundary: `scripts/verify-build.mjs` runs after `npm run build` and allows only three classes of runtime asset — HTML, hashed JS, hashed CSS and the model SVG previews — rejecting fixtures, absolute workspace paths and the original site's hosting identity.

## Before the unified project: the static source delivery packages

What follows describes the **pre-migration** shape, replaced by the unified application and kept only for traceability.

- The old shape was a complete static source delivery package: `object-collection/dist/shell.js` plus seven standalone pages, each exhibit with its own entry, relying on page navigation rather than route switching.
- The delivery scope and minimum adaptation list of that time were listed page by page, and acceptance was also performed page by page; that division no longer holds in the unified application.
- The testing and portability notes of that time addressed the static package above; current testing follows the [development and acceptance guide](DEVELOPMENT.md) and `npm run check`.

## Related documents that were not merged

- [Core differences audit](CORE-DIFFERENCES.md): a point-by-point comparison of the four original implementations' models, geometry, controls, timing and lifecycle; it remains the original basis for the migration.
- [Unified architecture](UNIFIED-ARCHITECTURE.md): the unified application's architecture, lifecycle contract and CI boundary; some content overlaps this document but leans more towards design description.
- [Path adaptation manifest](PATH-ADAPTATIONS.json): the record of moving the original source.
- The provenance and hash manifests in `archive/`, and the old source in `tests/fixtures/complete-source/`, are likewise historical evidence rather than current build output.

---

中文版见 [MIGRATION-HISTORY.zh-CN.md](MIGRATION-HISTORY.zh-CN.md)。

# Contributing

Start by reading the [README](README.md), the [development and acceptance guide](docs/DEVELOPMENT.md) and the design records for the exhibits you touch. Keep the paper feel, the hand-drawn lines and each machine's independent mechanism. Do not package a teaching illustration as a simulation of real equipment.

## Reporting an issue

Include the exhibit link, reproduction steps, expected and actual results, browser and viewport size. Attach a screenshot for visual problems. For timing or state problems, say whether the exhibit was paused, whether the tab was switched away, and whether you reset or left the exhibit. Do not post personal information, credentials or access tokens.

## Submitting a change

1. Branch from the current `main`; a small, single-purpose PR is easier to review.
2. Change `src/`, never hand-edit `dist/`, and never modify historical fixtures to hide a regression. Keep attribution and licence notices intact. The repository is MIT licensed, but the upstream work it includes stays under its own terms — do not drop or relicense those notices.
3. With the recommended Node.js 24.x, run `npm ci`, `npm run check` and `npm run test:legacy`; add regression tests for your change. Re-run the affected checks after your last edit.
4. Interaction and visual changes need a real-browser acceptance pass covering normal operation, pause/reset, exit/re-entry and repeated or interrupted input. Layout changes also need narrow and short viewports, visible focus, and resizing across layout boundaries while the exhibit is active. The checklist is in the development guide.
5. Open a draft PR stating the purpose, the scope, the exact results of the checks you ran, screenshots or reproduction steps, and anything you did not test. Historical baselines, current modules, browsers and remote CI are different kinds of evidence.

A PR is not approval to merge or release. Maintainers handle it under the current authorisation and repository rules; do not change access, add credentials, promise permissions or costs, or remove third-party copyright notices, and do not assign a new licence to the whole repository.

---

中文版见 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)。

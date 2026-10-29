# Documentation index

**Just want to look around?** Go to the [project home and the twelve exhibits](../README.md).

**Want to develop?** Start with the [development and acceptance guide](DEVELOPMENT.md). The current directory layout, commands and lifecycle follow that guide and the actual source; the design and acceptance records below keep their own dates, baselines and scope, and are not continuously updated production status pages.

## Exhibit design and subject records

Each is available in English and Chinese.

- [Bicycle derailleur](BICYCLE-EXHIBIT.md) · [中文](BICYCLE-EXHIBIT.zh-CN.md): the drivetrain model, the hill-climb experiment; the first and later revisions are marked by section.
- [Hand-crank generator](GENERATOR-EXHIBIT.md) · [中文](GENERATOR-EXHIBIT.zh-CN.md): the ideal AC model, parameters and applicability limits.
- [Learning by hand: the generator](GENERATOR-LEARNING.md) · [中文](GENERATOR-LEARNING.zh-CN.md): the predict → operate → explain → re-verify evidence gate.
- [Bicycle / generator 3D rebuild](QUALITY-REBUILD.md) · [中文](QUALITY-REBUILD.zh-CN.md): structure, geometry, occlusion and the acceptance record of that time.

Words such as "candidate", "unreleased" and the test counts in these documents describe the state at the time. Do not read the current `main` or the production deployment from them.

## Historical architecture and migration evidence

The following is kept for traceability; the old repository name, branch names, paths, commands, authorisations and acceptance numbers apply only to their own historical stage.

- [Migration history](MIGRATION-HISTORY.md) · [中文](MIGRATION-HISTORY.zh-CN.md): the batched acceptance of merging four entry points into one unified app (2 → 5 → 8 → 10 exhibits), and the standalone static delivery packages that predate the unified project.
- [Unified architecture](UNIFIED-ARCHITECTURE.md) · [中文](UNIFIED-ARCHITECTURE.zh-CN.md): the unified app's design, lifecycle contract and CI boundary.
- [Core differences audit](CORE-DIFFERENCES.md): how the four original implementations differed in model, geometry, controls, timing and lifecycle.
- [Path adaptation manifest](PATH-ADAPTATIONS.json): the record of moving the original source.

The source/hash manifest in `archive/` and the old source in `tests/fixtures/complete-source/` are also historical evidence, not current build output. For the latest code state see GitHub commits and PRs; for deployment state see the corresponding Vercel record and the live site. Neither can be inferred from an old acceptance document.

## Origins and licences

[Third-party origins and attribution](../THIRD_PARTY_NOTICES.md) · [Full upstream MIT licence text](../licenses/Colorfigures-LICENSE.txt). Keep the corresponding code's copyright and licence, and do not extend the upstream licence to the whole repository.

---

中文版见 [README.zh-CN.md](README.zh-CN.md)。

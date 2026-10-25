# Portable test entry points

See [`../../docs/TESTING.md`](../../docs/TESTING.md) for the complete package's commands, dependency setup, 20 core / 41 extended suite scope, preserved historical checks, and optional raster/Python tools.

Historical source inputs live in `baselines/`; their manifest is input provenance, not a saved acceptance report. Direct QA scripts may create outputs locally. The root `npm test` runner instead uses a temporary copy and cleans it up.

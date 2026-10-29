# Repository screenshots

These images are used on the repository's front page. They are not part of the app's `public/` directory or the production build. Every one is a real browser screenshot of the production site — nothing generated, composited or edited.

- Source site: <https://paper-mechanical-museum.vercel.app/>
- Captured: 2026-10-29 (UTC)
- Browser: cloud Chrome, desktop, 1500px viewport width; the JPEGs keep the original bytes the capture tool returned.
- Interface language: English (the default). The generator frame shows the current state of the translation — the shell (header, dock headings, sound panel) is English while the labels inside that machine's own panel are still Chinese. That is the real state; see the coverage note in the [README](../../README.md).

| File | What it shows | Size | Bytes |
| --- | --- | --- | --- |
| [museum-home.jpg](museum-home.jpg) | The home page, default coffee-machine pick | 1500 × 900 px | 174,188 |
| [generator-workbench.jpg](generator-workbench.jpg) | `/#/generator` after pressing "开始摇动" at +60 rpm with the circuit closed, reading 4.44 V / 1.97 W | 1500 × 1080 px | 195,483 |

To update one: recapture from the production site and check by eye that the title, the machine, the controls and the readouts are sharp and complete, that no personal information, sign-in prompt or developer overlay is in frame, and that the sidebar is not cut off at the bottom. Record the date, the production commit and the actual operating state alongside it. Do not replace a project screenshot with a generated image, and do not change exhibit behaviour just to make a screenshot easier. A screenshot is a display record; it does not stand in for interaction testing, real-device testing or cross-browser acceptance.

---

中文版见 [README.zh-CN.md](README.zh-CN.md)。

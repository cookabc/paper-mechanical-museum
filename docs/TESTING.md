# 测试与可移植性

> **历史文档：原完整静态源码交付包。** 下文命令、路径和验收数字不适用于当前统一 Vite 工程。当前操作请见[开发与验收指南](DEVELOPMENT.md)，其余记录见[文档索引](README.md)。

在完整源码包根目录运行，使用 Node.js 20 或更新版本。产品本身是静态 HTML/CSS/JavaScript，不需要 npm 依赖才能启动。

## 当前回归命令

| 命令 | 前提 | 范围 |
| --- | --- | --- |
| `npm test` | 只有 Node；不需安装包、Git、浏览器、凭据或网络 | 20 套当前生产源码回归 |
| `npm ci` | 首次安装需要 npm registry，或已有完整 npm 缓存 | 安装锁定的 JSDOM 26.1.0 开发依赖及其依赖，不安装浏览器 |
| `npm run test:extended` | 已安装 JSDOM；测试过程可离线 | 41 套，包含默认 20 套及 21 套扩展回归 |
| `npm run test:benchmark` | 已安装 JSDOM；测试过程可离线 | 4 个源码/DOM 相对 CPU 基准，不代表浏览器 FPS |
| `npm install --no-save sharp@0.33.5`，然后 `npm run test:raster` | 可选 Sharp peer 依赖及适用平台二进制 | 2 个 SVG 栅格化检查入口，耗时可能较长 |
| `npm run test:legacy` | 已安装 JSDOM | 6 次历史开发检查，其中 4 个旧检查与当前已改版行为不兼容，预期返回非零，详见下文 |

当前源码与音频生命周期、输入取消/焦点、咖啡/食品/乐器观察、电梯交互/遮挡/时序、洗衣机完整流程、风扇时间积分/惯性，以及抓娃娃机控制器/讲解/声音均有对应回归。扩展命令还覆盖真实生产脚本的 JSDOM 挂载、历史源几何对照、重复输入和中断后恢复。

根测试运行器会把四个项目复制到临时目录执行，结束后删除临时输出，不改写交付包内的生产或测试源码。命令后加 `-- --verbose` 可查看详细输出；加 `-- --keep-output` 可将本次临时副本保留到被忽略的 `qa-output/`。直接运行原始 QA 脚本则可能在其自己的 QA 目录生成结果，这与根运行器的隔离模式不同。

查看入口清单：

```sh
node scripts/test.cjs --list
node scripts/test.cjs --extended --list
node scripts/test.cjs --legacy --list
```

可用 `--suite=project/qa/name.cjs` 选择已列入运行器的单项；使用该项所需的依赖必须已安装。`npm start` 启动完整展馆，`npm run verify` 执行包结构与本地资源校验。

## 本轮验证所用环境

本轮源码回归使用 Node.js 24.22.1。默认 20 套不加载第三方包；扩展检查通过临时 `NODE_PATH` 使用已安装的官方 npm JSDOM 26.1.0。该临时路径不写入交付脚本或配置，包内没有借用其他项目的 fallback。

根 `package-lock.json` 保留同版 JSDOM 及 39 个依赖包节点的 npm registry 地址与 integrity。除离线锁文件一致性检查外，已在独立干净临时目录通过官方 npm registry 成功执行 `npm ci --ignore-scripts`，安装 39 个包。空缓存的 `npm ci --offline` 因缺少缓存包而不能完成，这是正常的首次安装网络要求，不是锁文件或源码依赖缺失。接收者用标准 `npm ci` 安装本包声明的开发依赖后即可离线运行扩展测试。

本次最终执行结果：`npm test` 为 20/20 套通过；最终 `test:extended` 为 41/41 套通过、0 失败，约 194 秒。可选 benchmark/raster 未在本次打包验证中运行；下列 legacy 失败不计入通过数量。

## 历史源输入保留，不携带 Git 历史

所有原仓中已 tracked 的自写 CJS、Python、HTML 测试源码均保留；另保留实际存在、被测试引用的 `object-collection/qa/instrument-contact/musicbox-before.js`。没有为了“全绿”删除旧断言或把旧报告冒充新验证。

原测试通过 `git show` 读取的必要历史文件，已冻结为 38 个源文件。每个项目的 `qa/baselines/manifest.json` 记录原完整 commit、文件字节数与 SHA-256；`portable-baseline.cjs` 每次读取时校验内容，完全不启动 Git，也不依赖 `.git/`、远端或凭据。未打包的任意历史 revision 会明确报错。

原有 `instrument-dynamic-v11/baseline/*.js` 与 `instrument-contact/musicbox-before.js` 是测试输入，不是旧截图或验收回执。咖啡讲解使用实际引入讲解前的源文件。所有当前行为测试仍执行相邻 `dist/` 的真实生产代码。

仅两个抓娃娃机历史源码比较将旧公开展馆返回 URL 标准化为本包相对返回路径；没有放宽几何、控制器或其他代码断言。独立 `source-integrity.cjs` 仍锁定本包五个生产文件的完整字节，包括已本地化的 URL、cache token 及根许可证。

## 已识别的旧检查限制

以下旧断言被保留，但不属于当前 `test:extended` 的通过范围。`test:legacy` 会真实执行并暴露失败，不会把它们跳过后算作通过。

1. `audit-food-dynamic-regression.cjs`：固定 v10 历史状态要求 before/after 字段完全相同；当前已新增咖啡剂量、暂停、讲解等状态。两个 `audit-food-dynamic-v10.cjs --snapshots-only` 调用可生成新的 before/after 输入，但不能使旧的全字段相等假设成立。新版咖啡/售货机过程与讲解测试负责当前行为。
2. `audit-mechanics-four.cjs` 的完整旧 suite：仍假设旧音频开关按钮、唱片立即停转、早期八音盒能量/盖板结构等。它的复用 harness 与可选 snapshots 功能仍被保留；当前专项电梯、相机、乐器/声音检查不依赖那些旧假设。
3. `review-six-lessons.cjs`：要求风扇 `frame`、抓娃娃机 `drop` 等与早期讲解前控制器逐字相同；当前已明确修正时间积分及跨阶段剩余时间处理。因此旧控制器相等断言不再适用。各项目的新版讲解、输入及等时状态测试覆盖当前实现。
4. `audit-motion-frames.cjs`（包括 `--quick`）：旧接触检查要求观察面板高亮数组中的第一个接触齿；当前生产实现使用最近接触针齿，与新讲解保持一致。断言未改写，这个旧入口不计为当前帧回归通过；新的乐器讲解/接触及结构回归单独覆盖当前模型。

这些是已实际跑出并检查原因的旧预期，不是对所有潜在问题的豁免。任何新的失败仍需调查，不能仅因脚本较旧就忽略。

## 其他保留工具及可选依赖

- `audit-food-dynamic-v10.cjs` 不加 `--snapshots-only`、`render-food-crossings.cjs`，以及 `audit-toaster-cut-ink.cjs` 不加 `--no-png` 时调用独立安装的 Inkscape CLI。其 snapshots-only/no-PNG 模式只需 Node。
- `washer-study/qa/check-dynamic-transfer.py` 需要 Python、Pillow、Inkscape。先直接运行 `node washer-study/qa/audit-dynamic-transfer.cjs` 重建 SVG 输入，再运行该 Python 文件。
- `fan-study/qa/dynamic-audit-d98afd3/capture-guards.cjs` 可重建 JSON/SVG；`check-guards.py` 需要 Python、NumPy、Pillow。`OUTPUT_DIR` 可指定输入/输出目录。无需把历史截图放进源码包。
- `object-collection/qa/six-principles/make-contact.py` 是拼图工具，不是回归 suite。需自行提供脚本列出的 JPG 截图，以及 Pillow 和中文字体。`MUSEUM_FONT_REGULAR`、`MUSEUM_FONT_BOLD` 可覆盖原 Linux 字体路径。
- `audit-food-observation.cjs --compare-baseline` 是可选旧开发模式。`FOOD_OBSERVATION_BASELINE_DIR` 应指向含有准确原始 `coffee-observation-before.js`、`toaster-observation-before.js`、`vending-observation-before.js` 的目录。原临时文件已不可用，本包不伪造。默认当前观察检查已包含于 `npm test`。
- 两个 `mobile.html` 保留并使用包内相对路径；需通过能服务完整包的本地服务器手动打开，不代表自动完成手机浏览器验收。

## 验证边界

这些测试验证确定性的生产源码回调、数值状态、SVG 以及指定 DOM/Web Audio 仿真。JSDOM/最小 DOM 不是真实浏览器，仿真音频不是试听。

通过不代表已认证原生浏览器布局、真实触屏、辅助技术、实际声音、设备性能或部署行为。旧截图、生成结果 JSON、历史验收回执均未作为本次新通过证据打包。可选 raster/benchmark 命令的存在也不等于已经跑过。

干净安装的依赖另用于复跑相机讲解、风扇时间/输入音效、抓物讲解三个代表性 JSDOM suite，全部通过；不借用其他项目依赖。

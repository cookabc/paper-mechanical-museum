# 统一机械馆：架构与验收边界

## 1. 目标与明确不做的事

把原来的七件主馆与洗衣机、电风扇、抓娃娃机三个独立页面逐步迁移成同一个应用。保留纸张纹理、手绘线条、SVG 投影、颜色、机制状态和默认自由玩，先解决工程边界及可验证的资源所有权，不重新设计画风或用一个通用动画替代不同机械模型。

当前统一首页与十件展品均有真实静态 ES module 适配器。迁移分为2→5→8→10件四批，逐批保留原状态/渲染对照并做实际浏览器验收。首页卡片或旧源码存在本身不构成迁移完成的证据。本轮不部署生产、不改变权限，也不声称性能已经提升。

## 2. 可追溯基线

- 仓库：`cookabc/little-claw-arcade`。
- 本轮采用的远端 main 基线：`ae56905eaae8a83764589d65dc96d54d4e922c38`，tree `61de7f271760a4f831249ad941c2e4d5236c8de5`。
- 完整源码经 PR #1 合入 main，原交付分支已删除。基线事实以该提交为界，不承诺 main 永远不再变化。
- 重构使用独立 `refactor/unified-museum` 分支。制作副本的本地导入提交不等于远端 Git 祖先，不能用它强推覆盖远端历史。
- 原 `SOURCE-PROVENANCE.json`、`FILE-MANIFEST.json` 与旧工具保留在 `archive/`。其哈希描述原源码包，不能当作新 `src/` 或新 `dist/` 的内容哈希。

原四套入口并不等价。`CORE-DIFFERENCES.md` 记录了共同点、几何/控制/焦点/时间积分差异和生命周期风险，是后续逐件适配的依据，不是通过验收的替代品。

## 3. 工程结构与运行边界

```text
index.html → src/main.ts → src/app/app.ts
                           ├─ home / hash routes
                           ├─ application ResourceScope + shared audio service
                           └─ current scene root + ResourceScope + observation binding
                              ├─ 七件主馆 → 共享 Colorfigures runtime + 独立机械模型
                              ├─ fan → Paper3D + 原风扇机械模型
                              ├─ washer → 明确保留的 washer renderer + 洗衣模型
                              └─ claw → 明确保留的 claw renderer + 抓取模型
```

Vite 负责开发、ES module 构建及 `dist/` 输出。`src/app/contracts.ts` 定义控制器、上下文和音频服务边界；`src/app/scope.ts` 管理资源；`src/app/scoped-dom.ts` 把原有 DOM 访问约束到场景根。TypeScript 当前设置 `allowJs: true`、`checkJs: false`，因此类型检查覆盖宿主与声明的边界，不等于已静态验证所有 JavaScript 内部逻辑。

适配器是实际 ES module 导入，不使用 iframe、eval、new Function、脚本文本替换执行或覆盖浏览器原型。应用控制 URL 和共享导航；旧 HTML 页面不是运行时子应用。

### 资源所有权

| 所有者 | 职责 | 不应拥有 |
| --- | --- | --- |
| 应用宿主 | 路由、浏览器历史、当前控制器、公共导航、页面隐藏/恢复入口 | 展品内部物理状态 |
| 应用 ResourceScope | 宿主事件与共享服务生命周期 | 已离开的场景时钟 |
| 场景 ResourceScope | RAF、timeout、事件、属性型输入处理器及清理 | 其他场景 DOM 与音频附件 |
| 展品控制器 | 实际模型状态、局部几何、暂停原因、重置与终止 | document.body 覆盖、全局调试状态 |
| 音频服务 | 一个当前附件、用户显式开启、声音更新与销毁 | 路由决策、自动重新开启声音 |
| 观察绑定 | 当前根内的标记与讲解、同一模拟速率 | 第二套独立推进机械运动的时钟 |

“共享”指代码和所有权统一，不强行把 Colorfigures 与 Paper3D 投影合成一个引擎。咖啡机和风扇的机械公式、时间积分、输入策略与几何仍按各自语义保留。洗衣机和抓娃娃机的历史核心因输入/层级/相机语义不同，以显式静态 factory 保留，未因文件同名而覆盖。它们不再拥有独立网页入口、音频服务或路由。

### 控制器生命周期验收要求

- `mount(context)`：只写指定 root，创建新状态。失败或被替换时释放已取得的资源，不破坏宿主导航。
- `pause(reason)`：可重复调用，暂停模拟/资源，取消按压、拖动和指针捕获，静音但保留物理进度。不同暂停原因不能互相解除。
- `resume(reason)`：只有仍活跃且所有暂停原因都解除的控制器可恢复。以新时间戳继续，不能补算后台经过的时间，不能新增重复 RAF 链，也不能自动恢复声音。
- `reset()`：按原展品的复位语义取消本轮，旧异步回调不能重新写入。咖啡/吐司原本保留的已领取计数仍保留，抓物整轮试验复位则清除该轮计数；场景中的“重置视角”仍只重置相机，不混同于整机重置。
- `dispose()`：终态、幂等。释放音频附件、观察绑定、时钟、事件、输入及纹理异步回调；只移除自己拥有的 DOM，不把焦点拉回旧场景。
- `snapshot()`：用于只读诊断，不能泄漏内部可变数组/对象引用，也不写 `window.__st` 一类全局状态。

原理观察卡片的退出/重入不会销毁场景，保持当前物理进度；路由离开展品则 dispose，回来创建初始状态。没有跨展品进度持久化，不能把两种行为混为一谈。

以上是需要由实际实现和测试满足的契约，不是仅凭存在这些方法就宣布通过。详细失败场景见核心差异审计的红测清单。

## 4. 视觉、交互与服务迁移原则

1. 原 SVG 几何、预览和手绘纹理可复用；全局样式逐步约束到宿主或对应展品。共享 tokens 不能成为无意改变比例、颜色或遮挡顺序的理由。
2. 聚焦与按键按展品语义处理。例如抓娃娃机普通方向键用来瞄准，不能被统一相机快捷键吞掉。正常重绘时恢复逻辑控件焦点，导航销毁时不恢复旧焦点。
3. 原观察实现相同，适合共享，但 DOM 查询和速率回调必须有当前场景所有权。原音频有两个有效版本，咖啡暂停/牛奶与相机暂停的修正不能在合并时丢失。
4. 声音始终 opt-in。切换、隐藏、离开或失焦要静音；过期 `resume()` promise 和旧附件销毁不能影响新附件。
5. 任何未迁移展品都明确显示待迁移，不用旧页面嵌入“填满”十件，也不把外站链接当作统一运行完成。

## 5. 源码基线与测试分层

`tests/fixtures/complete-source/` 保留原四个项目的运行源码、QA 及其必要历史输入。它们是只读比较基线，不被应用入口 import，也不放入 `public/`。构建时不得把这些目录复制到 `dist/`。

当前命令以根 `package.json` 为准。使用 Node 22.13+（22.x）或 24.x，推荐与 CI 一致的 24.x。最低版本同时考虑 Vite/Vitest 与 ESLint；不要把依赖允许的版本范围当成每个版本均已测试的证据：

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
# 上述四项顺序执行：
npm run check
```

当前测试直接导入十件实际模块和宿主，不以伪造控制器或剪出的旧脚本文本当作新实现。时钟、布局、指针捕获和音频节点可以使用测试环境替身；物理状态变化与真实渲染函数不能替换。重点覆盖切换、重复进出、暂停/恢复、重置、中断输入、旧 DOM/回调无效、焦点和音频附件隔离。

旧基线单独运行：

```sh
npm run test:legacy
npm run test:legacy -- --list
```

这调用 `tests/legacy/run.cjs`，在临时副本运行保留源码的默认基线套件；它不是新适配器的集成测试。“legacy”在这里是目录/脚本分类，不代表原包同名命令：原包的已知旧断言入口对应 `npm run test:legacy -- --legacy`，它有明确的历史不兼容项，不能算作当前通过，也不能为了全绿删除断言。

新模块测试通过、旧基线通过、真实浏览器验收是不同证据。旧源码的历史通过数字、截图或基准不继承到新应用。本文件不固定随改动易过期的通过数量；每次交付以最终提交的日志为准。尚不能仅凭自动化测试声称所有十件完成、全设备视觉一致、辅助技术通过、声音正确或性能提升。

### CI 的可复现与最小权限

`.github/workflows/ci.yml` 对 `pull_request` 及 main push 执行（PR覆盖重构分支，避免重复检查）：

- 检出事件对应的完整提交 SHA，PR 使用 head SHA，而非隐式浮动分支或合成 merge ref；校验 HEAD 并输出 commit/tree。
- 只授予 `contents: read`，不使用 `pull_request_target`，不持久保存检出凭据，不引入用户 secrets。
- `npm ci` 使用提交内锁文件；Node 24 跑 `npm run check`，独立任务跑旧基线，避免把两种证据混为一谈。
- 不缓存依赖、不上传或发布产物、不创建环境/凭据、不部署。远端 CI 尚未运行时只能说“配置已准备”，不能说“GitHub 检查通过”。

Actions 固定完整提交，2026-10-25 从官方 release/commit 页面核验：

- [actions/checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)：[`3d3c42e5aac5ba805825da76410c181273ba90b1`](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1)。
- [actions/setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)：[`949feb2413d6458794dcd2491c4babbbce0c15c1`](https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1)。

## 6. 分步推进与上线闸门

1. 先验证咖啡机/风扇代表切片，再按三件、三件、两件滚动迁移；每批准确区分已编码、自动通过、浏览器通过。
2. 每次接入一个实际展品，保留其原状态/几何/输入对照，补充统一宿主下的退出、恢复、音频和焦点测试。
3. 在相同设备与可重复动作下做重构前后视觉/性能对照；记录版本、场景、采样方法、空闲及活动资源，而不是根据 bundle 变小推断更快。
4. 全馆集成后再做桌面/手机、触控、键盘、屏幕阅读器、真实音频及浏览器前进/后退验收。
5. 独立评审最终提交和 CI，再决定合并与发布目标。当前未授权本轮生产部署。

`vercel.json` 明确 `framework: vite`、`npm ci`、`npm run build`、`outputDirectory: dist`；只禁用重构分支与原交付分支名的 Git 自动部署。这不是全局停用，也不保证合并 main 后不会触发部署，因此本轮不得合并或发布。保留现有访问权限，不新增授权。

## 7. 历史文档和许可证

`MIGRATION-HISTORY.md` 与 `PATH-ADAPTATIONS.json` 描述原完整静态源码包，旧命令/路由/分支事实需要按历史上下文阅读。当前工程以本文件、README、根 package scripts 和最终验证日志为准。

保留 `THIRD_PARTY_NOTICES.md` 与 `licenses/Colorfigures-LICENSE.txt`。重构和源码搬移不删除原版权/许可，也不把用户独立场景全部归入上游作者或擅自为全仓指定新许可证。

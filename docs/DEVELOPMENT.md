# 开发与验收指南

本文说明当前统一 Vite 工程。命令与约束以根 [`package.json`](../package.json)、[`vite.config.ts`](../vite.config.ts)、源码及 CI 为准；旧交付包的命令不能直接套用。历史记录见[文档索引](README.md)。

## 环境与命令

推荐 Node.js 24.x，与 CI 一致；`engines` 的允许范围不代表每个版本都已验收。首次执行 `npm ci` 安装锁定依赖。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | Vite 开发服务，默认 `127.0.0.1:4182`，端口冲突时报错 |
| `npm run lint` | 检查 `src` 与顶层 `tests/*.test.ts` |
| `npm run typecheck` | `tsc --noEmit`；包含 JS 导入边界，不等于所有 JS 内部已做类型检查 |
| `npm test` / `npm run test:watch` | 当前模块回归测试 / 监听模式 |
| `npm run build` | Vite 构建，然后校验发布包边界 |
| `npm run check` | 顺序执行 lint、typecheck、test、build |
| `npm run preview` | 预览已生成的 `dist`；地址以终端输出为准 |
| `npm run test:legacy` | 在临时副本执行保留源码的兼容基线 |
| `npm run test:legacy -- --list` | 列出旧基线入口 |

应用使用 hash 路由：`/#/` 是首页，`/#/generator` 等是展品。无需本地后端或应用密钥。

## 代码地图

```text
index.html → src/main.ts → src/app/app.ts
                           ├─ catalog.ts / home.js：馆藏与首页
                           ├─ 当前展品控制器 + 场景 ResourceScope
                           └─ 共享音频、观察、学习入口和展示外壳
```

| 路径 | 职责 |
| --- | --- |
| `src/app/` | 路由、控制器契约、资源作用域、局部 DOM、展品标题与展示适配 |
| `src/exhibits/<id>/` | 各展品的模型、几何绘图与交互适配 |
| `src/engines/` | 保留不同投影/渲染实现，不强行合并机械模型 |
| `src/shared/` | 音频、观察、学习入口、操作栏与物体舞台 |
| `src/styles/` | 共享视觉基础与响应式布局 |
| `public/previews/` | 十二件展品的 SVG 预览 |
| `tests/*.test.ts` | 直接导入当前模块的模型、绘图、交互、导航与生命周期测试 |
| `tests/fixtures/complete-source/` | 只读的原完整源码比较基线，不进入发布包 |
| `archive/` | 原来源清单、哈希清单与工具；路径语义属于历史交付包 |
| `docs/` | 维护说明、展品设计与分阶段验收记录 |

应用是 JavaScript ES modules 与 TypeScript 混合工程，非全量 TypeScript 改写。`allowJs: true`、`checkJs: false` 的实际边界见 [`tsconfig.json`](../tsconfig.json)。场景通过静态模块接入，不以 iframe、eval 或拼接旧脚本充当适配器。

## 修改时守住的边界

- **状态属于展品。** 模型、绘图、读数和操作必须一致，不用独立动画或预设答案冒充真实结果。教学活动应可选，不能代替用户操作。
- **资源有明确所有者。** [`SceneController`](../src/app/contracts.ts) 提供 `pause`、`resume`、`reset`、`dispose` 与可选只读 `snapshot`；[`ResourceScope`](../src/app/scope.ts) 管理事件、时钟和清理。旧场景不能残留 RAF、音频或异步回调。
- **暂停与离开不同。** 多个暂停原因不能互相解除；恢复不补算后台时间。关闭观察区保留机器进度，路由离开销毁实例，重新进入新建状态。整机重置和重置视角也不是同一件事。
- **声音主动开启。** 注意切换、隐藏、失焦和旧音频 promise 的隔离，不自动重新开启声音。
- **响应式不能重建机器状态。** 验证短屏、窄屏及来回跨布局边界时的状态、滚动和实际可见焦点，而非只断言 `activeElement` 没变。
- **保留出处。** 不删除第三方版权、历史来源或基线；不改生成的 `dist/`、不以修改旧 fixture 让当前测试变绿。

## 分层验收

1. **当前工程：** 对最终候选执行 `npm run check`，为受影响模型、交互与生命周期补充回归。`npm test` 使用 jsdom，不是真实浏览器。
2. **历史兼容：** 单独执行 `npm run test:legacy`；其结果不能证明当前适配器已通过。不要混用历史测试数字。
3. **真实浏览器：** 按改动范围检查直接操作与面板控制、运行、暂停/恢复、重置、离开/重入、前进/后退、重复点击及中断输入。布局改动覆盖桌面、窄屏、短屏和活动状态下的双向尺寸切换；机械改动比较默认、侧面、背面的遮挡与运动读数。
4. **记录证据：** 写明最终提交、命令结果、浏览器/视口、复现步骤与限制。桌面模拟手机不等于实机触控；自动测试不代表音效试听、屏幕阅读器或跨浏览器已验收。

[`scripts/verify-build.mjs`](../scripts/verify-build.mjs) 随构建检查入口、资源引用与十二张预览，仅允许入口、JS/CSS bundles 和预览进入 `dist`，并拒绝部分开发路径泄漏。这是发布边界检查，不是全功能、安全或视觉审计。

## CI 与发布

[CI](../.github/workflows/ci.yml) 在 PR 和 main push 时检出事件对应的精确提交，用 Node 24 分别运行当前工程检查与历史基线。仅有 `contents: read`，不持久保存检出凭据，也没有部署步骤。检查结果必须对应最终 head，不能把配置存在或旧提交通过当作本次通过。

生产目标为 [paper-mechanical-museum.vercel.app](https://paper-mechanical-museum.vercel.app/)。[`vercel.json`](../vercel.json) 配置 `npm ci`、`npm run build` 和输出目录 `dist`，仅对两个历史分支关闭 Git 自动部署，**并非关闭所有分支部署**。

本地验收、精确提交 CI、合并与生产部署是四个不同事实。维护者应先评审变更和最新基线，再按当前授权与仓库规则合并/发布；发布后核对生产提交并复查受影响流程。保持现有访问权限，不新增凭据、权限或费用承诺。

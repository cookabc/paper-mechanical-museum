# 纸上机械馆 · 统一工程（渐进迁移）

保留原来的纸感、手绘 SVG、配色与机械玩法，把十件展品逐步接入同一个可维护、可测试的应用。当前不是“十件全部迁移完成”：统一首页已列出十件藏品，**咖啡机、电风扇、拍立得相机、自动售货机与烤面包机**接入真实 ES module 适配器；其余五件明确显示待迁移，不嵌套旧网页，也不跳往另一个站点。

## 从哪里继续

权威仓库为 [cookabc/little-claw-arcade](https://github.com/cookabc/little-claw-arcade)。原完整源码基线是 `main` 的 [ae56905eaae8a83764589d65dc96d54d4e922c38](https://github.com/cookabc/little-claw-arcade/commit/ae56905eaae8a83764589d65dc96d54d4e922c38)，tree 为 `61de7f271760a4f831249ad941c2e4d5236c8de5`。完整源码已通过 PR #1 合入 main，原 `complete-museum-source` 分支已删除；“main 仍只有抓娃娃机”是旧说明，不再适用。

统一重构在 `refactor/unified-museum` 分支继续。首个两件切片已同步到远端提交 `5c9636c25bd8a4170710645a334f052e4875bffb`，本轮增量以该状态为基础，跟踪 [Issue #2](https://github.com/cookabc/little-claw-arcade/issues/2) 与草稿 PR #3。

本切片不合并 main、不部署生产，也不改变任何现有网站的访问权限。

## 本地运行

使用 **Node.js 22.13+（22.x）或 24.x** 和 npm；推荐 24.x，与 CI 一致。首次安装需要访问 npm registry；无需账号、应用密钥或后端。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:4182/ 。咖啡机为 `/#/coffee`，电风扇为 `/#/fan`，首页为 `/#/`。端口被占用可运行 `npm run dev -- --port 4183`。停止服务按 Ctrl+C。

```sh
npm run check      # lint → TypeScript 边界检查 → 当前切片测试 → Vite 构建
npm run build
npm run preview    # 以终端输出的地址检查构建产物
```

修改 `src/`，不要编辑 `dist/`。这里的 `dist/` 已改为 Vite 生成的发布产物，不再是旧项目里的手写源码目录。不能用旧的 `npm start` 或直接打开 `file://` 代替 Vite 开发/预览流程。

## 目录与边界

- `src/app/`：统一路由、控制器契约、资源作用域与局部 DOM 适配。
- `src/exhibits/`：真实场景模块，保留各自几何与运动模型。
- `src/engines/`、`src/shared/`、`src/styles/`：渲染适配、音频/观察服务及共享视觉基础。
- `public/previews/`：原十件预览素材。
- `tests/*.test.ts`：直接导入新模块的回归与生命周期测试。
- `tests/fixtures/complete-source/`：原“七件主馆 + 三件独立展品”的源码及历史 QA，仅供只读对照，不进入网站运行包。
- `archive/`：原来源清单、哈希清单与旧工具；路径语义属于原源码包，不是新构建命令。

TypeScript 先覆盖应用与生命周期边界，机械模型仍是可读 JavaScript ES modules；这不是全量 TypeScript 改写。没有 iframe、eval 或把旧脚本重新拼接执行的运行时桥接。

## 验证与后续

```sh
npm test                         # 当前已迁移模块
npm run test:legacy               # 独立旧源码基线，不代表新适配器通过
npm run test:legacy -- --list     # 查看旧基线入口
```

CI 对 PR head / push 的精确提交执行检查，只有 `contents: read`，没有部署步骤。CI 配置存在不等于远端已经通过；以该提交的实际检查结果为准。自动测试也不等于桌面/手机真实浏览器、屏幕阅读器、音效试听或性能验收。

后续依次接入其余五件，每件先保留状态/几何对照，再通过切换、暂停、重置、销毁和浏览器验收；全部迁移和独立验收后才讨论发布。不以“共用外壳”冒充机制统一，也不在测量前承诺性能提升。

详见 [统一架构](docs/UNIFIED-ARCHITECTURE.md) 与 [核心差异审计](docs/CORE-DIFFERENCES.md)。旧的 `docs/ARCHITECTURE.md`、`docs/TESTING.md`、`docs/DELIVERY-SCOPE.md` 记录原完整源码交付，里面的命令、分支状态与通过数字**不是当前工程的操作说明或新验收结果**。

## 发布与许可

`vercel.json` 的构建输出为 `dist`，只对 `refactor/unified-museum`（并保留旧分支名）关闭 Git 自动部署，不是全局关闭其他分支。这个分支级设置不会保证未来合并 main 也不部署，因此不得把合并或上线视为本次授权的一部分。

保留 [第三方来源与署名](THIRD_PARTY_NOTICES.md) 和 [上游 MIT 许可全文](licenses/Colorfigures-LICENSE.txt)。上游许可适用于对应原始代码及衍生部分，不代表所有独立场景与用户新增代码都署为上游作者，也不为整个仓库另行授予许可证。

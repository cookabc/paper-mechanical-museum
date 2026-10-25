# 纸上机械馆 · 统一工程

保留纸感、手绘 SVG、配色与机械玩法，共用一个应用入口、路由、资源生命周期、声音与观察服务；不嵌套旧网页，也不跳往另一个站点。

## 当前状态

权威仓库：[cookabc/paper-mechanical-museum](https://github.com/cookabc/paper-mechanical-museum)。生产网站：[纸上机械馆](https://paper-mechanical-museum.vercel.app/)。原十件统一版已通过 PR #3 合入 main，基线提交 `767198c7e722a33d3a605d7c4d8204c881b3f337`，tree `07b6f2cb1729a107a579db70a8c1dab21ea14258`。

第 12 件「手摇发电机」采用原创交流发电机示意与纯电阻教学模型，接入既有共享服务，详见[发电机设计与验收](docs/GENERATOR-EXHIBIT.md)。自行车设计说明见[传动与爬坡挑战](docs/BICYCLE-EXHIBIT.md)。分支合并与部署状态以 GitHub PR 和 Vercel 部署记录为准。

开发、验收、合并及部署分别记录；修改内容不改变现有网站访问权限。

## 本地运行

使用 **Node.js 22.13+（22.x）或 24.x** 和 npm；推荐 24.x，与 CI 一致。首次安装需要访问 npm registry；无需账号、应用密钥或后端。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:4182/ 。首页为 `/#/`，例如咖啡机 `/#/coffee`、电风扇 `/#/fan`、洗衣机 `/#/washer`、抓娃娃机 `/#/claw`；自行车为 `/#/bicycle`，新增发电机为 `/#/generator`；原十件路由见[最终切片验收](docs/FINAL-SLICE-VALIDATION.md)。端口被占用可运行 `npm run dev -- --port 4183`。停止服务按 Ctrl+C。

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
- `public/previews/`：十二件场景预览；自行车与发电机预览由各自原创绘图函数导出。
- `tests/*.test.ts`：直接导入新模块的回归与生命周期测试。
- `tests/fixtures/complete-source/`：原“七件主馆 + 三件独立展品”的源码及历史 QA，仅供只读对照，不进入网站运行包。
- `archive/`：原来源清单、哈希清单与旧工具；路径语义属于原源码包，不是新构建命令。

TypeScript 先覆盖应用与生命周期边界，原十件机械模型仍是可读 JavaScript ES modules，自行车模型及适配器为 TypeScript；这不是全量 TypeScript 改写。没有 iframe、eval 或把旧脚本重新拼接执行的运行时桥接。

## 验证与后续

```sh
npm test                         # 当前已迁移模块
npm run test:legacy               # 独立旧源码基线，不代表新适配器通过
npm run test:legacy -- --list     # 查看旧基线入口
```

CI 对 PR head / push 的精确提交执行检查，只有 `contents: read`，没有部署步骤。CI 配置存在不等于远端已经通过；以该提交的实际检查结果为准。自动测试也不等于桌面/手机真实浏览器、屏幕阅读器、音效试听或性能验收。

十件迁移分别保留状态/几何对照，逐批检查切换、暂停、重置、销毁及浏览器表现；合并与发布需要独立确认。不以“共用外壳”冒充机制统一，也不在测量前承诺性能提升。

原理观察区的退出/重入保留当前机器进度；离开展品路由则销毁该实例，重新进入会新建初始状态，不是跨展品进度持久化。

详见 [最终切片验收](docs/FINAL-SLICE-VALIDATION.md)、[统一架构](docs/UNIFIED-ARCHITECTURE.md) 与 [核心差异审计](docs/CORE-DIFFERENCES.md)。旧的 `docs/ARCHITECTURE.md`、`docs/TESTING.md`、`docs/DELIVERY-SCOPE.md` 记录原完整源码交付，里面的命令、分支状态与通过数字**不是当前工程的操作说明或新验收结果**。

## 发布与许可

`vercel.json` 的构建输出为 `dist`，只对 `refactor/unified-museum`（并保留旧分支名）关闭 Git 自动部署，不是全局关闭其他分支。这个分支级设置不会保证未来合并 main 也不部署，因此不得把合并或上线视为本次授权的一部分。

保留 [第三方来源与署名](THIRD_PARTY_NOTICES.md) 和 [上游 MIT 许可全文](licenses/Colorfigures-LICENSE.txt)。上游许可适用于对应原始代码及衍生部分，不代表所有独立场景与用户新增代码都署为上游作者，也不为整个仓库另行授予许可证。

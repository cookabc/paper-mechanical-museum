# 纸上机械馆 · Paper Mechanical Museum

十二件可以亲手操作的日常小机器。转动、按下、换挡，看看运动如何传递、声音如何发生——用纸张纹理、手绘线条与立体 SVG，把机械原理放到一张工作台上。

**[进入机械馆 →](https://paper-mechanical-museum.vercel.app/)** · [开发指南](docs/DEVELOPMENT.md) · [文档索引与历史记录](docs/README.md) · [来源与署名](THIRD_PARTY_NOTICES.md)

界面默认英文，页头可一键切回中文。外壳部分（首页、展品页头、操作区、音效与观察面板）
已全部双语；每件展品模型内部的标签目前仍是中文，正逐件翻译。无需登录，打开网站即可体验。自由操作是默认入口；「动手学」与原理观察是可选的探索方式，不替你操作机器。声音需主动开启。这里是交互教学模型，不是制造图纸或真实设备性能模拟。

## 项目截图

### 从一张工作台，走进十二件日常小机器

![纸上机械馆首页：纸张纹理、手绘标题与咖啡机立体预览](docs/screenshots/museum-home.jpg)

### 亲手操作，看见机械原理

![手摇发电机工作台：立体线圈与磁极、摇柄、灯泡，以及转速和电压功率读数](docs/screenshots/generator-workbench.jpg)

以上为 2026-10-29 正式站（英文默认界面）的真实浏览器截图。发电机画面通过「开始摇动」操作进入正向 60 rpm、电路接通状态；不是概念图或合成图。它也如实反映了翻译进度：外围外壳已是英文，而这台机器自己面板里的标签仍是中文。静态图片只展示一次状态，完整交互请进入机械馆体验。[截图来源与更新说明](docs/screenshots/README.md)。

## 馆藏

| 展品 | 试着做什么 |
| --- | --- |
| [洗衣机](https://paper-mechanical-museum.vercel.app/#/washer) | 装衣、加料，观察滚筒与水流 |
| [电风扇](https://paper-mechanical-museum.vercel.app/#/fan) | 开机、换挡，让风扇摇头 |
| [抓娃娃机](https://paper-mechanical-museum.vercel.app/#/claw) | 瞄准、下爪，领取小伙伴 |
| [咖啡机](https://paper-mechanical-museum.vercel.app/#/coffee) | 研磨、萃取，加一点奶泡 |
| [手摇八音盒](https://paper-mechanical-museum.vercel.app/#/musicbox) | 转动手柄，观察凸针与音梳 |
| [自动售货机](https://paper-mechanical-museum.vercel.app/#/vending) | 投币、选择，等待商品掉落 |
| [烤面包机](https://paper-mechanical-museum.vercel.app/#/toaster) | 放面包、调火候、压下拉杆 |
| [唱片机](https://paper-mechanical-museum.vercel.app/#/turntable) | 放下唱臂，听唱片转起来 |
| [拍立得相机](https://paper-mechanical-museum.vercel.app/#/camera) | 按下快门，等待照片显影 |
| [电梯](https://paper-mechanical-museum.vercel.app/#/elevator) | 选楼层，观察轿厢、配重与门锁 |
| [自行车变速器](https://paper-mechanical-museum.vercel.app/#/bicycle) | 踩踏、换挡，比较爬坡表现 |
| [手摇发电机](https://paper-mechanical-museum.vercel.app/#/generator) | 摇动、反转、断开负载，观察电压与电流 |

馆藏顺序与名称来自 [`src/app/catalog.ts`](src/app/catalog.ts)。所有展品都在同一个应用中运行，不嵌套旧网页。退出原理观察不会离开展品；切换展品路由则销毁当前实例，再次进入从初始状态开始，不保存跨展品进度。

## 本地运行

推荐 **Node.js 24.x + npm**，与 CI 保持一致；完整版本范围见 [`package.json`](package.json) 的 `engines`。安装依赖需要访问 npm registry；运行应用不需要账号、应用密钥或后端。

```sh
npm ci
npm run dev
```

打开 **http://127.0.0.1:4182/**。端口已占用时用 `npm run dev -- --port 4183`；停止服务按 Ctrl+C。

```sh
npm run check       # lint → typecheck → 当前模块测试 → 构建及发布边界检查
npm run test:legacy # 独立的历史源码兼容基线，不替代当前模块验收
npm run preview     # 先构建，再按终端地址预览 dist
```

修改 `src/`，不要编辑生成的 `dist/`，也不要把 `tests/fixtures/` 或 `archive/` 当作当前运行源码。不能用旧的 `npm start` 或 `file://` 打开方式代替 Vite。

## 开发与维护

每份文档以英文为主，中文版并列放在旁边。

| 英文 | 中文 | 内容 |
| --- | --- | --- |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | [docs/DEVELOPMENT.zh-CN.md](docs/DEVELOPMENT.zh-CN.md) | 目录、生命周期、测试、浏览器验收、发布边界 |
| [docs/README.md](docs/README.md) | [docs/README.zh-CN.md](docs/README.zh-CN.md) | 文档索引：现行说明、设计记录与历史证据的分界 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md) | 问题报告与小范围 PR 的提交方式 |
| [docs/screenshots/README.md](docs/screenshots/README.md) | [docs/screenshots/README.zh-CN.md](docs/screenshots/README.zh-CN.md) | 截图来源与更新方式 |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | [THIRD_PARTY_NOTICES.zh-CN.md](THIRD_PARTY_NOTICES.zh-CN.md) | 上游作者、许可及其不覆盖的范围 |

- 报告问题请提供展品链接、复现步骤、预期/实际行为、浏览器及屏幕大小；视觉问题附截图，避免包含个人信息。
- 变更以小而可验证的 PR 提交；保留各展品的机械逻辑、画风、署名与许可证。自动检查通过不等于已完成浏览器验收或已发布。

## 来源与许可

本仓库代码以 [MIT 许可](LICENSE) 发布，版权归 cookabc（2026）。

仓库同时包含按自身 MIT 条款保留的上游成果：等距 SVG 核心与洗衣机源自 April Zhu 的 Colorfigures，而后者建立于 ISO-GLOW（April Zhu）与 iso-figure（Tolga Cohce）之上。这些声明全文保存在 [licenses/Colorfigures-LICENSE.txt](licenses/Colorfigures-LICENSE.txt)，摘要见[第三方来源与署名](THIRD_PARTY_NOTICES.zh-CN.md)，必须与对应代码一同保留。仓库许可不改变上游成果的署名归属，也不对声明中列出的第三方素材重新授权。

English readme: [README.md](README.md).

# 小小抓物社 · Little Claw Arcade

纸上机械馆的独立抓娃娃机：纸感配色、手绘 SVG 立体模型、可直接操作的抓取流程，以及可选的原理观察。默认自由玩、声音默认关闭。

## 运行

这是纯静态 HTML / CSS / JavaScript 项目，没有后端、环境变量、数据库或运行时 npm 依赖。`dist/` 同时是可读源码和部署产物，不需要构建转换。

```sh
python3 -m http.server 4180 --directory dist
```

打开 `http://localhost:4180`。也可使用任意静态文件服务器。

## 操作

- 点击目标玩偶或使用摇杆移动，按下抓取按钮开始。
- 键盘方向键移动，空格抓取；画面中的帮助说明各控件。
- 成功出货后领取；原理观察按原速跟随，退出观察保留当前动作，不设手动暂停或慢速关卡。
- 音效只在主动开启后播放，切入后台会暂停。

## 检查

需要 Node.js 20 或更新版本，无需 `npm install`：

```sh
npm test
```

测试直接读取本仓库的产品函数，覆盖输入去重、抓取/领取守恒、时间分区与边界。测试范围和限制见 [qa/README.md](qa/README.md)。浏览器实际画面、声音和移动端体验不能由这些 Node 检查替代。

## Vercel

导入本仓库，Framework Preset 选 **Other**，Root Directory 为仓库根目录，Output Directory 为 `dist`。仓库内 `vercel.json` 配置校验命令和静态输出；不需要服务器、数据库、环境变量或付费附加资源。GitHub 仓库可保持私有，网站公开访问由 Vercel 项目访问设置控制。

部署前运行 `npm test`，部署后检查默认自由玩、完整抓取/领取、后台暂停与恢复、观察退出重入、键盘操作和 390px 窄屏。不要把一次构建成功当作交互验收完成。

## 来源与迁移范围

五个产品文件从已验收源提交 `0ff1eacfb4f44f1fa268c685982d9e570c7d6c2d` 原样导出，未改变机型、几何、布局、玩法或绘制路径。另补上游许可证文件和可独立运行的回归测试；没有复制原托管项目身份、凭据、私有日志、截图、部署归档或 Git 历史。

原有“返回纸上机械馆”链接仍指向机械馆，不涉及其他展品迁移。保留时间步长上限和后台暂停策略；时间一致性测试比较的是相同模拟时长，不承诺任意卡顿下与墙钟等速。

## 署名与许可

渲染基础来自 April Zhu 的 Colorfigures，继承其 MIT 版权声明及对 ISO-GLOW、Tolga Cohce 的 iso-figure 的署名。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 [上游许可全文](licenses/Colorfigures-LICENSE.txt)。

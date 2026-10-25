# 纸上机械馆 · 十件展品完整源码

此分支交付的是**完整机械馆**，不是只有抓娃娃机的空壳。包含首页、七件馆内展品，以及洗衣机、风扇、抓娃娃机三个独立页面的全部可读 HTML、CSS、JavaScript、SVG 素材、程序音效与回归测试。

保持原有纸感、手绘线条、配色、几何、玩法和默认自由玩。没有后端、账号、数据库、环境变量或在线 CDN 依赖。`dist/` 就是可编辑源码，不是压缩后的不可维护产物，无构建转换。

## 一条命令启动全部十件

安装 Node.js 20 或更新版本后，在仓库根目录执行：

```sh
npm start
```

打开 **http://127.0.0.1:4180/**。不需要先安装依赖。端口被占用时可用 `PORT=4181 npm start`（Windows PowerShell: `$env:PORT=4181; npm start`）。按 Ctrl+C 停止。

也可以在根目录运行 `python3 -m http.server 4180`。不要只发布某个 `dist/`，不要双击 `file://` 页面；整个目录的相对路径组成完整展馆。

## 十件都在本地

| 展品 | 本地路由 |
| --- | --- |
| 首页 | `/`（转到 `/object-collection/dist/`） |
| 咖啡机 | `/object-collection/dist/#coffee` |
| 手摇八音盒 | `/object-collection/dist/#musicbox` |
| 售货机 | `/object-collection/dist/#vending` |
| 烤面包机 | `/object-collection/dist/#toaster` |
| 唱片机 | `/object-collection/dist/#turntable` |
| 拍立得 | `/object-collection/dist/#camera` |
| 电梯 | `/object-collection/dist/#elevator` |
| 洗衣机 | `/washer-study/dist/` |
| 风扇 | `/fan-study/dist/` |
| 抓娃娃机 | `/claw-studio/dist/` |

首页三件独立展品的按钮和各页面“返回小物馆”均使用相对本地地址。作者署名链接仍指向上游公开页面，它不是运行依赖。

## 目录与开发

- `object-collection/dist/`：首页、共用等距 SVG 核心、观察/声音模块、七个 `scenes/*.js` 和十张预览。
- `washer-study/dist/`：洗衣机。原页面把核心和状态机放在 `index.html` 内；这是实际源码，不存在缺失的隐藏源目录。
- `fan-study/dist/`：独立 `engine.js`、`fan.js`、手绘纹理及样式。
- `claw-studio/dist/`：内联核心页面、`app.js` 状态机、观察与声音模块。
- 每个子目录的 `qa/`：生产函数回归、时间一致性、输入、原理观察与动态几何检查。
- `scripts/`：零依赖服务器、静态资源和路径校验、测试入口。
- `docs/`：架构、交付范围与最小路径适配说明。
- `licenses/`：实际使用的上游 MIT 许可全文。
- `SOURCE-PROVENANCE.json` 与 `FILE-MANIFEST.json`：来源提交、原始字节与交付文件哈希。

在各自 `dist/` 修改即可刷新看到结果。不要把几个目录中同名 `mechanical-audio.js` 或 `observation.js` 直接合并覆盖，它们来自不同已验收版本。缓存查询串只为更新资源；改动文件后需同步 `index.html` 中对应的 12 位 SHA-256 前缀。

## 检查

```sh
npm run verify   # 十件路由、43份运行资源、缓存签名与本地导航
npm test         # 无第三方依赖的生产逻辑回归
```

扩展测试的依赖、命令、历史基线与边界见 `docs/TESTING.md`。自动检查不等同于所有视角视觉穷尽或音效试听；请保留真实浏览器的完整操作检查。

## 分支与上线边界

这是 `complete-museum-source` 源码交付分支。现有 `main` 仍是已经上线的独立抓娃娃机；本交付不改 main，不自动合并草稿 PR，也不更新任何生产站。

根 `vercel.json` **仅禁止 `complete-museum-source` 分支的自动部署**，不会全局停掉其他分支。若以后要把完整馆另行部署，应先确定静态输出根、导航与对应发布目标；不要不经审查直接把此分支合并到抓娃娃机生产 main。

## 署名与许可

详细来源见 `THIRD_PARTY_NOTICES.md`。上游 MIT 许可覆盖其原始代码与相应衍生部分，不应据此把全部独立场景和用户新增代码都署成上游作者。此交付不为用户原创部分擅自授予额外开源许可证。

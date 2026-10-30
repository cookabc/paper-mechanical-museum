# 第三方来源、署名与许可

本项目保留原产品中的作者署名，不将整个机械馆统一署为某个上游作者。

## Colorfigures / ISO-GLOW / iso-figure

原等距 SVG 核心与洗衣机来源于 April Zhu 的 Colorfigures，核心注释也说明其对 ISO-GLOW 与 Tolga Cohce 的 iso-figure 的继承。主馆和抓物机复用并扩展了该基础。风扇独立 Paper3D 实现及后来新增场景/交互不因此全部归属上游作者。

官方来源：https://april-zhu.com/colorfigures
官方源码包：https://april-zhu.com/colorfigures/colorfigures.zip

`licenses/Colorfigures-LICENSE.txt` 是从官方包 `colorfigures/LICENSE` 保留的完整 MIT 文本，包括三条原始版权声明；SHA-256：`bc54cadb579906c051d7aad84f41f88c0df6c50089e052134226fe0b76fd5280`。

其许可应随对应原始代码及衍生部分一起保留。用户新增的场景、导航、机制观察与测试属于原创成果，按仓库的 [MIT 许可](LICENSE) 发布；该许可不替代上游声明，也不把原创成果归到上游作者名下。

## 测试工具

可选 npm 开发依赖仅用于自动化 DOM/图像测试，不参与网站运行；依赖自身许可证由对应 npm 包保留。Python 图像辅助工具可能需要 Pillow、NumPy 或 Inkscape，详见测试文档。

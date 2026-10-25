# 统一工程首个纵向切片

来源：GitHub `cookabc/little-claw-arcade` main `ae56905eaae8a83764589d65dc96d54d4e922c38`，与已核对完整源 tree `61de7f271760a4f831249ad941c2e4d5236c8de5` 一致。跟踪 [issue #2](https://github.com/cookabc/little-claw-arcade/issues/2)。

## 已验证
- `npm run check`：ESLint、TypeScript、27 项当前测试、Vite 构建通过。
- 其中 25 项是独立真实生命周期/共享服务/路由测试；2 项差分分别运行咖啡全杯机械状态与多视角 SVG、风扇 7 组原源对照。测试的时钟、DOM 布局和音频硬件为 double，机械与绘图函数为真实模块。
- 保留源 `npm run test:legacy`：20 套通过，57.6 秒。不是其余八件已迁移的证据。
- 云端 Chromium 实际操作：咖啡装豆、研磨、锁柄、放杯、标准杯萃取、加奶、领取至 1 杯、复位保留计数。分步半杯参数、研磨中暂停后 frames 368 → 368，退出分步和同域返回首页。
- 同一浏览器实际由首页进入风扇，默认静音、直接开机、换三档、开启摇头，保持原手绘 SVG 外观。
- 构建输出 13 个文件，仅 HTML、打包 JS/CSS 和 10 张展品预览图，无 QA、源码、许可证以外私有数据或 Git 历史。禁止把源码根作为托管输出。

## 本轮实际找到并修复的边界
- 卸载中单个 cleanup 抛错，其他资源仍须完成清理。
- Document listener 的 type/capture/去重及普通函数 this 绑定。
- 暂停释放按键和 click 防重复状态；复位清掉旧提示及计时器。
- 旧观察卡不复活/抢焦点；待决 AudioContext resume 不跨场景；旧音效节点及保留回调不可操纵新场景。
- 原生 Chromium 特有 Document 代理 setter Illegal invocation：代理写入明确绑定真实 Document。已修后重载，完整咖啡流程通过。

## 尚未完成
- 当前真正接入统一 app 的是咖啡机、电风扇，8 件尚为已保留基线而非新运行时 adapter；入口清楚提示接入中，不跳外站。
- 390 窄屏与最终音效节点修正后的浏览器重复切换正在复验；此项将在下一次验证记录补齐。
- 尚未运行 GitHub CI、尚未推送此本地提交、没有预览部署或生产发布。没有宣称所有角度/帧率/真实硬件音效都穷尽验证。

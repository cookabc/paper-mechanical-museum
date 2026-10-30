# 文档索引

**想体验？** 回到[项目首页与十二件馆藏](../README.md)。

**想开发？** 从[开发与验收指南](DEVELOPMENT.zh-CN.md)开始。当前目录、命令和生命周期以这份指南及实际源码为准；下面的设计和验收记录保留各自的时间、基线与范围，不是持续更新的生产状态页。

每份文档以英文为主，中文版见括号内链接。

## 展品设计与专题记录

- [自行车变速器](BICYCLE-EXHIBIT.zh-CN.md)（[English](BICYCLE-EXHIBIT.md)）：传动模型、爬坡实验；初版与后续内容分节标注。
- [手摇发电机](GENERATOR-EXHIBIT.zh-CN.md)（[English](GENERATOR-EXHIBIT.md)）：理想交流模型、参数与适用限制。
- [发电机动手学](GENERATOR-LEARNING.zh-CN.md)（[English](GENERATOR-LEARNING.md)）：预测、真实操作、解释与再验证的证据门。
- [自行车 / 发电机立体重建](QUALITY-REBUILD.zh-CN.md)（[English](QUALITY-REBUILD.md)）：结构、几何、遮挡与当时的验收记录。

这些文档中的「候选」「未发布」与测试数字描述记录当时的状态，不应据此判断最新 main 或生产部署。

## 历史架构与迁移证据

以下内容保留供追溯；其中旧仓库名、分支名、路径、命令、授权及验收数字只适用于对应历史阶段。

- [迁移历史](MIGRATION-HISTORY.zh-CN.md)（[English](MIGRATION-HISTORY.md)）：四套入口合并为统一应用的分批验收（2 → 5 → 8 → 10 件），以及统一工程之前的静态源码交付包形态。
- [统一架构](UNIFIED-ARCHITECTURE.zh-CN.md)（[English](UNIFIED-ARCHITECTURE.md)）：统一应用的设计、生命周期契约与 CI 边界。
- [核心差异审计](CORE-DIFFERENCES.md)：四套原实现的模型、几何、控制、时间与生命周期差异（英文撰写）。
- [路径适配清单](PATH-ADAPTATIONS.json)：原源码搬移记录。

`archive/` 的来源/哈希清单与 `tests/fixtures/complete-source/` 的旧源码也是历史证据，不是当前构建产物。最新代码状态看 GitHub 提交与 PR；部署状态看对应 Vercel 记录及实际网站，不能从一份旧验收文档推断。

## 来源与许可

本仓库以 [MIT 许可](../LICENSE) 发布。同时包含按自身 MIT 条款保留的上游成果——[第三方来源与署名](../THIRD_PARTY_NOTICES.zh-CN.md)（[English](../THIRD_PARTY_NOTICES.md)） · [上游许可全文](../licenses/Colorfigures-LICENSE.txt)。保留对应代码的版权与许可；仓库许可不对上游成果重新授权。

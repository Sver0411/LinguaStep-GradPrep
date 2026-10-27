# 文档目录

[返回项目首页](../README.md) · [English overview](../README.en.md)

## 使用应用

| 文档 | 适合什么时候阅读 |
| --- | --- |
| [使用指南](user-guide.md) | 了解词卡揭示、五词练习、例句朗读、每日计划和备份 |
| [内容与来源](content.md) | 确认词库、题库范围，理解来源标注与内容边界 |
| [词汇来源与更新](vocabulary-sources.md) | 查阅词汇生成、教材对齐、数据署名及更新流程 |
| [版本记录](changelog.md) · [English history](changelog.en.md) | 查看各版变化；旧版本描述按发布时状态保留 |
| [后续方向](roadmap.md) | 查看已完成能力与尚未承诺的方向 |

## 开发与部署

| 文档 | 主要内容 |
| --- | --- |
| [开发指南](development.md) | 本地启动、目录分层、测试和构建命令 |
| [部署指南](deployment.md) | Next.js、Docker、子路径部署与语音运行要求 |
| [架构](architecture.md) | 组件、Context、领域逻辑和仓储的依赖关系 |
| [复习算法](spaced-repetition.md) | 客观词汇 FSRS-6、旧自评调度及兼容策略 |
| [每日计划](daily-plan.md) | 计划结构、任务排序及完成进度 |
| [本地存储](storage.md) | IndexedDB、仓储与降级机制 |
| [数据迁移](data-migration.md) | 早期数据库与结构兼容说明 |

## AI 后端兼容维护

AI 前端入口目前暂停。下列文档保留后端设计、历史接口和维护方法，不表示这些功能已在当前界面开放。启用前应核对当前实现与配置。

- [DeepSeek 接入](deepseek-integration.md)
- [安全与密钥处理](ai-security.md)
- [Prompt 管理](ai-prompts.md)
- [内容校验](ai-content-validation.md)
- [AI 测试](ai-testing.md)
- [AI 部署](ai-deployment.md)

[使用体验审查及后续修复记录](../review/使用体验审查-2026-10-23.md)保留了本轮功能调整的背景。

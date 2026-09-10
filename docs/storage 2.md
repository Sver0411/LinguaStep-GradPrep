# 本地存储

## IndexedDB v3

数据库名：`lingua-step-learning`；版本常量：`3`。

| Store | 主键 | 用途 / 主要索引 |
| --- | --- | --- |
| `wordProgress` | `wordId` | 三模式复习；`nextReviewAt`、`lastStudiedAt`、`learningStatus` |
| `grammarProgress` | `grammarId` | 语法复习；`nextReviewAt`、`lastStudiedAt`、`status` |
| `mistakes` | `id` | 错题生命周期；`lastWrongAt`、`errorCount`、`state` |
| `favorites` | `contentId` | 带类型前缀的收藏 ID |
| `testResults` | `id` | 测试答案与用时；`completedAt` |
| `dailyRecords` | `date` | 每日学习计数；`date` |
| `dailyPlans` | `date` | 每日计划；`generatedAt` |
| `aiWords` | `id` | AI 词卡；`aiMetadata.generationId` |
| `aiGrammar` | `id` | AI 语法；`aiMetadata.generationId` |
| `aiComparisons` | `id` | AI 日英对比；`aiMetadata.generationId` |
| `aiGenerations` | `id` | 参数、模型、状态、校验、保存引用；时间/类型/状态索引 |
| `aiUsage` | `id` | 耗时、重试、token、错误；完成时间/请求 ID 索引 |
| `aiExplanations` | `id` | 当前错题解释缓存；`cacheKey` |
| `aiCollections` | `id` | 用户保存的 AI 练习集；`createdAt` |
| `aiContentReports` | `id` | 用户纠错反馈；`contentId` |

AI 内容保存 `AIContentMetadata`：provider、model、Prompt 名称/版本、generationId、时间、校验状态和内容哈希。人工精选内容继续使用既有 `source: "curated"`，不会被 AI 自动覆盖。

## 浏览器设置与密钥

| 存储 | 键 | 内容 |
| --- | --- | --- |
| localStorage | `lingua-step:settings` | 学习与显示设置 |
| localStorage | `lingua-step:ai-settings` | 非敏感 AI 开关、默认参数和密钥保存偏好 |
| sessionStorage / localStorage | `lingua-step:deepseek-api-key` | 用户明确输入的 BYOK |
| sessionStorage / localStorage | `lingua-step:ai-proxy-token` | 个人代理访问令牌 |

密钥与 AI 设置使用不同键；设置规范化器没有密钥字段。默认写入 sessionStorage；只有用户明确选择“保存在此设备”才写 localStorage。密钥不会进入 IndexedDB、快照、导出、URL、请求正文或 UI 历史。

## 一致性

LearningContext 通过完整快照边界保存 15 个 store。Web Locks 可用时，写入前读取最新快照并按键合并当前标签页变化；BroadcastChannel 通知其他标签页。IndexedDB 不可用时切换到内存仓库，不删除旧库。

## 删除规则

- 重置学习进度保留 AI 内容、历史、解释和密钥。
- 清 AI 历史删除 generation/usage，保留业务内容。
- 清解释缓存只删除解释。
- 删除 AI 内容会清理相关进度、收藏、错题、练习集和反馈。
- 重置 AI 设置与密钥必须二次确认。
- 重置全部数据清空 15 个 store、学习设置、AI 设置和两类浏览器密钥。

所有危险操作均在 UI 二次确认；Repository 和 Context 测试覆盖独立范围。

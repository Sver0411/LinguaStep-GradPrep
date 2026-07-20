# 本地存储

## 数据库

数据库名：`lingua-step-learning`；当前版本：`2`。

| Object Store | 主键 | 主要内容 | 索引 |
| --- | --- | --- | --- |
| `wordProgress` | `wordId` | 三模式 ReviewState 与聚合状态 | `nextReviewAt`、`lastStudiedAt`、`learningStatus` |
| `grammarProgress` | `grammarId` | 练习统计与 ReviewState | `nextReviewAt`、`lastStudiedAt`、`status` |
| `mistakes` | `id` | 原题、生命周期、优先级、收藏和历史 | `lastWrongAt`、`errorCount`、`state` |
| `favorites` | `contentId` | `word:`、`grammar:`、`comparison:` 前缀 ID | 无 |
| `testResults` | `id` | 模式、来源、答案、得分和用时 | `completedAt` |
| `dailyRecords` | `date` | 各语言学习数、复习数、答题和正确数 | `date` |
| `dailyPlans` | `date` | 当日新词、复习、逾期、错题、语法和测试目标 | `generatedAt` |

当前搜索和图表规模很小，内容属性来自打包的静态数据，因此在内存中聚合和筛选；索引用于保留未来按日期与状态增量查询的路径。

## 设置

localStorage 键 `lingua-step:settings` 只保存 AppSettings：主题、密度、揭示模式、计划数量、周末策略、测试反馈和可访问性选项。读取时逐字段校验；缺失、越界或未知枚举回到默认值。

## 一致性与多标签页

- 一次用户操作先生成完整新快照，再在一个 IndexedDB 读写事务中保存七个 store。
- 支持 Web Locks 时，写入前读取最新快照，只合并当前标签页真正改变的键和每日计数增量。
- 保存成功后通过 BroadcastChannel 发布快照，其他标签页即时更新。
- IndexedDB 无法打开或事务失败时降级到 MemoryLearningRepository；内存数据在刷新后不会保留。

## 重置范围

- 学习进度：清除单词、语法、测试、每日记录和每日计划；保留错题、收藏和设置。
- 测试记录：只清除测试结果。
- 错题记录：清除全部错题生命周期和历史。
- 收藏：取消全部单词、语法和对比收藏。
- 全部数据：清除七个 store，并把设置恢复默认。

界面会在实际删除前要求再次勾选确认。Repository 的每种范围都有独立测试。

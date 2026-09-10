# IndexedDB v1/v2 → v3 迁移

## 原则

- 原地升级，不清库、不改变旧内容 ID。
- `onupgradeneeded` 的单一事务创建缺失 store/索引并迁移旧记录；失败由浏览器回滚。
- 迁移函数接受部分损坏、v1、v2 和已迁移数据，重复执行保持幂等。
- 读取快照时再次规范化；旧数据没有 AI 数组或元数据时补安全空值。
- 迁移错误不打印学习正文，也不自动删除数据库。

## v1 → v2 保留规则

- 单词旧进度映射到 `modes.combined`，不伪造单语言轨迹。
- 语法补 ReviewState；错题补 contentRef、状态和历史；测试补来源、开始时间和用时。
- 每日记录补新学/复习、语言模式和日英语法计数。
- 新增 `dailyPlans`。

## v2 → v3

新增八个 AI store：`aiWords`、`aiGrammar`、`aiComparisons`、`aiGenerations`、`aiUsage`、`aiExplanations`、`aiCollections`、`aiContentReports`。

第二阶段七个 store 不改名、不清空。没有 AI 数据的旧快照得到空数组；人工精选内容保持既有 `source: "curated"`。AI 业务内容只有通过第三阶段服务生成时才带 `aiMetadata`。

## 失败与降级

数据库打开、升级或写入失败时抛出 `IndexedDbUnavailableError`。应用切换到本次会话内存仓库并显示提示，原数据库保留，用户关闭占用数据库的其他标签页后可刷新重试。

## 测试

- 纯迁移：旧记录映射、部分字段默认值、完整快照幂等。
- fake-indexeddb v1 → v3：核对词汇、语法、错题、收藏、测试和每日记录。
- fake-indexeddb v2 → v3：核对第二阶段七类数据逐项完全保留，同时新增 AI store 为空。
- v3 快照：15 个 store 往返保存；独立重置范围不越界。

任何迁移测试都不使用真实 DeepSeek，也不需要清除用户数据库。

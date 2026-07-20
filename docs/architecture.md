# 架构说明

## 目标与边界

第一阶段优先保证真实学习闭环、浏览器本地持久化和低维护成本。应用无登录、无服务端业务数据、无在线 AI 调用；所有内置学习内容随构建产物发布，因此断网后仍可学习和测试。

## 分层

```text
页面视图 components/views
        ↓
状态编排 context/LearningContext
        ↓
领域纯函数 lib/learning
        ↓
仓库接口 lib/repositories/types
     ↙             ↘
IndexedDB          Memory fallback

设置 → LocalStorageSettingsRepository
AI   → AiService → MockAiService（第一阶段）
```

- **视图层**只处理展示、键盘和点击交互。
- **Context**组合一次学习产生的单词进度、每日记录、错题和测试结果，并原子保存快照。
- **领域层**是无 UI 依赖的纯函数，负责掌握度、基础复习字段、判题、错题进出与连续天数。
- **仓库层**定义统一接口。未来云端同步通过新增实现替换，不需要改页面组件。

## 路由

| 路径 | 页面 |
| --- | --- |
| `/` | 今日首页 |
| `/words` | 单词学习与词库 |
| `/grammar` | 语法讲解与练习 |
| `/test` | 日英混合测试 |
| `/mistakes` | 错题本 |
| `/favorites` | 收藏 |
| `/stats` | 学习统计 |
| `/settings` | 设置 |

路由由 App Router 捕获，应用壳根据当前路径渲染对应视图。桌面端侧栏和手机端底栏使用真实链接，可刷新、收藏或直接访问。

## 本地存储

IndexedDB 数据库名为 `lingua-step-learning`，目前版本为 1。

| Object Store | 主键 | 内容 |
| --- | --- | --- |
| `wordProgress` | `wordId` | 掌握度、次数、最近时间、未来复习字段 |
| `grammarProgress` | `grammarId` | 学习与练习统计、未来复习字段 |
| `mistakes` | `id` | 原题、错误次数、连续答对、优先级与历史状态 |
| `favorites` | `contentId` | `word:` / `grammar:` 前缀的收藏 ID |
| `testResults` | `id` | 完整答案、得分和完成时间 |
| `dailyRecords` | `date` | 每日单词、语法、答题和正确数 |

`LearningRepository` 同时提供完整快照与细粒度写入接口。当前状态编排使用快照事务，保证一次操作关联的多个数据族不会部分更新。数据库打开或事务失败时，应用切换到 `MemoryLearningRepository` 并显示降级提示。

localStorage 仅保存 `AppSettings`，键为 `lingua-step:settings`。读取时会校验枚举和正整数，损坏数据自动回到默认值。

## 学习与复习逻辑

- “认识”进入已掌握状态并按基础间隔延后复习；“模糊”次日复习；“不认识”进入短时复习并增加 lapse。
- `ReviewSchedule` 已包含 `dueAt`、`intervalDays`、`easeFactor`、`repetitions`、`lapses`，第二阶段可在不改数据形状的前提下迁移到正式算法。
- 错题再次答错会增加错误次数和优先级；答对会增加连续次数；达到 3 次后 `active=false`，历史仍保留。
- 测试问题主体只来自已有单词或语法进度。单词干扰项可来自内置词库，但不会把未学词作为考查主体。
- 连续学习天数允许从今天或昨天起算，避免当天尚未开始学习时过早清零。

## 可访问性与响应式

- 全站使用语义按钮、链接、表单标签、焦点轮廓和状态文本。
- 单词卡支持 Space、1/2/3、左右方向键；专注模式支持 Esc。
- 桌面端使用侧栏；小屏使用固定底部主导航和“更多”面板。
- 主题支持浅色、深色和系统偏好，并尊重 `prefers-reduced-motion`。

## 扩展点

- 新建 `CloudLearningRepository` 可接入账号、数据库和多设备同步。
- `ReviewSchedule` 可由 FSRS/SM-2 服务计算，而 UI 保持不变。
- `AiService` 可替换为后端代理或本地个人测试实现。
- 内容数组可改为静态分包、CMS 或数据库加载；`WordPair` 与 `GrammarPoint` 模型保持统一。

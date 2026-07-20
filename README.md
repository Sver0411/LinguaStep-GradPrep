# LinguaStep（日英阶梯）

> 日语与英语，一起稳步进阶

LinguaStep 是一个中文界面的个人日语与英语学习网页应用。第二阶段已经形成“每日计划 → 三模式学习 → 到期复习 → 测试 → 错题巩固 → 统计反馈”的完整本地闭环。应用无需登录，不调用在线 AI；学习数据保存在当前浏览器。

## 第二阶段能力

- 每日计划：按本地日期每天生成一次，组合新词、到期复习、逾期项、错题、语法和测试目标；支持周末强度、错题优先、昨日未完成任务接续和手动重算。
- 间隔重复：可解释的 SM-2 衍生算法；“认识”从 4 天起逐步延长，“模糊”次日复习，“不认识”约 10 分钟后重试；逾期成功复习获得有限奖励。
- 三条单词记忆轨迹：日英对照、只学日语、只学英语分别保存掌握度、稳定度、难度和下次复习时间。
- 内容库：300 组日英对应词、35 个日语语法、15 个英语语法，每个语法点 5 道练习，另有 15 组日英语法语义对比。
- 搜索筛选：覆盖中文、日语、假名、罗马音、英语、例句和搭配；支持等级、频率、掌握状态、收藏、错题与到期筛选。
- 自定义测试：日语、英语、日英混合三种模式；可按今日、最近 7 天、错题、收藏、到期或全部已学内容出题，并设置难度、题数与反馈时机。
- 错题生命周期：活跃、巩固、已掌握、归档四种状态，保留答题历史、优先级和独立收藏。
- 收藏：统一管理单词、语法和日英对比，支持搜索、筛选、专项学习与批量取消收藏。
- 学习统计：今日、本周、累计、连续天数、正确率、待复习与错题等 13 项概览；提供 7/30 天趋势和掌握分布图。
- 设置与安全重置：计划参数、揭示方式、主题、字体、动画等均可配置；学习、测试、错题、收藏和全部数据可分别重置并要求二次确认。
- 数据兼容：IndexedDB v1 自动原地升级到 v2，旧学习进度映射到日英对照轨迹，不清库、不丢收藏和历史记录。

## 技术栈

- React 19、Next.js App Router API 与 Vinext
- TypeScript strict
- 原生 CSS 设计系统与 Lucide React
- IndexedDB + Repository Pattern；localStorage 只保存设置
- Vitest、fake-indexeddb、Testing Library 与 jsdom

应用刻意不引入账号、云同步、在线 AI、完整 FSRS、PWA、发音或自由输入题型，保持个人离线学习工具的边界清晰。

## 目录

```text
app/                    路由、全局样式和 Provider 入口
components/             应用壳、页面、词卡、练习与图表组件
context/                状态编排、跨标签页合并与持久化
data/                   300 组词、50 个语法、15 组语法对比
hooks/                  时间与搜索防抖钩子
lib/
  repositories/         IndexedDB v2、迁移、内存降级与设置仓库
  spaced-repetition.ts  可解释的复习调度器
  daily-plan.ts         每日计划生成与完成度
  learning.ts           学习、测试、错题与连续天数领域逻辑
  search.ts             单词和语法筛选
  statistics.ts         趋势、分布和概览聚合
tests/                  领域、迁移、IndexedDB、组件与工作流测试
docs/                   架构、存储、算法、计划、迁移和路线图
worker/                 Sites / Cloudflare Worker 构建入口
```

## 本地运行

环境要求：Node.js `>= 22.13`。

```bash
npm install
npm run dev
```

默认访问地址通常为 `http://localhost:3000`。

## 质量检查与构建

```bash
npm run typecheck
npm run lint
npm test
npm run test:components
npm run test:e2e
npm run build
npm run build:vercel
```

`test:e2e` 是不依赖外部浏览器服务的关键工作流集成测试，覆盖计划生成、学习、测试、错题和持久化闭环；主要界面交互另由 Testing Library 组件测试覆盖。

## 部署

项目包含 `.openai/hosting.json`，可构建并部署到 OpenAI Sites。也保留标准 Next.js / Vercel 构建入口：

1. 将仓库导入 Vercel。
2. Framework Preset 选择 Next.js。
3. Build Command 使用 `npm run build:vercel`。
4. Install Command 使用 `npm install`，输出目录保持默认。

当前版本不需要环境变量或 API Key。不同设备之间不会同步本地学习数据。

## 数据与迁移

IndexedDB 数据库 `lingua-step-learning` 当前版本为 2，共七个对象仓库：单词进度、语法进度、错题、收藏、测试结果、每日记录和每日计划。打开旧版数据库时，浏览器在同一个升级事务中逐条迁移；事务失败会回滚，应用随后显示存储降级提示。

详细说明：

- [架构说明](docs/architecture.md)
- [本地存储](docs/storage.md)
- [间隔重复算法](docs/spaced-repetition.md)
- [每日计划](docs/daily-plan.md)
- [v1 → v2 数据迁移](docs/data-migration.md)
- [开发路线图](docs/roadmap.md)
- [DeepSeek 第三阶段方案](docs/deepseek-integration.md)

## 已知限制

- 没有账号、云同步、导入导出或跨浏览器迁移。
- 测试只把已学内容作为题目主体；首次使用应先完成至少一张词卡或一个语法练习。
- 复习器是可解释的 SM-2 衍生实现，不是完整 FSRS。
- 断网后已加载页面和内置内容可继续使用，但当前没有注册完整 PWA Service Worker。
- DeepSeek 入口保持禁用，不会保存密钥或发出模型请求。

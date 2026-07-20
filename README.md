# LinguaStep（日英阶梯）

> 日语与英语，一起稳步进阶

LinguaStep 是一个中文界面的个人日语与英语学习网页应用。第一阶段围绕“学习 → 测试 → 发现薄弱点 → 再练习”完成闭环，内置 100 组真实日英对应词、14 个日语语法点和 6 个英语语法点。无需登录，学习记录保存在当前浏览器中。

## 已实现功能

- 首页：今日完成量、剩余任务、待复习词、错题和连续学习天数
- 单词：中 → 日英回想、同时/分步揭示、10/20/30 词轮次、完整学习总结
- 语法：中文讲解、结构与接续、场景、细微差异、日英对比、每项 5 道练习
- 测试：只从已学内容出题的日英混合四选一测试，逐题中文解析
- 错题本：自动收录、优先级、重复练习、连续答对 3 次后移出活跃列表
- 收藏：统一查看收藏的单词与语法
- 统计：今日与累计学习、测试正确率、错题、连续学习天数
- 设置：浅色/深色/跟随系统、学习偏好、二次确认的数据重置
- 本地保存：IndexedDB 保存结构化学习数据，localStorage 保存轻量设置
- 响应式：桌面侧栏、手机底部导航、专注学习模式和键盘快捷键
- 离线内容：词库、语法、测试逻辑和本地保存均不依赖在线接口

## 技术栈与选择理由

- **React 19 + Next.js App Router API + Vinext**：成熟的组件与路由模型；当前构建保持 Cloudflare Worker 兼容，同时提供标准 Next.js 的 Vercel 构建入口。
- **TypeScript（strict）**：数据模型、仓库接口和学习逻辑均有静态类型约束。
- **原生 CSS 设计系统**：不增加运行时样式依赖，便于维护响应式、深色主题与可访问焦点状态。
- **IndexedDB + Repository Pattern**：适合本地结构化数据；UI 不直接操作数据库，未来可替换云端实现。
- **Lucide React**：统一、可访问的界面图标，避免使用表情符号代替核心图标。
- **Vitest**：快速测试纯学习逻辑和仓库行为。

这套架构刻意不引入登录、复杂状态框架、完整 FSRS 或 AI SDK，避免第一阶段维护成本失控。

## 目录结构

```text
app/                    路由、全局样式、元数据与 Provider 入口
components/             应用壳、通用组件和八个页面视图
context/                学习状态编排；UI 与仓库之间的唯一入口
data/                   100 组单词与 20 个语法知识点
hooks/                  时间等客户端状态钩子
lib/
  ai/                   AI 服务抽象与第一阶段禁用实现
  repositories/         IndexedDB、内存降级、localStorage 设置仓库
  learning.ts           掌握度、错题、连续天数与出题纯逻辑
  models.ts             集中类型模型和未来复习字段
tests/                  核心逻辑与仓库单元测试
docs/                   架构、路线图与 DeepSeek 接入方案
worker/                 Sites / Cloudflare Worker 构建入口
```

## 安装与本地启动

环境要求：Node.js `>= 22.13`。

```bash
npm install
npm run dev
```

开发服务器会输出本地访问地址，默认通常为 `http://localhost:3000`。

## 检查与构建

```bash
npm run typecheck       # TypeScript 严格类型检查
npm run lint            # ESLint
npm test                # Vitest 单元测试
npm run build           # Sites / Cloudflare Worker 生产构建
npm run build:vercel    # 标准 Next.js / Vercel 生产构建
```

## Vercel 部署

1. 将仓库推送到 GitHub、GitLab 或 Bitbucket，并在 Vercel 导入。
2. Framework Preset 选择 **Next.js**。
3. Build Command 设置为 `npm run build:vercel`。
4. Install Command 使用 `npm install`，Output Directory 保持默认。
5. 第一阶段无环境变量、数据库或 API Key，直接部署即可。

Vercel 部署仍使用浏览器本地数据，不会在不同设备间同步。

## 本地数据说明

IndexedDB 数据库 `lingua-step-learning` 使用六个对象仓库：单词进度、语法进度、错题、收藏、测试结果和每日记录。主题、显示密度、揭示模式与学习数量保存在 localStorage。若 IndexedDB 初始化失败，应用会显示提示并降级为当前页面内存记录。

设置页提供三种独立重置：

- 学习进度：清除单词、语法、测试与每日记录，保留错题和收藏；
- 错题：只清除错题；
- 全部数据：清除学习数据、收藏和设置。

所有重置都需要打开确认对话框并再次勾选确认，避免误触。

## 阶段规划

- **第一阶段（已完成）**：本地学习闭环、真实内置内容、响应式主题、离线使用与核心单测。
- **第二阶段**：正式间隔重复算法、每日计划、单语言模式、搜索筛选、趋势图表、内容扩充与云端仓库实现。
- **第三阶段**：DeepSeek 生成单词卡、语法、测试和错题解释。

DeepSeek 将支持两种未来接入方式：生产环境默认由后端代理读取服务端密钥；仅供个人本地测试时，可由设置页临时读取本地 API Key。当前 `MockAiService` 始终返回“尚未开放”，不会发出网络请求。详见 [DeepSeek 接入方案](docs/deepseek-integration.md)。

## 已知限制

- 复习间隔为第一阶段基础队列，并非完整 FSRS。
- 无账号、云端同步、发音、拼写、自由输入翻译、导入导出和 AI 在线调用。
- 测试题来自已经学习的内容；首次使用需先完成至少一张单词卡或一个语法练习。
- 离线可使用已打包内容，但本阶段未注册完整 PWA Service Worker。

更多说明见 [架构文档](docs/architecture.md) 与 [开发路线图](docs/roadmap.md)。

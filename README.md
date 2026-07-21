# LinguaStep（日英阶梯）

> 日语与英语，一起稳步进阶

LinguaStep 是一个中文界面的个人日语与英语学习应用。v0.3.1 在完整的本地学习闭环上加入了可控的 DeepSeek AI：生成词卡、语法和四选一练习，为错题生成中文解释，同时保留离线学习、IndexedDB 数据和第二阶段全部功能。

当前公开站点：[直接打开 LinguaStep](https://linguastep-ai-study.christinewoods7817.chatgpt.site)。无需登录；未配置部署端密钥时，可在“设置 → DeepSeek AI”选择个人 API Key（BYOK）。

## 第三阶段能力

- 两种安全接入：部署端环境变量保管 DeepSeek Key，或用户自带 Key（BYOK）；浏览器只调用同源 `/api/ai/*` 代理。
- 结构化生成：日英对应词卡、日语/英语语法、日英语义对比和基于已学内容的四选一题。
- 质量闸门：Zod Schema、字段/语言/等级检查、重复归一化、内容哈希、题目引用和干扰项校验；失败内容不会进入学习库。
- Prompt 合约 v2：为词汇、语法、日英对比和测试题定义精确字段、英文枚举与嵌套结构；空的可选上下文会规范化为未提供，减少无意义修复调用。
- 保存控制：默认自动保存，也可仅在当前会话预览；支持手动保存、撤销最近批量保存、删除内容、反馈问题和移出学习库。
- 错题解释：只发送当前题、用户选择和必要摘要；支持简洁/详细、缓存和强制重新生成。
- 可恢复请求：超时、有限指数退避、并发限制、同请求去重、取消、中文错误分类、前端每日软限制和服务端内存限流。
- 可追踪用量：记录请求 ID、模型、Prompt 版本、状态、校验、耗时、重试和 token；不记录密钥、完整请求头或系统提示词。
- 数据兼容：IndexedDB v1/v2 原地升级到 v3，保留旧学习记录并新增 AI 内容、历史、用量、解释、练习集和纠错记录。
- 离线降级：断网只禁用 AI 操作；内置内容、已保存 AI 内容、学习、复习、测试、错题、收藏和统计继续工作。

第二阶段的 300 组词、50 个语法、15 组日英对比、三模式间隔复习、每日计划、测试、错题生命周期、收藏和统计均保留。

## 技术栈与目录

- React 19、Next.js 16 App Router API、Vinext、TypeScript strict
- 原生 CSS、Lucide React
- IndexedDB v3 + Repository Pattern；localStorage 只保存非敏感设置
- 原生 `fetch` 接入 DeepSeek OpenAI-compatible API；Zod 校验 JSON
- Vitest、fake-indexeddb、Testing Library、jsdom

```text
app/api/ai/             同源 AI 路由和健康检查
components/ai/          AI 设置与错因解释 UI
components/views/       学习页面与 AI 助学页面
context/                LearningContext 与独立 AIContext
lib/ai/                 config、provider、prompt、schema、validation、service、server、client
lib/repositories/       IndexedDB v3、迁移与内存降级
tests/                  领域、AI、接口、组件、迁移和工作流测试
docs/                   架构、安全、校验、测试和部署文档
```

## 本地开发

环境要求：Node.js `>= 22.13`。

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认地址通常是 `http://localhost:3000`。不配置 Key 也能使用全部本地学习功能。

### 服务器托管 Key

1. 在 DeepSeek 开放平台创建 API Key。
2. 在 `.env.local` 设置 `DEEPSEEK_API_KEY`。真实 `.env*` 已被 Git 忽略，切勿提交。
3. 本地 `localhost` 可不设置 `AI_PROXY_ACCESS_TOKEN`；仅该开发例外生效。
4. 打开“设置 → DeepSeek AI”，选择“服务器代理”并测试连接。

```env
AI_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=你的服务器密钥
DEEPSEEK_MODEL_FAST=deepseek-v4-flash
DEEPSEEK_MODEL_QUALITY=deepseek-v4-pro
AI_ENABLED=true
AI_TIMEOUT_MS=45000
AI_MAX_RETRIES=3
AI_MAX_CONCURRENCY=2
AI_PROXY_ACCESS_TOKEN=
```

### 用户自带 Key（BYOK）

在设置页选择“个人 API Key”。Key 通过专用请求头按次发送到同源代理，服务端不保存、不返回；它不会进入 IndexedDB、学习设置、URL 或请求正文。

默认使用 `sessionStorage`，浏览器会话结束后失效。“保存在此设备”使用 `localStorage`，只应在可信的个人设备上开启；浏览器存储无法提供服务器密钥级别的保护。

## DeepSeek 模型与行为

- Fast：`deepseek-v4-flash`，普通生成显式使用非思考模式。
- Quality：`deepseek-v4-pro`，复杂内容、N1、日英语法对比或质量复核可启用思考模式。
- API 基址：`https://api.deepseek.com`；请求使用 `/chat/completions`、`response_format: {"type":"json_object"}`。
- 模型名、地址、超时、重试和并发均从集中配置读取，客户端不能指定任意模型。

接口以 DeepSeek 官方文档为准：[Models](https://api-docs.deepseek.com/api/list-models)、[Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion)、[Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode)。

## 质量检查与测试

```bash
npm run typecheck
npm run lint
npm test
npm run test:components
npm run test:e2e
npm run build
npm run build:vercel
```

常规测试全部使用 Mock Provider 和固定 Fixture，不调用真实 DeepSeek，不产生 API 费用。

### 当前验收状态（2026-07-21）

- TypeScript strict、ESLint、Vinext/Sites 构建与 Next.js/Vercel 构建通过。
- 16 个自动化测试文件共 101 项测试通过，覆盖配置、Provider、重试/超时/取消、代理安全、Schema、本地校验、组件、IndexedDB v1/v2→v3 和 Mock 工作流。
- 使用真实 DeepSeek API 验证了 `deepseek-v4-flash`、`deepseek-v4-pro`、JSON Output、普通非思考模式和复杂任务思考模式。
- 真实生成验证通过：日英词卡、N2 日语语法、N2/四级日英对比、基于指定已学词汇的四选一题、六字段中文错因解释。
- 真实测试不会保存 API Key、完整请求头、完整 Prompt 或原始响应到仓库和测试快照。

可选的手动冒烟测试：

```bash
DEEPSEEK_API_KEY=你的密钥 npm run test:deepseek
```

没有 `DEEPSEEK_API_KEY` 时脚本自动跳过。启用后只发送一个最小 JSON 请求，可能产生少量 API 费用，且不会输出密钥。该脚本不在默认测试或 CI 中运行。

## Vercel 部署

1. 将仓库导入 Vercel，Framework Preset 选择 Next.js。
2. Build Command 使用 `npm run build:vercel`，Install Command 使用 `npm install`。
3. 在 Production/Preview 环境配置 `.env.example` 中的变量。
4. `DEEPSEEK_API_KEY` 与 `AI_PROXY_ACCESS_TOKEN` 都是敏感变量，不能使用 `NEXT_PUBLIC_` 等客户端公开前缀。
5. 公网部署使用服务器 Key 时必须设置一个足够长、随机的 `AI_PROXY_ACCESS_TOKEN`，并在个人浏览器设置页输入相同令牌。未配置时代理会拒绝生产服务器模式。
6. 部署后检查页面源码、`/api/ai/health`、错误响应和浏览器网络响应：它们只能显示“是否配置”，不能包含 Key 值。
7. 修改 `DEEPSEEK_MODEL_FAST/QUALITY` 可切换允许的模型；设置 `AI_ENABLED=false` 可关闭全部 AI 请求而不影响本地学习。

服务端限流是单实例内存限流。在 Serverless 多实例环境中它不是分布式全局配额；代理访问令牌、DeepSeek 账户配额和前端软限制仍需同时使用。详见 [AI 部署](docs/ai-deployment.md)。

项目同时保留 `.openai/hosting.json`，可部署到 OpenAI Sites；部署端未配置服务器 Key 时仍可使用 BYOK 和本地学习。

## 数据与隐私

- IndexedDB 数据库 `lingua-step-learning` 当前版本为 3，共 15 个对象仓库。
- 只在用户明确触发时发送生成参数或当前题目；出题最多发送 100 条必要的内容摘要。
- 不发送姓名、邮箱、全部测试历史或无关学习数据。
- 临时生成内容只存在 React 内存；历史和用量可保存，但不包含完整 Prompt 或密钥。
- 删除 AI 内容会同时清理对应进度、收藏、错题和练习集引用，避免悬空数据。

## 文档

- [架构说明](docs/architecture.md)
- [本地存储](docs/storage.md)
- [v1/v2 → v3 数据迁移](docs/data-migration.md)
- [DeepSeek 集成](docs/deepseek-integration.md)
- [AI 安全](docs/ai-security.md)
- [Prompt 管理](docs/ai-prompts.md)
- [AI 内容校验](docs/ai-content-validation.md)
- [AI 测试](docs/ai-testing.md)
- [AI 部署](docs/ai-deployment.md)
- [开发路线图](docs/roadmap.md)

## 当前边界

本阶段仍不实现账号/云同步、自由输入翻译题、AI 自由文本批改、发音与语音识别、PWA、社交、管理员后台或自动同步。AI 内容可能出错，最终学习判断仍应以可靠教材和官方资料为准。

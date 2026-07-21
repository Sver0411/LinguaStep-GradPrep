# 架构说明

## 目标与边界

第三阶段继续采用“本地学习优先、AI 按需增强”。AI 故障、断网或未配置密钥时，原有学习功能不依赖网络；页面不直接调用 DeepSeek，也不直接写 IndexedDB。

## 分层

```text
页面 / AI 组件
  ├─ LearningContext ─→ 学习纯函数 ─→ LearningRepository ─→ IndexedDB v3
  └─ AIContext ─→ AIAPIClient ─→ /study-service/*
                                      ↓
                              Request Guard
                                      ↓
                       AIContentService（业务编排）
                         ↙       ↓        ↘
                      Prompt   Zod      本地校验
                                      ↓
                             AIProvider 接口
                           ↙                 ↘
                  DeepSeekProvider       MockAIProvider
                           ↓
               https://api.deepseek.com
```

- `AIContext` 只管理前端操作状态、最小化上下文、临时结果和保存编排，与 `LearningContext` 分离。
- `AIAPIClient` 只访问同源路由，负责离线判断、BYOK/代理令牌专用请求头和取消。
- `request-guard` 负责同源检查、64 KiB 请求体、代理令牌、Key 模式解析和内存限流。
- `AIContentService` 选择模板和模型，解析/修复 JSON、运行质量复核、本地校验并生成业务 ID 和来源元数据。
- `AIProvider` 屏蔽供应商调用；生产使用原生 fetch 的 DeepSeek Provider，测试使用 Mock Provider。
- 所有可保存内容必须先通过 Schema 和业务规则；页面收到的是已校验的应用模型。

## 路由

| 路径 | 职责 |
| --- | --- |
| `/ai` | 单词、语法、练习题生成；预览、保存、历史和用量 |
| `/settings#deepseek-ai` | AI 开关、Key 模式、连接测试、默认生成和清理 |
| `/study-service/health` | 返回非敏感运行配置 |
| `/study-service/models` | 测试连接与允许模型 |
| `/study-service/generate-words` | 结构化词卡生成 |
| `/study-service/generate-grammar` | 语法或日英对比生成 |
| `/study-service/generate-quiz` | 基于最小内容摘要出题 |
| `/study-service/explain-mistake` | 当前错题中文解释 |

旧的 `/api/ai/*` 路由继续保留兼容；浏览器默认使用中性的 `/study-service/*` 路径，避免部分托管边缘层或浏览器扩展拦截通用 API 路径。

其他学习路由保持第二阶段不变。AI 保存的词汇、语法和对比通过 `allWords/allGrammar/allComparisons` 进入同一学习、收藏、搜索、测试与统计流程。

## 请求序列

```text
用户提交
 → AIContext 阻止重复操作并创建 AbortController
 → AIAPIClient 加入接入模式专用 Header
 → 服务端认证、限流和输入 Schema
 → DeepSeek JSON Output（普通任务显式关闭思考）
 → JSON 解析；失败时一次修复，再失败则一次受约束重生成
 → 可选质量模型复核
 → 本地语言/难度/重复/题目引用校验
 → 返回合格项、拒绝原因、Generation 和 Usage
 → 自动保存或保留为当前会话临时结果
```

服务端仅对 429、500/503、网络、超时、空响应和截断等瞬时错误进行有界指数退避；鉴权、余额、参数和业务校验错误不盲目重试。

## 保存边界

- AI 内容、历史、用量、解释、练习集和纠错记录与学习数据在一个快照事务中保存。
- 密钥不属于 `LearningSnapshot` 或 `AppSettings`。非敏感 AI 设置使用独立 localStorage 键；密钥使用独立 session/localStorage 键。
- 临时词汇/语法/题目只在 AIContext 内存中。生成历史和用量可持久化，但不保存完整系统 Prompt。
- 删除内容会清理进度、收藏、错题、练习集和报告引用。

## 安全与部署

运行时配置集中在 `lib/ai/config/ai-config.ts`。服务器 Key 从 `process.env` 读取；客户端代码不读取服务器环境变量。远程生产服务器模式必须同时验证 `AI_PROXY_ACCESS_TOKEN`，localhost 才豁免。CSP 限制浏览器连接为同源，因此浏览器不会直接联系 DeepSeek。

## 测试策略

- 单元：配置、错误映射、Provider 请求/重试/去重、Schema、校验、服务编排、密钥存储。
- 接口：接入保护、同源、请求体、非法输入、安全错误、成功结构。
- 组件：生成表单、加载/取消、部分成功、保存、设置、遮挡 Key、解释和历史。
- 数据：真实 fake-indexeddb 的 v1/v2 → v3 升级与快照往返。
- 工作流：Mock Provider 生成 → 校验 → 保存 → 学习 → 出题 → 错题 → 解释 → 刷新 → 删除。

真实 DeepSeek 只由手动 `npm run test:deepseek` 冒烟脚本访问，不进入常规测试或 CI。

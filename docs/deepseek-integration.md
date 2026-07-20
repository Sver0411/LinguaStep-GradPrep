# DeepSeek 集成

## 运行配置

配置统一由 `lib/ai/config/ai-config.ts` 读取和限界：

```env
AI_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL_FAST=deepseek-v4-flash
DEEPSEEK_MODEL_QUALITY=deepseek-v4-pro
AI_ENABLED=true
AI_TIMEOUT_MS=45000
AI_MAX_RETRIES=3
AI_MAX_CONCURRENCY=2
AI_PROXY_ACCESS_TOKEN=
```

只允许 `deepseek` Provider。普通词汇、语法和题目生成使用 Fast 模型并显式 `thinking: disabled`；Quality、N1、日英对比、错题解释和二次复核使用 Quality 模型，复杂审查可启用思考。模型只能从服务器允许列表选择。

请求使用 `POST /chat/completions`、Bearer 鉴权、非流式输出和 `response_format: {"type":"json_object"}`。连接测试通过 `GET /models` 确认两个配置模型均可用。实现依据 DeepSeek 官方 [Models](https://api-docs.deepseek.com/api/list-models)、[Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion) 和 [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode)。

## 两种 Key 模式

### 服务器托管

浏览器请求同源代理；代理从 `DEEPSEEK_API_KEY` 读取 Key。生产域名还必须配置并验证 `AI_PROXY_ACCESS_TOKEN`，localhost 可豁免。健康接口只返回布尔配置状态和模型名。

### BYOK

用户 Key 存在 sessionStorage（默认）或用户明确选择的 localStorage。AIAPIClient 将它放入 `x-linguastep-api-key` 专用请求头，同源代理只在当前请求内构造 Provider；不写数据库、不缓存、不返回。

## 业务接口

`AIProvider.generateJSON()` 负责供应商通信，`AIContentService` 暴露：

- `generateWords`
- `generateGrammar`（含 comparison）
- `generateQuiz`
- `explainMistake`

页面只能调用 AIContext，不能调用 Provider 或 DeepSeek。

## JSON 修复和质量复核

1. 首次响应解析 JSON 并通过严格 Zod Schema。
2. 格式失败时，用版本化 repair Prompt 修复一次。
3. 修复仍失败时，用 Quality 模型按原约束重生成一次。
4. 用户开启复核，或 N1/日英对比触发复杂审查时，质量模型返回 pass/needsRepair/reject。
5. 最终内容继续经过本地规则；全部拒绝则失败，部分通过则返回 partial。

不会让同一输出无限自我确认，也不会存储模型内部推理。

## 重试和取消

只重试 429、500/503、网络、超时、空响应、截断和可恢复资源不足；指数退避从约 500ms 开始并带小幅 jitter，最多由服务器和用户设置的较小值决定。401/403、402、400/422、模型不可用和内容校验失败不盲目重试。

每个浏览器操作有 AbortController；Provider 超时使用子 AbortController。全局 Provider 并发限制默认为 2，相同在途请求按非敏感指纹去重。

## 数据最小化

词汇和语法生成发送表单参数及用于去重的摘要；出题最多发送 100 条相关内容摘要；错题解释只发送当前题、选择、深度和可选相关摘要。不发送用户全部测试历史、姓名、邮箱或无关数据。

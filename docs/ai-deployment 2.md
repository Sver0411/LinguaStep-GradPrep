# AI 部署

## Vercel

使用 `npm run build:vercel`。在 Project Settings → Environment Variables 配置 `.env.example` 中的变量：

- 敏感：`DEEPSEEK_API_KEY`、`AI_PROXY_ACCESS_TOKEN`
- 非敏感：Provider、Base URL、模型、开关、超时、重试、并发

敏感变量不得添加 `NEXT_PUBLIC_` 前缀。生产服务器模式必须设置随机长代理令牌；个人浏览器在设置页输入同一令牌。`AI_ENABLED=false` 可禁用 AI，不影响 IndexedDB 学习。

部署验证：

1. 设置页加载后显示 Fast/Quality 配置，且 Server Action 响应不能包含任何密钥；`/study-service/health` 可作诊断，旧 `/api/ai/health` 仅作兼容。
2. 设置页测试 Fast/Quality 两个模型。
3. 查看浏览器源码、静态包和 Network Response，不应出现服务器 Key。
4. 错误代理令牌返回中文安全错误；跨域请求被拒绝。
5. 生成 1 组临时词卡，验证保存前校验、token 和历史。

Vercel Serverless 的内存限流只覆盖单实例/暖实例，无法当作全局分布式配额。公开部署应限制网址传播、使用强代理令牌并配置 DeepSeek 账户额度。

## OpenAI Sites

项目含 `.openai/hosting.json`，可用 Vinext 构建并部署 Sites。浏览器 AI 调用默认使用 React Server Action/RSC，避免普通 API route fetch 在到达 Worker 前被托管边缘层拦截；兼容路由仍保留用于诊断。配置服务器环境变量后可用服务器模式；没有服务器 Key 时健康信息显示未配置，BYOK 和所有本地功能仍可使用。部署密钥只设置在平台环境，不写仓库。

## 本地

`.env.local` 已被 `.gitignore` 排除。localhost 使用服务器 Key 时可以不配置代理令牌，便于单人开发；此豁免按请求 hostname 判断，不应用于生产别名。

## 模型和禁用

切换模型只改 `DEEPSEEK_MODEL_FAST` / `DEEPSEEK_MODEL_QUALITY`，两者会同时成为服务端允许列表。部署前用 `/models` 连接测试确认账号可见。设置 `AI_ENABLED=false` 后所有生成路由失败关闭，健康接口仍可用于诊断。

定价会变化，应用不硬编码费用；只显示 token。当前价格参考 DeepSeek 官方 [Pricing](https://api-docs.deepseek.com/quick_start/pricing)。

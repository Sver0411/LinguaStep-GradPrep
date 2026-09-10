# AI 测试

## 默认原则

`npm test` 只使用 MockAIProvider、固定 JSON Fixture、模拟 HTTP Response 和 fake-indexeddb，不读取真实 Key、不访问网络、不产生费用。

覆盖范围：

- 配置、Provider 选择、模型与 HTTPS 基址。
- JSON mode、思考开关、token 解析、429 重试、鉴权不重试、截断、模型列表和在途去重。
- 词汇/语法/题目 Schema、本地重复、语言方向、等级、来源和选项。
- 服务修复、部分成功、全部拒绝、元数据和用量。
- 服务器 Key/BYOK、代理令牌、同源、请求大小、安全错误和成功接口。
- session/device Key、遮挡、正文/URL 不含 Key、离线短路。
- AI 表单、加载/取消、部分成功、保存、设置、解释和历史内容管理。
- v1/v2 → v3 迁移和 Mock 端到端工作流。

## 命令

```bash
npm run typecheck
npm run lint
npm test
npm run test:components
npm run test:e2e
```

`test:e2e` 运行本地学习关键工作流；完整 AI Mock 工作流也由 `tests/ai-workflow.e2e.test.ts` 包含在默认套件中。

## 手动真实冒烟

```bash
DEEPSEEK_API_KEY=你的密钥 npm run test:deepseek
```

未设置 Key 时自动跳过。脚本发送一个极小的非思考 JSON 请求，只验证鉴权、模型和 JSON Output；可能产生少量费用，不在 CI 中运行，也不输出 Key。

调试失败时只记录错误代码、HTTP 状态、请求 ID、模型和计时，禁止打印完整 Header/Request 对象或原始学习内容。

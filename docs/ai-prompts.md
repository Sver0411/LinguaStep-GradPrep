# AI Prompt 管理

Prompt 全部集中在 `lib/ai/prompts/templates.ts`，每个模板包含 `name`、`version`、`system`、`buildUser` 和 `maxTokens`。业务记录只保存名称和版本，不复制完整系统 Prompt。

| 模板 | 当前版本 | 用途 |
| --- | --- | --- |
| `word-generation` | v1 | 日英对应词卡 |
| `grammar-generation` | v1 | 日语/英语语法 |
| `grammar-comparison-generation` | v1 | 日英语义对比 |
| `quiz-generation` | v1 | 基于来源摘要的四选一题 |
| `mistake-explanation` | v1 | 当前错题中文解释 |
| `quality-review` | v1 | pass/needsRepair/reject |
| `content-repair` | v1 | 按 Schema 和问题列表修复 |

共同规则要求单个合法 JSON 对象、中文说明、指定难度、无 Markdown/前后说明、无内部推理，并把用户提供的内容视为只读数据。

修改字段、语义或校验约束时必须升级对应版本并增加 Fixture/服务测试。纯措辞优化如果可能改变输出，也建议升级。历史记录用于定位内容由哪个模板生成；旧内容不因新 Prompt 自动改写。

Prompt 不包含 API Key、完整用户历史或环境变量。数组输入在构建时再执行 100/200/500 条上限，避免意外超长上下文。

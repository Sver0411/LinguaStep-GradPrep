# 开发指南

[项目首页](../README.md) · [文档目录](README.md) · [部署指南](deployment.md)

## 环境与启动

需要 Node.js `>=22.13` 和 npm。

```bash
git clone https://github.com/Sver0411/LinguaStep-GradPrep.git
cd LinguaStep-GradPrep
npm ci
npm run dev
```

默认开发入口使用 Vinext，地址以终端输出为准。也可以直接启动 Next.js 开发服务器：

```bash
npm exec next dev
```

核心学习不需要配置密钥。在线发音由同源 `/api/tts` 调用 Edge 朗读服务，需要网络及出站 WebSocket。不要将在线语音与内置内容的本地存储混为离线能力。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run typecheck` | TypeScript 检查 |
| `npm run lint` | ESLint 检查 |
| `npm test` | 全部自动化测试 |
| `npm run test:components` | 指定的组件测试集合 |
| `npm run test:e2e` | 仓库内的工作流测试；不代替浏览器真机走查 |
| `npm run build` | Vinext 生产构建 |
| `npm start` | 启动 Vinext 生产服务 |
| `npm run build:vercel` | Next.js 生产构建 |
| `npm exec next start` | 启动已构建的 Next.js 服务 |

常规自动化测试使用 Mock，不访问付费 AI。UI 或音频改动还应检查桌面和手机布局、浏览器播放权限及实际语音服务。

## 技术与目录

React 19、Next.js 16、TypeScript、Tailwind CSS；通过 Vinext / Vite 保留另一条构建入口。IndexedDB 保存本地记录，Zod 处理输入校验，Vitest / Testing Library 执行自动化验证。

```text
app/                 页面入口、布局、API 与 Server Action
components/          桌面视图、移动端屏幕与共用学习组件
context/learning/    应用状态、持久化与学习动作
lib/                 调度、计划、检索、语音及其他领域逻辑
lib/repositories/    IndexedDB、迁移和内存仓储
lib/ai/              暂停前端后的 AI 兼容后端
data/               静态词汇、语法、题库与资料
tests/              单元、接口、组件和工作流测试
docs/               使用与维护文档
```

目录依赖与拆分约定见[架构说明](architecture.md)。复习与持久化改动应对照[算法](spaced-repetition.md)、[计划](daily-plan.md)、[本地存储](storage.md)和[数据迁移](data-migration.md)。

## 环境变量与 AI 兼容代码

AI 前端入口目前暂停；`.env.example` 和 AI 文档用于后端兼容维护。日常使用无需复制或填写 AI 配置。

确需维护后端时可复制模板：

```bash
cp .env.example .env.local
```

真实密钥只放未提交的环境文件或部署平台变量中，不使用 `NEXT_PUBLIC_` 前缀公开密钥。具体接口、令牌、超时和模型配置见 [DeepSeek 接入](deepseek-integration.md)、[AI 安全](ai-security.md)与 [AI 部署](ai-deployment.md)。不要根据历史文档推断当前界面已开放 AI 或 BYOK。

## 更新文档与版本

- 用户流程变化写入[使用指南](user-guide.md)，内容数量变化写入[内容说明](content.md)。
- 版本同步维护 `package.json`、`package-lock.json` 根项目版本、`lib/constants.ts` 和[版本记录](changelog.md)。依赖包的版本不能随项目版本批量替换。
- README 只保留概览与入口，长期说明放进独立文档并更新[文档目录](README.md)。

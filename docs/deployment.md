# 部署指南

[项目首页](../README.md) · [文档目录](README.md) · [开发指南](development.md)

## 先确认运行需求

- Node.js `>=22.13`。在线发音接口使用 Node.js 运行时和出站 WebSocket；需要在目标运行环境中实际验证。
- 当前语音通过社区 `msedge-tts` 接入 Edge 在线朗读，无需 Key；它不是带可用性承诺的 Azure 开发者 API。
- 学习数据在用户浏览器，不会因为部署服务端就自动变成账号或云同步。
- 默认学习功能无需 AI 密钥。当前 AI 前端暂停，维护后端时再查阅[单独的 AI 部署文档](ai-deployment.md)。

## Next.js / Vercel

本地验证：

```bash
npm ci
npm run build:vercel
npm exec next start
```

在 Vercel 导入 GitHub 仓库，Framework Preset 使用 Next.js，Build Command 使用 `npm run build:vercel`。发音接口应使用 Node.js 运行时；构建成功后还需测试真实的 MP3 返回和浏览器播放。

## Docker 与子路径

仓库提供 `Dockerfile.server`，使用 Next.js standalone 输出，默认部署在 `/LinguaStep` 子路径：

```bash
docker build -f Dockerfile.server --build-arg APP_BASE_PATH=/LinguaStep -t linguastep .
docker run --rm -p 3000:3000 linguastep
```

访问 `http://localhost:3000/LinguaStep`。若部署在域名根路径，构建时改用空路径：

```bash
docker build -f Dockerfile.server --build-arg APP_BASE_PATH= -t linguastep .
```

直接构建 Next.js 时可通过 `NEXT_PUBLIC_BASE_PATH` 设置相同路径。它是构建配置，路径变更后需要重新构建；反向代理应按配置转发页面、静态资源与 `/api/tts`。

## Vinext / Sites

```bash
npm ci
npm run build
npm start
```

项目保留 `.openai/hosting.json` 与 Vinext 构建入口。不同托管环境对 Node.js 依赖、WebSocket 和服务端函数的支持可能不同，不能仅凭构建成功认定语音运行正常。若在线语音不兼容，优先使用支持上述需求的 Node.js 部署方案。

本文件仅说明项目的运行入口，不会自动创建或修改托管项目。

## 部署后走查

1. 打开首页、单词学习、语法及测试，检查静态资源与子路径路由。
2. 分别播放日语、英语及中文，检查例句双语连读。
3. 完成一次答题，刷新后确认本地记录保留，并测试备份导出与恢复入口。
4. 在手机宽度下检查底部导航、例句换行和作答按钮；手机浏览器的媒体权限需要真机确认。

服务器 Key、代理令牌等敏感值只在环境变量中配置，勿提交到仓库或写入公开构建配置。

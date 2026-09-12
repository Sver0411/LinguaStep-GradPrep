# 架构说明

## 目标与边界

“本地学习优先、AI 按需增强”。AI 故障、断网或未配置密钥时，原有学习功能不依赖网络；页面不直接调用 DeepSeek，也不直接写 IndexedDB。

## 分层与依赖方向

依赖只能从上往下，**下层不得反向引用上层**：

```text
app/          框架外壳：路由、布局、API / Server Action
  ↓
components/   视图：桌面视图、手机外壳与各屏幕
  ↓
context/      应用状态：learning（学习数据）、AIContext（AI 编排）
  ↓
lib/          领域逻辑：学习算法、每日计划、检索、仓储、AI 服务
  ↓
data/         静态内容：词库、语法、题库、参考资料
```

自查判据：`lib` 不得引用 `app`；`data` 只引用 `lib` 的类型（`import type`），不引用其运行时值。

## 学习数据层 `context/learning/`

`LearningContext` 曾是一个 1200 行的单体文件，现按职责分层：

```text
context/learning/
  types.ts               本模块对外暴露的全部类型
  snapshot-utils.ts      纯函数：快照合并、裁剪、集合差量、主题、计划生成
  use-snapshot-store.ts  持久化：打开仓储、写入加锁、跨标签广播、重置、备份/恢复
  actions/
    use-word-actions.ts      学习与“熟知”标记
    use-practice-actions.ts  语法与测验完成
    use-mistake-actions.ts   错题本
    use-favorite-actions.ts  收藏
    use-ai-actions.ts        生成内容的生命周期
  context.ts             React context 与 useLearning
  LearningProvider.tsx   仅做组装，不含状态与业务规则
  index.ts               对外唯一入口
```

约定：

- 动作 hook 只用 `Pick<SnapshotStore, …>` 声明所需能力，不直接触碰仓储。
- 每个 hook 返回 `useMemo` 化的对象，保证 Provider 发布的值引用稳定，避免整棵树重渲染。
- 新增一类用户动作 = 新增一个 `actions/*.ts` + 在 Provider 里组装，不改其它文件。

## 手机外壳 `components/mobile/`

```text
components/mobile/
  MobileApp.tsx       外壳：路由分发 + 底部导航
  navigation.ts       URL 助手（mobileHref / navigateTo / mobileHrefForStep）
  constants.ts        标签与参考资料
  ui/                 与屏幕无关的通用件
  screens/            一屏一文件（首页/单词/学习/语法/练习/测验/错题/资料/统计/设置/收藏/我的）
  index.ts            对外唯一入口

```

- 底部导航是常驻固定底栏（`position: fixed`），学习会话中自动隐藏，避免遮挡底部评分条。
- 屏幕之间互不引用，公共能力一律走 `navigation.ts` / `ui/`。

## AI 通道

```text
AI 组件
  └─ AIContext ─→ AIAPIClient ─→ React Server Action / RSC
                                      ↓（兼容路由：/study-service/*）
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

- `AIContext` 只管理前端操作状态与保存编排，与 `context/learning` 分离。
- `AIAPIClient` 默认调用同源 React Server Action，负责离线判断、令牌单次传输与前端取消。

## 校验

改动后至少跑通：

1. 类型检查（`tsc --noEmit`）。
2. 桌面与手机全路由冒烟（无 console / page 错误）。
3. 主链路：“首页 → 完成一轮单词 → 继续 → 语法”。

## 目录规模参考

| 目录 | 说明 |
| --- | --- |
| `data/` | 内容数据，单行超长属正常（词库/题库） |
| `components/` | 视图；超过 ~300 行的文件应继续按 `screens/`、`ui/` 的思路拆分 |
| `lib/` | 领域逻辑；`lib/ai/` 已按 client/config/errors/prompts/provider/schemas/server/services/types/validation 分层 |
| `context/` | `learning/`（分层）+ `AIContext.tsx` |

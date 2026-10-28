<p align="center">
  <img src="docs/assets/linguastep-banner.svg" alt="LinguaStep 日英阶梯：日语与英语，一起稳步进阶" width="100%" />
</p>

<p align="center">
  <a href="docs/changelog.md"><img src="https://img.shields.io/badge/version-0.18.4-5964f2?style=flat-square" alt="版本 0.18.4" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.13-43853d?style=flat-square" alt="Node.js >=22.13" />
  <img src="https://img.shields.io/badge/TypeScript-3178c6?style=flat-square" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Local--first-278c82?style=flat-square" alt="本地优先" />
</p>

<p align="center">
  <a href="https://twclab.top/LinguaStep">在线体验</a> ·
  <a href="docs/user-guide.md">使用指南</a> ·
  <a href="docs/README.md">完整文档</a> ·
  <a href="docs/changelog.md">版本记录</a> ·
  <a href="README.en.md">English</a>
</p>

LinguaStep 是面向中文使用者的日语与英语学习应用。它把日英词卡、例句朗读、语法、选择练习和间隔复习连接起来，让“看过一个词”自然进入“做题检验，再按时复习”的过程。无需注册，学习记录保存在当前浏览器。

项目适合希望建立日常学习习惯、巩固日语或英语基础，并结合 JLPT / CET / TOEIC 目标安排练习的个人使用者。可以同时学日英，也可以只使用其中一种语言。

## 在线预览

[打开 LinguaStep](https://twclab.top/LinguaStep)，从首页的“继续”开始，也可以直接查看各功能页面：

| 页面 | 可以体验什么 |
| --- | --- |
| [单词学习](https://twclab.top/LinguaStep/words) | 词卡揭示、例句、对应选择与词库浏览 |
| [语法](https://twclab.top/LinguaStep/grammar) | 用法讲解、日英对比与即时练习 |
| [练习](https://twclab.top/LinguaStep/test) | 分级测试、能力训练与错题巩固 |
| [学习统计](https://twclab.top/LinguaStep/stats) | 学习量、首次作答和隔日记忆表现 |

在线页面以当前部署版本为准；下文介绍仓库 `main` 中的功能。

## 核心学习体验

### 先熟悉一小批，再用答题检验

**熟悉 5 组词 → 对应选择题 → 保留错词、补入新词 → 继续练习。**

1. 先看中文提示，按设置同时或分步揭示日语、英语，熟悉词义与例句。
2. 熟悉本批后做对应选择：日英模式练日语选英语、英语选日语；单语模式练对应中文。
3. 本轮答对的词退出当前池，答错或提前查看答案的词保留；只有新补入的词需要揭示。
4. 每批自然衔接下一批，本次全部通过后才显示最终完成页。

例如本批通过 3 组、剩下 2 组，就先揭示 3 组新词，再练习“旧 2 组＋新 3 组”。新词不足时按实际数量继续，不用手动点“认识 / 模糊 / 不认识”。

### 单词、例句与中文一起听

日语和英语两侧都有例句及中文译文，简洁模式也会显示。揭示后自动朗读外语单词、例句及其中文；首个单词额外读出中文释义，第二侧不重复读该释义。

例句旁可一键重播“外语例句 → 中文译文”。日语使用 Nanami、英语使用 Jenny、中文使用 Xiaoxiao 自然神经语音；可以关闭自动朗读，保留手动播放。选择题提交前隐藏例句，避免泄露答案。

### 让复习接上每日计划

客观词汇答题接入 **FSRS-6**：按真实的答对、答错与复习间隔更新记忆状态，安排下次复习。本轮答对表示通过当前练习；长期“已掌握”还需要隔日成功和足够的稳定性，详见[复习算法](docs/spaced-repetition.md)。

首页依次接上到期复习、新词、语法、测试和错题。在设置中选择主目标、学习范围、每日任务量或 **10 / 20 / 30 分钟**预算，可选填考试日期；计划会参考近期耗时给出预计用时和调整原因。

### 从查阅到练习，保持连贯

| 功能 | 使用方式 |
| --- | --- |
| 三种学习模式 | 日语、英语、日英对照分别保留进度；支持揭示顺序与每轮数量设置 |
| 语法与日英对比 | 查用法、接续、例句和易混点，再进入相关练习 |
| 能力训练 | 短句听辨、听写、语法填空和新语境阅读，每轮最多 5 题 |
| 错题本 | 自动保留错误与历史；听力题能重播，输入题继续用输入作答 |
| 词库与收藏 | 搜索中文、日语、英语及例句；词书条目可收藏、加入学习和后续复习 |
| 学习统计 | 区分学习量、题目首次作答、隔日选择正确率及旧自评记录 |
| 手机与电脑 | 桌面侧边栏与独立手机布局，支持浅色/深色、字号和专注模式 |
| 备份恢复 | 电脑和手机设置中均可导出、导入 JSON 备份，恢复前确认替换 |

[查看完整使用指南](docs/user-guide.md)

## 内容规模与来源

| 内容 | 当前规模 | 范围说明 |
| --- | --- | --- |
| 核心日英对应词 | **2560 组** | N3/N2/N1 每级至少 800 词，含两侧例句及中文译文 |
| 高频词书 | **1989 条** | N3 / N2 / N1 / 基础分区，可加入学习 |
| 语法点 | **80 个** | 日语 65、英语 15，配合讲解与练习 |
| 日英语法对比 | **137 组** | 对比表达场景、共同点和易错处 |
| 日语分级练习 | **1715 题** | N3 / N2 / N1 的教辅、公开练习及内置/原创题 |
| 英语练习 | **848 题** | 基础英语 800 题，CET-4 / CET-6 / TOEIC 原创题各 16 题 |
| 日语速查 | **92 个基础假名、7 组主题** | 五十音、时间、数字、问候、交通等 |

题目明确区分教辅、公开练习和内置/原创来源；当前没有经官方历年出处核实的题目计数。英语基础题不映射成四六级难度，练习结果不用于预测考试分数。词汇对应也不表示两个词在所有语境中都能互换。

[内容范围与题库来源](docs/content.md) · [词汇来源、署名与更新](docs/vocabulary-sources.md)

## 本地开始

需要 **Node.js ≥ 22.13**，基础学习不需要配置 API Key。

```bash
git clone https://github.com/Sver0411/LinguaStep-GradPrep.git
cd LinguaStep-GradPrep
npm ci
npm run dev
```

打开终端提示的地址，通常是 `http://localhost:3000`。在线发音需要网络和支持出站 WebSocket 的服务端。

常用验证与生产运行命令：

```bash
npm run typecheck       # 类型检查
npm test                # 自动化测试
npm run build           # Vinext 生产构建
npm start               # 启动 Vinext 生产服务
npm run build:vercel    # Next.js / Vercel 构建
```

[完整开发说明](docs/development.md) · [Vercel、Docker 与子路径部署](docs/deployment.md)

## 技术栈与结构

| 技术 | 用途 |
| --- | --- |
| React 19 / Next.js 16 / TypeScript | 页面、交互与类型约束 |
| Tailwind CSS / Lucide | 样式与图标 |
| IndexedDB | 本地学习记录、错题、计划与备份数据 |
| ts-fsrs | 客观词汇复习调度 |
| msedge-tts | 同源服务端自然语音，支持单词和任意句子 |
| Vinext / Vite | 开发与另一条生产构建入口 |
| Vitest / Testing Library / Zod | 自动化验证与输入校验 |

代码按 `app → components → context → lib → data` 分层。页面负责交互，学习动作、调度、存储与内容数据分开维护，详见[架构说明](docs/architecture.md)。

## 数据与当前边界

- **本地优先**：内置内容和记录保存在当前浏览器；在线语音依赖网络，不能把它等同于完全离线。
- **手动迁移**：不同设备、浏览器不会自动同步，换设备或清理浏览器前请先导出备份。
- **练习定位**：题型覆盖和难度校准仍有限，选择题表现不等同于完整考试、听说读写能力。
- **AI 状态**：前端入口目前暂停，保留后端兼容实现与文档；日常学习不依赖 AI 密钥。

## 文档导航

| 你想了解什么 | 文档 |
| --- | --- |
| 如何背词、听例句、复习和备份 | [使用指南](docs/user-guide.md) |
| 词库、题库覆盖哪些内容，来源是什么 | [内容与来源](docs/content.md) |
| 如何运行、修改与验证项目 | [开发指南](docs/development.md) |
| 如何部署、配置路径和语音服务 | [部署指南](docs/deployment.md) |
| 算法、每日计划和数据如何工作 | [复习算法](docs/spaced-repetition.md) · [每日计划](docs/daily-plan.md) · [本地存储](docs/storage.md) |
| 最近更新了什么、后续想做什么 | [版本记录](docs/changelog.md) · [后续方向](docs/roadmap.md) |

全部维护文档与历史 AI 资料集中在[文档目录](docs/README.md)。

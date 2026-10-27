<p align="center">
  <img src="docs/assets/linguastep-banner.svg" alt="LinguaStep 日英阶梯：日语与英语，一起稳步进阶" width="100%" />
</p>

<p align="center">
  <a href="docs/changelog.md"><img src="https://img.shields.io/badge/version-0.18.2-5964f2?style=flat-square" alt="版本 0.18.2" /></a>
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

LinguaStep 是面向中文使用者的日语与英语学习应用。把词卡、例句朗读、语法、选择练习和间隔复习放进同一条学习路径，无需注册，学习记录保存在当前浏览器。

## 怎样学习

**熟悉 5 组词 → 对应选择题 → 保留错词、补入新词 → 继续练习。**

例如本批通过 3 组、剩下 2 组，就先揭示 3 组新词，再练习“旧 2 组＋新 3 组”。错词不再重复揭示，中间无需确认轮次总结；本次通过后，仍由 FSRS 安排后续复习。

| 能力 | 已提供的体验 |
| --- | --- |
| 日英词卡 | 2560 组对应词，支持日语、英语、日英对照三种学习模式 |
| 例句与听读 | 两侧均有例句及中文译文，支持自然神经语音和双语重播 |
| 长期复习 | 客观词汇答题接入 FSRS-6，错题与到期复习接入每日计划 |
| 语法与训练 | 80 个语法点、137 组日英对比；听辨、听写、填空与阅读练习 |
| 计划与反馈 | 主目标、每日时间预算、首次作答及隔日记忆表现 |
| 手机与电脑 | 独立移动端布局；词书收藏可加入学习，支持 JSON 备份恢复 |

[了解完整学习流程](docs/user-guide.md) · [查看内容范围与来源](docs/content.md)

## 本地开始

需要 **Node.js ≥ 22.13**。

```bash
git clone https://github.com/Sver0411/LinguaStep-GradPrep.git
cd LinguaStep-GradPrep
npm ci
npm run dev
```

打开终端提示的地址，通常是 `http://localhost:3000`。基础学习不需要配置 API Key；在线发音需要网络和支持出站 WebSocket 的服务端。

[开发与检查命令](docs/development.md) · [部署到自己的服务器](docs/deployment.md)

## 按需要阅读

| 你想了解什么 | 文档 |
| --- | --- |
| 如何背词、听例句、复习和备份 | [使用指南](docs/user-guide.md) |
| 词库、题库覆盖哪些内容，来源是什么 | [内容与来源](docs/content.md) |
| 如何运行、修改与验证项目 | [开发指南](docs/development.md) |
| 如何部署、配置路径和语音服务 | [部署指南](docs/deployment.md) |
| FSRS、每日计划和数据如何工作 | [算法](docs/spaced-repetition.md) · [计划](docs/daily-plan.md) · [架构](docs/architecture.md) |
| 最近更新了什么 | [版本记录](docs/changelog.md) · [后续方向](docs/roadmap.md) |

学习记录不会自动跨设备同步，换设备前请先导出备份。内置练习的范围与难度覆盖有限，不能直接作为考试成绩预测；[内容说明](docs/content.md)中区分了教辅、公开练习和原创材料。AI 前端入口目前暂停，相关后端维护资料保留在[文档目录](docs/README.md)。

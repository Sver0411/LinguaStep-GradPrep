# 词汇来源与更新

[项目首页](../README.md) · [词书功能](word-books.md)

旧内置词库已完全退出当前应用。当前词条成员与册内顺序来自 AnkiWeb 同一作者公开分享的红宝书、绿宝书文字卡组，不以通用 JLPT 词表冒充教材。

| 词书 | N1 | N2 | N3 | N4 | N5 |
| --- | --- | --- | --- | --- | --- |
| 红宝书 | [来源](https://ankiweb.net/shared/info/716751361) | [来源](https://ankiweb.net/shared/info/601949071) | [来源](https://ankiweb.net/shared/info/216235073) | [来源](https://ankiweb.net/shared/info/1305673899) | [来源](https://ankiweb.net/shared/info/789028455) |
| 绿宝书 | [来源](https://ankiweb.net/shared/info/49842504) | [来源](https://ankiweb.net/shared/info/176303074) | [来源](https://ankiweb.net/shared/info/1342852640) | [来源](https://ankiweb.net/shared/info/2039076689) | [来源](https://ankiweb.net/shared/info/983151495) |

[分享作者目录](https://ankiweb.net/shared/by-author/1681155450)。封面来自用户本地对应 PDF；词头、中文和单词音频来自卡组。版权仍归原权利人；公开下载并不表示教材、封面或音频获得了统一的开源许可。

英语核心表达参考 [JMdict / EDRDG](https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html)，结构化输入使用 [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified) 的 3.6.2 数据（2026-10-26）。JMdict 派生数据须遵守其 CC BY-SA 4.0 署名与相同方式共享要求。部分平行例句来自 JMdict 所附 Tatoeba / Tanaka 语料，按原始来源的 CC BY 2.0 条件署名使用；数据内保留词典标识与可用的语料编号。

部分日中例句参考 [5mdld/anki-jlpt-decks（egg rolls）](https://github.com/5mdld/anki-jlpt-decks)，其许可为 CC BY-NC 4.0。只用于匹配词头与读音的例句补充，不作为红绿宝书成员依据。缺失例句另行编写，缺失译文在内容构建阶段补译；学习运行时不调用翻译服务。

## 构建流程

1. `scripts/extract-book-audio.py` 安全读取 Anki SQLite 和媒体映射，提取 MP3，以内容散列去重；不执行卡片模板。
2. `scripts/build-word-books.py` 整理十册数据、同词 ID、词典匹配及音频引用；`data/word-book-editorial.json` 保存词形、释义与例句修订。
3. `scripts/enrich-book-examples.py` 补充词典语料例句。
4. `scripts/translate-book-fields.py` 对公开词典文本补译并缓存，遇限流即停止；`scripts/finalize-book-translations.py` 应用缓存并列出缺项。
5. 检查所有活动词的双语表达、双语例句、中文译文及音频引用，再运行内容与交互测试。

原始卡组、媒体和中间缓存保存在忽略的 `work/` 中。生成数据及修订记录可追溯，学习页面不增加来源徽标。分发不同来源的数据时，应分别遵守相应许可；商业使用前需处理教材与非商业语料的授权。

## 例句假名与文字校正（v0.20.2）

日语例句离线生成 ruby 假名，浏览器不下载分词词典。词书导入后运行 `node scripts/build-example-furigana.mjs`：先逐条应用 `data/example-text-review.json` 中有前后值的 134 处明显 OCR 字形校正，再生成读音。遇到原句与审核前后值均不匹配时停止，避免覆盖后续编辑。读音单独纠正表为 `data/example-reading-corrections.json`。每句移除标注后必须逐字还原原句，朗读仍使用原句。

读音使用 Kuromoji 0.1.2 / IPADIC；自动标注及抽查不代表完整专业审校。相关许可保存在 [第三方说明](third-party/kuromoji-NOTICE.md) 与 [Apache 2.0](third-party/kuromoji-LICENSE.txt)。重建词库或语法后都要重新运行假名脚本。

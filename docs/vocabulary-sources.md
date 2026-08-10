# 词汇数据来源与更新

LinguaStep v0.6.1 当前向应用启用 **2559 组**日英对应词，N1/N2/N3 每级不少于 800 词。基础词条与本地《红宝书》《绿宝书》词汇单元对齐；扫描件先通过本机 OCR 提取日语词头，再与内置日英词典候选去重匹配。OCR 无法完整识别的常用条目从已随项目校订的扩展词库补齐，并在界面标记为“教材词库补充”。

## 教材来源

- 本地《红宝书·新日本语能力考试 N3 文字词汇（详解＋练习）》：读取 20 个词汇单元，作为 N3 常用考试词的主要来源。
- 本地《无敌绿宝书·新日语能力考试 N2 词汇（必考词＋基础词＋超纲词）》：本轮读取必考词单元，补充 N2 高频词。
- 教材 PDF 为扫描版，OCR 只用于确认词头是否出现在教材中；含义、词性、读音和日英对应仍需通过结构化词典数据及人工复核确认。

## 数据来源与许可

- [JMdict/EDRDG](https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html)：提供日语写法、读音、英语释义和词性。本项目生成数据使用 CC BY-SA 4.0 发布的 JMdict 英语常用词 JSON；版权归 Electronic Dictionary Research and Development Group（EDRDG）所有。许可与再分发要求见 [EDRDG License Statement](https://www.edrdg.org/edrdg/licence.html)。当前生成批次对应 JMdict `3.6.2+20260720135044`，词典日期为 2026-07-20。
- [ECDICT](https://github.com/skywind3000/ECDICT)：提供英语音标、词频、词性与中文义项，项目采用 MIT License。
- [OpenCC](https://github.com/BYVoid/OpenCC)：生成脚本仅在构建数据时用于繁体中文到简体中文转换。

`data/words-expanded.generated.json` 是上述公开词典来源派生出的候选数据，目前只作为读音、英语释义和词性等字段的对齐材料，不会整体加载。对 JMdict 派生部分的再使用须遵守 CC BY-SA 4.0 和 EDRDG 的署名、相同方式共享及更新要求；ECDICT 部分仍受其 MIT License 约束。

## 生成规则

脚本会优先选择 JMdict 标记为常用的条目，并与 ECDICT 的英文词条对齐。随后执行：

1. 检查日语写法、假名、罗马音、英语词、中文义项、词性和频率字段。
2. 通过义项重合度降低同形多义词的错误配对。
3. 排除高歧义功能词和不适合作为独立词卡的内容。
4. 按日语写法与英语词分别去重，生成候选集合。
5. 普通动词保持词典原形；以「する」结尾的动词统一转换成サ变词干，例如「勉強する」转换为「勉強」。
6. 只有在本地红宝书或绿宝书 OCR 结果中出现、并完成核心义复核的候选才加入 `data/words-exam-reference.ts`。
7. 应用运行时将人工基础词和教材复核词合并，再按日语词头与英语词头双重去重。

自动对齐内容适合个人词汇学习，但不能替代专业双语词典。遇到义项或读音问题，应以权威词典为准并更新生成规则。

## 定期更新

下载最新 JMdict 英语 common JSON 和 ECDICT CSV 后执行：

```bash
python3 -m pip install -r scripts/requirements-vocabulary.txt
python3 scripts/build-expanded-vocabulary.py \
  /path/to/jmdict-eng-common.json \
  /path/to/ecdict.csv \
  data/words-expanded.generated.json \
  6500
npm test -- --run tests/content.test.ts
```

更新时必须同步记录教材范围、候选词典版本和复核数量，并完成全量测试，确保最终词条不重复且字段完整。不得为了数量重新启用未经教材核对的整个自动候选库。

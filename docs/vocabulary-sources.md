# 词汇数据来源与更新

LinguaStep v0.5.0 的内置词库固定向应用导出 6000 组日英对应词。原有 300 组人工精编词保持在最前，剩余内容由可复现脚本对公开词典数据进行筛选、语义对齐、简繁转换和去重后生成。

## 数据来源与许可

- [JMdict/EDRDG](https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html)：提供日语写法、读音、英语释义和词性。本项目生成数据使用 CC BY-SA 4.0 发布的 JMdict 英语常用词 JSON；版权归 Electronic Dictionary Research and Development Group（EDRDG）所有。许可与再分发要求见 [EDRDG License Statement](https://www.edrdg.org/edrdg/licence.html)。当前生成批次对应 JMdict `3.6.2+20260720135044`，词典日期为 2026-07-20。
- [ECDICT](https://github.com/skywind3000/ECDICT)：提供英语音标、词频、词性与中文义项，项目采用 MIT License。
- [OpenCC](https://github.com/BYVoid/OpenCC)：生成脚本仅在构建数据时用于繁体中文到简体中文转换。

`data/words-expanded.generated.json` 是上述来源派生出的紧凑补充数据。对 JMdict 派生部分的再使用须遵守 CC BY-SA 4.0 和 EDRDG 的署名、相同方式共享及更新要求；ECDICT 部分仍受其 MIT License 约束。

## 生成规则

脚本会优先选择 JMdict 标记为常用的条目，并与 ECDICT 的英文词条对齐。随后执行：

1. 检查日语写法、假名、罗马音、英语词、中文义项、词性和频率字段。
2. 通过义项重合度降低同形多义词的错误配对。
3. 排除高歧义功能词和不适合作为独立词卡的内容。
4. 按日语写法与英语词分别去重，生成 6500 条候选。
5. 应用运行时将原 300 组人工内容与候选合并，再次去重并截取前 6000 组。

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

更新时必须同步记录 JMdict 发布版本和词典日期，并完成全量测试，确保最终仍是 6000 个不重复且字段完整的词条。

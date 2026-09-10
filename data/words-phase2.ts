import type { FrequencyLevel, WordPair } from "@/lib/models";

type CoreSpec = [
  meaningZh: string,
  japanese: string,
  reading: string,
  romanization: string,
  english: string,
  phonetic: string,
];

type VerbSpec = [
  meaningZh: string,
  japanese: string,
  reading: string,
  romanization: string,
  english: string,
  phonetic: string,
  japaneseObject: string,
  englishObject: string,
];

type AdverbSpec = [
  meaningZh: string,
  japanese: string,
  reading: string,
  romanization: string,
  english: string,
  phonetic: string,
  japaneseExample: string,
  englishExample: string,
];

function levels(index: number): { japanese: string; english: string } {
  return {
    japanese:
      index < 60 ? "JLPT N3" : index < 170 ? "JLPT N2" : "JLPT N1",
    english:
      index < 100
        ? "CET-4"
        : index < 170
          ? "CET-6"
          : "TOEIC",
  };
}

function frequency(index: number): FrequencyLevel {
  if (index < 80) return "高频";
  if (index < 160) return "常用";
  if (index < 190) return "普通";
  return "低频";
}

function wordId(index: number): string {
  return `word-${String(index + 101).padStart(3, "0")}`;
}

function noun(spec: CoreSpec, index: number): WordPair {
  const [meaningZh, japanese, reading, romanization, english, phonetic] = spec;
  const level = levels(index);
  const patterns = [
    {
      jp: `授業で「${japanese}」について具体的に話し合った。`,
      en: `We discussed the ${english} in detail during class.`,
      zh: `我们在课堂上详细讨论了${meaningZh}。`,
    },
    {
      jp: `${japanese}を正しく理解することが大切だ。`,
      en: `It is important to understand the ${english} correctly.`,
      zh: `正确理解${meaningZh}很重要。`,
    },
    {
      jp: `報告書には${japanese}に関する最新の情報が載っている。`,
      en: `The report contains the latest information about the ${english}.`,
      zh: `报告中载有关于${meaningZh}的最新信息。`,
    },
    {
      jp: `専門家は${japanese}の変化を注意深く調べた。`,
      en: `The experts carefully examined changes in the ${english}.`,
      zh: `专家仔细调查了${meaningZh}的变化。`,
    },
    {
      jp: `私たちは${japanese}を考慮して次の行動を決めた。`,
      en: `We decided what to do next after considering the ${english}.`,
      zh: `我们考虑了${meaningZh}后决定了下一步行动。`,
    },
  ];
  const example = patterns[index % patterns.length];
  const rank = frequency(index);
  return {
    id: wordId(index),
    meaningZh,
    japanese: {
      term: japanese,
      reading,
      romanization,
      partOfSpeech: "名词",
      difficulty: level.japanese,
      example: example.jp,
      exampleZh: example.zh,
      collocations: [`${japanese}に関する`, `${japanese}を考慮する`],
    },
    english: {
      term: english,
      phonetic,
      partOfSpeech: "noun",
      difficulty: level.english,
      example: example.en,
      exampleZh: example.zh,
      collocations: [`the ${english}`, `${english} related`],
    },
    note: "",
    highFrequency: rank === "高频",
    frequency: rank,
    source: "curated",
  };
}

function verb(spec: VerbSpec, index: number): WordPair {
  const [
    meaningZh,
    japanese,
    reading,
    romanization,
    english,
    phonetic,
    japaneseObject,
    englishObject,
  ] = spec;
  const level = levels(index);
  const rank = frequency(index);
  const translation = `我们需要谨慎地${meaningZh}${englishObject === "the situation" ? "当前情况" : "相关内容"}。`;
  return {
    id: wordId(index),
    meaningZh,
    japanese: {
      term: japanese,
      reading,
      romanization,
      partOfSpeech: "动词",
      difficulty: level.japanese,
      example: `${japaneseObject}${japanese}ときは、十分な確認が必要だ。`,
      exampleZh: translation,
      collocations: [`慎重に${japanese}`, `${japanese}必要がある`],
    },
    english: {
      term: english,
      phonetic,
      partOfSpeech: "verb",
      difficulty: level.english,
      example: `We need to ${english} ${englishObject} carefully.`,
      exampleZh: translation,
      collocations: [`${english} carefully`, `need to ${english}`],
    },
    note: "",
    highFrequency: rank === "高频",
    frequency: rank,
    source: "curated",
  };
}

function adjective(spec: CoreSpec, index: number): WordPair {
  const [meaningZh, japanese, reading, romanization, english, phonetic] = spec;
  const level = levels(index);
  const rank = frequency(index);
  return {
    id: wordId(index),
    meaningZh,
    japanese: {
      term: japanese,
      reading,
      romanization,
      partOfSpeech: japanese.endsWith("い") ? "い形容词" : "形容动词・连体词",
      difficulty: level.japanese,
      example: `この場面では、より${japanese}判断が求められる。`,
      exampleZh: `在这种场合，需要更${meaningZh}的判断。`,
      collocations: [`${japanese}判断`, `非常に${japanese}`],
    },
    english: {
      term: english,
      phonetic,
      partOfSpeech: "adjective",
      difficulty: level.english,
      example: `This situation requires a more ${english} judgment.`,
      exampleZh: `这种情况需要更${meaningZh}的判断。`,
      collocations: [`highly ${english}`, `${english} approach`],
    },
    note: "",
    highFrequency: rank === "高频",
    frequency: rank,
    source: "curated",
  };
}

function adverb(spec: AdverbSpec, index: number): WordPair {
  const [
    meaningZh,
    japanese,
    reading,
    romanization,
    english,
    phonetic,
    japaneseExample,
    englishExample,
  ] = spec;
  const level = levels(index);
  const rank = frequency(index);
  return {
    id: wordId(index),
    meaningZh,
    japanese: {
      term: japanese,
      reading,
      romanization,
      partOfSpeech: "副词・接续表达",
      difficulty: level.japanese,
      example: japaneseExample,
      exampleZh: `该句在语境中表达“${meaningZh}”。`,
      collocations: [`${japanese}確認する`, `${japanese}説明する`],
    },
    english: {
      term: english,
      phonetic,
      partOfSpeech: "adverb / connector",
      difficulty: level.english,
      example: englishExample,
      exampleZh: `该句在语境中表达“${meaningZh}”。`,
      collocations: [`${english} important`, `${english}, ...`],
    },
    note: "",
    highFrequency: rank === "高频",
    frequency: rank,
    source: "curated",
  };
}

const NOUNS: CoreSpec[] = [
  ["课题", "課題", "かだい", "kadai", "issue", "/ˈɪʃuː/"],
  ["趋势", "傾向", "けいこう", "keikō", "trend", "/trend/"],
  ["对策", "対策", "たいさく", "taisaku", "measure", "/ˈmeʒər/"],
  ["价值", "価値", "かち", "kachi", "value", "/ˈvæljuː/"],
  ["需求", "需要", "じゅよう", "juyō", "demand", "/dɪˈmænd/"],
  ["供给", "供給", "きょうきゅう", "kyōkyū", "supply", "/səˈplaɪ/"],
  ["费用", "費用", "ひよう", "hiyō", "cost", "/kɔːst/"],
  ["利益", "利益", "りえき", "rieki", "benefit", "/ˈbenɪfɪt/"],
  ["损失", "損失", "そんしつ", "sonshitsu", "loss", "/lɔːs/"],
  ["调查", "調査", "ちょうさ", "chōsa", "survey", "/ˈsɜːrveɪ/"],
  ["研究", "研究", "けんきゅう", "kenkyū", "research", "/rɪˈsɜːrtʃ/"],
  ["分析", "分析", "ぶんせき", "bunseki", "analysis", "/əˈnæləsɪs/"],
  ["证据", "証拠", "しょうこ", "shōko", "evidence", "/ˈevɪdəns/"],
  ["判断", "判断", "はんだん", "handan", "judgment", "/ˈdʒʌdʒmənt/"],
  ["标准", "基準", "きじゅん", "kijun", "criterion", "/kraɪˈtɪəriən/"],
  ["条件", "条件", "じょうけん", "jōken", "condition", "/kənˈdɪʃən/"],
  ["范围", "範囲", "はんい", "han'i", "scope", "/skoʊp/"],
  ["特征", "特徴", "とくちょう", "tokuchō", "feature", "/ˈfiːtʃər/"],
  ["内容", "内容", "ないよう", "naiyō", "content", "/ˈkɑːntent/"],
  ["目的", "目的", "もくてき", "mokuteki", "purpose", "/ˈpɜːrpəs/"],
  ["效果", "効果", "こうか", "kōka", "effect", "/ɪˈfekt/"],
  ["原因", "原因", "げんいん", "gen'in", "cause", "/kɔːz/"],
  ["过程", "過程", "かてい", "katei", "process", "/ˈprɑːses/"],
  ["方针", "方針", "ほうしん", "hōshin", "policy", "/ˈpɑːləsi/"],
  ["战略", "戦略", "せんりゃく", "senryaku", "strategy", "/ˈstrætədʒi/"],
  ["手段", "手段", "しゅだん", "shudan", "means", "/miːnz/"],
  ["立场", "立場", "たちば", "tachiba", "position", "/pəˈzɪʃən/"],
  ["观点", "観点", "かんてん", "kanten", "perspective", "/pərˈspektɪv/"],
  ["课程", "課程", "かてい", "katei", "curriculum", "/kəˈrɪkjələm/"],
  ["成果", "成果", "せいか", "seika", "outcome", "/ˈaʊtkʌm/"],
  ["现象", "現象", "げんしょう", "genshō", "phenomenon", "/fəˈnɑːmɪnən/"],
  ["作用", "役割", "やくわり", "yakuwari", "role", "/roʊl/"],
  ["竞争", "競争", "きょうそう", "kyōsō", "competition", "/ˌkɑːmpəˈtɪʃən/"],
  ["合作", "協力", "きょうりょく", "kyōryoku", "cooperation", "/koʊˌɑːpəˈreɪʃən/"],
  ["互动", "交流", "こうりゅう", "kōryū", "interaction", "/ˌɪntərˈækʃən/"],
  ["谈判", "交渉", "こうしょう", "kōshō", "negotiation", "/nɪˌɡoʊʃiˈeɪʃən/"],
  ["合同", "契約", "けいやく", "keiyaku", "contract", "/ˈkɑːntrækt/"],
  ["法律", "法律", "ほうりつ", "hōritsu", "law", "/lɔː/"],
  ["权利", "権利", "けんり", "kenri", "right", "/raɪt/"],
  ["义务", "義務", "ぎむ", "gimu", "obligation", "/ˌɑːblɪˈɡeɪʃən/"],
  ["资格", "資格", "しかく", "shikaku", "qualification", "/ˌkwɑːlɪfɪˈkeɪʃən/"],
  ["预算", "予算", "よさん", "yosan", "budget", "/ˈbʌdʒɪt/"],
  ["收入", "収入", "しゅうにゅう", "shūnyū", "income", "/ˈɪnkʌm/"],
  ["支出", "支出", "ししゅつ", "shishutsu", "expenditure", "/ɪkˈspendɪtʃər/"],
  ["储蓄", "貯金", "ちょきん", "chokin", "savings", "/ˈseɪvɪŋz/"],
  ["债务", "借金", "しゃっきん", "shakkin", "debt", "/det/"],
  ["税款", "税金", "ぜいきん", "zeikin", "tax", "/tæks/"],
  ["物价", "物価", "ぶっか", "bukka", "prices", "/ˈpraɪsɪz/"],
  ["经济形势", "景気", "けいき", "keiki", "business climate", "/ˈbɪznəs ˈklaɪmət/"],
  ["就业", "雇用", "こよう", "koyō", "employment", "/ɪmˈplɔɪmənt/"],
  ["人口", "人口", "じんこう", "jinkō", "population", "/ˌpɑːpjəˈleɪʃən/"],
  ["世代", "世代", "せだい", "sedai", "generation", "/ˌdʒenəˈreɪʃən/"],
  ["效率", "能率", "のうりつ", "nōritsu", "productivity", "/ˌproʊdʌkˈtɪvəti/"],
  ["质量", "品質", "ひんしつ", "hinshitsu", "quality", "/ˈkwɑːləti/"],
  ["库存", "在庫", "ざいこ", "zaiko", "inventory", "/ˈɪnvəntɔːri/"],
  ["设备", "設備", "せつび", "setsubi", "equipment", "/ɪˈkwɪpmənt/"],
  ["设施", "施設", "しせつ", "shisetsu", "facility", "/fəˈsɪləti/"],
  ["住宅", "住宅", "じゅうたく", "jūtaku", "housing", "/ˈhaʊzɪŋ/"],
  ["灾害", "災害", "さいがい", "saigai", "disaster", "/dɪˈzæstər/"],
  ["污染", "汚染", "おせん", "osen", "pollution", "/pəˈluːʃən/"],
];

const VERBS: VerbSpec[] = [
  ["处理", "扱う", "あつかう", "atsukau", "deal with", "/diːl wɪð/", "大量のデータを", "large amounts of data"],
  ["补充", "補う", "おぎなう", "oginau", "supplement", "/ˈsʌplɪment/", "不足している情報を", "the missing information"],
  ["防止", "防ぐ", "ふせぐ", "fusegu", "prevent", "/prɪˈvent/", "事故を", "accidents"],
  ["省去", "省く", "はぶく", "habuku", "omit", "/oʊˈmɪt/", "不要な手順を", "unnecessary steps"],
  ["缩写", "省略する", "しょうりゃくする", "shōryaku suru", "abbreviate", "/əˈbriːvieɪt/", "長い名称を", "the long name"],
  ["重新审视", "見直す", "みなおす", "minaosu", "reconsider", "/ˌriːkənˈsɪdər/", "現在の計画を", "the current plan"],
  ["致力于", "取り組む", "とりくむ", "torikumu", "tackle", "/ˈtækəl/", "難しい課題に", "the difficult issue"],
  ["承担", "引き受ける", "ひきうける", "hikiukeru", "undertake", "/ˌʌndərˈteɪk/", "大切な仕事を", "the important task"],
  ["放弃", "断念する", "だんねんする", "dannen suru", "abandon", "/əˈbændən/", "無理な計画を", "the unrealistic plan"],
  ["强调", "強調する", "きょうちょうする", "kyōchō suru", "emphasize", "/ˈemfəsaɪz/", "安全の重要性を", "the importance of safety"],
  ["指出", "指摘する", "してきする", "shiteki suru", "point out", "/pɔɪnt aʊt/", "報告書の問題を", "the problem in the report"],
  ["主张", "主張する", "しゅちょうする", "shuchō suru", "assert", "/əˈsɜːrt/", "自分の意見を", "their opinion"],
  ["承认", "認める", "みとめる", "mitomeru", "acknowledge", "/əkˈnɑːlɪdʒ/", "自分の間違いを", "the mistake"],
  ["促使", "促す", "うながす", "unagasu", "prompt", "/prɑːmpt/", "早めの対応を", "an early response"],
  ["妨碍", "妨げる", "さまたげる", "samatageru", "hinder", "/ˈhɪndər/", "作業の進行を", "the progress of the work"],
  ["扩大", "拡大する", "かくだいする", "kakudai suru", "expand", "/ɪkˈspænd/", "事業の範囲を", "the scope of the project"],
  ["缩小", "縮小する", "しゅくしょうする", "shukushō suru", "shrink", "/ʃrɪŋk/", "生産規模を", "the scale of production"],
  ["维持", "維持する", "いじする", "iji suru", "sustain", "/səˈsteɪn/", "現在の品質を", "the current quality"],
  ["引进", "導入する", "どうにゅうする", "dōnyū suru", "introduce", "/ˌɪntrəˈduːs/", "新しい制度を", "the new system"],
  ["废除", "廃止する", "はいしする", "haishi suru", "abolish", "/əˈbɑːlɪʃ/", "古い規則を", "the old rule"],
  ["限制", "制限する", "せいげんする", "seigen suru", "restrict", "/rɪˈstrɪkt/", "利用時間を", "access time"],
  ["区分", "区別する", "くべつする", "kubetsu suru", "distinguish", "/dɪˈstɪŋɡwɪʃ/", "二つの概念を", "the two concepts"],
  ["评价", "評価する", "ひょうかする", "hyōka suru", "evaluate", "/ɪˈvæljueɪt/", "学習の成果を", "the learning outcome"],
  ["观察", "観察する", "かんさつする", "kansatsu suru", "observe", "/əbˈzɜːrv/", "行動の変化を", "changes in behavior"],
  ["记录", "記録する", "きろくする", "kiroku suru", "record", "/rɪˈkɔːrd/", "毎日の結果を", "the daily results"],
  ["保存", "保存する", "ほぞんする", "hozon suru", "preserve", "/prɪˈzɜːrv/", "重要な資料を", "the important documents"],
  ["整理", "整理する", "せいりする", "seiri suru", "organize", "/ˈɔːrɡənaɪz/", "集めた情報を", "the collected information"],
  ["分类", "分類する", "ぶんるいする", "bunrui suru", "classify", "/ˈklæsɪfaɪ/", "資料を目的別に", "the materials by purpose"],
  ["加工", "処理する", "しょりする", "shori suru", "process data", "/ˈprɑːses ˈdeɪtə/", "入力データを", "the input data"],
  ["操作", "操作する", "そうさする", "sōsa suru", "operate", "/ˈɑːpəreɪt/", "この機械を", "this machine"],
  ["管理", "管理する", "かんりする", "kanri suru", "manage", "/ˈmænɪdʒ/", "限られた予算を", "the limited budget"],
  ["调整", "調整する", "ちょうせいする", "chōsei suru", "adjust", "/əˈdʒʌst/", "予定を", "the schedule"],
  ["连接", "接続する", "せつぞくする", "setsuzoku suru", "connect", "/kəˈnekt/", "二つの機器を", "the two devices"],
  ["分离", "分離する", "ぶんりする", "bunri suru", "separate", "/ˈsepəreɪt/", "有用な成分を", "the useful component"],
  ["整合", "統合する", "とうごうする", "tōgō suru", "integrate", "/ˈɪntɪɡreɪt/", "複数の機能を", "several functions"],
  ["共享", "共有する", "きょうゆうする", "kyōyū suru", "share", "/ʃer/", "必要な情報を", "the necessary information"],
  ["委托", "依頼する", "いらいする", "irai suru", "request", "/rɪˈkwest/", "専門家に調査を", "an investigation from the expert"],
  ["响应", "応じる", "おうじる", "ōjiru", "respond", "/rɪˈspɑːnd/", "相手の要望に", "the other person's request"],
  ["遵从", "従う", "したがう", "shitagau", "obey", "/oʊˈbeɪ/", "安全規則に", "the safety rules"],
  ["违反", "違反する", "いはんする", "ihan suru", "violate", "/ˈvaɪəleɪt/", "法律に", "the law"],
  ["克服", "克服する", "こくふくする", "kokufuku suru", "overcome", "/ˌoʊvərˈkʌm/", "大きな困難を", "the major difficulty"],
  ["忍受", "耐える", "たえる", "taeru", "endure", "/ɪnˈdjʊr/", "厳しい寒さに", "the severe cold"],
  ["带来影响", "及ぼす", "およぼす", "oyobosu", "exert", "/ɪɡˈzɜːrt/", "社会に大きな影響を", "a strong influence on society"],
  ["伴随", "伴う", "ともなう", "tomonau", "accompany", "/əˈkʌmpəni/", "急な変化に危険が", "the rapid change"],
  ["属于", "属する", "ぞくする", "zoku suru", "belong", "/bɪˈlɔːŋ/", "同じ分類に", "the same category"],
  ["占据", "占める", "しめる", "shimeru", "account for", "/əˈkaʊnt fɔːr/", "全体の半分を", "half of the total"],
  ["适合", "適する", "てきする", "teki suru", "suit", "/suːt/", "初心者の学習に", "beginner learners"],
  ["出色", "優れる", "すぐれる", "sugureru", "excel", "/ɪkˈsel/", "実用性に", "practical performance"],
  ["不同", "異なる", "ことなる", "kotonaru", "differ", "/ˈdɪfər/", "地域によって条件が", "from region to region"],
  ["一致", "一致する", "いっちする", "itchi suru", "correspond", "/ˌkɔːrəˈspɑːnd/", "説明と結果が", "with the result"],
  ["满足", "満たす", "みたす", "mitasu", "satisfy", "/ˈsætɪsfaɪ/", "必要な条件を", "the necessary conditions"],
  ["缺少", "欠ける", "かける", "kakeru", "lack", "/læk/", "計画に具体性が", "specific details"],
  ["扩散", "拡がる", "ひろがる", "hirogaru", "spread", "/spred/", "新しい考えが社会に", "through society"],
  ["加深", "深める", "ふかめる", "fukameru", "deepen", "/ˈdiːpən/", "相互理解を", "mutual understanding"],
  ["提高", "高める", "たかめる", "takameru", "enhance", "/ɪnˈhæns/", "商品の価値を", "the value of the product"],
  ["下降", "低下する", "ていかする", "teika suru", "decline", "/dɪˈklaɪn/", "集中力が", "in concentration"],
  ["恢复", "回復する", "かいふくする", "kaifuku suru", "recover", "/rɪˈkʌvər/", "体力が", "from the illness"],
  ["产生", "発生する", "はっせいする", "hassei suru", "arise", "/əˈraɪz/", "新しい問題が", "from the change"],
  ["消耗", "消費する", "しょうひする", "shōhi suru", "consume", "/kənˈsuːm/", "大量の電力を", "a large amount of electricity"],
  ["生产", "生産する", "せいさんする", "seisan suru", "produce", "/prəˈduːs/", "安全な食品を", "safe food"],
  ["出口", "輸出する", "ゆしゅつする", "yushutsu suru", "export", "/ɪkˈspɔːrt/", "製品を海外へ", "products overseas"],
  ["进口", "輸入する", "ゆにゅうする", "yunyū suru", "import", "/ɪmˈpɔːrt/", "原料を海外から", "raw materials from abroad"],
  ["投资", "投資する", "とうしする", "tōshi suru", "invest", "/ɪnˈvest/", "教育に時間を", "time in education"],
  ["雇用", "雇う", "やとう", "yatou", "employ", "/ɪmˈplɔɪ/", "経験のある人を", "experienced people"],
  ["解雇", "解雇する", "かいこする", "kaiko suru", "dismiss", "/dɪsˈmɪs/", "規則に違反した職員を", "the employee who broke the rules"],
  ["节省", "節約する", "せつやくする", "setsuyaku suru", "save", "/seɪv/", "水と電気を", "water and electricity"],
  ["花费", "費やす", "ついやす", "tsuiyasu", "spend", "/spend/", "研究に多くの時間を", "a lot of time on research"],
  ["赚取", "稼ぐ", "かせぐ", "kasegu", "earn", "/ɜːrn/", "生活に必要なお金を", "enough money to live"],
  ["借入", "借りる", "かりる", "kariru", "borrow", "/ˈbɑːroʊ/", "図書館から本を", "a book from the library"],
  ["出借", "貸す", "かす", "kasu", "lend", "/lend/", "友人に資料を", "the material to a friend"],
];

const ADJECTIVES: CoreSpec[] = [
  ["恰当的", "適切な", "てきせつな", "tekisetsu na", "appropriate", "/əˈproʊpriət/"],
  ["准确的", "正確な", "せいかくな", "seikaku na", "accurate", "/ˈækjərət/"],
  ["明确的", "明確な", "めいかくな", "meikaku na", "clear", "/klɪr/"],
  ["模糊的", "曖昧な", "あいまいな", "aimai na", "vague", "/veɪɡ/"],
  ["灵活的", "柔軟な", "じゅうなんな", "jūnan na", "flexible", "/ˈfleksəbəl/"],
  ["严密的", "厳密な", "げんみつな", "genmitsu na", "precise", "/prɪˈsaɪs/"],
  ["合理的", "妥当な", "だとうな", "datō na", "valid", "/ˈvælɪd/"],
  ["有效的", "有効な", "ゆうこうな", "yūkō na", "effective", "/ɪˈfektɪv/"],
  ["高效的", "効率的な", "こうりつてきな", "kōritsuteki na", "efficient", "/ɪˈfɪʃənt/"],
  ["积极的", "積極的な", "せっきょくてきな", "sekkyokuteki na", "proactive", "/ˌproʊˈæktɪv/"],
  ["消极的", "消極的な", "しょうきょくてきな", "shōkyokuteki na", "passive", "/ˈpæsɪv/"],
  ["客观的", "客観的な", "きゃっかんてきな", "kyakkanteki na", "objective", "/əbˈdʒektɪv/"],
  ["主观的", "主観的な", "しゅかんてきな", "shukanteki na", "subjective", "/səbˈdʒektɪv/"],
  ["公平的", "公平な", "こうへいな", "kōhei na", "fair", "/fer/"],
  ["不平等的", "不平等な", "ふびょうどうな", "fubyōdō na", "unequal", "/ʌnˈiːkwəl/"],
  ["丰富的", "豊かな", "ゆたかな", "yutaka na", "abundant", "/əˈbʌndənt/"],
  ["匮乏的", "乏しい", "とぼしい", "toboshii", "scarce", "/skers/"],
  ["严重的", "深刻な", "しんこくな", "shinkoku na", "serious", "/ˈsɪriəs/"],
  ["关键的", "重大な", "じゅうだいな", "jūdai na", "critical", "/ˈkrɪtɪkəl/"],
  ["急剧的", "急激な", "きゅうげきな", "kyūgeki na", "rapid", "/ˈræpɪd/"],
  ["缓慢的", "緩やかな", "ゆるやかな", "yuruyaka na", "moderate", "/ˈmɑːdərət/"],
  ["稳定的", "安定した", "あんていした", "antei shita", "stable", "/ˈsteɪbəl/"],
  ["不稳定的", "不安定な", "ふあんていな", "fuantei na", "unstable", "/ʌnˈsteɪbəl/"],
  ["独特的", "独特な", "どくとくな", "dokutoku na", "distinctive", "/dɪˈstɪŋktɪv/"],
  ["共同的", "共通の", "きょうつうの", "kyōtsū no", "common", "/ˈkɑːmən/"],
  ["一般的", "一般的な", "いっぱんてきな", "ippanteki na", "general", "/ˈdʒenərəl/"],
  ["典型的", "典型的な", "てんけいてきな", "tenkeiteki na", "typical", "/ˈtɪpɪkəl/"],
  ["根本的", "基本的な", "きほんてきな", "kihonteki na", "fundamental", "/ˌfʌndəˈmentəl/"],
  ["暂时的", "一時的な", "いちじてきな", "ichijiteki na", "temporary", "/ˈtempəreri/"],
  ["永久的", "永続的な", "えいぞくてきな", "eizokuteki na", "permanent", "/ˈpɜːrmənənt/"],
  ["人工的", "人工的な", "じんこうてきな", "jinkōteki na", "artificial", "/ˌɑːrtɪˈfɪʃəl/"],
  ["自然的", "自然な", "しぜんな", "shizen na", "natural", "/ˈnætʃrəl/"],
  ["正式的", "公式の", "こうしきの", "kōshiki no", "official", "/əˈfɪʃəl/"],
  ["非正式的", "非公式の", "ひこうしきの", "hikōshiki no", "informal", "/ɪnˈfɔːrməl/"],
  ["合法的", "合法な", "ごうほうな", "gōhō na", "legal", "/ˈliːɡəl/"],
  ["违法的", "違法な", "いほうな", "ihō na", "illegal", "/ɪˈliːɡəl/"],
  ["肯定的", "肯定的な", "こうていてきな", "kōteiteki na", "affirmative", "/əˈfɜːrmətɪv/"],
  ["否定的", "否定的な", "ひていてきな", "hiteiteki na", "negative", "/ˈneɡətɪv/"],
  ["谨慎的", "慎重な", "しんちょうな", "shinchō na", "cautious", "/ˈkɔːʃəs/"],
  ["大胆的", "大胆な", "だいたんな", "daitan na", "bold", "/boʊld/"],
];

const ADVERBS: AdverbSpec[] = [
  ["事先", "あらかじめ", "あらかじめ", "arakajime", "beforehand", "/bɪˈfɔːrhænd/", "必要な資料をあらかじめ準備しておいた。", "We prepared the necessary materials beforehand."],
  ["偶然", "たまたま", "たまたま", "tamatama", "by chance", "/baɪ tʃæns/", "駅でたまたま昔の友人に会った。", "I met an old friend at the station by chance."],
  ["经常", "しばしば", "しばしば", "shibashiba", "frequently", "/ˈfriːkwəntli/", "この表現は新聞でしばしば使われる。", "This expression is frequently used in newspapers."],
  ["很少", "めったに", "めったに", "mettani", "rarely", "/ˈrerli/", "彼は忙しくて、めったに旅行しない。", "He is busy and rarely travels."],
  ["始终", "常に", "つねに", "tsuneni", "constantly", "/ˈkɑːnstəntli/", "状況は常に変化している。", "The situation is constantly changing."],
  ["暂时地", "一時的に", "いちじてきに", "ichijiteki ni", "temporarily", "/ˌtempəˈrerəli/", "工事のため、道路は一時的に閉鎖された。", "The road was temporarily closed for construction."],
  ["大概", "おそらく", "おそらく", "osoraku", "probably", "/ˈprɑːbəbli/", "おそらく明日には結果が分かるだろう。", "We will probably know the result tomorrow."],
  ["未必", "必ずしも", "かならずしも", "kanarazushimo", "not necessarily", "/nɑːt ˌnesəˈserəli/", "高い商品が必ずしも良いとは限らない。", "An expensive product is not necessarily better."],
  ["反而", "むしろ", "むしろ", "mushiro", "rather", "/ˈræðər/", "休むより、むしろ少し歩いたほうが気分がいい。", "Rather than resting, I feel better after a short walk."],
  ["而且", "さらに", "さらに", "sarani", "furthermore", "/ˌfɜːrðərˈmɔːr/", "費用が安く、さらに操作も簡単だ。", "It is inexpensive; furthermore, it is easy to operate."],
  ["因此", "したがって", "したがって", "shitagatte", "therefore", "/ˈðerfɔːr/", "需要が増えた。したがって、生産量も増えた。", "Demand increased; therefore, production also rose."],
  ["另一方面", "一方", "いっぽう", "ippō", "meanwhile", "/ˈmiːnwaɪl/", "都市の人口は増えた。一方、地方では減少した。", "The urban population grew; meanwhile, rural areas declined."],
  ["所以", "そのため", "そのため", "sono tame", "consequently", "/ˈkɑːnsɪkwentli/", "電車が遅れた。そのため、会議に間に合わなかった。", "The train was delayed; consequently, I missed the meeting."],
  ["换句话说", "つまり", "つまり", "tsumari", "in other words", "/ɪn ˈʌðər wɜːrdz/", "つまり、今の方法では十分ではないということだ。", "In other words, the current method is not sufficient."],
  ["例如", "例えば", "たとえば", "tatoeba", "for instance", "/fɔːr ˈɪnstəns/", "例えば、毎日十分だけでも復習すると効果がある。", "For instance, reviewing for ten minutes daily is effective."],
  ["实际上", "実際に", "じっさいに", "jissai ni", "actually", "/ˈæktʃuəli/", "説明を聞くだけでなく、実際に使ってみよう。", "Do not just listen to the explanation; actually try using it."],
  ["最终", "結局", "けっきょく", "kekkyoku", "eventually", "/ɪˈventʃuəli/", "何度も話し合い、結局その案を採用した。", "After many discussions, we eventually adopted the proposal."],
  ["同时", "同時に", "どうじに", "dōji ni", "simultaneously", "/ˌsaɪməlˈteɪniəsli/", "二つの作業を同時に進めるのは難しい。", "It is difficult to carry out two tasks simultaneously."],
  ["分别", "別々に", "べつべつに", "betsubetsu ni", "individually", "/ˌɪndɪˈvɪdʒuəli/", "問題を別々に考えたほうが分かりやすい。", "It is easier to consider each problem individually."],
  ["直接地", "直接", "ちょくせつ", "chokusetsu", "directly", "/dəˈrektli/", "担当者に直接質問してください。", "Please ask the person in charge directly."],
  ["间接地", "間接的に", "かんせつてきに", "kansetsuteki ni", "indirectly", "/ˌɪndəˈrektli/", "その変化は生活に間接的に影響した。", "The change indirectly affected daily life."],
  ["精确地", "正確に", "せいかくに", "seikaku ni", "accurately", "/ˈækjərətli/", "数字を正確に記録してください。", "Please record the figures accurately."],
  ["完全地", "完全に", "かんぜんに", "kanzen ni", "completely", "/kəmˈpliːtli/", "問題が完全に解決したわけではない。", "The problem has not been completely solved."],
  ["几乎", "ほとんど", "ほとんど", "hotondo", "almost", "/ˈɔːlmoʊst/", "準備はほとんど終わっている。", "The preparation is almost complete."],
  ["至少", "少なくとも", "すくなくとも", "sukunakutomo", "at least", "/æt liːst/", "少なくとも週に三回は復習したい。", "I want to review at least three times a week."],
  ["最多", "せいぜい", "せいぜい", "seizei", "at most", "/æt moʊst/", "この作業にはせいぜい一時間しかかからない。", "This task will take an hour at most."],
  ["不久", "まもなく", "まもなく", "mamonaku", "shortly", "/ˈʃɔːrtli/", "電車はまもなく到着します。", "The train will arrive shortly."],
  ["已经", "すでに", "すでに", "sudeni", "already", "/ɔːlˈredi/", "必要な手続きはすでに終わった。", "The necessary procedure is already complete."],
  ["仍然", "依然として", "いぜんとして", "izen to shite", "still", "/stɪl/", "原因は依然として分かっていない。", "The cause is still unknown."],
  ["依次", "順番に", "じゅんばんに", "junban ni", "in turn", "/ɪn tɜːrn/", "一人ずつ順番に意見を述べた。", "Each person expressed an opinion in turn."],
];

export const PHASE_TWO_WORDS: WordPair[] = [
  ...NOUNS.map((spec, index) => noun(spec, index)),
  ...VERBS.map((spec, offset) => verb(spec, NOUNS.length + offset)),
  ...ADJECTIVES.map((spec, offset) =>
    adjective(spec, NOUNS.length + VERBS.length + offset),
  ),
  ...ADVERBS.map((spec, offset) =>
    adverb(spec, NOUNS.length + VERBS.length + ADJECTIVES.length + offset),
  ),
];

import type { GrammarPoint } from "@/lib/models";
import { PHASE_TWO_GRAMMAR_POINTS } from "./grammar-phase2";

type ExerciseDraft = Omit<
  GrammarPoint["exercises"][number],
  "id" | "source" | "sourceId"
>;

function makeExercises(
  sourceId: string,
  drafts: ExerciseDraft[],
): GrammarPoint["exercises"] {
  return drafts.map((draft, index) => ({
    id: `${sourceId}-q${index + 1}`,
    source: "grammar",
    sourceId,
    ...draft,
  }));
}

const PHASE_ONE_GRAMMAR_POINTS: GrammarPoint[] = [
  {
    id: "jp-noni",
    title: "〜のに：明明……却……",
    language: "japanese",
    level: "JLPT N3 巩固",
    explanation:
      "「〜のに」表示实际结果与根据前项自然预期的结果相反，相当于中文的“明明……却……”。它常带有说话人的意外、不满、遗憾或责备，后句通常不是命令、请求等意志表达。",
    structure: "普通形＋のに；名词／な形容词＋なのに",
    connection:
      "动词和い形容词接普通形；な形容词与名词现在肯定形要加「な」，构成「静かなのに」「休日なのに」。",
    scenarios: ["表达出乎意料的结果", "表示遗憾或不满", "委婉责备对方"],
    nuance:
      "比「けれども」的转折情绪更强，暗含“按理说不该如此”的预期。句末只说「〜のに」时，常把遗憾或抱怨留给听者体会。",
    examples: [
      {
        text: "毎日練習しているのに、なかなか上手になりません。",
        translationZh: "明明每天都在练习，却总是不见长进。",
      },
      {
        text: "この部屋は駅に近いのに、とても静かです。",
        translationZh: "这个房间明明离车站很近，却非常安静。",
      },
    ],
    comparison: {
      japanese: "薬を飲んだのに、熱が下がらなかった。",
      english: "Although I took the medicine, my fever did not go down.",
      translationZh: "虽然吃了药，烧却没有退。",
    },
    commonErrors: [
      "误说「便利のに」；な形容词现在肯定形应说「便利なのに」。",
      "在后句直接接请求或命令，如「雨なのに、来てください」；这种场合通常改用「けれども／ても」。",
    ],
    confusables: [
      "「〜ても」表示让步条件“即使……也……”，不一定陈述已经发生的事实；「〜のに」多针对实际发生的反预期结果。",
      "「〜けれども」只是一般转折，情绪色彩通常比「〜のに」弱。",
    ],
    exercises: makeExercises("jp-noni", [
      {
        prompt: "选择最自然的一项：毎日早く寝ている（　）、朝起きるのがつらい。",
        options: ["のに", "ので", "ために", "ながら"],
        correctIndex: 0,
        explanation:
          "前项“每天早睡”通常应带来容易起床的结果，实际却相反，因此用表示反预期的「のに」。",
      },
      {
        prompt: "选择正确接续：この町は便利（　）、家賃があまり高くない。",
        options: ["のに", "なのに", "だのに", "でのに"],
        correctIndex: 1,
        explanation:
          "「便利」是な形容词，现在肯定形接「のに」时要用「便利なのに」。",
      },
      {
        prompt: "哪一句最适合表达“明明约好了，他却没来”？",
        options: [
          "約束したので、彼は来なかった。",
          "約束しても、彼は来なかった。",
          "約束したのに、彼は来なかった。",
          "約束するために、彼は来なかった。",
        ],
        correctIndex: 2,
        explanation:
          "约好之后按理应赴约，结果却没有来；「約束したのに」准确表达遗憾和反预期。",
      },
      {
        prompt: "「日曜日なのに、会社へ行かなければならない」主要表达什么语气？",
        options: ["目的", "遗憾或不满", "原因", "同时进行"],
        correctIndex: 1,
        explanation:
          "星期日本应休息，却必须去公司，句子借「のに」表达说话人的遗憾或不满。",
      },
      {
        prompt: "选择最自然的一项：もう十二時（　）、弟はまだ帰ってこない。",
        options: ["なのに", "なために", "のでに", "だように"],
        correctIndex: 0,
        explanation:
          "名词「十二時」接「のに」要用「十二時なのに」，表示已经很晚但弟弟仍未回来。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-temo",
    title: "〜ても：即使……也……",
    language: "japanese",
    level: "JLPT N3 巩固",
    explanation:
      "「〜ても」表示即便前项条件成立，后项结果仍不受影响，相当于“即使……也……”。它既能谈尚未发生的假设，也能说明反复成立的让步关系，语气通常比「のに」客观。",
    structure: "动词て形＋も；い形容词去い＋くても；な形容词／名词＋でも",
    connection:
      "动词按て形变化后加「も」，如「雨が降っても」；い形容词用「高くても」，な形容词和名词用「静かでも」「雨でも」。",
    scenarios: ["提出让步条件", "表示决心不受条件影响", "说明极端条件下仍成立"],
    nuance:
      "重点不在转折情绪，而在“该条件不能改变结论”。与疑问词搭配可构成「何をしても」「どこへ行っても」等全面让步表达。",
    examples: [
      {
        text: "雨が降っても、試合は予定どおり行われます。",
        translationZh: "即使下雨，比赛也会按计划举行。",
      },
      {
        text: "この仕事は忙しくても、やりがいがあります。",
        translationZh: "这份工作即使很忙，也很有价值。",
      },
    ],
    comparison: {
      japanese: "たとえ失敗しても、もう一度挑戦します。",
      english: "Even if I fail, I will try again.",
      translationZh: "即使失败，我也会再挑战一次。",
    },
    commonErrors: [
      "把い形容词接成「高いても」；正确形式是去掉「い」后说「高くても」。",
      "把名词接成「学生ても」；名词后要用「でも」，即「学生でも」。",
    ],
    confusables: [
      "「〜たら」表示条件成立后通常会出现相应结果；「〜ても」强调即便成立，结论仍不改变。",
      "「〜のに」常描述已发生事实并带遗憾；「〜ても」更适合假设性的“即使”。",
    ],
    exercises: makeExercises("jp-temo", [
      {
        prompt: "选择最自然的一项：少し高く（　）、品質のいい物を買いたい。",
        options: ["ても", "でも", "のに", "ながら"],
        correctIndex: 0,
        explanation:
          "い形容词「高い」变为「高く」后接「ても」，表示即使稍贵也想买质量好的东西。",
      },
      {
        prompt: "选择正确接续：日曜日（　）、この図書館は開いています。",
        options: ["ても", "くても", "でも", "なのでも"],
        correctIndex: 2,
        explanation:
          "名词「日曜日」表示让步条件时直接接「でも」，构成「日曜日でも」。",
      },
      {
        prompt: "“即使被反对，我也不改变决定”最自然的日语是？",
        options: [
          "反対されたので、決心を変えません。",
          "反対されても、決心を変えません。",
          "反対されたのに、決心を変えます。",
          "反対されるために、決心を変えません。",
        ],
        correctIndex: 1,
        explanation:
          "反对这一条件不会影响“不改变决定”的结论，应用「反対されても」。",
      },
      {
        prompt: "选择最自然的一项：何度説明し（　）、彼は納得しなかった。",
        options: ["たら", "ても", "ので", "ながら"],
        correctIndex: 1,
        explanation:
          "「何度〜ても」表示无论多少次都不改变结果，此处意为解释多少次他都没有接受。",
      },
      {
        prompt: "下列哪项主要表示尚未确定的让步条件？",
        options: [
          "雨が降ったので、中止した。",
          "雨が降ったのに、出かけた。",
          "雨が降ったとき、家にいた。",
          "雨が降っても、出かける。",
        ],
        correctIndex: 3,
        explanation:
          "「雨が降っても」把下雨当作可能条件，并表示出门这一决定不受它影响。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-youni",
    title: "〜ように：为了能够……／以便……",
    language: "japanese",
    level: "JLPT N3 巩固",
    explanation:
      "「〜ように」表示以某种状态或能力的实现为目标，常译为“为了能……”“以便……”。前项多是不完全由意志控制的动词，如可能形、无意志动词或否定形；主句说明为此采取的行动。",
    structure: "动词辞书形／ない形＋ように",
    connection:
      "直接接动词普通形，常见形式有「できるように」「忘れないように」「聞こえるように」。前后分句的主语可以不同。",
    scenarios: ["为获得能力而努力", "为避免某结果采取措施", "转述提醒或愿望"],
    nuance:
      "关注的是期望状态能否实现，而不是一个主动完成的具体动作。表示提醒时，「〜ようにしてください」比直接命令更委婉。",
    examples: [
      {
        text: "日本語のニュースが分かるように、毎日語彙を勉強しています。",
        translationZh: "为了能听懂日语新闻，我每天学习词汇。",
      },
      {
        text: "大事な予定を忘れないように、カレンダーに書いておきました。",
        translationZh: "为了不忘记重要安排，我事先写在了日历上。",
      },
    ],
    comparison: {
      japanese: "後ろの人にも聞こえるように、大きな声で話してください。",
      english: "Please speak loudly so that the people in the back can hear you.",
      translationZh: "请大声说，以便后面的人也能听见。",
    },
    commonErrors: [
      "把主动完成具体目标一律接「ように」，如「日本へ行くように貯金する」；若目的是主动去日本，通常说「行くために」。",
      "遗漏否定形中的「ない」，把“为了不忘记”误说成「忘れるように」；应说「忘れないように」。",
    ],
    confusables: [
      "「〜ために」多接意志动词并表示明确目的，前后主语原则上相同；「〜ように」常接可能形或无意志表达，前后主语可不同。",
      "表示比喻或方式的「〜ように」也使用同一形式，如「先生が言ったように」，需根据语境判断。",
    ],
    exercises: makeExercises("jp-youni", [
      {
        prompt: "选择最自然的一项：漢字が読める（　）、毎日少しずつ練習しています。",
        options: ["ためで", "ように", "のに", "そうに"],
        correctIndex: 1,
        explanation:
          "「読める」是能力状态，以获得该能力为目标时使用「読めるように」。",
      },
      {
        prompt: "选择最自然的一项：遅刻しない（　）、いつもより早く家を出た。",
        options: ["ように", "のに", "ほど", "ながら"],
        correctIndex: 0,
        explanation:
          "提前出门是为了避免迟到这一结果，因此使用「遅刻しないように」。",
      },
      {
        prompt: "哪一句最适合“请写清楚一点，以便谁都能看懂”？",
        options: [
          "誰でも読めるように、はっきり書いてください。",
          "誰でも読むために、はっきり書いてください。",
          "誰でも読んだのに、はっきり書いてください。",
          "誰でも読みながら、はっきり書いてください。",
        ],
        correctIndex: 0,
        explanation:
          "“任何人都能读懂”是期望实现的能力状态，所以「読めるように」最自然。",
      },
      {
        prompt: "“为了不感冒，请注意保暖”中空格应填什么？風邪をひかない（　）、暖かくしてください。",
        options: ["ものを", "ことに", "ように", "わけで"],
        correctIndex: 2,
        explanation:
          "「ない形＋ように」表示为避免某结果而采取行动，此处是避免感冒。",
      },
      {
        prompt: "下列哪项更适合使用「ために」而不是目的用法的「ように」？",
        options: [
          "子どもにも見える（　）、低い所に置く。",
          "忘れない（　）、メモを取る。",
          "医者になる（　）、大学で医学を学ぶ。",
          "声が届く（　）、マイクを使う。",
        ],
        correctIndex: 2,
        explanation:
          "成为医生是说话人主动追求的明确目标，通常说「医者になるために」。其余都是能力、避免或状态目标，宜用「ように」。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-tameni",
    title: "〜ために：为了……",
    language: "japanese",
    level: "JLPT N3 巩固",
    explanation:
      "「〜ために」接在有意志的动作或目标后，说明后项行为的明确目的，相当于“为了……”。目的用法中，前后动作的实施者原则上相同，后项通常是为达成目标而主动采取的手段。",
    structure: "意志动词辞书形＋ために；名词＋の＋ために",
    connection:
      "动词用辞书形，如「合格するために」；名词后加「の」，如「健康のために」。这里讲的是目的用法，不是表示原因的「〜ため（に）」。",
    scenarios: ["说明行动的明确目的", "说明为某人或某事付出", "表达目标与实现手段"],
    nuance:
      "比「〜に」形式更完整、正式，适合解释计划和理由。若前项不是可控制的意志目标，通常要改用「〜ように」。",
    examples: [
      {
        text: "留学するために、アルバイトをしてお金をためています。",
        translationZh: "为了留学，我在打工存钱。",
      },
      {
        text: "家族のために、毎日まじめに働いています。",
        translationZh: "为了家人，我每天认真工作。",
      },
    ],
    comparison: {
      japanese: "試験に合格するために、学習計画を立てた。",
      english: "I made a study plan in order to pass the exam.",
      translationZh: "为了通过考试，我制定了学习计划。",
    },
    commonErrors: [
      "前后主语不一致却使用目的「ために」，如「子どもが読めるために、字を大きくした」；应改为「読めるように」。",
      "名词后漏掉「の」，误说「健康ために」；正确形式是「健康のために」。",
    ],
    confusables: [
      "目的「〜ために」前接意志性目标；「〜ように」前常接可能形、无意志动词或否定形。",
      "原因用法「事故のため、電車が遅れた」译为“由于事故”，不是目的，要从前后逻辑判断。",
    ],
    exercises: makeExercises("jp-tameni", [
      {
        prompt: "选择最自然的一项：大学院に入る（　）、毎晩勉強している。",
        options: ["のに", "ために", "ようで", "ところで"],
        correctIndex: 1,
        explanation:
          "进入研究生院是本人有意识追求的目标，晚间学习是为此采取的手段，所以用「ために」。",
      },
      {
        prompt: "选择正确接续：健康（　）、毎朝三十分歩いています。",
        options: ["ために", "のために", "なために", "でために"],
        correctIndex: 1,
        explanation:
          "名词「健康」接目的「ために」时要加「の」，构成「健康のために」。",
      },
      {
        prompt: "哪一句中的「ために」明确表示目的？",
        options: [
          "大雪のために、道路が閉鎖された。",
          "病気のために、学校を休んだ。",
          "資格を取るために、講座に通っている。",
          "事故のために、会議に遅れた。",
        ],
        correctIndex: 2,
        explanation:
          "参加课程是为了取得资格，前后构成目标与手段。其他三项的「ために」都表示原因。",
      },
      {
        prompt: "选择最自然的一项：“为了让婴儿也能吃，把蔬菜煮软了。”",
        options: [
          "赤ちゃんも食べるために、野菜を柔らかく煮た。",
          "赤ちゃんも食べられるように、野菜を柔らかく煮た。",
          "赤ちゃんも食べたのに、野菜を柔らかく煮た。",
          "赤ちゃんも食べながら、野菜を柔らかく煮た。",
        ],
        correctIndex: 1,
        explanation:
          "前后主语不同，且「食べられる」表示能力状态，应使用「ように」，不是目的「ために」。",
      },
      {
        prompt: "下列哪种情况最符合目的「〜ために」的使用条件？",
        options: [
          "前项是不受控制的自然现象",
          "前后动作通常由同一主体有意实施",
          "后项必须是过去的意外结果",
          "前项必须使用可能形",
        ],
        correctIndex: 1,
        explanation:
          "目的用法表示同一主体为了主动目标采取行动；无意志状态或可能形目标多用「ように」。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-koto-ni-naru",
    title: "〜ことになる：决定为……／结果变成……",
    language: "japanese",
    level: "JLPT N3 巩固",
    explanation:
      "「〜ことになる」表示某件事由组织、他人、规则或客观发展决定，也可说明推导出的结果，相当于“决定为……”或“结果就会……”。它刻意弱化说话人亲自做决定的色彩。",
    structure: "动词辞书形／ない形＋ことになる；过去决定常用「ことになった」",
    connection:
      "接动词普通形的现在非过去肯定或否定形式，如「転勤することになる」「参加しないことになる」。表示既定安排常用「〜ことになっている」。",
    scenarios: ["宣布组织或他人作出的安排", "说明规则与既定制度", "推导某条件造成的结果"],
    nuance:
      "说话人可能参与过讨论，但使用这一形式时把决定呈现为外部结论。日常宣布调动、会议安排或规则时非常常见。",
    examples: [
      {
        text: "来月から大阪支社で働くことになりました。",
        translationZh: "已经决定我从下个月起到大阪分公司工作。",
      },
      {
        text: "規則を守らなければ、参加できないことになります。",
        translationZh: "如果不遵守规则，结果就会无法参加。",
      },
    ],
    comparison: {
      japanese: "話し合いの結果、旅行は延期することになった。",
      english: "After the discussion, it was decided that the trip would be postponed.",
      translationZh: "商量之后，旅行被决定延期。",
    },
    commonErrors: [
      "表达自己当场作出的决定却用「ことになる」；若强调个人决定，应说「ことにする」。",
      "把既定规则误写成「ことにしている」；客观规定通常说「ことになっている」。",
    ],
    confusables: [
      "「〜ことにする」强调主体主动决定；「〜ことになる」强调外部决定或客观结果。",
      "「〜ようになる」表示能力、习惯或状态逐渐变化，不表示某项安排被决定。",
    ],
    exercises: makeExercises("jp-koto-ni-naru", [
      {
        prompt: "选择最自然的一项：会社の決定で、来月転勤する（　）。",
        options: ["ことにしました", "ことになりました", "ようにしました", "ものにしました"],
        correctIndex: 1,
        explanation:
          "调动是公司作出的外部决定，因此使用「転勤することになりました」。",
      },
      {
        prompt: "“我决定从今天起戒烟”最自然的说法是？",
        options: [
          "今日からたばこをやめることにした。",
          "今日からたばこをやめることになった。",
          "今日からたばこをやめるようになった。",
          "今日からたばこをやめるわけになった。",
        ],
        correctIndex: 0,
        explanation:
          "这是说话人主动做出的个人决定，应使用「ことにした」，而非强调外部决定的「ことになった」。",
      },
      {
        prompt: "选择最自然的一项：この寮では、夜十一時に門を閉める（　）。",
        options: ["ことにしている", "ことになっている", "ようとしている", "わけがない"],
        correctIndex: 1,
        explanation:
          "宿舍关门时间属于既定规则，使用表示规定的「ことになっている」。",
      },
      {
        prompt: "「このまま欠席すると、受験できないことになる」中的「ことになる」表示什么？",
        options: ["个人愿望", "过去习惯", "推导出的结果", "同时发生"],
        correctIndex: 2,
        explanation:
          "句子从“继续缺席”推导出“不能参加考试”的结果，因此是客观结果用法。",
      },
      {
        prompt: "选择正确的一项：会議の結果、新製品は来春発売される（　）。",
        options: ["ことになった", "ことにしたい", "ようにできた", "ものがあった"],
        correctIndex: 0,
        explanation:
          "经会议形成的上市安排不是个人决定，应用「発売されることになった」。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-wake-dewa-nai",
    title: "〜わけではない：并非……／并不是说……",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜わけではない」用于否定根据上下文可能产生的整体判断，相当于“并非……”“并不是说……”。它常保留部分事实，只否定过度概括，因此比直接使用普通否定更委婉、更有修正意味。",
    structure: "普通形＋わけではない；名词／な形容词＋な／である＋わけではない",
    connection:
      "动词和い形容词接普通形；名词与な形容词在现在肯定时常接「な」或较正式的「である」，如「嫌いなわけではない」。口语也常说「わけじゃない」。",
    scenarios: ["纠正对方的过度推断", "进行部分否定", "委婉澄清态度"],
    nuance:
      "不是简单否认某个事实，而是说“不能由此得出那个结论”。与「全部／必ずしも／誰でも」等词搭配时，常形成“并非全部、未必总是”的部分否定。",
    examples: [
      {
        text: "甘い物が嫌いなわけではないが、今は控えています。",
        translationZh: "我并不是讨厌甜食，只是现在有所节制。",
      },
      {
        text: "高い商品が必ずしも品質がいいわけではありません。",
        translationZh: "价格高的商品未必质量就好。",
      },
    ],
    comparison: {
      japanese: "忙しいからといって、連絡できないわけではない。",
      english: "Being busy does not mean that I cannot get in touch.",
      translationZh: "忙并不意味着就无法联系。",
    },
    commonErrors: [
      "把它理解为完全否定；「好きなわけではない」通常是“谈不上喜欢”，不一定等于“讨厌”。",
      "な形容词接续错误地说「簡単だわけではない」；通常应说「簡単なわけではない」。",
    ],
    confusables: [
      "「〜わけがない」是强烈判断“不可能……”；「〜わけではない」只是修正或部分否定。",
      "普通否定「食べない」陈述不吃这一事实；「食べるわけではない」否定“会吃”这一推断，依赖语境。",
    ],
    exercises: makeExercises("jp-wake-dewa-nai", [
      {
        prompt: "选择最自然的一项：日本に長く住めば、誰でも日本語が上手になる（　）。",
        options: ["わけがない", "わけではない", "ことにする", "ものがある"],
        correctIndex: 1,
        explanation:
          "长期居住并不必然意味着任何人都会变得擅长日语，此处是对普遍化结论的部分否定。",
      },
      {
        prompt: "选择正确接续：彼のことが嫌い（　）が、少し話しにくい。",
        options: ["だわけではない", "なわけではない", "のわけがない", "でわけではない"],
        correctIndex: 1,
        explanation:
          "な形容词「嫌い」接「わけではない」时用「嫌いなわけではない」。",
      },
      {
        prompt: "“我并不是每天都运动”最准确的日语是？",
        options: [
          "毎日運動するわけではない。",
          "毎日運動するわけがない。",
          "毎日運動しないことはない。",
          "毎日運動することになった。",
        ],
        correctIndex: 0,
        explanation:
          "句子只否定“每天”这一整体判断，并不表示完全不运动，所以用「わけではない」。",
      },
      {
        prompt: "「お金があれば幸せになれるわけではない」的含义是？",
        options: [
          "有钱就绝对不幸福",
          "没钱才会幸福",
          "有钱并不一定就能幸福",
          "为了幸福必须有钱",
        ],
        correctIndex: 2,
        explanation:
          "「わけではない」否定“有钱必然幸福”的推论，属于部分否定，而非断言有钱会不幸福。",
      },
      {
        prompt: "哪一句表达的是“不可能”，而不是“并非如此”？",
        options: [
          "全部食べたわけではない。",
          "嫌いなわけではない。",
          "彼がそんなうそをつくわけがない。",
          "いつも暇なわけではない。",
        ],
        correctIndex: 2,
        explanation:
          "「わけがない」表示说话人根据判断认定“不可能”；其他选项的「わけではない」都是部分否定。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-wake-ga-nai",
    title: "〜わけがない：不可能……",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜わけがない」表示说话人依据常识、事实或充分理由，强烈断定某事不可能，相当于“绝不可能……”。它不是单纯描述能力不足，而是强调从道理上得不出那种结果。",
    structure: "普通形＋わけがない；名词／な形容词＋な／である＋わけがない",
    connection:
      "动词和い形容词直接接普通形；名词与な形容词常用「な」或「である」连接。口语中「わけない」另有“很容易”的用法，不可混同。",
    scenarios: ["基于证据强烈否定", "反驳不合理猜测", "强调某结果绝无可能"],
    nuance:
      "确信程度很高，有时会显得武断。礼貌场合可以用「〜はずがありません」等较缓和表达，但两者依据和语感仍不完全相同。",
    examples: [
      {
        text: "あんなに責任感の強い彼が、約束を忘れるわけがない。",
        translationZh: "责任心那么强的他，不可能忘记约定。",
      },
      {
        text: "一日でこの厚い本を全部読めるわけがありません。",
        translationZh: "不可能在一天内读完这本厚书。",
      },
    ],
    comparison: {
      japanese: "鍵は私が持っているから、彼が先に部屋へ入れるわけがない。",
      english: "He cannot possibly enter the room first because I have the key.",
      translationZh: "钥匙在我这里，所以他绝不可能先进入房间。",
    },
    commonErrors: [
      "误用为一般能力否定；单纯说“不会游泳”应是「泳げない」，不必用「泳げるわけがない」。",
      "与「わけではない」混用；后者是“并非”，确信和否定范围都更弱。",
    ],
    confusables: [
      "「〜はずがない」也表示“不应该会”，更侧重根据预期推断；「〜わけがない」常带“按道理绝无可能”的强烈断言。",
      "「〜ことはない」常表示“没有必要……”或“不会发生”，并不等同于强烈的逻辑否定。",
    ],
    exercises: makeExercises("jp-wake-ga-nai", [
      {
        prompt: "选择最自然的一项：まだ五歳の子どもが、この問題を解ける（　）。",
        options: ["わけではない", "わけがない", "ことにした", "ものだった"],
        correctIndex: 1,
        explanation:
          "说话人根据年龄与题目难度，强烈判断五岁孩子不可能解出，因此用「わけがない」。",
      },
      {
        prompt: "“田中今天在国外，所以不可能在这里”最自然的说法是？",
        options: [
          "田中さんは今日海外にいるので、ここにいるわけがない。",
          "田中さんは今日海外にいるので、ここにいるわけではない。",
          "田中さんは今日海外にいるために、ここにいる。",
          "田中さんは今日海外にいても、ここにいる。",
        ],
        correctIndex: 0,
        explanation:
          "人在海外这一事实构成充分依据，说明其在此地从逻辑上不可能，用「わけがない」。",
      },
      {
        prompt: "选择正确接续：あの親切な人が犯人（　）。",
        options: ["だわけがない", "なわけがない", "のわけではない", "でわけがない"],
        correctIndex: 1,
        explanation:
          "名词「犯人」现在肯定形接该句型时可用「犯人なわけがない」，意为“不可能是犯人”。",
      },
      {
        prompt: "哪一句表示“并非所有人都赞成”，而不是“不可能赞成”？",
        options: [
          "全員が賛成するわけがない。",
          "全員が賛成したことになる。",
          "全員が賛成するわけではない。",
          "全員が賛成するものだ。",
        ],
        correctIndex: 2,
        explanation:
          "「全員が〜わけではない」只否定全员这一范围；「わけがない」则会变成“全员赞成绝无可能”。",
      },
      {
        prompt: "「彼が試験に落ちるわけがない」最接近哪一项？",
        options: [
          "他未必会考试",
          "他不可能考试不及格",
          "他并不是没参加考试",
          "他决定不参加考试",
        ],
        correctIndex: 1,
        explanation:
          "「落ちるわけがない」是对“落榜”可能性的强烈否定，即认定他不可能不及格。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-mono-da",
    title: "〜ものだ：本来就……／常常……",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜ものだ」可说明一般常识、事物本性或理所当然的道理，常译为“本来就……”。接过去形「〜たものだ」时，还可带感慨回忆过去经常做的事，本知识点同时训练这两种高频用法。",
    structure: "动词普通形／い形容词普通形＋ものだ；な形容词＋なものだ；回忆：动词た形＋ものだ",
    connection:
      "描述常理时接现在普通形；怀旧回忆使用过去形。名词一般不直接用于这一句型，口语中可说「もんだ」，但语气更随意。",
    scenarios: ["陈述普遍规律或常识", "表达理所当然的劝诫", "感慨回忆过去习惯"],
    nuance:
      "常理用法带有概括或教导语气，不适合只描述某一次偶然事件。回忆用法通常伴随怀念、感慨，与单纯过去时不同。",
    examples: [
      {
        text: "人は失敗から多くのことを学ぶものです。",
        translationZh: "人本来就会从失败中学到很多东西。",
      },
      {
        text: "子どものころ、夏になるとよく川で遊んだものだ。",
        translationZh: "小时候一到夏天，我常常在河里玩。",
      },
    ],
    comparison: {
      japanese: "時間がたつのは本当に早いものだ。",
      english: "Time really does fly.",
      translationZh: "时间过得真快啊。",
    },
    commonErrors: [
      "用「〜たものだ」描述仅发生一次且没有回忆色彩的事件；这时普通过去时更自然。",
      "把「ものだから」的原因用法与「ものだ」的常理用法混为一谈；两者接续后的句法功能不同。",
    ],
    confusables: [
      "「〜ことだ」常用于给个人建议“应该……”，「〜ものだ」更像陈述普遍道理或社会常识。",
      "「〜ようになった」表示习惯发生变化；「〜たものだ」回忆过去反复存在、如今往往已改变的习惯。",
    ],
    exercises: makeExercises("jp-mono-da", [
      {
        prompt: "选择最自然的一项：誰でも間違えることはある（　）。",
        options: ["ものだ", "わけがない", "ことになる", "ためだ"],
        correctIndex: 0,
        explanation:
          "“任何人都会犯错”是在陈述一般常理，因此使用「ものだ」。",
      },
      {
        prompt: "选择最适合表达怀旧回忆的一项：学生のころは、よく徹夜で勉強した（　）。",
        options: ["ことになる", "わけではない", "ものだ", "ために"],
        correctIndex: 2,
        explanation:
          "「た形＋ものだ」可带感慨地回忆过去经常做的事，此处是学生时代常熬夜学习。",
      },
      {
        prompt: "「年を取ると、体力が落ちるものだ」表达什么？",
        options: ["一次偶然事件", "普遍规律", "个人命令", "不可能的推断"],
        correctIndex: 1,
        explanation:
          "该句概括年龄增长与体力下降的一般规律，是「ものだ」的常理用法。",
      },
      {
        prompt: "哪一句不适合用回忆用法「〜たものだ」？",
        options: [
          "昔は毎朝ここを散歩したものだ。",
          "若いころはよく海外へ旅行したものだ。",
          "昨日一度だけこの店で昼食を食べたものだ。",
          "子どものころは祖母によく昔話を聞かされたものだ。",
        ],
        correctIndex: 2,
        explanation:
          "「昨日一度だけ」明确是单次事件，不符合「〜たものだ」回忆反复习惯的典型条件。",
      },
      {
        prompt: "选择正确接续：自然は美しい（　）。",
        options: ["なものだ", "ものだ", "でものだ", "のものだ"],
        correctIndex: 1,
        explanation:
          "い形容词「美しい」直接接「ものだ」，用于感叹自然本来就是美丽的。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-koto-naku",
    title: "〜ことなく：不……而……",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜ことなく」表示在没有进行前项动作的状态下完成后项，相当于“不……而……”“没有……就……”。它是较正式的书面表达，常用于叙述持续行为、报道或正式说明。",
    structure: "动词辞书形＋ことなく",
    connection:
      "只接动词辞书形，如「休むことなく」「あきらめることなく」。后面直接连接另一个动作或状态，不接名词、形容词。",
    scenarios: ["书面叙述未做前项而做后项", "强调动作持续未中断", "正式描述坚定态度"],
    nuance:
      "语义接近「〜ないで」，但语气更正式，且常突出“始终没有……”的持续性。日常简单请求通常使用「ないで」更自然。",
    examples: [
      {
        text: "彼は一度も休むことなく、ゴールまで走り続けた。",
        translationZh: "他一次也没有休息，一直跑到了终点。",
      },
      {
        text: "研究チームは失敗してもあきらめることなく、実験を続けた。",
        translationZh: "研究团队即使失败也没有放弃，继续进行了实验。",
      },
    ],
    comparison: {
      japanese: "彼女は誰にも相談することなく、重要な決断をした。",
      english: "She made an important decision without consulting anyone.",
      translationZh: "她没有和任何人商量就作出了重要决定。",
    },
    commonErrors: [
      "把动词变成ない形后再接，误说「休まないことなく」；正确形式是辞书形「休むことなく」。",
      "在随意口语的小事中机械使用，造成过度正式；如“别加糖喝”通常说「砂糖を入れないで飲む」。",
    ],
    confusables: [
      "「〜ないで」口语和书面都常用，可表示附带状态；「〜ことなく」更正式并常强调完全未做或持续未中断。",
      "「〜ずに」也表示“不……而……”，语体较书面；「する」要变为「せずに」，而「ことなく」仍是「することなく」。",
    ],
    exercises: makeExercises("jp-koto-naku", [
      {
        prompt: "选择最自然的一项：選手たちは最後まであきらめる（　）、戦い続けた。",
        options: ["ことなく", "ものだから", "わけではなく", "ためには"],
        correctIndex: 0,
        explanation:
          "队员们在没有放弃的状态下一直战斗，且语体正式，适合用「辞书形＋ことなく」。",
      },
      {
        prompt: "选择正确形式：“他没敲门就进来了。”",
        options: [
          "彼はドアをノックしないことなく入ってきた。",
          "彼はドアをノックすることなく入ってきた。",
          "彼はドアをノックしたことなく入ってきた。",
          "彼はドアをノックするものなく入ってきた。",
        ],
        correctIndex: 1,
        explanation:
          "「ことなく」前接动词辞书形，所以是「ノックすることなく」。",
      },
      {
        prompt: "「昼も夜も休むことなく働いた」最准确的含义是？",
        options: [
          "白天休息、晚上工作",
          "本来打算休息",
          "昼夜不停地工作",
          "为了休息而工作",
        ],
        correctIndex: 2,
        explanation:
          "「休むことなく」表示完全没有休息，整句强调昼夜持续工作。",
      },
      {
        prompt: "哪一项是「〜ことなく」更口语化的近义表达？",
        options: ["〜ないで", "〜たびに", "〜おかげで", "〜に違いない"],
        correctIndex: 0,
        explanation:
          "「〜ないで」同样能表示不做前项而做后项，但在日常口语中更常见。",
      },
      {
        prompt: "选择最自然的一项：その鳥は海の上を止まる（　）、何時間も飛び続けた。",
        options: ["ものを", "ことなく", "わけに", "うえで"],
        correctIndex: 1,
        explanation:
          "鸟在数小时里没有停下而持续飞行，使用「止まることなく」突出动作未中断。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-ue-de",
    title: "〜上で：在……之后／在……方面",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜上で」有两个核心用法：接动词过去形时表示先完成前项，再据此进行后项；接辞书形或名词「の」时，表示“在做……时／在……方面”。两种用法都强调前项是后项的重要基础或条件。",
    structure: "动词た形＋上で（之后）；动词辞书形＋上で／名词＋の上で（方面、过程中）",
    connection:
      "表示先后顺序时用「確認した上で」；表示某活动层面时用「生活する上で」「仕事の上で」。写作时要根据动词形态和语义区分。",
    scenarios: ["审慎完成前置步骤", "说明做事时的重要条件", "限定讨论的方面或领域"],
    nuance:
      "比普通的「〜てから」更正式，并暗示前项经过考虑、确认或准备，对后项具有必要意义。若只是自然时间先后而无重要关联，用「てから」更自然。",
    examples: [
      {
        text: "契約内容をよく確認した上で、署名してください。",
        translationZh: "请仔细确认合同内容后再签字。",
      },
      {
        text: "外国で生活する上で、文化の違いを理解することは大切です。",
        translationZh: "在国外生活时，理解文化差异很重要。",
      },
    ],
    comparison: {
      japanese: "家族と相談した上で、最終的な返事をします。",
      english: "I will give my final answer after consulting my family.",
      translationZh: "和家人商量之后，我会给出最终答复。",
    },
    commonErrors: [
      "表示“完成后再做”时误用辞书形「確認する上で署名する」；应使用过去形「確認した上で」。",
      "把任何简单先后都换成「上で」；如“吃完饭就刷牙”通常用「食べてから」，无需强调审慎基础。",
    ],
    confusables: [
      "「〜てから」只表示一般时间顺序；「〜た上で」强调前项是后项的必要准备或判断基础。",
      "「〜上に」表示“不仅……而且……”，与表示基础、方面的「〜上で」含义完全不同。",
    ],
    exercises: makeExercises("jp-ue-de", [
      {
        prompt: "选择最自然的一项：資料を読んだ（　）、参加するかどうか決めます。",
        options: ["上で", "上に", "うちに", "ところを"],
        correctIndex: 0,
        explanation:
          "先阅读资料，并以其为判断基础再决定是否参加，应用「読んだ上で」。",
      },
      {
        prompt: "选择正确形式：海外で働く（　）、語学力は大きな助けになる。",
        options: ["上で", "上を", "上に", "上へ"],
        correctIndex: 0,
        explanation:
          "辞书形「働く＋上で」表示“在海外工作这一过程中／方面”。",
      },
      {
        prompt: "“请理解风险后再使用本服务”最自然的日语是？",
        options: [
          "リスクを理解する上に、本サービスを利用してください。",
          "リスクを理解した上で、本サービスを利用してください。",
          "リスクを理解することなく、本サービスを利用してください。",
          "リスクを理解したものの、本サービスを利用してください。",
        ],
        correctIndex: 1,
        explanation:
          "理解风险是使用服务前的重要步骤，因此用「理解した上で」。",
      },
      {
        prompt: "哪一句中的「上で」表示“在……方面”，而不是“……之后”？",
        options: [
          "説明を聞いた上で判断した。",
          "現物を見た上で買った。",
          "仕事の上で必要な知識だ。",
          "家族に話した上で返事した。",
        ],
        correctIndex: 2,
        explanation:
          "「仕事の上で」限定为工作方面；其他三句都是完成前项之后再做后项。",
      },
      {
        prompt: "下列哪种情境通常用「〜てから」比「〜た上で」自然？",
        options: [
          "审核合同后签字",
          "调查事实后作出判断",
          "和家人商量后答复",
          "吃完早餐后刷牙",
        ],
        correctIndex: 3,
        explanation:
          "吃早餐与刷牙只是日常时间先后，不强调审慎判断或必要基础，使用「てから」更自然。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-ni-chigainai",
    title: "〜に違いない：一定……／肯定……",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜に違いない」表示根据现有证据或情况作出确信度很高的推断，相当于“一定……”“肯定……”。说话人并非亲眼确认事实，但认为判断几乎不会错。",
    structure: "普通形＋に違いない；名词／な形容词词干＋に違いない",
    connection:
      "动词和い形容词接普通形；名词和な形容词现在肯定形通常去掉「だ」，如「学生に違いない」「元気に違いない」。",
    scenarios: ["根据迹象作出强推断", "表达高度确信", "推测隐藏原因或身份"],
    nuance:
      "确信度通常高于「だろう／かもしれない」，但仍属于推断而非已证实事实。正式书面语也常用「〜に相違ない」，语气更郑重。",
    examples: [
      {
        text: "電気がついているから、まだ誰かいるに違いない。",
        translationZh: "灯还亮着，所以里面一定还有人。",
      },
      {
        text: "彼女は十年も海外で働いたから、英語が上手に違いない。",
        translationZh: "她在海外工作了十年，英语一定很好。",
      },
    ],
    comparison: {
      japanese: "足跡が新しい。犯人は近くにいるに違いない。",
      english: "The footprints are fresh. The culprit must be nearby.",
      translationZh: "脚印很新，犯人一定就在附近。",
    },
    commonErrors: [
      "名词后保留断定助动词，误说「学生だに違いない」；一般应说「学生に違いない」。",
      "把已经亲眼确认的事实仍说成推测；若事实已确定，直接陈述通常更自然。",
    ],
    confusables: [
      "「〜かもしれない」只表示可能，确信度较低；「〜に違いない」表示高度确信。",
      "「〜はずだ」强调依据计划、规则或合理预期得出结论；「〜に違いない」更突出说话人的强烈判断。",
    ],
    exercises: makeExercises("jp-ni-chigainai", [
      {
        prompt: "选择最自然的一项：こんなに道がぬれている。夜中に雨が降った（　）。",
        options: ["に違いない", "わけではない", "ことなく", "上で"],
        correctIndex: 0,
        explanation:
          "道路湿这一迹象使说话人高度确信夜里下过雨，因此使用「に違いない」。",
      },
      {
        prompt: "选择正确接续：あの制服を着ている人は警察官（　）。",
        options: ["だに違いない", "なに違いない", "に違いない", "でに違いない"],
        correctIndex: 2,
        explanation:
          "名词「警察官」接「に違いない」时不加「だ」，直接说「警察官に違いない」。",
      },
      {
        prompt: "“他一定知道真相”最自然的日语是？",
        options: [
          "彼は真実を知ることなく。",
          "彼は真実を知っているに違いない。",
          "彼は真実を知るわけではない。",
          "彼は真実を知るために。",
        ],
        correctIndex: 1,
        explanation:
          "对他目前“知道”这一状态作高度确信的推断，要用「知っているに違いない」。",
      },
      {
        prompt: "哪一项的确信程度通常最低？",
        options: ["〜に違いない", "〜はずだ", "〜かもしれない", "〜に相違ない"],
        correctIndex: 2,
        explanation:
          "「かもしれない」只表示存在可能性；「に違いない／に相違ない」确信很强，「はずだ」也有明确依据。",
      },
      {
        prompt: "选择最符合语境的一项：彼は三日も寝ていない。とても疲れている（　）。",
        options: ["ことになる", "に違いない", "わけではない", "上に"],
        correctIndex: 1,
        explanation:
          "连续三天没睡是推断其非常疲劳的充分依据，所以使用「疲れているに違いない」。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-ni-kagirazu",
    title: "〜に限らず：不限于……",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜に限らず」表示范围不只局限于前项，还扩展到其他对象，相当于“不限于……”“不仅……”。后句常出现「も」「まで」「すべて」等提示扩大范围的词。",
    structure: "名词＋に限らず",
    connection:
      "主要接名词或名词性短语，如「若者に限らず」「日本国内に限らず」。后项补充同类范围，构成从局部到更广范围的扩展。",
    scenarios: ["扩大适用对象范围", "说明某现象具有普遍性", "正式介绍服务或制度"],
    nuance:
      "前项通常是人们容易首先想到的代表性对象，后项再说明其他对象也包括在内。比简单的「だけでなく」稍正式，常见于说明文和新闻。",
    examples: [
      {
        text: "この講座は学生に限らず、社会人も参加できます。",
        translationZh: "这门课程不限于学生，社会人士也可以参加。",
      },
      {
        text: "環境問題は一つの国に限らず、世界全体で考える必要があります。",
        translationZh: "环境问题不限于某一个国家，需要全世界共同思考。",
      },
    ],
    comparison: {
      japanese: "このアプリは日本語学習者に限らず、教師にも役立つ。",
      english: "This app is useful not only for Japanese learners but also for teachers.",
      translationZh: "这款应用不仅对日语学习者有用，对教师也有帮助。",
    },
    commonErrors: [
      "后句没有扩大同类范围，导致逻辑不完整；「学生に限らず、値段が安い」前后类别不对应。",
      "与「〜に限り」混淆；「会員に限り」表示只限会员，意思恰好与范围扩大的「に限らず」相反。",
    ],
    confusables: [
      "「〜だけでなく」口语适用范围广，可连接多种形式；「〜に限らず」主要接名词且更正式。",
      "「〜に限って」可表示偏偏、唯独或只在某情况，不表示将范围扩展出去。",
    ],
    exercises: makeExercises("jp-ni-kagirazu", [
      {
        prompt: "选择最自然的一项：この祭りは地元の人（　）、観光客にも人気がある。",
        options: ["に限り", "に限らず", "に違いない", "に応じて"],
        correctIndex: 1,
        explanation:
          "人气从当地人扩大到游客，表达“不限于当地人”应使用「に限らず」。",
      },
      {
        prompt: "「経験者に限らず、初心者も応募できる」的含义是？",
        options: [
          "只有有经验者能报名",
          "有经验者不能报名",
          "不仅有经验者，初学者也能报名",
          "初学者必须有经验才能报名",
        ],
        correctIndex: 2,
        explanation:
          "「に限らず」取消只限于前项的范围，后句明确把初学者也包括进来。",
      },
      {
        prompt: "选择最符合“不限国籍，任何人都能参加”的日语。",
        options: [
          "国籍に限り、誰でも参加できます。",
          "国籍に限らず、誰でも参加できます。",
          "国籍に違いなく、誰でも参加できます。",
          "国籍の上で、誰でも参加できます。",
        ],
        correctIndex: 1,
        explanation:
          "不把参与者限制于某一国籍，范围扩展到任何人，所以用「国籍に限らず」。",
      },
      {
        prompt: "哪一项表示“仅限今天”？",
        options: ["今日に限らず", "今日に限っても", "今日に限り", "今日に応じて"],
        correctIndex: 2,
        explanation:
          "「名词＋に限り」表示限定范围，即“仅限今天”；「に限らず」则表示不限于。",
      },
      {
        prompt: "选择逻辑最完整的一项。",
        options: [
          "この問題は若者に限らず、高齢者にも関係している。",
          "この問題は若者に限らず、解決が難しい。",
          "この問題は若者に限らず、昨日発生した。",
          "この問題は若者に限らず、値段が下がった。",
        ],
        correctIndex: 0,
        explanation:
          "前项“年轻人”与后项“老年人”属于同一人群范围，清楚形成从局部到更广对象的扩展。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-dokoroka",
    title: "〜どころか：非但不……反而……",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜どころか」否定听者可能预想的程度或事实，并引出与其相反或远超预期的情况，相当于“别说……，就连……”“非但不……反而……”。后项往往比前项更意外，是句子的真正重点。",
    structure: "普通形＋どころか；名词／な形容词（词干）＋どころか",
    connection:
      "动词、い形容词接普通形；名词和な形容词常直接接「どころか」，如「休みどころか」「静かどころか」。后项常与「も／さえ／まで」呼应。",
    scenarios: ["纠正与事实相反的预想", "表示实际程度远超预期", "强调连较低层次也未达到"],
    nuance:
      "语气比「だけでなく」强烈，包含明显的出乎意料。前后项需要构成可比较的程度关系或相反关系，不能只是并列两件无关的事。",
    examples: [
      {
        text: "薬を飲んだが、よくなるどころか、さらに悪化した。",
        translationZh: "吃了药之后非但没好，反而更加严重了。",
      },
      {
        text: "忙しくて、旅行どころか、一日休む時間さえない。",
        translationZh: "忙得别说旅行了，就连休息一天的时间都没有。",
      },
    ],
    comparison: {
      japanese: "彼は英語どころか、母語の文章さえほとんど読まない。",
      english: "Far from reading English, he hardly even reads in his native language.",
      translationZh: "别说英语了，他就连母语文章都几乎不读。",
    },
    commonErrors: [
      "把它当成普通递进“而且”；若没有意外、反向或程度落差，使用「だけでなく」更合适。",
      "前后项顺序颠倒；“别说难的，连容易的也不会”应先放较高预期，后放更出乎意料的低层次。",
    ],
    confusables: [
      "「〜ばかりか」表示“不仅……而且……”，不一定否定预期；「〜どころか」突出反差或远超预想。",
      "「〜どころではない」表示“不是做……的时候／根本顾不上……”，是另一固定句型。",
    ],
    exercises: makeExercises("jp-dokoroka", [
      {
        prompt: "选择最自然的一项：この料理はおいしい（　）、食べられないほど塩辛い。",
        options: ["に限らず", "どころか", "上で", "ために"],
        correctIndex: 1,
        explanation:
          "实际情况不是“好吃”，反而咸到无法入口，形成强烈反预期，应用「どころか」。",
      },
      {
        prompt: "“他别说道歉了，反而责怪了我”最自然的日语是？",
        options: [
          "彼は謝るどころか、逆に私を責めた。",
          "彼は謝るために、逆に私を責めた。",
          "彼は謝る上で、逆に私を責めた。",
          "彼は謝るに限らず、逆に私を責めた。",
        ],
        correctIndex: 0,
        explanation:
          "从预期的道歉转为相反的责怪，正是「〜どころか、逆に〜」的典型结构。",
      },
      {
        prompt: "选择正确接续：休日（　）、今週は毎晩残業している。",
        options: ["だどころか", "などころか", "どころか", "でどころか"],
        correctIndex: 2,
        explanation:
          "名词「休日」可直接接「どころか」，表示别说休息，反而每天加班。",
      },
      {
        prompt: "「千円どころか、百円さえ持っていない」的含义是？",
        options: [
          "不只有一千日元，还有一百日元",
          "别说一千日元，连一百日元都没有",
          "只有一千日元，没有一百日元",
          "为了得到一千日元，要先有一百日元",
        ],
        correctIndex: 1,
        explanation:
          "后项降到更低金额仍不成立，强调实际情况远低于“一千日元”这一预想。",
      },
      {
        prompt: "哪一句应使用「だけでなく」而不是「どころか」更自然？",
        options: [
          "病気が治る（　）、前より悪くなった。",
          "漢字（　）、ひらがなも書けない。",
          "彼は数学（　）、物理も得意だ。",
          "一時間（　）、十分も待てなかった。",
        ],
        correctIndex: 2,
        explanation:
          "数学和物理都擅长只是普通递进，没有否定预期或强烈落差，应说「数学だけでなく、物理も」。",
      },
    ]),
    source: "curated",
  },
  {
    id: "jp-ni-ojite",
    title: "〜に応じて：根据……／与……相应",
    language: "japanese",
    level: "JLPT N2 入门",
    explanation:
      "「〜に応じて」表示后项随着前项的差异、变化或要求而作相应调整，相当于“根据……”“与……相应”。它强调不是固定采用同一做法，而是针对条件选择合适的反应。",
    structure: "名词＋に応じて；修饰名词时用「名词＋に応じた＋名词」",
    connection:
      "接表示需要、能力、人数、情况、变化等名词，如「必要に応じて」。后接名词时不能直接用「に応じて」，要改为「に応じた方法」。",
    scenarios: ["按需求调整方案", "随能力或数量改变安排", "提供分级、个性化服务"],
    nuance:
      "重点是“对应差异而调整”。若只表示按照明确规则、命令行动，常用「〜に従って」；若表示两项同步渐变，也可用「〜につれて」。",
    examples: [
      {
        text: "参加者のレベルに応じて、クラスを三つに分けます。",
        translationZh: "根据参加者的水平，把班级分成三组。",
      },
      {
        text: "必要に応じて、専門家に相談してください。",
        translationZh: "请根据需要向专家咨询。",
      },
    ],
    comparison: {
      japanese: "季節に応じて、店のメニューを変えています。",
      english: "We change the restaurant's menu according to the season.",
      translationZh: "我们根据季节调整店里的菜单。",
    },
    commonErrors: [
      "修饰名词时误说「状況に応じて方法」；应使用连体形式「状況に応じた方法」。",
      "将它用于服从命令，如「先生の命令に応じて並ぶ」；强调遵从命令时「命令に従って」更自然。",
    ],
    confusables: [
      "「〜によって」可表示原因、手段、施事或因对象而异，范围更广；「〜に応じて」明确强调作出相应调整。",
      "「〜に従って」强调遵循规则或随着趋势推进；「〜に応じて」强调针对不同条件采取匹配措施。",
    ],
    exercises: makeExercises("jp-ni-ojite", [
      {
        prompt: "选择最自然的一项：収入（　）、支払う税金の額が変わります。",
        options: ["に応じて", "どころか", "ことなく", "わけがない"],
        correctIndex: 0,
        explanation:
          "税额随收入差异而相应变化，因此使用「収入に応じて」。",
      },
      {
        prompt: "选择正确形式：お客様の希望（　）サービスを提供します。",
        options: ["に応じて", "に応じた", "に応じるて", "に応じの"],
        correctIndex: 1,
        explanation:
          "空格后的「サービス」是被修饰名词，所以要用连体形式「希望に応じたサービス」。",
      },
      {
        prompt: "“请根据情况改变计划”最自然的日语是？",
        options: [
          "状況に応じて、計画を変更してください。",
          "状況どころか、計画を変更してください。",
          "状況ことなく、計画を変更してください。",
          "状況に違いない、計画を変更してください。",
        ],
        correctIndex: 0,
        explanation:
          "针对不同情况作相应调整，应使用「状況に応じて」。",
      },
      {
        prompt: "哪一句更适合用「〜に従って」？",
        options: [
          "能力（　）課題の難しさを変える。",
          "人数（　）部屋の広さを決める。",
          "マニュアル（　）機械を操作する。",
          "予算（　）購入品を選ぶ。",
        ],
        correctIndex: 2,
        explanation:
          "按照操作手册这一明确规范行动，宜用「マニュアルに従って」；其他选项都强调针对差异调整，适合「に応じて」。",
      },
      {
        prompt: "「必要に応じて休憩を取ってください」最准确的含义是？",
        options: [
          "无论如何都不要休息",
          "只按固定时间休息",
          "请根据需要休息",
          "休息后需求会改变",
        ],
        correctIndex: 2,
        explanation:
          "固定搭配「必要に応じて」表示视需要、根据实际需要采取相应行动。",
      },
    ]),
    source: "curated",
  },
  {
    id: "en-present-perfect",
    title: "Present Perfect：现在完成时",
    language: "english",
    level: "高中基础／CET-4",
    explanation:
      "现在完成时用来连接过去与现在：动作发生在过去，但结果、经历或持续状态与现在有关。它不强调明确的过去时间点，常用于“已经完成”“曾经经历”以及“从过去持续到现在”三类情境。",
    structure: "Subject + have/has + past participle",
    connection:
      "主语为 he、she、it 或单数名词时用 has，其余用 have；主要动词使用过去分词。否定式为 have/has not done，疑问式将 have/has 提到主语前。",
    scenarios: ["说明刚完成且影响现在的动作", "谈论截至目前的人生经历", "描述从过去持续到现在的状态"],
    nuance:
      "它关注“截至现在”的关联，而一般过去时关注已结束的过去时间。若句中有 yesterday、last year、in 2020 等明确且已结束的过去时间，通常应使用一般过去时。",
    examples: [
      {
        text: "I have just finished my homework, so I can go out now.",
        translationZh: "我刚做完作业，所以现在可以出门了。",
      },
      {
        text: "She has lived in Shanghai for five years.",
        translationZh: "她已经在上海住了五年。",
      },
    ],
    comparison: {
      japanese: "私はその映画を三回見たことがあります。",
      english: "I have seen that movie three times.",
      translationZh: "我看过那部电影三次。",
    },
    commonErrors: [
      "把过去式当作过去分词，如写成「I have went」；go 的过去分词是 gone，应为「I have gone」。",
      "与明确的已结束过去时间连用，如「I have seen him yesterday」；应改为「I saw him yesterday」。",
    ],
    confusables: [
      "一般过去时表示过去某时发生并结束的动作；现在完成时不锁定已结束的时间点，并强调当前关联。",
      "have been to 表示“去过且已回来”，have gone to 表示“已经去了、目前通常不在这里”。",
    ],
    exercises: makeExercises("en-present-perfect", [
      {
        prompt: "Choose the correct answer: She ___ her report, so she is free now.",
        options: ["finishes", "finished yesterday", "has finished", "had finish"],
        correctIndex: 2,
        explanation:
          "报告已完成并造成“现在有空”的结果，要用现在完成时 has finished。",
      },
      {
        prompt: "Choose the grammatically correct sentence.",
        options: [
          "I have visited Beijing last summer.",
          "I visited Beijing last summer.",
          "I have visit Beijing last summer.",
          "I has visited Beijing last summer.",
        ],
        correctIndex: 1,
        explanation:
          "last summer 是明确且已结束的过去时间，应使用一般过去时 visited，不能用现在完成时。",
      },
      {
        prompt: "Complete the sentence: We ___ each other since primary school.",
        options: ["know", "knew", "have known", "are knowing"],
        correctIndex: 2,
        explanation:
          "since primary school 表示从过去某点持续到现在；know 是状态动词，使用 have known。",
      },
      {
        prompt: "Tom is not in the office. He ___ to the bank.",
        options: ["has been", "has gone", "went ever", "have gone"],
        correctIndex: 1,
        explanation:
          "Tom 现在不在办公室，说明他去了银行尚未回来，用 has gone to；has been to 表示去过并已返回。",
      },
      {
        prompt: "Which time expression commonly goes with the present perfect?",
        options: ["yesterday", "last night", "in 2019", "so far"],
        correctIndex: 3,
        explanation:
          "so far 意为“到目前为止”，时间范围延续到现在，是现在完成时的典型标志。",
      },
    ]),
    source: "curated",
  },
  {
    id: "en-past-perfect",
    title: "Past Perfect：过去完成时",
    language: "english",
    level: "高中基础／CET-4",
    explanation:
      "过去完成时表示在某个过去时间或另一过去动作之前已经完成的动作，即常说的“过去的过去”。它帮助读者明确两个过去事件的先后关系，较早发生的事件使用 had + 过去分词。",
    structure: "Subject + had + past participle",
    connection:
      "所有人称都使用 had，后接过去分词；否定式为 had not done，疑问式为 Had + subject + done。常与 before、after、by the time、already 等连用。",
    scenarios: ["交代两个过去事件的先后", "说明过去某时之前已完成", "解释过去状态的原因"],
    nuance:
      "必须有一个过去参照点，不能只因动作很久以前发生就使用。若 before/after 已清楚表明顺序，口语中有时两个动作都用一般过去时，但过去完成时能突出较早动作。",
    examples: [
      {
        text: "By the time we arrived, the movie had already started.",
        translationZh: "我们到达时，电影已经开始了。",
      },
      {
        text: "She was nervous because she had never flown before.",
        translationZh: "她很紧张，因为此前从未坐过飞机。",
      },
    ],
    comparison: {
      japanese: "駅に着いたとき、電車はすでに出発していました。",
      english: "When I reached the station, the train had already left.",
      translationZh: "我到车站时，火车已经开走了。",
    },
    commonErrors: [
      "把 had 后的动词写成过去式，如「had went」；必须使用过去分词 gone。",
      "没有过去参照点就滥用过去完成时；单纯说“我昨天吃了早饭”用 I ate breakfast yesterday 即可。",
    ],
    confusables: [
      "一般过去时用于过去发生的事件；过去完成时专门标出在另一个过去参照点之前已经发生的事件。",
      "现在完成时连接过去与现在；过去完成时连接更早过去与一个过去参照点。",
    ],
    exercises: makeExercises("en-past-perfect", [
      {
        prompt: "By the time the teacher came in, the students ___ their seats.",
        options: ["take", "have taken", "had taken", "were take"],
        correctIndex: 2,
        explanation:
          "学生就座发生在老师走进教室之前，两个都是过去事件，较早的动作使用 had taken。",
      },
      {
        prompt: "Choose the correct answer: I recognized her because we ___ before.",
        options: ["met", "had met", "have meet", "were meeting tomorrow"],
        correctIndex: 1,
        explanation:
          "见过她发生在过去的 recognized 之前，应使用过去完成时 had met。",
      },
      {
        prompt: "Which sentence is grammatically correct?",
        options: [
          "He had left before I arrived.",
          "He had leave before I arrived.",
          "He has left before I arrived yesterday.",
          "He had left before I had arrive.",
        ],
        correctIndex: 0,
        explanation:
          "较早发生的离开用 had left，随后发生的到达用一般过去时 arrived，形式与顺序都正确。",
      },
      {
        prompt: "Complete the sentence: She ___ the task by 5 p.m. yesterday.",
        options: ["has completed", "had completed", "completes", "will complete"],
        correctIndex: 1,
        explanation:
          "by 5 p.m. yesterday 建立过去截止点，表示在该点前已完成，应使用 had completed。",
      },
      {
        prompt: "When is the past perfect normally needed?",
        options: [
          "To describe a future plan",
          "To state a general truth",
          "To mark an action earlier than another past point",
          "To describe an action happening right now",
        ],
        correctIndex: 2,
        explanation:
          "过去完成时的核心功能是标出某动作早于另一个过去动作或过去时间点。",
      },
    ]),
    source: "curated",
  },
  {
    id: "en-conditionals",
    title: "Conditionals：第一与第二条件句",
    language: "english",
    level: "高中基础／CET-4",
    explanation:
      "第一条件句讨论将来真实、可能发生的条件及结果；第二条件句讨论现在或将来不太可能、与事实相反的假设。两者都由 if 从句和主句组成，但动词形式反映说话人对可能性的判断。",
    structure:
      "First: If + present simple, will + base verb; Second: If + past simple, would + base verb",
    connection:
      "第一条件句的 if 从句即使谈将来也用一般现在时，不用 will；第二条件句使用过去式表达距离感，正式英语中 be 动词常对所有人称使用 were。",
    scenarios: ["预测现实可行的未来结果", "提出不太可能的设想", "给出假想建议"],
    nuance:
      "第二条件句中的过去式不表示过去时间，而表示与现实的距离。if 从句放在句首时通常用逗号与主句分开；放在句末时通常不需要逗号。",
    examples: [
      {
        text: "If it rains tomorrow, we will stay at home.",
        translationZh: "如果明天下雨，我们就待在家里。",
      },
      {
        text: "If I had more free time, I would learn another language.",
        translationZh: "如果我有更多空闲时间，我会再学一门语言。",
      },
    ],
    comparison: {
      japanese: "もし私があなただったら、その仕事を引き受けません。",
      english: "If I were you, I would not accept that job.",
      translationZh: "如果我是你，我不会接受那份工作。",
    },
    commonErrors: [
      "在第一条件句的 if 从句中使用 will，如「If it will rain」；通常应说「If it rains」。",
      "混合两种结构，如「If I had time, I will help」；非现实假设应搭配 would help。",
    ],
    confusables: [
      "第一条件句认为条件有现实可能：If I see her, I will tell her；第二条件句认为情况较不现实：If I saw her, I would tell her。",
      "零条件句使用一般现在时表示规律，如 If water reaches 100°C, it boils，不是在预测某一次未来事件。",
    ],
    exercises: makeExercises("en-conditionals", [
      {
        prompt: "If the weather ___ fine tomorrow, we will go hiking.",
        options: ["will be", "is", "were", "would be"],
        correctIndex: 1,
        explanation:
          "这是现实可能的未来条件，第一条件句的 if 从句使用一般现在时 is，不使用 will be。",
      },
      {
        prompt: "If I ___ enough money, I would travel around the world.",
        options: ["have", "will have", "had", "had had"],
        correctIndex: 2,
        explanation:
          "主句 would travel 表明这是现在不太现实的设想，第二条件句 if 从句用过去式 had。",
      },
      {
        prompt: "Choose the correct first conditional sentence.",
        options: [
          "If she studies hard, she will pass the exam.",
          "If she will study hard, she passes the exam.",
          "If she studied hard, she will pass the exam.",
          "If she studies hard, she would passed the exam.",
        ],
        correctIndex: 0,
        explanation:
          "第一条件句使用 If + 一般现在时 studies，主句使用 will + 动词原形 pass。",
      },
      {
        prompt: "Which sentence gives a hypothetical suggestion?",
        options: [
          "If I am you, I will apologize yesterday.",
          "If I were you, I would apologize.",
          "If I was you, I apologized.",
          "If I will be you, I apologize.",
        ],
        correctIndex: 1,
        explanation:
          "固定表达 If I were you 使用第二条件句提出假想建议，主句与 would + 动词原形搭配。",
      },
      {
        prompt: "What does 'If he had a car, he would drive to work' imply?",
        options: [
          "He definitely owns a car.",
          "He drove to work yesterday.",
          "He probably does not have a car now.",
          "He will certainly buy a car tomorrow.",
        ],
        correctIndex: 2,
        explanation:
          "第二条件句描述与当前事实有距离的假设，通常暗示他现在没有车或拥有车的可能性很低。",
      },
    ]),
    source: "curated",
  },
  {
    id: "en-passive-voice",
    title: "Passive Voice：被动语态",
    language: "english",
    level: "高中基础／CET-4",
    explanation:
      "被动语态把动作承受者放在主语位置，适用于执行者未知、不重要，或需要突出结果和对象的情况。句子的时态由 be 动词体现，主要动词始终使用过去分词；必要时可用 by 引出动作执行者。",
    structure: "Subject + be (in the required tense) + past participle (+ by + agent)",
    connection:
      "一般现在时用 am/is/are done，一般过去时用 was/were done，现在完成时用 have/has been done，含情态动词时用 modal + be done。只有能带宾语的及物动词通常才能转成被动。",
    scenarios: ["执行者未知或无需说明", "突出动作结果或承受者", "用于正式、客观的说明"],
    nuance:
      "被动并不等于过去时，时态仍要根据时间决定。by 表示动作执行者，with 常表示使用的工具或材料；若执行者显而易见，省略 by 短语更自然。",
    examples: [
      {
        text: "The bridge was built more than one hundred years ago.",
        translationZh: "这座桥建于一百多年前。",
      },
      {
        text: "All applications must be submitted by Friday.",
        translationZh: "所有申请必须在星期五之前提交。",
      },
    ],
    comparison: {
      japanese: "この小説は多くの言語に翻訳されています。",
      english: "This novel has been translated into many languages.",
      translationZh: "这部小说已被翻译成多种语言。",
    },
    commonErrors: [
      "漏掉 be 动词，误写「The window broken yesterday」；完整被动应是「The window was broken yesterday」。",
      "be 后使用过去式而不是过去分词，如「was wrote」；write 的过去分词是 written，应说「was written」。",
    ],
    confusables: [
      "主动句突出执行者：Someone stole my bike；被动句突出承受者或未知执行者：My bike was stolen。",
      "by 后接动作执行者，with 后接工具，如 The window was broken by a boy with a stone。",
    ],
    exercises: makeExercises("en-passive-voice", [
      {
        prompt: "Choose the correct answer: English ___ in many countries.",
        options: ["speaks", "is spoken", "is speaking", "has spoke"],
        correctIndex: 1,
        explanation:
          "English 是 speak 的承受对象，且句子描述一般事实，应使用一般现在时被动 is spoken。",
      },
      {
        prompt: "The meeting ___ because of the storm yesterday.",
        options: ["canceled", "was canceled", "is cancel", "was canceling by"],
        correctIndex: 1,
        explanation:
          "会议被取消，yesterday 要求一般过去时，所以用 was + 过去分词 canceled。",
      },
      {
        prompt: "Choose the correct passive form of 'They will announce the results tomorrow.'",
        options: [
          "The results will announce tomorrow.",
          "The results are announced tomorrow by them.",
          "The results will be announced tomorrow.",
          "The results will have announce tomorrow.",
        ],
        correctIndex: 2,
        explanation:
          "一般将来时被动结构是 will + be + 过去分词，因此为 will be announced。",
      },
      {
        prompt: "The report has ___ by the manager.",
        options: ["check", "checked", "been checked", "being check"],
        correctIndex: 2,
        explanation:
          "现在完成时被动结构是 has/have been + 过去分词，完整形式为 has been checked。",
      },
      {
        prompt: "Choose the correct prepositions: The picture was painted ___ Maya ___ a small brush.",
        options: ["with; by", "by; with", "from; at", "of; for"],
        correctIndex: 1,
        explanation:
          "Maya 是动作执行者，前用 by；a small brush 是工具，前用 with。",
      },
    ]),
    source: "curated",
  },
  {
    id: "en-relative-clauses",
    title: "Relative Clauses：定语从句",
    language: "english",
    level: "高中基础／CET-4",
    explanation:
      "定语从句放在名词之后，对人或事物进行限定或补充说明。关系词在从句中承担主语、宾语或所属关系等成分，选择时既要看先行词，也要看从句中缺少什么成分。",
    structure:
      "noun + who/whom/whose/which/that + clause; place + where + clause; time + when + clause",
    connection:
      "who 常指人并作主语，whom 指人并作宾语，whose 表示所属；which 指物，that 可在限制性从句中指人或物。非限制性定语从句用逗号隔开，通常不用 that。",
    scenarios: ["准确限定所谈的人或物", "补充非必要背景信息", "把相关信息合并成一句"],
    nuance:
      "限制性从句决定先行词具体指谁或什么，不能随意删除；非限制性从句只是补充信息，去掉后主句指代仍明确。关系词作限制性从句宾语时常可省略，作主语时不能省略。",
    examples: [
      {
        text: "The woman who lives next door is a doctor.",
        translationZh: "住在隔壁的那位女士是一名医生。",
      },
      {
        text: "My laptop, which I bought last year, is already broken.",
        translationZh: "我的笔记本电脑是去年买的，现在已经坏了。",
      },
    ],
    comparison: {
      japanese: "昨日私を助けてくれた人は田中さんです。",
      english: "The person who helped me yesterday is Mr. Tanaka.",
      translationZh: "昨天帮助我的人是田中先生。",
    },
    commonErrors: [
      "关系词已经作从句宾语后又重复宾语，如「the book which I bought it」；应删除 it。",
      "在非限制性定语从句中使用 that，如「My father, that is 60, ...」；应使用 who。",
    ],
    confusables: [
      "which 在从句中作主语或宾语；where 相当于 in/at which，在从句中作地点状语，因此要看从句是否缺成分。",
      "what 本身含有“the thing(s) that”的意义，前面不能再接先行词；有先行词时通常用 that/which。",
    ],
    exercises: makeExercises("en-relative-clauses", [
      {
        prompt: "The student ___ won the prize is in my class.",
        options: ["which", "who", "where", "whose"],
        correctIndex: 1,
        explanation:
          "先行词 student 指人，关系词在从句中作 won 的主语，所以使用 who。",
      },
      {
        prompt: "This is the house ___ I grew up.",
        options: ["which", "who", "where", "what"],
        correctIndex: 2,
        explanation:
          "从句 I grew up 成分完整，缺少的是地点状语“在这所房子里”，因此使用 where。",
      },
      {
        prompt: "Choose the grammatically correct sentence.",
        options: [
          "The book which I borrowed it was useful.",
          "The book what I borrowed was useful.",
          "The book which I borrowed was useful.",
          "The book where I borrowed was useful.",
        ],
        correctIndex: 2,
        explanation:
          "which 指代 the book 并在从句中作 borrowed 的宾语，不能再加 it；what 前也不能另有先行词。",
      },
      {
        prompt: "My aunt, ___ lives in Canada, is visiting us next month.",
        options: ["that", "who", "where", "what"],
        correctIndex: 1,
        explanation:
          "逗号表示非限制性定语从句，先行词为人且关系词作主语，应使用 who，不能使用 that。",
      },
      {
        prompt: "The girl ___ bicycle was stolen called the police.",
        options: ["who", "whom", "whose", "which"],
        correctIndex: 2,
        explanation:
          "空格表示女孩与自行车的所属关系，即“她的自行车”，所以使用 whose。",
      },
    ]),
    source: "curated",
  },
  {
    id: "en-gerunds-infinitives",
    title: "Gerunds & Infinitives：动名词与不定式",
    language: "english",
    level: "高中基础／CET-4",
    explanation:
      "动名词由动词加 -ing 构成，在句中起名词作用；不定式通常是 to + 动词原形。某些动词固定接动名词，某些固定接不定式，还有少数两者都能接但意义会变化，因此学习时应把搭配和含义一起掌握。",
    structure:
      "verb + gerund (doing); verb + infinitive (to do); preposition + gerund",
    connection:
      "enjoy、avoid、finish、suggest 等后接 doing；want、decide、hope、plan 等后接 to do；介词后必须用动名词。remember、stop、try 等接不同形式时意义可能改变。",
    scenarios: ["表达喜好与避免的活动", "表达计划、决定或愿望", "区分形式变化带来的语义差别"],
    nuance:
      "动名词常把动作看作活动、经历或一般概念，不定式常带目标、意图或尚未发生的意味，但这只是倾向，固定搭配仍需记忆。否定形式分别是 not doing 与 not to do。",
    examples: [
      {
        text: "She enjoys reading on the train.",
        translationZh: "她喜欢在火车上阅读。",
      },
      {
        text: "We decided to postpone the meeting until Friday.",
        translationZh: "我们决定把会议推迟到星期五。",
      },
    ],
    comparison: {
      japanese: "私は寝る前にドアに鍵をかけたことを覚えています。",
      english: "I remember locking the door before I went to bed.",
      translationZh: "我记得睡前锁过门。",
    },
    commonErrors: [
      "在介词后使用动词原形，如「without say goodbye」；介词后应说「without saying goodbye」。",
      "忽略固定搭配，误说「enjoy to read」或「decide going」；应分别为 enjoy reading 和 decide to go。",
    ],
    confusables: [
      "remember doing 表示记得做过某事；remember to do 表示记得要去做某事。",
      "stop doing 表示停止正在做的事；stop to do 表示停下当前动作，转而去做另一件事。",
    ],
    exercises: makeExercises("en-gerunds-infinitives", [
      {
        prompt: "She avoided ___ about the problem.",
        options: ["to talk", "talk", "talking", "to talking"],
        correctIndex: 2,
        explanation:
          "avoid 后固定接动名词，所以使用 talking，意为她避免谈论这个问题。",
      },
      {
        prompt: "We hope ___ you again soon.",
        options: ["seeing", "see", "to see", "to seeing"],
        correctIndex: 2,
        explanation:
          "hope 后接 to + 动词原形表达希望做某事，因此选 to see。",
      },
      {
        prompt: "He left without ___ goodbye.",
        options: ["say", "to say", "saying", "said"],
        correctIndex: 2,
        explanation:
          "without 是介词，介词后动词要用 -ing 形式，因此是 without saying goodbye。",
      },
      {
        prompt: "I remember ___ the email yesterday, so you should have it.",
        options: ["to send", "sending", "send", "to sending"],
        correctIndex: 1,
        explanation:
          "yesterday 和后半句表明发邮件已经发生；remember doing 表示记得做过某事。",
      },
      {
        prompt: "On the way home, we stopped ___ some coffee.",
        options: ["buying", "to buy", "buy", "to buying"],
        correctIndex: 1,
        explanation:
          "stop to do 表示停下原来的行程，转而去做另一件事；此处是途中停下来买咖啡。",
      },
    ]),
    source: "curated",
  },
];

export const GRAMMAR_POINTS: GrammarPoint[] = PHASE_ONE_GRAMMAR_POINTS.concat(
  PHASE_TWO_GRAMMAR_POINTS,
);

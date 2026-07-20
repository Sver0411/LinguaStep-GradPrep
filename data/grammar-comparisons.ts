import type { GrammarComparison } from "@/lib/models";

type ComparisonSpec = [
  id: string,
  semantic: string,
  japanese: string,
  english: string,
  difference: string,
  japaneseExample: string,
  englishExample: string,
  translationZh: string,
  pitfall: string,
  level: string,
];

const SPECS: ComparisonSpec[] = [
  ["ongoing","正在进行","〜ている","be + V-ing","日语「ている」还可表示结果状态或习惯；英语进行时更侧重某时段正在展开的动作。","今、資料を読んでいる。","I am reading the material now.","我现在正在阅读资料。","不要把所有「ている」都机械译成英语进行时。","N3 / CET-4"],
  ["result-state","完成与结果状态","〜てある／〜ている","have done / be + past participle","日语常从眼前状态描述结果；英语会根据施事和焦点选择完成时或被动。","机の上に資料が置いてある。","The materials have been placed on the desk.","资料已经放在桌上。","「てある」暗示有人有意完成了准备。","N3 / CET-4"],
  ["condition","现实条件","〜ば／〜たら","if + present, will + verb","日语条件形式按时间和语气分工；英语第一条件句的 if 从句通常不用 will。","時間があれば、参加します。","If I have time, I will join.","如果有时间，我会参加。","日语「たら」可表示完成后的时间顺序，不总是英语 if。","N3 / CET-4"],
  ["hypothesis","假设与反事实","〜なら／〜としたら","if + past / would + verb","两种语言都用距离感表达不现实，但形式并非逐字对应。","私が責任者なら、計画を見直す。","If I were in charge, I would review the plan.","如果我是负责人，我会重新审视计划。","正式英语反事实常用 were，不按普通过去事实理解。","N2 / CET-4"],
  ["deduction","推测","〜に違いない／〜かもしれない","must / may / might","日语与英语都区分确信程度；英语 must 在此表示逻辑推断而非义务。","電気がついている。彼は家にいるに違いない。","The light is on. He must be home.","灯亮着，他一定在家。","「must have done」是对过去的推测。","N2 / CET-4"],
  ["reason","原因","〜ので／〜ため","because / since / due to","日语根据礼貌和客观性选择形式；英语需区分连词和介词短语。","雨のため、試合は中止になった。","The game was canceled due to the rain.","由于下雨，比赛取消了。","due to 后接名词，because 后接完整从句。","N3 / CET-4"],
  ["contrast","转折","〜ものの／〜のに","although / even though","日语「のに」常含遗憾或不满；英语 although 本身通常不编码这种情绪。","準備したものの、自信がない。","Although I prepared, I am not confident.","虽然准备了，但我没有信心。","英语 although 不与 but 同时连接同一对分句。","N2 / CET-4"],
  ["purpose","目的","〜ために／〜ように","to / in order to / so that","日语按意志动词和能力状态区分；英语按主语是否一致选择不定式或 so that。","忘れないように、メモした。","I wrote it down so that I would not forget.","为了不忘记，我记了下来。","非意志结果常用「ように」，不能一律替换为「ために」。","N3 / CET-4"],
  ["passive","被动","受身形","be + past participle","日语还常用受害被动表达不便；英语被动主要调整信息焦点。","雨に降られて困った。","I was caught in the rain and had trouble.","我被雨淋了，很困扰。","受害被动不一定能自然地逐字译成英语被动。","N3 / CET-4"],
  ["causative","使役","〜させる","make / let / have + object + verb","日语一个使役形可覆盖强制或允许；英语用不同动词区分。","先生は学生に書き直させた。","The teacher made the students rewrite it.","老师让学生重写。","make 后接动词原形，let 偏允许。","N3 / CET-4"],
  ["comparison","比较","〜ほど／〜より","comparative / as...as","日语用助词标记比较基准；英语形容词需要比较级或 as 结构。","今年は去年ほど寒くない。","This year is not as cold as last year.","今年没有去年那么冷。","「Aほど〜ない」表示 A 的程度更高。","N3 / CET-4"],
  ["concession","让步","〜ても／〜としても","even if / even though","日语可区分假设让步和事实让步；英语 even if 偏假设，even though 偏事实。","雨が降っても、出発します。","Even if it rains, we will leave.","即使下雨，我们也出发。","已知事实通常用 even though，不用 even if。","N3 / CET-4"],
  ["experience","经验","〜たことがある","have + past participle","两者都能谈经历，但英语现在完成时还承担持续和结果等功能。","京都へ行ったことがある。","I have been to Kyoto.","我去过京都。","明确的过去时间通常与英语一般过去时搭配。","N3 / CET-4"],
  ["obligation","义务","〜なければならない／〜べきだ","must / have to / should","日语和英语都按外部义务与主观建议区分强度。","規則を守らなければならない。","We have to follow the rules.","我们必须遵守规则。","must 不总等于「べき」；后者常带评价或建议。","N3 / CET-4"],
  ["advice","建议","〜たほうがいい","should / had better","日语形式像过去式但表达当前建议；英语 had better 语气通常更强并暗含后果。","早く休んだほうがいい。","You should get some rest early.","你最好早点休息。","否定建议使用「ないほうがいい」。","N3 / CET-4"],
];

export const GRAMMAR_COMPARISONS: GrammarComparison[] = SPECS.map(
  ([
    id,
    semantic,
    japanese,
    english,
    difference,
    japaneseExample,
    englishExample,
    translationZh,
    pitfall,
    level,
  ], index) => {
    const choices = [japanese, "〜ためだけ", "〜とは限らない", "〜つつある"];
    const shift = index % 4;
    const options = choices.map(
      (_, optionIndex) => choices[(optionIndex + shift) % 4],
    ) as [string, string, string, string];
    return {
      id: `comparison-${id}`,
      semantic,
      japanese,
      english,
      difference,
      japaneseExample,
      englishExample,
      translationZh,
      pitfalls: [pitfall, "两种语言只能按语义和语境比较，不能逐字一一对应。"],
      level,
      exercise: {
        id: `comparison-${id}-q1`,
        source: "comparison",
        sourceId: `comparison-${id}`,
        prompt: `表达“${semantic}”时，哪项日语形式与 ${english} 的核心语义最接近？`,
        options,
        correctIndex: options.indexOf(japanese),
        explanation: `${difference} ${pitfall}`,
        language: "mixed",
        difficulty: level,
        category: "comparison",
      },
    };
  },
);

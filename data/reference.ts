/**
 * Reference material ported from the standalone LinguaStep mobile project
 * (`LinguaStep-移动端`). The original shipped kana grids without readings, so
 * each kana now carries its romaji and can be read aloud with the same speech
 * helper used by word cards.
 */

export type ReferenceTone = "mint" | "lavender" | "coral" | "teal";

export interface ReferenceEntry {
  term: string;
  meaning: string;
}

export interface ReferenceTopic {
  id: string;
  title: string;
  subtitle: string;
  tone: ReferenceTone;
  entries: ReferenceEntry[];
}

export interface KanaCell {
  character: string;
  romaji: string;
}

export const REFERENCE_TOPICS: ReferenceTopic[] = [
  {
    id: "weekday-time",
    title: "星期与时间",
    subtitle: "月曜日 · 火曜日 · 今日几点",
    tone: "mint",
    entries: [
      { term: "月曜日", meaning: "星期一" },
      { term: "火曜日", meaning: "星期二" },
      { term: "水曜日", meaning: "星期三" },
      { term: "木曜日", meaning: "星期四" },
      { term: "金曜日", meaning: "星期五" },
      { term: "土曜日", meaning: "星期六" },
      { term: "日曜日", meaning: "星期日" },
      { term: "午前 / 午後", meaning: "上午 / 下午" },
      { term: "今何時ですか", meaning: "现在几点？" },
    ],
  },
  {
    id: "numbers-units",
    title: "数字与单位",
    subtitle: "一つ · 二人 · 一本 · 〜円",
    tone: "coral",
    entries: [
      { term: "一つ / 二つ", meaning: "一个 / 两个" },
      { term: "一人 / 二人", meaning: "一个人 / 两个人" },
      { term: "一本 / 一枚", meaning: "一根 / 一张" },
      { term: "百円 / 千円", meaning: "一百日元 / 一千日元" },
    ],
  },
  {
    id: "expressions",
    title: "问候与常用表达",
    subtitle: "おはよう · ありがとう · すみません",
    tone: "lavender",
    entries: [
      { term: "おはようございます", meaning: "早上好" },
      { term: "ありがとうございます", meaning: "谢谢" },
      { term: "すみません", meaning: "不好意思 / 对不起" },
      { term: "よろしくお願いします", meaning: "请多关照" },
    ],
  },
  {
    id: "weather",
    title: "颜色与天气",
    subtitle: "白い · 暑い · 雨が降る",
    tone: "mint",
    entries: [
      { term: "白い / 黒い", meaning: "白色的 / 黑色的" },
      { term: "晴れ / 雨", meaning: "晴天 / 雨天" },
      { term: "暑い / 寒い", meaning: "热 / 冷" },
    ],
  },
  {
    id: "places",
    title: "交通与地点",
    subtitle: "駅 · 電車 · 右 · 左",
    tone: "teal",
    entries: [
      { term: "駅はどこですか", meaning: "车站在哪里？" },
      { term: "電車 / バス", meaning: "电车 / 公交车" },
      { term: "右 / 左 / まっすぐ", meaning: "右 / 左 / 直走" },
    ],
  },
  {
    id: "food-shopping",
    title: "饮食与购物",
    subtitle: "これをください · おいしい",
    tone: "coral",
    entries: [
      { term: "これをください", meaning: "请给我这个" },
      { term: "いくらですか", meaning: "多少钱？" },
      { term: "おいしいです", meaning: "很好吃" },
    ],
  },
  {
    id: "particles",
    title: "助词小抄",
    subtitle: "は · が · を · に · で",
    tone: "lavender",
    entries: [
      { term: "私は学生です", meaning: "我是学生" },
      { term: "水を飲みます", meaning: "喝水" },
      { term: "学校に行きます", meaning: "去学校" },
    ],
  },
];

export const HIRAGANA_ROWS: KanaCell[][] = [
  [
    { character: "あ", romaji: "a" },
    { character: "い", romaji: "i" },
    { character: "う", romaji: "u" },
    { character: "え", romaji: "e" },
    { character: "お", romaji: "o" },
  ],
  [
    { character: "か", romaji: "ka" },
    { character: "き", romaji: "ki" },
    { character: "く", romaji: "ku" },
    { character: "け", romaji: "ke" },
    { character: "こ", romaji: "ko" },
  ],
  [
    { character: "さ", romaji: "sa" },
    { character: "し", romaji: "shi" },
    { character: "す", romaji: "su" },
    { character: "せ", romaji: "se" },
    { character: "そ", romaji: "so" },
  ],
  [
    { character: "た", romaji: "ta" },
    { character: "ち", romaji: "chi" },
    { character: "つ", romaji: "tsu" },
    { character: "て", romaji: "te" },
    { character: "と", romaji: "to" },
  ],
  [
    { character: "な", romaji: "na" },
    { character: "に", romaji: "ni" },
    { character: "ぬ", romaji: "nu" },
    { character: "ね", romaji: "ne" },
    { character: "の", romaji: "no" },
  ],
  [
    { character: "は", romaji: "ha" },
    { character: "ひ", romaji: "hi" },
    { character: "ふ", romaji: "fu" },
    { character: "へ", romaji: "he" },
    { character: "ほ", romaji: "ho" },
  ],
  [
    { character: "ま", romaji: "ma" },
    { character: "み", romaji: "mi" },
    { character: "む", romaji: "mu" },
    { character: "め", romaji: "me" },
    { character: "も", romaji: "mo" },
  ],
  [
    { character: "や", romaji: "ya" },
    { character: "ゆ", romaji: "yu" },
    { character: "よ", romaji: "yo" },
  ],
  [
    { character: "ら", romaji: "ra" },
    { character: "り", romaji: "ri" },
    { character: "る", romaji: "ru" },
    { character: "れ", romaji: "re" },
    { character: "ろ", romaji: "ro" },
  ],
  [
    { character: "わ", romaji: "wa" },
    { character: "を", romaji: "wo" },
    { character: "ん", romaji: "n" },
  ],
];

export const KATAKANA_ROWS: KanaCell[][] = [
  [
    { character: "ア", romaji: "a" },
    { character: "イ", romaji: "i" },
    { character: "ウ", romaji: "u" },
    { character: "エ", romaji: "e" },
    { character: "オ", romaji: "o" },
  ],
  [
    { character: "カ", romaji: "ka" },
    { character: "キ", romaji: "ki" },
    { character: "ク", romaji: "ku" },
    { character: "ケ", romaji: "ke" },
    { character: "コ", romaji: "ko" },
  ],
  [
    { character: "サ", romaji: "sa" },
    { character: "シ", romaji: "shi" },
    { character: "ス", romaji: "su" },
    { character: "セ", romaji: "se" },
    { character: "ソ", romaji: "so" },
  ],
  [
    { character: "タ", romaji: "ta" },
    { character: "チ", romaji: "chi" },
    { character: "ツ", romaji: "tsu" },
    { character: "テ", romaji: "te" },
    { character: "ト", romaji: "to" },
  ],
  [
    { character: "ナ", romaji: "na" },
    { character: "ニ", romaji: "ni" },
    { character: "ヌ", romaji: "nu" },
    { character: "ネ", romaji: "ne" },
    { character: "ノ", romaji: "no" },
  ],
  [
    { character: "ハ", romaji: "ha" },
    { character: "ヒ", romaji: "hi" },
    { character: "フ", romaji: "fu" },
    { character: "ヘ", romaji: "he" },
    { character: "ホ", romaji: "ho" },
  ],
  [
    { character: "マ", romaji: "ma" },
    { character: "ミ", romaji: "mi" },
    { character: "ム", romaji: "mu" },
    { character: "メ", romaji: "me" },
    { character: "モ", romaji: "mo" },
  ],
  [
    { character: "ヤ", romaji: "ya" },
    { character: "ユ", romaji: "yu" },
    { character: "ヨ", romaji: "yo" },
  ],
  [
    { character: "ラ", romaji: "ra" },
    { character: "リ", romaji: "ri" },
    { character: "ル", romaji: "ru" },
    { character: "レ", romaji: "re" },
    { character: "ロ", romaji: "ro" },
  ],
  [
    { character: "ワ", romaji: "wa" },
    { character: "ヲ", romaji: "wo" },
    { character: "ン", romaji: "n" },
  ],
];

export const KANA_TOTAL =
  HIRAGANA_ROWS.flat().length + KATAKANA_ROWS.flat().length;

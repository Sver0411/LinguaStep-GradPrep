import type {
  ChoiceQuestion,
  GrammarLanguage,
  GrammarPoint,
} from "@/lib/models";

interface GrammarSpec {
  id: string;
  title: string;
  language: GrammarLanguage;
  level: string;
  meaning: string;
  structure: string;
  connection: string;
  nuance: string;
  context: string;
  answer: string;
  distractors: [string, string, string];
  example: string;
  translation: string;
  counterpart: string;
  pitfall: string;
}

function rotateOptions(
  values: [string, string, string, string],
  correct: string,
  seed: number,
): { options: [string, string, string, string]; correctIndex: number } {
  const shift = seed % 4;
  const options = values.map((_, index) => values[(index + shift) % 4]) as [
    string,
    string,
    string,
    string,
  ];
  return { options, correctIndex: options.indexOf(correct) };
}

function exercises(spec: GrammarSpec): ChoiceQuestion[] {
  const fill = rotateOptions(
    [spec.answer, ...spec.distractors],
    spec.answer,
    spec.id.length,
  );
  const meaning = rotateOptions(
    [spec.meaning, "表示单纯原因", "表示完全否定", "表示动作正在同时进行"],
    spec.meaning,
    spec.id.length + 1,
  );
  const structure = rotateOptions(
    [spec.structure, "名词＋だけで", "动词命令形＋と", "形容词词干＋さえ"],
    spec.structure,
    spec.id.length + 2,
  );
  const scene = rotateOptions(
    [spec.nuance, "只适合陈述客观数字", "只用于直接命令", "只用于儿童口语"],
    spec.nuance,
    spec.id.length + 3,
  );
  const counterpart = rotateOptions(
    [spec.counterpart, "There is no relationship.", "Do it immediately.", "It happened by accident."],
    spec.counterpart,
    spec.id.length + 4,
  );

  return [
    {
      id: `${spec.id}-q1`,
      source: "grammar",
      sourceId: spec.id,
      prompt: `选择最自然的形式：${spec.context}`,
      options: fill.options,
      correctIndex: fill.correctIndex,
      explanation: `${spec.answer}符合该句的接续和“${spec.meaning}”这一语义。`,
      language: spec.language,
      difficulty: spec.level,
      category: "grammar",
    },
    {
      id: `${spec.id}-q2`,
      source: "grammar",
      sourceId: spec.id,
      prompt: `“${spec.title}”最核心的含义是什么？`,
      options: meaning.options,
      correctIndex: meaning.correctIndex,
      explanation: spec.nuance,
      language: spec.language,
      difficulty: spec.level,
      category: "grammar",
    },
    {
      id: `${spec.id}-q3`,
      source: "grammar",
      sourceId: spec.id,
      prompt: "选择正确的基本结构。",
      options: structure.options,
      correctIndex: structure.correctIndex,
      explanation: spec.connection,
      language: spec.language,
      difficulty: spec.level,
      category: "grammar",
    },
    {
      id: `${spec.id}-q4`,
      source: "grammar",
      sourceId: spec.id,
      prompt: "哪一项最符合这个语法的使用场景或语气？",
      options: scene.options,
      correctIndex: scene.correctIndex,
      explanation: `${spec.nuance} 常见误区：${spec.pitfall}`,
      language: spec.language,
      difficulty: spec.level,
      category: "grammar",
    },
    {
      id: `${spec.id}-q5`,
      source: "grammar",
      sourceId: spec.id,
      prompt: `例句“${spec.example}”最接近哪一项英语表达？`,
      options: counterpart.options,
      correctIndex: counterpart.correctIndex,
      explanation: `${spec.translation}；对应表达是 ${spec.counterpart}`,
      language: spec.language,
      difficulty: spec.level,
      category: "grammar",
    },
  ];
}

function point(spec: GrammarSpec): GrammarPoint {
  return {
    id: spec.id,
    title: spec.title,
    language: spec.language,
    level: spec.level,
    explanation: `${spec.meaning}。${spec.nuance} 使用时需要结合上下文判断说话人的立场，不能只按中文逐字替换。`,
    structure: spec.structure,
    connection: spec.connection,
    scenarios: [spec.nuance, `用于表达“${spec.meaning}”`, "用于正式或中性说明"],
    nuance: spec.nuance,
    examples: [
      { text: spec.example, translationZh: spec.translation },
      {
        text: spec.language === "japanese" ? spec.context.replace("（　）", spec.answer) : spec.context.replace("___", spec.answer),
        translationZh: `该例句用于确认“${spec.meaning}”的结构。`,
      },
    ],
    comparison: {
      japanese: spec.language === "japanese" ? spec.example : `同类语义：${spec.meaning}`,
      english: spec.counterpart,
      translationZh: spec.translation,
    },
    commonErrors: [spec.pitfall, `不要忽略接续要求：${spec.connection}`],
    confusables: [`近义表达需要按语气强度和事实性区分；本项重点是“${spec.meaning}”。`],
    exercises: exercises(spec),
    source: "curated",
  };
}

const SPECS: GrammarSpec[] = [
  { id:"jp-monono", title:"〜ものの：虽然……但是……", language:"japanese", level:"JLPT N2 核心", meaning:"承认前项事实后指出与预期不同的结果", structure:"普通形＋ものの", connection:"动词／い形普通形；な形与名词可用「である＋ものの」", nuance:"书面而克制，通常不带强烈责备", context:"資格は取った（　）、実務経験がまだ足りない。", answer:"ものの", distractors:["ために","ばかりか","次第"], example:"薬を飲んだものの、痛みは完全には消えなかった。", translation:"虽然吃了药，但疼痛并未完全消失。", counterpart:"Although I took the medicine, the pain did not disappear completely.", pitfall:"不要把它用于单纯并列；前后必须存在反预期关系。" },
  { id:"jp-wakeniha", title:"〜わけにはいかない：不能……", language:"japanese", level:"JLPT N2 核心", meaning:"因责任、常识或处境而不能做某事", structure:"动词辞书形／ない形＋わけにはいかない", connection:"接在意志性动作后；双重否定「ないわけにはいかない」表示不得不", nuance:"不是能力不足，而是社会或心理上的制约", context:"約束した以上、途中でやめる（　）。", answer:"わけにはいかない", distractors:["ことにする","おそれがある","ものの"], example:"明日は試験なので、今日は遊んでいるわけにはいかない。", translation:"明天有考试，所以今天不能只顾着玩。", counterpart:"I cannot afford to spend today playing because the exam is tomorrow.", pitfall:"不能用来表达不会游泳等能力上的不可能。" },
  { id:"jp-kotonisuru", title:"〜ことにする：决定……", language:"japanese", level:"JLPT N3 巩固", meaning:"说话人主动做出决定", structure:"动词辞书形／ない形＋ことにする", connection:"决定不做某事时使用「ないことにする」", nuance:"强调个人或当事人的意志，与外部决定相区别", context:"健康のため、毎朝歩く（　）。", answer:"ことにした", distractors:["ことになった","ようになった","ものだった"], example:"来月から毎日日本語で日記を書くことにした。", translation:"我决定从下个月开始每天用日语写日记。", counterpart:"I decided to write a diary in Japanese every day from next month.", pitfall:"制度或他人安排应使用「ことになる」。" },
  { id:"jp-youninaru", title:"〜ようになる：变得能够……", language:"japanese", level:"JLPT N3 巩固", meaning:"能力、习惯或状态经过变化后成立", structure:"动词辞书形／ない形＋ようになる", connection:"常与表示时间或练习过程的表达一起使用", nuance:"关注结果状态的自然变化，不强调一次主动决定", context:"練習して、速く読める（　）。", answer:"ようになった", distractors:["ようにした","ことにした","ばかりだった"], example:"毎日練習して、自然に話せるようになった。", translation:"通过每天练习，变得能够自然地说话了。", counterpart:"Daily practice enabled me to speak naturally.", pitfall:"主动养成习惯时更适合「ようにする」。" },
  { id:"jp-younisuru", title:"〜ようにする：尽量做到……", language:"japanese", level:"JLPT N3 巩固", meaning:"有意识地努力形成习惯或避免某事", structure:"动词辞书形／ない形＋ようにする", connection:"常与「毎日」「できるだけ」等持续表达共现", nuance:"强调反复的主观努力，不是一次性的决定", context:"寝る前にスマホを見ない（　）。", answer:"ようにしている", distractors:["ようになっている","ことになっている","ものにしている"], example:"新しい単語を毎日復習するようにしている。", translation:"我尽量每天复习新单词。", counterpart:"I make a point of reviewing new words every day.", pitfall:"能力自然形成应使用「ようになる」。" },
  { id:"jp-tabini", title:"〜たびに：每当……", language:"japanese", level:"JLPT N3 巩固", meaning:"同一条件每次出现都会发生后项", structure:"动词辞书形／名词＋の＋たびに", connection:"后项通常是反复出现的变化、感受或发现", nuance:"强调每一次都如此，不能用于只发生一次的事件", context:"この写真を見る（　）、学生時代を思い出す。", answer:"たびに", distractors:["うちに","ものの","ことから"], example:"この町を訪れるたびに、新しい発見がある。", translation:"每次到访这座城市都会有新的发现。", counterpart:"Every time I visit this town, I discover something new.", pitfall:"名词后要使用「のたびに」。" },
  { id:"jp-nitsurete", title:"〜につれて：随着……", language:"japanese", level:"JLPT N2 核心", meaning:"一个连续变化伴随另一个自然变化", structure:"动词辞书形／变化名词＋につれて", connection:"前后都应具有方向性或阶段性的变化", nuance:"强调自然的同步变化，通常不接意志命令", context:"気温が上がる（　）、電力の使用量も増える。", answer:"につれて", distractors:["に対して","をめぐって","ことから"], example:"日本語が上達するにつれて、読むのが楽しくなった。", translation:"随着日语进步，阅读也变得有趣了。", counterpart:"As my Japanese improved, reading became more enjoyable.", pitfall:"后项若是主动命令或计划，通常不自然。" },
  { id:"jp-nitomonatte", title:"〜に伴って：伴随着……", language:"japanese", level:"JLPT N2 核心", meaning:"某种较大变化带来相关变化", structure:"名词／动词辞书形＋に伴って", connection:"多接社会、制度、规模等客观变化", nuance:"比「につれて」更正式，也可包含因果关系", context:"制度の変更（　）、申請方法も変わった。", answer:"に伴って", distractors:["に限って","に対して","ものの"], example:"人口の増加に伴って、住宅の需要も高まった。", translation:"伴随人口增加，住房需求也上升了。", counterpart:"Housing demand rose along with population growth.", pitfall:"日常微小的自然变化通常用「につれて」更自然。" },
  { id:"jp-nitaishite", title:"〜に対して：对于／与……相对", language:"japanese", level:"JLPT N3 巩固", meaning:"指出对象，或对比两个不同对象", structure:"名词＋に対して", connection:"修饰名词时用「に対する＋名词」", nuance:"可表示态度的对象，也可表示鲜明对比", context:"先生は学生の質問（　）丁寧に答えた。", answer:"に対して", distractors:["について","に伴って","に基づいて"], example:"兄が慎重なのに対して、弟は行動が速い。", translation:"哥哥很谨慎，而弟弟行动迅速。", counterpart:"While the older brother is cautious, the younger one acts quickly.", pitfall:"单纯表示话题时通常用「について」。" },
  { id:"jp-ippoude", title:"〜一方で：另一方面……", language:"japanese", level:"JLPT N2 核心", meaning:"并列同一事物的两个不同侧面或形成对比", structure:"普通形＋一方で；名词／な形＋である一方で", connection:"前后可以针对同一对象，也可以比较不同对象", nuance:"书面常用，语气比简单的「でも」更有分析性", context:"オンライン授業は便利な（　）、集中しにくい面もある。", answer:"一方で", distractors:["ことから","次第で","ばかりに"], example:"この仕事は自由な一方で、責任も重い。", translation:"这份工作自由度高，但另一方面责任也很重。", counterpart:"This job offers freedom, while it also carries heavy responsibility.", pitfall:"不是表示时间顺序的“接着”。" },
  { id:"jp-bakarika", title:"〜ばかりか：不但……而且……", language:"japanese", level:"JLPT N2 核心", meaning:"在前项基础上追加程度更高或意外的后项", structure:"普通形／名词＋ばかりか", connection:"后项常与「も」「まで」「さえ」呼应", nuance:"强调追加和递进，后项往往超出预期", context:"彼は英語（　）、中国語も話せる。", answer:"ばかりか", distractors:["に限って","ものの","に対して"], example:"この製品は安いばかりか、品質も高い。", translation:"这款产品不仅便宜，而且质量也高。", counterpart:"This product is not only inexpensive but also high in quality.", pitfall:"只表示限定时不能使用「ばかりか」。" },
  { id:"jp-osoregaaru", title:"〜おそれがある：恐怕会……", language:"japanese", level:"JLPT N2 核心", meaning:"客观指出不希望发生的可能性", structure:"动词普通形／名词＋の＋おそれがある", connection:"多用于新闻、公告和正式风险说明", nuance:"只用于负面风险，语气正式而客观", context:"大雨で川があふれる（　）。", answer:"おそれがある", distractors:["ことにする","に違いない","ものがある"], example:"このままでは事故が起こるおそれがある。", translation:"照这样下去，恐怕会发生事故。", counterpart:"There is a risk that an accident may occur if this continues.", pitfall:"积极的可能性应使用「可能性がある」，不用「おそれ」。" },
  { id:"jp-kanenai", title:"〜かねない：有可能……", language:"japanese", level:"JLPT N2 核心", meaning:"根据当前迹象警告负面结果可能发生", structure:"动词ます形去ます＋かねない", connection:"只接动词，常见于提醒和批评", nuance:"比普通「かもしれない」更带警戒和担忧", context:"その言い方は誤解を招き（　）。", answer:"かねない", distractors:["ざるを得ない","ものの","に基づく"], example:"無理を続けると、健康を損ないかねない。", translation:"继续勉强下去可能会损害健康。", counterpart:"Continuing to overwork could damage your health.", pitfall:"注意接续是ます形词干，不是辞书形。" },
  { id:"jp-zaruwoenai", title:"〜ざるを得ない：不得不……", language:"japanese", level:"JLPT N2 核心", meaning:"虽不情愿但因外部原因必须如此", structure:"动词ない形去ない＋ざるを得ない", connection:"「する」变为「せざるを得ない」", nuance:"正式且带无奈，比「なければならない」更强调别无选择", context:"予算不足で計画を変更せ（　）。", answer:"ざるを得ない", distractors:["かねない","ものの","次第だ"], example:"電車が止まり、タクシーを使わざるを得なかった。", translation:"电车停运了，只能不得不坐出租车。", counterpart:"The train stopped, so I had no choice but to take a taxi.", pitfall:"「する」的特殊形式是「せざるを得ない」。" },
  { id:"jp-kotokara", title:"〜ことから：由于／从……来看", language:"japanese", level:"JLPT N2 核心", meaning:"根据可观察事实说明原因、判断或命名由来", structure:"普通形＋ことから", connection:"名词和な形可用「であることから」", nuance:"强调作为判断依据的客观事实", context:"駅に近い（　）、この地域は人気がある。", answer:"ことから", distractors:["ものの","次第で","に対して"], example:"形が星に似ていることから、その名が付けられた。", translation:"由于形状像星星，因此得了这个名字。", counterpart:"It was given that name because its shape resembles a star.", pitfall:"单纯主观理由在口语中常用「から／ので」。" },
  { id:"jp-nimotoduite", title:"〜に基づいて：基于……", language:"japanese", level:"JLPT N2 核心", meaning:"以事实、规则或资料作为依据", structure:"名词＋に基づいて／に基づく＋名词", connection:"后接名词时使用连体形「に基づく」", nuance:"正式客观，常用于研究、制度和判断", context:"調査結果（　）、新しい方針を決めた。", answer:"に基づいて", distractors:["をめぐって","に対して","ばかりか"], example:"データに基づいて結論を出す必要がある。", translation:"有必要依据数据得出结论。", counterpart:"We need to draw a conclusion based on the data.", pitfall:"不能表示话题；谈论某事应使用「について」。" },
  { id:"jp-womegutte", title:"〜をめぐって：围绕……", language:"japanese", level:"JLPT N2 核心", meaning:"多个主体围绕某议题产生讨论、对立或行动", structure:"名词＋をめぐって／をめぐる＋名词", connection:"后接名词时用「をめぐる問題」等形式", nuance:"常含争议或多方关系，不只是单纯话题", context:"新しい制度（　）、激しい議論が続いている。", answer:"をめぐって", distractors:["に基づいて","において","に伴って"], example:"土地の利用をめぐって住民の意見が分かれた。", translation:"围绕土地使用问题，居民意见产生了分歧。", counterpart:"Residents were divided over how the land should be used.", pitfall:"只有一个人单纯说明话题时用「について」更自然。" },
  { id:"jp-nikanshite", title:"〜に関して：关于……", language:"japanese", level:"JLPT N2 核心", meaning:"正式提出信息、调查或说明的主题", structure:"名词＋に関して／に関する＋名词", connection:"后接名词时使用「に関する」", nuance:"比「について」正式，常见于公告和书面语", context:"申請方法（　）、窓口にお問い合わせください。", answer:"に関して", distractors:["をめぐって","に対して","につれて"], example:"環境問題に関して詳しい調査が行われた。", translation:"针对环境问题进行了详细调查。", counterpart:"A detailed investigation was conducted regarding environmental issues.", pitfall:"不要把「に関して」误当作表示对象态度的「に対して」。" },
  { id:"jp-nioite", title:"〜において：在……／于……", language:"japanese", level:"JLPT N2 核心", meaning:"正式指出事件发生的场所、时期或领域", structure:"名词＋において／における＋名词", connection:"修饰名词时使用「における」", nuance:"书面正式，相当于口语的「で」或「に」", context:"現代社会（　）、情報の役割は大きい。", answer:"において", distractors:["に伴って","を通じて","に限って"], example:"会議は本社において開催される。", translation:"会议将在总公司举行。", counterpart:"The meeting will be held at the head office.", pitfall:"日常口语地点通常直接用「で」，不必过度正式。" },
  { id:"jp-niwatatte", title:"〜にわたって：历经／遍及……", language:"japanese", level:"JLPT N2 核心", meaning:"范围在时间、空间或数量上持续得很广", structure:"名词＋にわたって／にわたる＋名词", connection:"常与期间、地区、领域等范围名词搭配", nuance:"强调跨度广，不用于单一瞬间或极小范围", context:"調査は三年間（　）行われた。", answer:"にわたって", distractors:["に対して","ことから","ばかりか"], example:"台風の影響は広い地域にわたった。", translation:"台风影响遍及广阔地区。", counterpart:"The typhoon affected a wide area.", pitfall:"短暂的一次动作不适合使用此表达。" },
  { id:"jp-shidai", title:"〜次第：一……就……／取决于……", language:"japanese", level:"JLPT N2 核心", meaning:"前项完成后立即行动，或结果由某因素决定", structure:"动词ます形词干＋次第；名词＋次第だ", connection:"表示立即行动时后项多为说话人的计划", nuance:"正式且强调紧接发生；名词接续时表示取决于", context:"結果が分かり（　）、すぐご連絡します。", answer:"次第", distractors:["ものの","たびに","に対して"], example:"準備ができ次第、出発します。", translation:"准备一完成就出发。", counterpart:"We will leave as soon as the preparations are complete.", pitfall:"已经发生的过去事件通常不用表示将来安排的「次第」。" },
  { id:"jp-aida", title:"〜間／間に：在……期间", language:"japanese", level:"JLPT N3 核心", meaning:"表示某状态持续的整个期间，或期间内发生一次动作", structure:"名词＋の／普通形＋間（に）", connection:"持续动作常用「間」，期间内某一点发生的动作常用「間に」", nuance:"关键在于后项是全程持续还是只在期间内发生", context:"母が買い物をしている（　）、部屋を掃除した。", answer:"間に", distractors:["うちで","たびに","最中を"], example:"夏休みの間、毎日図書館で勉強した。", translation:"暑假期间，我每天都在图书馆学习。", counterpart:"I studied at the library every day during summer vacation.", pitfall:"不要混淆全程持续的「間」和期间内一次完成的「間に」。" },
  { id:"jp-ijouwa", title:"〜以上（は）：既然……就……", language:"japanese", level:"JLPT N3 核心", meaning:"承认前项事实后提出相应责任、决心或义务", structure:"普通形＋以上（は）", connection:"名词和な形容词常用「である以上」", nuance:"后项多是义务、意志、判断，不用于轻微随意的结果", context:"約束した（　）、最後まで責任を持つべきだ。", answer:"以上は", distractors:["うちに","おかげで","ばかり"], example:"試験を受ける以上、十分に準備したい。", translation:"既然要参加考试，就想充分准备。", counterpart:"Since I am taking the exam, I want to prepare thoroughly.", pitfall:"后项一般不接单纯过去事实，而接责任、意志或必然判断。" },
  { id:"jp-uchini", title:"〜うちに：趁着……／在……过程中", language:"japanese", level:"JLPT N3 核心", meaning:"趁某状态尚未改变采取行动，或在持续过程中自然变化", structure:"动词辞书形／ない形／ている形；い形；な形＋な；名词＋の＋うちに", connection:"前项通常是有时间界限的状态", nuance:"带有错过当前时机后条件会改变的含义", context:"忘れない（　）、メモしておきましょう。", answer:"うちに", distractors:["以上に","たびに","せいで"], example:"日本にいるうちに、京都を訪れたい。", translation:"想趁在日本期间去京都看看。", counterpart:"I want to visit Kyoto while I am still in Japan.", pitfall:"若只是表示两个动作同时持续，不一定使用「うちに」。" },
  { id:"jp-okagede", title:"〜おかげで：多亏……", language:"japanese", level:"JLPT N3 核心", meaning:"说明带来好结果的原因并表达感谢", structure:"普通形；名词＋の＋おかげで", connection:"句末可用「おかげだ」总结原因", nuance:"原则上用于积极结果，讽刺用法需有明确语境", context:"先生が丁寧に説明してくれた（　）、理解できた。", answer:"おかげで", distractors:["せいで","以上は","くせに"], example:"毎日練習したおかげで、試合に勝てた。", translation:"多亏每天练习，比赛获胜了。", counterpart:"Thanks to daily practice, we won the match.", pitfall:"负面原因通常用「せいで」，不要机械互换。" },
  { id:"jp-okini", title:"〜おきに：每隔……", language:"japanese", level:"JLPT N3 核心", meaning:"表示以固定间隔重复发生", structure:"数量词＋おきに", connection:"「一日おきに」通常表示隔一天一次", nuance:"关注两个事件之间的间隔，不等同于每一个单位都发生", context:"この薬は六時間（　）飲んでください。", answer:"おきに", distractors:["ごとで","たびを","うちに"], example:"駅では二分おきに電車が来る。", translation:"车站每隔两分钟就来一班电车。", counterpart:"A train arrives at the station every two minutes.", pitfall:"「一日おき」和「一日ごと」在实际频率上可能不同，要结合单位理解。" },
  { id:"jp-gachida", title:"〜がちだ：往往……／容易……", language:"japanese", level:"JLPT N3 核心", meaning:"表示某种多为负面的倾向经常出现", structure:"动词ます形词干／名词＋がちだ", connection:"可用「がちな＋名词」「がちに＋动词」", nuance:"用于实际发生频率偏高的倾向，不是单纯可能性", context:"忙しいと、朝食を抜き（　）。", answer:"がちだ", distractors:["気味だ","そうだ","ようだ"], example:"梅雨の時期は家にこもりがちだ。", translation:"梅雨季节往往容易待在家里不出门。", counterpart:"During the rainy season, people tend to stay indoors.", pitfall:"「気味」表示轻微状态，「がち」强调经常出现的倾向。" },
  { id:"jp-karashite", title:"〜からして：单从……来看", language:"japanese", level:"JLPT N3 进阶", meaning:"举出最明显的一个例子并据此评价整体", structure:"名词＋からして", connection:"常接具有代表性的部分、态度或外观", nuance:"说话人从一个典型线索推断整体，评价色彩较强", context:"彼は話し方（　）、自信に満ちている。", answer:"からして", distractors:["について","にとって","とともに"], example:"この店は入口の雰囲気からして高級そうだ。", translation:"这家店单从入口的氛围看就很高级。", counterpart:"Judging from the entrance alone, this restaurant looks expensive.", pitfall:"不要把它当作普通起点「から」使用。" },
  { id:"jp-kawarini", title:"〜代わりに：代替……／作为交换", language:"japanese", level:"JLPT N3 核心", meaning:"代替某人某事，或说明得到一项条件同时承担另一项", structure:"名词＋の／动词普通形＋代わりに", connection:"可表示代理、替代和补偿交换", nuance:"前后常存在替换或对等交换关系", context:"私が料理する（　）、弟が皿を洗う。", answer:"代わりに", distractors:["せいで","最中に","ごとに"], example:"父の代わりに会議へ出席した。", translation:"我代替父亲参加了会议。", counterpart:"I attended the meeting in place of my father.", pitfall:"单纯转折没有替代或交换关系时不用此表达。" },
  { id:"jp-gimi", title:"〜気味：有点……倾向", language:"japanese", level:"JLPT N3 核心", meaning:"表示身体、心理或状态略微呈现某种倾向", structure:"动词ます形词干／名词＋気味", connection:"常与疲れ、風邪、遅れ等词搭配", nuance:"程度较轻且多为负面状态", context:"最近少し疲れ（　）なので、早く寝る。", answer:"気味", distractors:["がち","だらけ","ばかり"], example:"今日は風邪気味なので、運動を控えます。", translation:"今天有点感冒，所以不运动了。", counterpart:"I feel slightly sick today, so I will avoid exercise.", pitfall:"经常发生的行为倾向更适合「がち」。" },
  { id:"jp-kiru", title:"〜きる／きれない：做完／无法完全……", language:"japanese", level:"JLPT N3 核心", meaning:"表示动作彻底完成，或数量程度大到无法完成", structure:"动词ます形词干＋きる／きれない", connection:"常接吃、读、用、相信等可达成终点的动作", nuance:"强调从头到尾、完全达到界限", context:"この量は一人では食べ（　）。", answer:"きれない", distractors:["にくい","がたい","かねない"], example:"長い小説を三日で読みきった。", translation:"三天把那部长篇小说读完了。", counterpart:"I finished reading the long novel in three days.", pitfall:"不是所有动作都有可感知的完成界限。" },
  { id:"jp-kuseni", title:"〜くせに：明明……却……", language:"japanese", level:"JLPT N3 核心", meaning:"针对与前项身份、能力或事实不相称的行为表达责备", structure:"普通形；名词＋の；な形＋な＋くせに", connection:"主语通常相同，且多针对人", nuance:"责备和轻蔑色彩强，不适合礼貌中性场合", context:"知っている（　）、何も教えてくれない。", answer:"くせに", distractors:["おかげで","以上は","ために"], example:"子どものくせに、大人のような話し方をする。", translation:"明明是孩子，说话却像大人一样。", counterpart:"Although he is a child, he talks like an adult.", pitfall:"客观转折用「のに」更合适；「くせに」容易冒犯对方。" },
  { id:"jp-gotoni", title:"〜ごとに：每……／每当……", language:"japanese", level:"JLPT N3 核心", meaning:"表示每一个单位、每一次动作都同样发生", structure:"名词／数量词／动词辞书形＋ごとに", connection:"可接时间、数量和反复动作", nuance:"强调无一例外地按单位重复", context:"この機械は一時間（　）点検する。", answer:"ごとに", distractors:["おきに","うちに","からして"], example:"会う人ごとに同じ質問をされた。", translation:"遇到的每个人都问了我同一个问题。", counterpart:"Every person I met asked me the same question.", pitfall:"表示间隔时要与「おきに」区分。" },
  { id:"jp-saichuuni", title:"〜最中に：正在……的时候", language:"japanese", level:"JLPT N3 核心", meaning:"表示某动作进行到最投入的中间阶段时发生另一件事", structure:"动词ている形／名词＋の＋最中に", connection:"后项常是突然发生并打断前项的事情", nuance:"比「とき」更强调正处于动作中心", context:"会議の（　）、電話が鳴った。", answer:"最中に", distractors:["間を","うちで","たびに"], example:"食事をしている最中に、地震が起きた。", translation:"正在吃饭的时候发生了地震。", counterpart:"An earthquake occurred right in the middle of dinner.", pitfall:"普通时间背景用「とき」即可，不必总用「最中」。" },
  { id:"jp-sae", title:"〜さえ：连……都……", language:"japanese", level:"JLPT N3 核心", meaning:"举出极端例子强调程度超出预期", structure:"名词／助词＋さえ", connection:"可说「にさえ」「でさえ」「からさえ」", nuance:"被举出的项目通常被认为最不可能或最低限度", context:"忙しくて、昼ご飯を食べる時間（　）なかった。", answer:"さえ", distractors:["こそ","ほど","ばかり"], example:"この問題は先生でさえ答えられなかった。", translation:"这道题连老师都没能回答。", counterpart:"Even the teacher could not answer this question.", pitfall:"注意保留必要助词，如「先生にさえ相談しなかった」。" },
  { id:"jp-seide", title:"〜せいで：都怪……／由于……", language:"japanese", level:"JLPT N3 核心", meaning:"说明导致负面结果的原因并带责怪或遗憾", structure:"普通形；名词＋の＋せいで", connection:"句末可用「せいだ」，不确定原因可用「せいか」", nuance:"主观负面评价明显，与积极的「おかげで」相对", context:"電車が遅れた（　）、約束に間に合わなかった。", answer:"せいで", distractors:["おかげで","以上は","ための"], example:"寝不足のせいで、仕事に集中できない。", translation:"因为睡眠不足，工作无法集中注意力。", counterpart:"Because of lack of sleep, I cannot concentrate on work.", pitfall:"客观正式原因可用「ため」，不要总带责怪语气。" },
  { id:"jp-tabakarida", title:"〜たばかりだ：刚刚……", language:"japanese", level:"JLPT N3 核心", meaning:"从说话人主观感觉看动作刚结束不久", structure:"动词た形＋ばかりだ", connection:"可以是几分钟、几天甚至更长，取决于语境", nuance:"强调说话人的“还没过多久”感受，不是严格时间值", context:"日本に来た（　）で、まだ道が分からない。", answer:"ばかり", distractors:["ところ","きり","最中"], example:"このパソコンは先月買ったばかりだ。", translation:"这台电脑是上个月刚买的。", counterpart:"I only bought this computer last month.", pitfall:"与表示动作刚完成瞬间的「たところ」区分。" },
  { id:"jp-darake", title:"〜だらけ：满是……", language:"japanese", level:"JLPT N3 核心", meaning:"表示到处都是不理想的人或事物", structure:"名词＋だらけ", connection:"常与泥、灰尘、错误、伤等负面名词搭配", nuance:"包含说话人的负面评价", context:"この作文は間違い（　）だ。", answer:"だらけ", distractors:["ばかり","ほど","さえ"], example:"雨の中で転んで、服が泥だらけになった。", translation:"在雨中摔了一跤，衣服沾满了泥。", counterpart:"I fell in the rain and my clothes became covered in mud.", pitfall:"中性地表示大量事物时通常不用「だらけ」。" },
  { id:"jp-teirai", title:"〜て以来：自从……以来", language:"japanese", level:"JLPT N3 核心", meaning:"从某个过去事件开始，后项状态一直持续到现在", structure:"动词て形＋以来", connection:"后项多为持续、反复或尚未改变的状态", nuance:"起点通常是对之后有明显影响的重要事件", context:"日本へ来（　）、毎日日記を書いている。", answer:"て以来", distractors:["てからして","て最中","ておきに"], example:"大学を卒業して以来、彼には会っていない。", translation:"自从大学毕业后就没见过他。", counterpart:"I have not seen him since graduating from university.", pitfall:"后项若是一次性完成动作，通常不符合持续语义。" },
  { id:"jp-teshikataganai", title:"〜てしかたがない：……得不得了", language:"japanese", level:"JLPT N3 核心", meaning:"表示无法控制的感情、感觉或欲望程度很强", structure:"动词て形／い形くて／な形で＋しかたがない", connection:"常接担心、想见、疼、困等非意志状态", nuance:"不是客观困难，而是主观感受强烈到无法抑制", context:"試験の結果が気になっ（　）。", answer:"てしかたがない", distractors:["てもかまわない","て以来","てみせる"], example:"海外にいる家族に会いたくてしかたがない。", translation:"想见在海外的家人想得不得了。", counterpart:"I miss my family overseas terribly.", pitfall:"不能接说话人主动控制的命令或计划。" },
  { id:"jp-temokamawanai", title:"〜てもかまわない：即使……也没关系", language:"japanese", level:"JLPT N3 核心", meaning:"表示允许某行为或认为某条件不构成问题", structure:"动词て形／形容词て形／名词＋でも＋かまわない", connection:"疑问形式常用于请求许可", nuance:"语气比「てもいい」稍正式", context:"少し遅れ（　）、必ず来てください。", answer:"てもかまわない", distractors:["てならない","て以来","てしかたがない"], example:"ここに荷物を置いてもかまいません。", translation:"把行李放在这里也没关系。", counterpart:"You may leave your luggage here.", pitfall:"对上级直接说时仍需注意礼貌程度。" },
  { id:"jp-toorini", title:"〜とおりに：按照……", language:"japanese", level:"JLPT N3 核心", meaning:"表示完全依照示范、说明或预定内容行动", structure:"动词辞书形／た形／名词＋の＋とおりに", connection:"部分名词可直接接「どおりに」，如「予定どおり」", nuance:"强调方式或结果与标准一致", context:"説明書に書いてある（　）、操作してください。", answer:"とおりに", distractors:["に比べて","によると","において"], example:"先生が見せたとおりに、漢字を書いた。", translation:"按照老师示范的样子写了汉字。", counterpart:"I wrote the kanji exactly as the teacher demonstrated.", pitfall:"注意「名词＋どおり」和「名词＋のとおり」的搭配差异。" },
  { id:"jp-nikurabete", title:"〜に比べて：与……相比", language:"japanese", level:"JLPT N3 核心", meaning:"以某对象为基准比较差异", structure:"名词＋に比べて", connection:"后项说明程度、性质或数量的不同", nuance:"只表示比较，不必包含对立或评价", context:"去年（　）、今年は雨が少ない。", answer:"に比べて", distractors:["に対して","について","において"], example:"都会に比べて、この町は静かだ。", translation:"和大城市相比，这座小镇很安静。", counterpart:"Compared with the city, this town is quiet.", pitfall:"比较基准必须明确，不能只列出一个对象。" },
  { id:"jp-niyoruto", title:"〜によると：根据……", language:"japanese", level:"JLPT N3 核心", meaning:"指出传闻、信息或判断的来源", structure:"名词＋によると／によれば", connection:"后项常与「そうだ」「ということだ」等传闻表达呼应", nuance:"用于转述来源，不表示行动手段", context:"天気予報（　）、明日は雪だそうだ。", answer:"によると", distractors:["によって","にとって","に対して"], example:"新聞によると、新しい制度が始まるそうだ。", translation:"据报纸报道，新制度即将实施。", counterpart:"According to the newspaper, a new system will begin.", pitfall:"表示手段、原因或被动施事者时使用「によって」。" },
  { id:"jp-bahodo", title:"〜ば〜ほど：越……越……", language:"japanese", level:"JLPT N3 核心", meaning:"表示一方程度增加时另一方也随之变化", structure:"动词ば形＋辞书形＋ほど；い形ければ＋い形＋ほど", connection:"同一词通常在前后重复", nuance:"表达连续相关变化，不是单次比较", context:"練習すれ（　）、上手になる。", answer:"ばするほど", distractors:["てもするほど","たらしただけ","のでしたほど"], example:"日本語は勉強すればするほど面白くなる。", translation:"日语越学越有意思。", counterpart:"The more I study Japanese, the more interesting it becomes.", pitfall:"正确形式要重复核心谓语，如「読めば読むほど」。" },
  { id:"jp-bekida", title:"〜べきだ：应该……", language:"japanese", level:"JLPT N3 进阶", meaning:"根据常识、责任或道德提出强烈建议", structure:"动词辞书形＋べきだ；する→するべき／すべき", connection:"否定常用「べきではない」", nuance:"语气较强，对他人使用可能显得居高临下", context:"約束は守る（　）。", answer:"べきだ", distractors:["はずだ","わけだ","そうだ"], example:"間違いに気づいたら、すぐ謝るべきだ。", translation:"意识到错误后就应该马上道歉。", counterpart:"You should apologize immediately when you realize your mistake.", pitfall:"个人轻微建议用「ほうがいい」更柔和。" },
  { id:"jp-muke", title:"〜向け：面向……／适合……", language:"japanese", level:"JLPT N3 进阶", meaning:"表示商品、服务或内容专门针对某类对象", structure:"名词＋向け（だ／の／に）", connection:"修饰名词时用「向けの＋名词」", nuance:"强调设计时就以该对象为目标", context:"これは初心者（　）の教材です。", answer:"向け", distractors:["向き","ため","に対して"], example:"この番組は子ども向けに作られている。", translation:"这个节目是面向儿童制作的。", counterpart:"This program is made for children.", pitfall:"「向き」表示适合性质，「向け」强调目标受众。" },
  { id:"jp-youganai", title:"〜ようがない：无法……", language:"japanese", level:"JLPT N3 进阶", meaning:"表示即使想做也没有方法或手段", structure:"动词ます形词干＋ようがない", connection:"常接说明、调查、联系、想象等动作", nuance:"强调方法不存在，不是能力暂时不足", context:"住所が分からないので、連絡し（　）。", answer:"ようがない", distractors:["きれない","にくい","がたい"], example:"証拠がなくて、確かめようがない。", translation:"没有证据，无法确认。", counterpart:"There is no way to verify it without evidence.", pitfall:"单纯“做起来困难”使用「にくい」更合适。" },
  { id:"jp-wokikkakeni", title:"〜をきっかけに：以……为契机", language:"japanese", level:"JLPT N3 进阶", meaning:"某事件成为之后变化或行动的直接契机", structure:"名词＋をきっかけに／がきっかけで", connection:"后项多为开始、改变、兴趣或关系发展", nuance:"强调转折点，不等同于普通原因", context:"留学（　）、日本文化に興味を持った。", answer:"をきっかけに", distractors:["を込めて","を中心に","に比べて"], example:"友人の勧めをきっかけに、日本語を学び始めた。", translation:"以朋友的建议为契机，开始学习日语。", counterpart:"A friend's recommendation prompted me to start learning Japanese.", pitfall:"持续性背景原因不一定是明确契机。" },
  { id:"jp-wokomete", title:"〜を込めて：倾注……", language:"japanese", level:"JLPT N3 进阶", meaning:"把感情、愿望或心意融入动作或物品中", structure:"感情名词＋を込めて", connection:"常与感谢、爱、祈愿、心等搭配", nuance:"用于表达真诚而有意识的情感投入", context:"感謝の気持ち（　）、手紙を書いた。", answer:"を込めて", distractors:["を中心に","をきっかけに","に対して"], example:"平和への願いを込めて、歌を歌った。", translation:"怀着对和平的愿望唱了这首歌。", counterpart:"We sang the song with a wish for peace.", pitfall:"不能接没有情感或意图的普通物质名词。" },
  { id:"jp-wochuushinni", title:"〜を中心に：以……为中心", language:"japanese", level:"JLPT N3 进阶", meaning:"表示范围围绕核心人物、地点、内容展开", structure:"名词＋を中心に／を中心として", connection:"修饰名词时用「を中心とする＋名词」", nuance:"强调核心与周边的范围关系", context:"駅（　）、新しい店が増えている。", answer:"を中心に", distractors:["を込めて","をきっかけに","によると"], example:"若者を中心に、このアプリが人気を集めている。", translation:"这款应用主要在年轻人中很受欢迎。", counterpart:"This app is popular mainly among young people.", pitfall:"单纯表示话题时应使用「について」。" },
  { id:"en-modal-deduction", title:"Modal Deduction：情态动词推测", language:"english", level:"CET-4 核心", meaning:"用 must、may、might、cannot 等表达不同确信程度", structure:"modal verb + base verb / have + past participle", connection:"现在推测接动词原形；过去推测用 modal + have done", nuance:"must 表示高度肯定，might 表示可能，cannot 表示认为不可能", context:"The lights are on. She ___ be at home.", answer:"must", distractors:["should to","must to","would have"], example:"He must have forgotten the meeting.", translation:"他一定是忘了会议。", counterpart:"彼は会議を忘れたに違いない。", pitfall:"must have done 是对过去的推测，不表示过去的义务。" },
  { id:"en-wish-subjunctive", title:"Wish & Subjunctive：愿望与虚拟", language:"english", level:"CET-6 过渡", meaning:"表达与现在或过去事实相反的愿望", structure:"wish + past simple / wish + past perfect", connection:"现在相反用过去式；过去后悔用 had + 过去分词", nuance:"形式上的过去时表达距离现实，而不只是时间", context:"I wish I ___ more time now.", answer:"had", distractors:["have","will have","had had"], example:"I wish I had studied harder last year.", translation:"我真希望去年学习得更努力些。", counterpart:"去年もっと勉強していればよかった。", pitfall:"谈现在愿望时不用一般现在时。" },
  { id:"en-participle-clauses", title:"Participle Clauses：分词从句", language:"english", level:"CET-6 过渡", meaning:"用现在分词或过去分词压缩状语从句", structure:"V-ing / past participle, main clause", connection:"主动关系用 V-ing，被动或完成状态常用过去分词", nuance:"分词逻辑主语应与主句主语一致", context:"___ by the news, she called her family.", answer:"Surprised", distractors:["Surprising","Surprise","To surprising"], example:"Having finished the report, he went home.", translation:"完成报告后，他回家了。", counterpart:"報告書を書き終えてから、彼は帰宅した。", pitfall:"避免悬垂分词，即分词动作主体与主句主语不一致。" },
  { id:"en-reported-speech", title:"Reported Speech：间接引语", language:"english", level:"CET-4 核心", meaning:"转述他人话语并按语境调整时态和指示词", structure:"reporting verb + (that) clause", connection:"过去转述常发生时态后移；客观真理可不后移", nuance:"是否后移取决于转述时间和事实是否仍成立", context:"She said that she ___ tired.", answer:"was", distractors:["is always","has be","will been"], example:"He told me that he had finished the task.", translation:"他告诉我他已经完成了任务。", counterpart:"彼は仕事を終えたと私に言った。", pitfall:"tell 后通常需要人作宾语，而 say 不直接接人。" },
  { id:"en-comparatives", title:"Advanced Comparatives：进阶比较结构", language:"english", level:"CET-4 核心", meaning:"使用倍数、相关比较和强调成分表达精确差异", structure:"the + comparative..., the + comparative...", connection:"两个比较级分句表示一方变化带动另一方变化", nuance:"比较对象必须逻辑一致，可用 much/far/even 强调比较级", context:"The more you practice, the ___ you become.", answer:"more confident", distractors:["most confident","confidence","confidently"], example:"The earlier we start, the sooner we will finish.", translation:"开始得越早，完成得越快。", counterpart:"早く始めれば始めるほど、早く終わる。", pitfall:"不能在比较级前使用 very；应使用 much 或 far。" },
  { id:"en-causatives", title:"Causatives：使役结构", language:"english", level:"CET-4・CET-6 过渡", meaning:"表达让、使或请别人完成某动作", structure:"make + object + base verb; have/get + object + past participle", connection:"make 后接原形；服务由他人完成时用 have/get something done", nuance:"make 偏强制，have/get done 常表示安排服务", context:"I had my computer ___ yesterday.", answer:"repaired", distractors:["repair","repairing","to repair"], example:"The teacher made us rewrite the report.", translation:"老师让我们重写报告。", counterpart:"先生は私たちに報告書を書き直させた。", pitfall:"主动使役 make 后不加 to；被动形式则是 be made to do。" },
  { id:"en-articles", title:"Articles：冠词的语义选择", language:"english", level:"高中・CET-4", meaning:"根据可数性、特指性和首次提及选择 a/an、the 或零冠词", structure:"a/an + singular count noun; the + specific noun", connection:"首次提及常用不定冠词，再次指代用 the", nuance:"冠词表达听者能否识别对象，不只是语法装饰", context:"I saw ___ unusual bird, and the bird had a red tail.", answer:"an", distractors:["a","the first","no article"], example:"Education plays an important role in society.", translation:"教育在社会中发挥重要作用。", counterpart:"教育は社会で重要な役割を果たす。", pitfall:"不可数抽象名词泛指时通常不用 a/an。" },
  { id:"en-subject-verb", title:"Subject–Verb Agreement：主谓一致", language:"english", level:"高中・CET-4", meaning:"谓语形式与真正的语法主语在人称和数上保持一致", structure:"singular subject + singular verb", connection:"介词短语和插入语不改变中心主语的数", nuance:"重点识别中心名词，而不是离谓语最近的名词", context:"The quality of these products ___ improved.", answer:"has", distractors:["have","are","were"], example:"Neither of the answers is correct.", translation:"两个答案都不正确。", counterpart:"どちらの答えも正しくない。", pitfall:"the number of 接单数谓语，a number of 接复数谓语。" },
  { id:"en-inversion", title:"Inversion & Emphasis：倒装与强调", language:"english", level:"CET-6・TOEIC 进阶", meaning:"否定副词前置时使用部分倒装以加强正式语气", structure:"negative adverb + auxiliary + subject + verb", connection:"never、rarely、only then 等置于句首会触发助动词倒装", nuance:"多见于正式写作和演讲，强调限制或罕见程度", context:"Never ___ such a clear explanation.", answer:"have I heard", distractors:["I have heard","did I heard","I heard have"], example:"Only then did I understand the problem.", translation:"直到那时我才理解这个问题。", counterpart:"その時になって初めて、問題が分かった。", pitfall:"倒装使用助动词后，实义动词要回到原形。" },
];

export const PHASE_TWO_GRAMMAR_POINTS: GrammarPoint[] = SPECS.map(point);

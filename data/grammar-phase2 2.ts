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

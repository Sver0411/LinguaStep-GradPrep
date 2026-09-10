import type { ChoiceQuestion } from "@/lib/models";
import { GRAMMAR_POINTS } from "@/data/grammar";
import { WORD_PAIRS } from "@/data/words";
import { BOOK_N1_QUESTIONS, BOOK_N2_QUESTIONS, BOOK_N3_QUESTIONS } from "@/data/book-n1-questions";
import { EXTERNAL_QUESTIONS } from "@/data/exam-practice";
import { EXTERNAL_ENGLISH_QUESTIONS } from "@/data/exam-practice-en";

export type ExamLanguage = "japanese" | "english";
export type JapaneseExamLevel = "N3" | "N2" | "N1";
export type EnglishExamLevel = "CET-4" | "CET-6" | "TOEIC";
export type ExamSection = "characters" | "grammar" | "reading";

export interface ExamQuestion extends ChoiceQuestion {
  examLanguage: ExamLanguage;
  examLevel: JapaneseExamLevel | EnglishExamLevel;
  examSection: ExamSection;
  sourceLabel: string;
}

function japaneseQuestion(
  id: string,
  level: JapaneseExamLevel,
  section: ExamSection,
  prompt: string,
  options: [string, string, string, string],
  correctIndex: number,
  explanation: string,
  context?: string,
  sourceLabel = section === "reading" ? "原创 JLPT 真题式阅读" : "红蓝宝书1000题（用户本地资料）",
): ExamQuestion {
  return {
    id: `exam-jp-${level.toLowerCase()}-${id}`,
    source: section === "characters" ? "word" : "grammar",
    sourceId: `exam-jp-${level.toLowerCase()}-${id}`,
    prompt,
    context,
    options,
    correctIndex,
    explanation,
    language: "japanese",
    difficulty: `JLPT ${level}`,
    category: section,
    examLanguage: "japanese",
    examLevel: level,
    examSection: section,
    sourceLabel,
  };
}

function englishQuestion(
  id: string,
  level: EnglishExamLevel,
  section: ExamSection,
  prompt: string,
  options: [string, string, string, string],
  correctIndex: number,
  explanation: string,
  context?: string,
  sourceLabel = "LinguaStep 原创考试型练习",
): ExamQuestion {
  return {
    id: `exam-en-${level.toLowerCase()}-${id}`,
    source: section === "characters" ? "word" : "grammar",
    sourceId: `exam-en-${level.toLowerCase()}-${id}`,
    prompt,
    context,
    options,
    correctIndex,
    explanation,
    language: "english",
    difficulty: level,
    category: section,
    examLanguage: "english",
    examLevel: level,
    examSection: section,
    sourceLabel,
  };
}

const JAPANESE_BOOK_QUESTIONS: ExamQuestion[] = [
  japaneseQuestion("char-001", "N3", "characters", "お店の前に人が並んでいます。下線部の読み方として最もよいものを選びなさい。", ["あそんで", "ならんで", "はさんで", "さけんで"], 1, "「並んで」は「ならんで」と読む。"),
  japaneseQuestion("char-002", "N3", "characters", "日本は物価が高いと言われている。下線部の読み方として最もよいものを選びなさい。", ["ぶつか", "もつか", "ぶっか", "もっか"], 2, "「物価」は「ぶっか」と読み、商品やサービスの価格水準を表す。"),
  japaneseQuestion("vocab-003", "N3", "characters", "すみませんが、（　）ができたので、お先に失礼します。", ["緊急", "急用", "緊張", "急行"], 1, "「急用ができる」は、急いで処理しなければならない用事が生じること。"),
  japaneseQuestion("vocab-004", "N3", "characters", "携帯電話を見ながら階段を（　）のは危険だ。", ["おりる", "さわぐ", "われる", "おちる"], 0, "階段では「階段をおりる」と言う。"),
  japaneseQuestion("grammar-005", "N3", "grammar", "わたしが（　）間に、父は出張から帰ってきました。", ["寝る", "寝ている", "寝た", "寝ていた"], 3, "ある動作が続いていた期間に別の出来事が起きたので「寝ていた間に」が自然。"),
  japaneseQuestion("grammar-006", "N3", "grammar", "この学校の学生である（　）、校則を守らなければならない。", ["以上に", "以上で", "以上の", "以上は"], 3, "「～以上は」は、そうであるからには当然、という義務や決意を表す。"),
  japaneseQuestion("grammar-011", "N3", "grammar", "もち米で作ったものなので、（　）うちに食べたほうがいいと思います。", ["冷める", "冷めている", "冷めない", "冷めなかった"], 2, "状態が変化する前を表す「冷めないうちに」が正しい。"),
  japaneseQuestion("grammar-012", "N3", "grammar", "この組織は6つの部門から（　）。", ["なっています", "なられています", "しています", "されています"], 0, "構成を表す固定表現は「～からなっている」。"),

  japaneseQuestion("char-001", "N2", "characters", "日本では野球選手に憧れる子どもたちが多い。下線部の読み方として最もよいものを選びなさい。", ["あこがれる", "みだれる", "めぐまれる", "たおれる"], 0, "「憧れる」は「あこがれる」と読む。"),
  japaneseQuestion("char-002", "N2", "characters", "最近、化粧をする男性が増えている。下線部の読み方として最もよいものを選びなさい。", ["かしょう", "かっしょう", "けしょう", "けっしょう"], 2, "「化粧」は「けしょう」と読む。"),
  japaneseQuestion("vocab-003", "N2", "characters", "田中選手は、全国大会が終わったら（　）するそうだ。", ["移動", "完了", "引退", "失業"], 2, "競技生活を終える場合は「引退する」を使う。"),
  japaneseQuestion("vocab-004", "N2", "characters", "あのころは親に（　）、悪いことばかりしていた。", ["たたかって", "さからって", "からかって", "ふるまって"], 1, "「親に逆らう」は、親の指示に従わず反抗すること。"),
  japaneseQuestion("grammar-005", "N2", "grammar", "忙しい（　）、睡眠をちゃんと取らないと体が持たないよ。", ["かといって", "からいって", "からして", "からといって"], 3, "「～からといって」は、その理由だけで後件が正当化されないことを表す。"),
  japaneseQuestion("grammar-006", "N2", "grammar", "この問題（　）、ご意見はありませんか。", ["に関して", "にかかわって", "にとって", "にかわって"], 0, "話題や対象を示す場合は「～に関して」を使う。"),
  japaneseQuestion("grammar-011", "N2", "grammar", "会議では新製品の開発（　）、活発な議論が続いている。", ["をめぐって", "をこめて", "を前にして", "を通して"], 0, "「～をめぐって」は、ある話題を中心に議論や対立が起こることを表す。"),
  japaneseQuestion("grammar-012", "N2", "grammar", "彼の言ったことを気にする（　）よ。言い方がいつもきついんだから。", ["理由はない", "ばかりはない", "ことはない", "ものはない"], 2, "「～ことはない」は、その必要がないという助言を表す。"),

  japaneseQuestion("char-001", "N1", "characters", "エレベーターの点検を怠ったため、事故を引き起こした。下線部の読み方として最もよいものを選びなさい。", ["おこたった", "そなわった", "さえぎった", "あなどった"], 0, "「怠る」は「おこたる」と読み、するべきことをしない意味。"),
  japaneseQuestion("char-002", "N1", "characters", "この仕事の応募には、スペイン語が必須条件となっている。下線部の読み方として最もよいものを選びなさい。", ["ひっしゅう", "ひっす", "ひっしゅ", "ひつじゅ"], 1, "「必須」は「ひっす」と読む。"),
  japaneseQuestion("vocab-003", "N1", "characters", "ここ1か月、株価の（　）が続いている。", ["下降", "下落", "下り線", "下り坂"], 1, "株価や地価が下がる場合は「下落」を使う。"),
  japaneseQuestion("vocab-004", "N1", "characters", "妹は恋人ができて、性格が（　）変わった。", ["ぐるりと", "ちらっと", "がらりと", "ずらっと"], 2, "「がらりと変わる」は、状態が急に大きく変化すること。"),
  japaneseQuestion("grammar-005", "N1", "grammar", "今回のシンポジウムは幼児教育（　）諸問題について考える。", ["にかかわる", "にわたる", "にあたいする", "にあたる"], 0, "「～にかかわる」は、その事柄と関係・関連があることを表す。"),
  japaneseQuestion("grammar-006", "N1", "grammar", "食べ物に関しては（　）好き嫌いがない。", ["これといって", "いまひとつ", "うってかわって", "おりいって"], 0, "「これといって～ない」は、特に取り上げるほどのものがないことを表す。"),
  japaneseQuestion("grammar-011", "N1", "grammar", "ここ1か月（　）、仕事に追われてまったく余裕がない。", ["にしても", "としても", "というか", "というもの"], 3, "「ここ1か月というもの」は、その期間ずっと同じ状態が続くことを強調する。"),
  japaneseQuestion("grammar-012", "N1", "grammar", "期末試験の結果（　）、卒業できないこともある。", ["からみると", "いかんでは", "に限って", "を機に"], 1, "「～いかんでは」は、結果や事情によって後件が変わることを表す。"),
];

const JAPANESE_READING_QUESTIONS: ExamQuestion[] = [
  japaneseQuestion("reading-01", "N3", "reading", "図書館が土曜日の閉館時間を遅くする理由は何ですか。", ["本を増やすため", "利用者の希望が多かったため", "職員を減らすため", "工事をするため"], 1, "利用者アンケートで、土曜日も仕事や学校の後に利用したいという希望が多かったため。", "市立図書館では、来月から土曜日の閉館時間を午後5時から午後7時に変更します。利用者アンケートで、仕事や学校の後にも利用したいという意見が多かったためです。日曜日はこれまでどおり午後5時に閉館します。"),
  japaneseQuestion("reading-02", "N3", "reading", "日曜日の閉館時間はどうなりますか。", ["午後5時のまま", "午後6時になる", "午後7時になる", "休館になる"], 0, "本文に「日曜日はこれまでどおり午後5時」とある。", "市立図書館では、来月から土曜日の閉館時間を午後5時から午後7時に変更します。利用者アンケートで、仕事や学校の後にも利用したいという意見が多かったためです。日曜日はこれまでどおり午後5時に閉館します。"),
  japaneseQuestion("reading-03", "N3", "reading", "筆者が朝に準備をするようになって、最も変わったことは何ですか。", ["朝食を食べなくなった", "忘れ物が減った", "学校が近くなった", "寝る時間が遅くなった"], 1, "前の晩に準備することで、朝に慌てず忘れ物も減った。", "以前の私は、朝になってから学校へ持っていく物を準備していた。そのため、急いで家を出て忘れ物をすることが多かった。今は前の晩に準備するようにしている。朝は少しゆっくりでき、忘れ物もほとんどなくなった。"),
  japaneseQuestion("reading-04", "N3", "reading", "筆者は今、いつ学校の準備をしますか。", ["朝起きてすぐ", "学校に着いてから", "前の晩", "週末"], 2, "本文に「今は前の晩に準備する」とある。", "以前の私は、朝になってから学校へ持っていく物を準備していた。そのため、急いで家を出て忘れ物をすることが多かった。今は前の晩に準備するようにしている。朝は少しゆっくりでき、忘れ物もほとんどなくなった。"),

  japaneseQuestion("reading-01", "N2", "reading", "筆者が考える在宅勤務の課題は何ですか。", ["通勤時間が長くなること", "仕事と休憩の区切りが曖昧になること", "会社の仕事がなくなること", "家族と話せなくなること"], 1, "便利さの一方で、仕事と休憩の境界が曖昧になり長時間働く人もいると述べている。", "在宅勤務は通勤時間を減らし、生活に余裕を生む。一方、仕事と休憩の区切りが曖昧になり、以前より長く働いてしまう人もいる。制度を導入するだけでなく、連絡する時間帯や休憩の取り方について、職場全体で共通のルールを作る必要がある。"),
  japaneseQuestion("reading-02", "N2", "reading", "筆者が必要だと考えていることは何ですか。", ["在宅勤務を禁止すること", "全員が同じ家に住むこと", "職場で共通のルールを作ること", "通勤時間を長くすること"], 2, "最後の文で、連絡時間や休憩について共通ルールが必要だと述べている。", "在宅勤務は通勤時間を減らし、生活に余裕を生む。一方、仕事と休憩の区切りが曖昧になり、以前より長く働いてしまう人もいる。制度を導入するだけでなく、連絡する時間帯や休憩の取り方について、職場全体で共通のルールを作る必要がある。"),
  japaneseQuestion("reading-03", "N2", "reading", "新しい商店街の取り組みの目的は何ですか。", ["店を早く閉めるため", "客に地域全体を歩いてもらうため", "商品の値段を上げるため", "観光客を断るため"], 1, "複数の店を回る仕組みにより、地域全体を歩いてもらうことが目的。", "ある商店街では、複数の店で買い物をすると記念品がもらえる仕組みを始めた。一つの店だけを宣伝するのではなく、客に地域全体を歩いてもらうのが目的だ。参加店同士が協力することで、これまで入ったことのない店を知る客も増えている。"),
  japaneseQuestion("reading-04", "N2", "reading", "取り組みの結果、何が起きていますか。", ["参加店が減っている", "知らなかった店に入る客が増えている", "記念品がなくなった", "商店街が閉鎖された"], 1, "本文末に、これまで入ったことのない店を知る客が増えているとある。", "ある商店街では、複数の店で買い物をすると記念品がもらえる仕組みを始めた。一つの店だけを宣伝するのではなく、客に地域全体を歩いてもらうのが目的だ。参加店同士が協力することで、これまで入ったことのない店を知る客も増えている。"),

  japaneseQuestion("reading-01", "N1", "reading", "筆者が指摘する効率化の逆説とは何ですか。", ["道具が高価になるほど仕事が減ること", "時間を節約する道具が、かえって新たな仕事を生むこと", "人が道具を使わなくなること", "効率化によって連絡が完全になくなること"], 1, "節約できた時間に別の仕事が入り、期待した余裕が生まれないという逆説。", "時間を節約する道具が増えれば、私たちは当然、以前より余裕を持てるはずだ。ところが実際には、短時間で処理できるようになった分だけ新しい仕事が加わり、忙しさはむしろ増している。効率化そのものが悪いのではない。節約できた時間を何に使うかを決めないまま、空いた時間をすべて別の作業で埋めてしまうことに問題がある。"),
  japaneseQuestion("reading-02", "N1", "reading", "筆者の主張に最も近いものはどれですか。", ["効率化をすべてやめるべきだ", "空いた時間の用途を意識して決めるべきだ", "新しい仕事は必ず断るべきだ", "道具を使えば自然に余裕が生まれる"], 1, "筆者は効率化を否定せず、節約した時間の使い方を決める必要を述べている。", "時間を節約する道具が増えれば、私たちは当然、以前より余裕を持てるはずだ。ところが実際には、短時間で処理できるようになった分だけ新しい仕事が加わり、忙しさはむしろ増している。効率化そのものが悪いのではない。節約できた時間を何に使うかを決めないまま、空いた時間をすべて別の作業で埋めてしまうことに問題がある。"),
  japaneseQuestion("reading-03", "N1", "reading", "合意形成について、筆者が重要だと考えることは何ですか。", ["反対意見を早く排除すること", "結論を出さず議論を続けること", "異なる前提を明らかにすること", "多数決を一切使わないこと"], 2, "意見の違いだけでなく、その背後にある前提を可視化することが重要だと述べている。", "合意形成というと、全員が同じ意見になることだと考えられがちだ。しかし、立場の異なる人々が完全に同意することはまれである。重要なのは、結論だけを急ぐのではなく、各自が何を前提として判断しているのかを明らかにすることだ。前提の違いが見えれば、譲れる点と譲れない点を具体的に検討できる。"),
  japaneseQuestion("reading-04", "N1", "reading", "本文によれば、前提の違いが見えると何ができますか。", ["全員の立場を同じにできる", "議論を中止できる", "譲歩できる点を具体的に検討できる", "結論を秘密にできる"], 2, "最後の文に、譲れる点と譲れない点を具体的に検討できるとある。", "合意形成というと、全員が同じ意見になることだと考えられがちだ。しかし、立場の異なる人々が完全に同意することはまれである。重要なのは、結論だけを急ぐのではなく、各自が何を前提として判断しているのかを明らかにすることだ。前提の違いが見えれば、譲れる点と譲れない点を具体的に検討できる。"),
];

const ENGLISH_QUESTIONS: ExamQuestion[] = [
  englishQuestion("lang-01", "CET-4", "grammar", "The new library provides students _____ free access to digital journals.", ["at", "with", "for", "by"], 1, "The fixed pattern is provide somebody with something."),
  englishQuestion("lang-02", "CET-4", "grammar", "If it _____ tomorrow, the outdoor activity will be moved indoors.", ["rains", "rained", "will rain", "has rained"], 0, "In a real future condition, the if-clause uses the present simple."),
  englishQuestion("lang-03", "CET-4", "characters", "The word closest in meaning to “essential” is _____.", ["optional", "necessary", "temporary", "ordinary"], 1, "Essential means absolutely necessary or extremely important."),
  englishQuestion("lang-04", "CET-4", "grammar", "Neither the teacher nor the students _____ satisfied with the schedule.", ["was", "is", "has", "were"], 3, "With neither...nor, agreement normally follows the nearer subject, students."),
  englishQuestion("read-01", "CET-4", "reading", "Why did the university introduce reusable cups?", ["To make drinks sweeter", "To reduce disposable waste", "To shorten class time", "To increase parking space"], 1, "The passage states that the program aims to reduce disposable waste.", "A university café has introduced reusable cups to reduce disposable waste. Students pay a small deposit when they take a cup and receive it back when they return the cup. During the first month, the café used 40 percent fewer paper cups than before."),
  englishQuestion("read-02", "CET-4", "reading", "What happens when students return a reusable cup?", ["They receive the deposit back", "They get a free meal", "They must buy another drink", "They pay an extra fee"], 0, "Students receive their small deposit back when the cup is returned."),
  englishQuestion("read-03", "CET-4", "reading", "What result was reported after the first month?", ["Drink sales stopped", "Paper-cup use fell by 40 percent", "The café closed earlier", "All students brought bottles"], 1, "The café used 40 percent fewer paper cups."),
  englishQuestion("read-04", "CET-4", "reading", "Which title best fits the passage?", ["A New Way to Reduce Campus Waste", "How to Prepare for Final Exams", "The History of Coffee", "Why Students Need More Classes"], 0, "The passage focuses on a reusable-cup program and its waste reduction."),

  englishQuestion("lang-01", "CET-6", "grammar", "The committee postponed the vote, arguing that the evidence was not sufficiently _____ to support the proposal.", ["conclusive", "casual", "portable", "obedient"], 0, "Conclusive evidence is strong enough to prove a point or support a decision."),
  englishQuestion("lang-02", "CET-6", "grammar", "Rarely _____ such a rapid change in public attitudes within a single decade.", ["we have witnessed", "have we witnessed", "we witnessed", "did we have witnessed"], 1, "A negative adverb at the beginning triggers subject-auxiliary inversion."),
  englishQuestion("lang-03", "CET-6", "characters", "The word “mitigate” is closest in meaning to _____.", ["intensify", "predict", "reduce", "ignore"], 2, "To mitigate a problem is to make it less severe or harmful."),
  englishQuestion("lang-04", "CET-6", "grammar", "The policy is intended not to replace human judgment _____ to provide it with better evidence.", ["but", "and", "or", "so"], 0, "The correlative structure is not...but...."),
  englishQuestion("read-01", "CET-6", "reading", "What concern does the passage raise about recommendation systems?", ["They make all information unavailable", "They may narrow users' exposure without users noticing", "They prevent people from using phones", "They always recommend false information"], 1, "The concern is the gradual narrowing of exposure, often without conscious awareness.", "Recommendation systems help users manage an overwhelming amount of information. Yet convenience has a cost: when a system repeatedly predicts what a person will prefer, it may gradually narrow that person's exposure to unfamiliar ideas. The problem is not that every recommendation is wrong, but that users may stop noticing what has been left out."),
  englishQuestion("read-02", "CET-6", "reading", "According to the passage, the main problem is not that _____.", ["every recommendation is wrong", "users have preferences", "information is abundant", "systems make predictions"], 0, "The final sentence explicitly says the problem is not that every recommendation is wrong."),
  englishQuestion("read-03", "CET-6", "reading", "What does “what has been left out” refer to?", ["The user's password", "Ideas and information not recommended", "The cost of the device", "The system's source code"], 1, "It refers to unfamiliar ideas excluded from the user's recommendation stream."),
  englishQuestion("read-04", "CET-6", "reading", "Which statement best expresses the author's position?", ["Recommendation systems should be banned", "Convenience should be balanced with awareness of excluded information", "Users should accept every recommendation", "Unfamiliar ideas have no value"], 1, "The author acknowledges convenience while warning about invisible narrowing."),

  englishQuestion("lang-01", "TOEIC", "grammar", "All expense reports must be submitted _____ Friday afternoon to be included in this month's payroll.", ["by", "during", "among", "beside"], 0, "By indicates a deadline no later than Friday afternoon."),
  englishQuestion("lang-02", "TOEIC", "grammar", "Ms. Patel will lead the client meeting _____ Mr. Gomez is delayed at the airport.", ["unless", "because of", "despite", "whereas"], 0, "Unless means except if and correctly introduces the condition."),
  englishQuestion("lang-03", "TOEIC", "characters", "In a business email, “tentative schedule” means a schedule that is _____.", ["final and unchangeable", "not yet confirmed", "already canceled", "kept secret"], 1, "Tentative means provisional or not yet finally decided."),
  englishQuestion("lang-04", "TOEIC", "grammar", "The maintenance team completed the inspection ahead of schedule, _____ production resumed at noon.", ["but", "so", "unless", "although"], 1, "So introduces the result of completing the inspection early."),
  englishQuestion("read-01", "TOEIC", "reading", "Why was the delivery date changed?", ["The customer canceled the order", "A supplier reported a short delay", "The warehouse was permanently closed", "The price was reduced"], 1, "The email attributes the change to a short supplier delay.", "To: Purchasing Team\nSubject: Revised delivery date\nA supplier has reported a short delay in shipping the replacement parts. The delivery originally scheduled for August 12 will now arrive on August 14. Please inform the maintenance team. This change will not affect the planned installation on August 16."),
  englishQuestion("read-02", "TOEIC", "reading", "When will the replacement parts arrive?", ["August 12", "August 14", "August 16", "August 18"], 1, "The revised arrival date is August 14."),
  englishQuestion("read-03", "TOEIC", "reading", "Who should be informed about the change?", ["The sales department", "The maintenance team", "All customers", "The building owner"], 1, "The email asks the purchasing team to inform the maintenance team."),
  englishQuestion("read-04", "TOEIC", "reading", "What will remain unchanged?", ["The supplier", "The price of the parts", "The August 16 installation", "The original arrival date"], 2, "The email says the delivery change will not affect the planned installation on August 16."),
];

const JAPANESE_EXTRA_QUESTIONS: ExamQuestion[] = [
  japaneseQuestion("extra-char-01", "N3", "characters", "駅員に定期券を（　）てもらった。", ["確認し", "完成し", "参加し", "反省し"], 0, "「確認する」は、内容や状態を確かめること。"),
  japaneseQuestion("extra-char-02", "N3", "characters", "改札口で切符を見せてください。下線部の読み方として最もよいものを選びなさい。", ["かいさつぐち", "かいせつぐち", "かいさつこう", "かいせつこう"], 0, "「改札口」は「かいさつぐち」と読む。"),
  japaneseQuestion("extra-char-03", "N3", "characters", "この色はあなたの服によく（　）。", ["似合う", "違う", "戻る", "触る"], 0, "服や色が人に「似合う」は、よく調和するという意味。"),
  japaneseQuestion("extra-char-04", "N3", "characters", "説明が細かすぎて、かえって分かりにくい。下線部の読み方はどれですか。", ["こまかすぎて", "ほそかすぎて", "さいかすぎて", "ちいさすぎて"], 0, "「細かい」は「こまかい」と読む。"),
  japaneseQuestion("extra-grammar-01", "N3", "grammar", "忘れない（　）、メモしておきましょう。", ["ように", "そうに", "ために", "みたいに"], 0, "目的や注意を表す「～ように」を使う。"),
  japaneseQuestion("extra-grammar-02", "N3", "grammar", "この町に引っ越してきた（　）です。", ["ばかり", "ところ", "だけ", "ほど"], 0, "「～たばかりだ」は、動作が終わってから時間があまり経っていないことを表す。"),
  japaneseQuestion("extra-grammar-03", "N3", "grammar", "雨が降っ（　）、試合は行われます。", ["ても", "たら", "なら", "ので"], 0, "「～ても」は、予想に反する条件や譲歩を表す。"),
  japaneseQuestion("extra-grammar-04", "N3", "grammar", "音楽を聞き（　）宿題をした。", ["ながら", "たまま", "そうで", "らしく"], 0, "同時に二つの動作を行う場合は「～ながら」を使う。"),
  japaneseQuestion("extra-reading-01", "N3", "reading", "店が臨時休業するのはなぜですか。", ["店員が旅行するため", "店内の設備を直すため", "商品が売り切れたため", "新しい店を開くため"], 1, "本文に、冷蔵設備の工事を行うためとある。", "駅前のパン屋は、6月10日から12日まで臨時休業します。店内の冷蔵設備を新しくする工事を行うためです。13日の朝から通常どおり営業します。休業中は、隣の商店街の店を利用してください。"),
  japaneseQuestion("extra-reading-02", "N3", "reading", "パン屋はいつ営業を再開しますか。", ["6月10日の朝", "6月12日の夜", "6月13日の朝", "6月14日の午後"], 2, "13日の朝から通常営業すると書かれている。", "駅前のパン屋は、6月10日から12日まで臨時休業します。店内の冷蔵設備を新しくする工事を行うためです。13日の朝から通常どおり営業します。休業中は、隣の商店街の店を利用してください。"),
  japaneseQuestion("extra-reading-03", "N3", "reading", "筆者が昼休みに散歩する目的は何ですか。", ["買い物をするため", "午後の集中力を戻すため", "同僚を探すため", "早く帰宅するため"], 1, "短い散歩で気分を切り替え、午後に集中しやすくなると述べている。", "以前は昼休みに机で食事をして、そのまま仕事を続けていた。最近は10分だけ会社の周りを歩くようにしている。外の空気を吸うと気分が変わり、午後の仕事にも集中しやすい。"),
  japaneseQuestion("extra-reading-04", "N3", "reading", "筆者は昼休みに何をしていますか。", ["会社の周りを10分歩く", "毎日長い昼寝をする", "同僚と買い物に行く", "午後の仕事を終わらせる"], 0, "本文に、会社の周りを10分歩くとある。", "以前は昼休みに机で食事をして、そのまま仕事を続けていた。最近は10分だけ会社の周りを歩くようにしている。外の空気を吸うと気分が変わり、午後の仕事にも集中しやすい。"),

  japaneseQuestion("extra-char-01", "N2", "characters", "会社は海外市場への進出を（　）している。", ["検討", "回復", "交換", "完成"], 0, "「検討する」は、よく考えて決めようとすること。"),
  japaneseQuestion("extra-char-02", "N2", "characters", "災害に備えて、水を用意しておく。下線部の読み方はどれですか。", ["そなえて", "たくわえて", "そろえて", "ささえて"], 0, "「備える」は「そなえる」と読む。"),
  japaneseQuestion("extra-char-03", "N2", "characters", "新しい社員を採用する予定です。下線部の読み方はどれですか。", ["さいよう", "さいゆう", "さいおう", "さよう"], 0, "「採用」は「さいよう」と読む。"),
  japaneseQuestion("extra-char-04", "N2", "characters", "無駄な表現を省いて、文章を短くした。", ["はぶいて", "ぬいて", "のぞいて", "かわいて"], 0, "「省く」は「はぶく」と読む。"),
  japaneseQuestion("extra-grammar-01", "N2", "grammar", "毎日練習したからといって、必ず勝てる（　）。", ["わけではない", "に違いない", "ことになる", "はずがない"], 0, "「～わけではない」は、全面的な断定を否定する。"),
  japaneseQuestion("extra-grammar-02", "N2", "grammar", "あの二人は長年の友人だから、事情を知っている（　）。", ["に違いない", "わけではない", "ことはない", "ものなら"], 0, "「～に違いない」は、強い確信を表す。"),
  japaneseQuestion("extra-grammar-03", "N2", "grammar", "できる（　）やってみたいが、今は時間がない。", ["ものなら", "ところなら", "だけなら", "ようなら"], 0, "「～ものなら」は、実現が難しい仮定を表す。"),
  japaneseQuestion("extra-grammar-04", "N2", "grammar", "経験（　）、研修内容を変えています。", ["に応じて", "に限って", "を通して", "に先立って"], 0, "「～に応じて」は、基準や変化に合わせることを表す。"),
  japaneseQuestion("extra-reading-01", "N2", "reading", "市が自転車の利用を勧める理由は何ですか。", ["道路を狭くするため", "交通渋滞と排出ガスを減らすため", "駅を閉鎖するため", "観光客を減らすため"], 1, "自転車通勤を増やし、渋滞と排出ガスを減らす計画だとある。", "市は来年度から自転車通勤をする職員に補助金を出す。自動車通勤を減らし、中心部の交通渋滞と排出ガスを減らすためだ。ただし、安全のため、雨の日や長距離通勤者には無理に勧めないとしている。"),
  japaneseQuestion("extra-reading-02", "N2", "reading", "補助金の対象にならない可能性があるのは誰ですか。", ["近距離の自転車通勤者", "雨の日だけ自転車に乗る人", "長距離通勤者", "市の職員全員"], 2, "長距離通勤者には無理に勧めないと書かれている。", "市は来年度から自転車通勤をする職員に補助金を出す。自動車通勤を減らし、中心部の交通渋滞と排出ガスを減らすためだ。ただし、安全のため、雨の日や長距離通勤者には無理に勧めないとしている。"),
  japaneseQuestion("extra-reading-03", "N2", "reading", "研究チームが調査したものは何ですか。", ["海岸のごみの種類と量", "魚の値段の変化", "港の観光客数", "漁師の勤務時間"], 0, "海岸ごみの種類と量を季節ごとに調べたとある。", "研究チームは三年間、同じ海岸でごみを集め、種類と量を季節ごとに記録した。夏は観光客が増えるためプラスチック容器が多く、冬は漁業用の網やひもが目立った。対策には季節ごとの原因を知る必要がある。"),
  japaneseQuestion("extra-reading-04", "N2", "reading", "本文から分かる対策は何ですか。", ["一年中同じ対策を行う", "季節ごとの原因に合わせて対策する", "海岸を立入禁止にする", "観光客を増やす"], 1, "最後に季節ごとの原因を知る必要があると述べている。", "研究チームは三年間、同じ海岸でごみを集め、種類と量を季節ごとに記録した。夏は観光客が増えるためプラスチック容器が多く、冬は漁業用の網やひもが目立った。対策には季節ごとの原因を知る必要がある。"),

  japaneseQuestion("extra-char-01", "N1", "characters", "制度の変更は社会に著しい影響を与えた。下線部の読み方はどれですか。", ["いちじるしい", "いちじるしゅい", "ちょじるしい", "いちろしい"], 0, "「著しい」は「いちじるしい」と読む。"),
  japaneseQuestion("extra-char-02", "N1", "characters", "彼は長年、環境政策に携わってきた。下線部の読み方はどれですか。", ["たずさわって", "たずねわって", "かかわって", "たおわって"], 0, "「携わる」は「たずさわる」と読む。"),
  japaneseQuestion("extra-char-03", "N1", "characters", "似た名前の制度が多く、非常に紛らわしい。", ["まぎらわしい", "まぎわらしい", "ふんらわしい", "まくらわしい"], 0, "「紛らわしい」は「まぎらわしい」と読む。"),
  japaneseQuestion("extra-char-04", "N1", "characters", "交渉によって対立を打開する道が見えた。", ["だかいする", "たかいする", "うちひらく", "しょうがいする"], 0, "「打開する」は「だかいする」と読み、困難を切り開く意味。"),
  japaneseQuestion("extra-grammar-01", "N1", "grammar", "会社は計画の見直しを余儀なくされた。", ["を余儀なくされた", "を余儀にされた", "に余儀をされた", "を余儀なくした"], 0, "「～を余儀なくされる」は、望まなくてもそうせざるを得ないこと。"),
  japaneseQuestion("extra-grammar-02", "N1", "grammar", "去年の好況（　）、今年は景気が停滞している。", ["にひきかえ", "にかかわらず", "をものともせず", "に先立って"], 0, "「～にひきかえ」は、二つの事柄を対比する。"),
  japaneseQuestion("extra-grammar-03", "N1", "grammar", "その映画を見ると、涙を流さずにはいられない。", ["ずにはいられない", "ないではおかない", "ないことはない", "ずにすむ"], 0, "「～ずにはいられない」は、気持ちを抑えられず必ずしてしまうこと。"),
  japaneseQuestion("extra-grammar-04", "N1", "grammar", "彼は批判をものともせず、改革を進めた。", ["をものともせず", "をものにせず", "ものならず", "ものでもなく"], 0, "「～をものともせず」は、困難を恐れずに行動すること。"),
  japaneseQuestion("extra-reading-01", "N1", "reading", "筆者がデータの可視化に求めるものは何ですか。", ["数字を隠すこと", "数字の意味を考えるきっかけ", "結論を自動で決めること", "専門家だけの利用"], 1, "可視化は結論を代わりに出すのではなく、意味を考えるきっかけだと述べている。", "データをグラフにすれば、複雑な傾向を直感的に把握しやすくなる。しかし、見やすい図がそのまま正しい結論を保証するわけではない。どの数字を選び、何と比較したのかを問い直して初めて、可視化は判断を支える道具になる。"),
  japaneseQuestion("extra-reading-02", "N1", "reading", "見やすい図だけでは不十分なのはなぜですか。", ["図を作るのに時間がかかるから", "正しい結論を自動的に保証しないから", "数字が少なくなるから", "比較ができなくなるから"], 1, "図の見やすさだけでは、結論の正しさは保証されない。", "データをグラフにすれば、複雑な傾向を直感的に把握しやすくなる。しかし、見やすい図がそのまま正しい結論を保証するわけではない。どの数字を選び、何と比較したのかを問い直して初めて、可視化は判断を支える道具になる。"),
  japaneseQuestion("extra-reading-03", "N1", "reading", "筆者が地域の祭りについて重視する点は何ですか。", ["規模を毎年大きくすること", "参加者が意味を共有すること", "外部の人を完全に断ること", "費用をなくすこと"], 1, "祭りの規模より、参加者が意味を共有することが重要だと述べている。", "地域の祭りは、観光客を集めるイベントへ変わりつつある。経済効果は大切だが、規模を追うだけでは、地元の人が参加する理由が薄れてしまう。長く続く祭りには、何を祝うのか、誰が支えるのかという意味を参加者が共有している。"),
  japaneseQuestion("extra-reading-04", "N1", "reading", "長く続く祭りに必要なものは何ですか。", ["大規模な広告", "参加者が共有する意味", "毎年の新しい会場", "観光客だけの支援"], 1, "最後の文で、祭りの意味を参加者が共有していることが必要だとある。", "地域の祭りは、観光客を集めるイベントへ変わりつつある。経済効果は大切だが、規模を追うだけでは、地元の人が参加する理由が薄れてしまう。長く続く祭りには、何を祝うのか、誰が支えるのかという意味を参加者が共有している。"),
];

const ENGLISH_EXTRA_QUESTIONS: ExamQuestion[] = [
  englishQuestion("extra-lang-01", "CET-4", "grammar", "Students are expected to submit the report _____ Monday morning.", ["by", "at", "among", "since"], 0, "By indicates a deadline no later than Monday morning."),
  englishQuestion("extra-lang-02", "CET-4", "grammar", "The museum is closed today _____ a public holiday.", ["because of", "although", "unless", "while"], 0, "Because of is followed by a noun phrase and gives the reason."),
  englishQuestion("extra-lang-03", "CET-4", "characters", "The word closest in meaning to “purchase” is _____.", ["borrow", "buy", "repair", "return"], 1, "Purchase means to buy something."),
  englishQuestion("extra-lang-04", "CET-4", "grammar", "Please turn off the lights _____ you leave the room.", ["before", "during", "despite", "since"], 0, "Before introduces the earlier action."),
  englishQuestion("extra-read-01", "CET-4", "reading", "Why did Mia join the library club?", ["To meet classmates and read more", "To avoid doing homework", "To learn how to drive", "To sell old books"], 0, "The passage says she wanted to meet classmates and read more.", "Mia joined the school library club at the beginning of the semester. She wanted to meet classmates who enjoyed books. The club also recommends one short novel each month, so Mia now reads more regularly."),
  englishQuestion("extra-read-02", "CET-4", "reading", "How often does the club recommend a novel?", ["Every day", "Every week", "Every month", "Every year"], 2, "The club recommends one short novel each month."),
  englishQuestion("extra-read-03", "CET-4", "reading", "What has changed for Mia?", ["She reads more regularly", "She stopped attending school", "She writes fewer reports", "She moved to another city"], 0, "The final sentence says Mia now reads more regularly."),
  englishQuestion("extra-read-04", "CET-4", "reading", "What is the best title for the passage?", ["A Club That Encourages Reading", "A Difficult Driving Test", "How to Sell a Novel", "A New School Cafeteria"], 0, "The passage focuses on the library club and its reading habit."),

  englishQuestion("extra-lang-01", "CET-6", "grammar", "The report suggests that the policy should be revised _____ current conditions.", ["in light of", "in spite", "in case", "by means"], 0, "In light of means considering or because of new information."),
  englishQuestion("extra-lang-02", "CET-6", "grammar", "Had the warning arrived earlier, the team _____ the mistake.", ["could have avoided", "can avoid", "will avoid", "avoids"], 0, "The past perfect conditional takes could have plus the past participle."),
  englishQuestion("extra-lang-03", "CET-6", "characters", "To “allocate” resources means to _____.", ["distribute them for a purpose", "hide them permanently", "measure them twice", "remove them from use"], 0, "Allocate means to distribute resources for a particular purpose."),
  englishQuestion("extra-lang-04", "CET-6", "grammar", "The proposal is attractive; _____, its cost has not been fully calculated.", ["nevertheless", "therefore", "otherwise", "similarly"], 0, "Nevertheless introduces a contrast with the attractive proposal."),
  englishQuestion("extra-read-01", "CET-6", "reading", "What is the main benefit of the community garden?", ["It creates a shared space and supplies local produce", "It replaces all city parks", "It eliminates the need for public transport", "It sells imported food"], 0, "The passage describes both a shared space and local produce.", "A vacant lot beside the station has become a community garden. Residents grow vegetables together and share the harvest. The project has also created a place where neighbors who rarely spoke before can meet and plan activities."),
  englishQuestion("extra-read-02", "CET-6", "reading", "What do residents do with the harvest?", ["They share it", "They export it", "They throw it away", "They sell it to the station"], 0, "The passage says residents share the harvest."),
  englishQuestion("extra-read-03", "CET-6", "reading", "What social effect has the project had?", ["Neighbors have more chances to meet", "Residents moved away", "The station became quieter", "People stopped growing vegetables"], 0, "The garden created a place for neighbors to meet and plan activities."),
  englishQuestion("extra-read-04", "CET-6", "reading", "What was the lot before the project?", ["A vacant lot", "A busy restaurant", "A school gym", "A train platform"], 0, "The first sentence calls it a vacant lot."),

  englishQuestion("extra-lang-01", "TOEIC", "grammar", "The manager asked all employees to arrive _____ for the safety briefing.", ["punctually", "punctual", "punctuality", "punctuate"], 0, "The adverb punctually modifies the verb arrive."),
  englishQuestion("extra-lang-02", "TOEIC", "grammar", "The conference room is available _____ 2:00 and 4:00 p.m.", ["between", "among", "during", "until"], 0, "Between is used with two times or points."),
  englishQuestion("extra-lang-03", "TOEIC", "characters", "A “mandatory” training session is one that is _____.", ["optional", "required", "temporary", "private"], 1, "Mandatory means required or not optional."),
  englishQuestion("extra-lang-04", "TOEIC", "grammar", "The invoice was corrected immediately _____ the customer could process the payment.", ["so that", "even though", "as if", "rather than"], 0, "So that introduces the purpose of the correction."),
  englishQuestion("extra-read-01", "TOEIC", "reading", "What change does the notice announce?", ["The fitness center will open earlier", "The center will close permanently", "Membership fees will double", "The pool will move outside"], 0, "The notice says the center will open at 6 a.m. instead of 7 a.m.", "Notice to members: Beginning next Monday, the Greenway Fitness Center will open at 6:00 a.m., one hour earlier than usual. The change responds to requests from members who exercise before work. Closing time and weekend hours will remain the same."),
  englishQuestion("extra-read-02", "TOEIC", "reading", "Why was the opening time changed?", ["Members requested earlier access", "The staff wanted shorter hours", "The building was sold", "Weekend classes were canceled"], 0, "The change responds to requests from members who exercise before work."),
  englishQuestion("extra-read-03", "TOEIC", "reading", "What will remain the same?", ["Closing time and weekend hours", "The opening time", "Membership applications", "The center's location"], 0, "The notice states that closing time and weekend hours remain unchanged."),
  englishQuestion("extra-read-04", "TOEIC", "reading", "When does the new schedule begin?", ["This Friday", "Next Monday", "Next month", "At the weekend"], 1, "The notice begins with “Beginning next Monday.”"),
];

/**
 * Real N1 drill questions extracted from the user's 红蓝宝书1000题 N1 PDF.
 * These are genuine past-paper style items with publisher answers, so they sit
 * in the base bank and reduce how many synthetic fillers the generators need.
 */
const PDF_BOOK_QUESTIONS: ExamQuestion[] = [
  ...BOOK_N1_QUESTIONS.map((question) =>
    japaneseQuestion(
      `book-n1-${question.no}`,
      question.level,
      question.section,
      question.prompt,
      question.options,
      question.correctIndex,
      question.explanation,
      undefined,
      "红蓝宝书1000题 N1（本地 PDF）",
    ),
  ),
  ...BOOK_N3_QUESTIONS.map((question) =>
    japaneseQuestion(
      `book-n3-${question.no}`,
      question.level,
      question.section,
      question.prompt,
      question.options,
      question.correctIndex,
      question.explanation,
      undefined,
      "红蓝宝书1000题 N3（本地 PDF 扫描 OCR）",
    ),
  ),
  ...BOOK_N2_QUESTIONS.map((question) =>
    japaneseQuestion(
      `book-n2-${question.no}`,
      question.level,
      question.section,
      question.prompt,
      question.options,
      question.correctIndex,
      question.explanation,
      undefined,
      "红蓝宝书1000题 N2（本地 PDF 扫描 OCR）",
    ),
  ),
];

/**
 * JLPT-style practice items pulled from the public exercise bank. They carry
 * their own answer keys, which is why they could replace the generated filler
 * outright. Labelled separately so users can tell them from the PDF-sourced
 * past-paper questions.
 */
const PRACTICE_QUESTIONS: ExamQuestion[] = EXTERNAL_QUESTIONS.map((question, index) =>
  japaneseQuestion(
    `ext-${index}`,
    question.level,
    question.section,
    question.prompt,
    question.options,
    question.correctIndex,
    `「${question.options[question.correctIndex]}」是本题正确答案。`,
    undefined,
    "JLPT 练习题（japanesetest4you）",
  ),
);

const PRACTICE_EN_QUESTIONS: ExamQuestion[] = EXTERNAL_ENGLISH_QUESTIONS.map((question, index) =>
  englishQuestion(
    `ext-en-${index}`,
    question.level,
    question.section,
    question.prompt,
    question.options,
    question.correctIndex,
    question.explanation || `正确答案：${question.options[question.correctIndex]}`,
    undefined,
    "英语练习题（中学英语真题库）",
  ),
);

const BASE_EXAM_QUESTIONS: ExamQuestion[] = [
  ...JAPANESE_BOOK_QUESTIONS,
  ...JAPANESE_READING_QUESTIONS,
  ...ENGLISH_QUESTIONS,
  ...JAPANESE_EXTRA_QUESTIONS,
  ...ENGLISH_EXTRA_QUESTIONS,
  ...PDF_BOOK_QUESTIONS,
  ...PRACTICE_QUESTIONS,
  ...PRACTICE_EN_QUESTIONS,
];

const JAPANESE_LEVEL_ORDER: JapaneseExamLevel[] = ["N3", "N2", "N1"];
const ENGLISH_LEVEL_ORDER: EnglishExamLevel[] = ["CET-4", "CET-6", "TOEIC"];
/**
 * How many synthetic questions a section is filled up to when the real
 * question bank is thinner than that. Real questions always win and a bucket
 * may grow past this number freely — we only top up thin sections to a
 * comfortable round size. Padding every bucket to a fixed target made
 * "120 题" meaningless: a 30-question round would show the same generated
 * prompt several times while real questions sat unused.
 */
const EXAM_SECTION_MIN_FILL = 40;

function fourUniqueOptions(correct: string, candidates: string[]): [string, string, string, string] {
  const values = [correct, ...candidates.filter((candidate) => candidate !== correct)];
  const unique = [...new Set(values)];
  while (unique.length < 4) unique.push(`选项 ${unique.length + 1}`);
  return unique.slice(0, 4) as [string, string, string, string];
}

function wordLevel(word: (typeof WORD_PAIRS)[number], language: ExamLanguage): JapaneseExamLevel | EnglishExamLevel {
  const value = language === "japanese" ? word.japanese.difficulty : word.english.difficulty;
  if (value.includes("N3")) return "N3";
  if (value.includes("N2")) return "N2";
  if (value.includes("N1")) return "N1";
  if (value.includes("CET-6")) return "CET-6";
  if (value.includes("TOEIC")) return "TOEIC";
  return "CET-4";
}

function generateCharacterSupplements(language: ExamLanguage): ExamQuestion[] {
  const levels = language === "japanese" ? JAPANESE_LEVEL_ORDER : ENGLISH_LEVEL_ORDER;
  const result: ExamQuestion[] = [];
  let serial = 0;
  levels.forEach((level) => {
    const existingCount = BASE_EXAM_QUESTIONS.filter(
      (question) =>
        question.examLanguage === language &&
        question.examSection === "characters" &&
        question.examLevel === level,
    ).length;
    const pool = WORD_PAIRS.filter((word) => wordLevel(word, language) === level);
    const needed = Math.min(
      Math.max(0, EXAM_SECTION_MIN_FILL - existingCount),
      pool.length,
    );
    for (let index = 0; index < needed; index += 1) {
      const word = pool[index];
      const others = pool.filter((candidate) => candidate.id !== word.id);
      // Rotate deterministically through the whole remaining pool instead of
      // slicing a fixed window, which ran past the end on smaller levels and
      // produced "选项 2/3" filler distractors.
      const offset = others.length > 0 ? index % others.length : 0;
      const distractorAt = (step: number) =>
        others[(offset + step) % others.length];
      serial += 1;
      if (language === "japanese") {
      const correct = word.japanese.reading ?? word.japanese.term;
      const distractors = [distractorAt(0), distractorAt(1), distractorAt(2)]
        .map((candidate) => candidate.japanese.reading ?? candidate.japanese.term);
      result.push(japaneseQuestion(
        `generated-characters-${serial}`,
        level as JapaneseExamLevel,
        "characters",
        `「${word.japanese.term}」的读音最接近下列哪一项？`,
        fourUniqueOptions(correct, distractors),
        0,
        `「${word.japanese.term}」读作「${correct}」。`,
        undefined,
        "内置分级词汇补充题",
      ));
    } else {
      const correct = word.meaningZh;
      const distractors = [distractorAt(0), distractorAt(1), distractorAt(2)]
        .map((candidate) => candidate.meaningZh);
      result.push(englishQuestion(
        `generated-characters-${serial}`,
        level as EnglishExamLevel,
        "characters",
        `Which meaning is closest to “${word.english.term}”?`,
        fourUniqueOptions(correct, distractors),
        0,
        `“${word.english.term}”对应的中文核心义是“${correct}”。`,
        undefined,
        "内置分级词汇补充题",
      ));
      }
    }
  });
  return result;
}

function grammarExamLevel(
  point: (typeof GRAMMAR_POINTS)[number],
  language: ExamLanguage,
): JapaneseExamLevel | EnglishExamLevel {
  if (language === "japanese") {
    if (point.level.includes("N1")) return "N1";
    if (point.level.includes("N2")) return "N2";
    return "N3";
  }
  if (point.level.includes("TOEIC")) return "TOEIC";
  if (point.level.includes("CET-6")) return "CET-6";
  return "CET-4";
}

function generateGrammarSupplements(language: ExamLanguage): ExamQuestion[] {
  const levels = language === "japanese" ? JAPANESE_LEVEL_ORDER : ENGLISH_LEVEL_ORDER;
  const result: ExamQuestion[] = [];
  let serial = 0;
  levels.forEach((level) => {
    const existingCount = BASE_EXAM_QUESTIONS.filter(
      (question) =>
        question.examLanguage === language &&
        question.examSection === "grammar" &&
        question.examLevel === level,
    ).length;
    // Only grammar points that actually belong to this level, and only one
    // question per (point, exercise) pair, so no bucket reuses another level's
    // material and nothing is emitted twice.
    const combos = GRAMMAR_POINTS.filter(
      (point) => point.language === language && grammarExamLevel(point, language) === level,
    ).flatMap((point) => point.exercises.map((exercise) => ({ point, exercise })));
    const needed = Math.min(
      Math.max(0, EXAM_SECTION_MIN_FILL - existingCount),
      combos.length,
    );
    for (let index = 0; index < needed; index += 1) {
      const { exercise } = combos[index];
      serial += 1;
      const id = `generated-grammar-${serial}`;
      if (language === "japanese") {
        result.push(japaneseQuestion(id, level as JapaneseExamLevel, "grammar", exercise.prompt, exercise.options, exercise.correctIndex, exercise.explanation, undefined, "内置语法补充题"));
      } else {
        result.push(englishQuestion(id, level as EnglishExamLevel, "grammar", exercise.prompt, exercise.options, exercise.correctIndex, exercise.explanation, undefined, "内置语法补充题"));
      }
    }
  });
  return result;
}

/**
 * Reading questions are intentionally *not* supplemented. Each level ships a
 * handful of hand-written passages; the previous generator replayed them up to
 * 14 times with a shuffled prefix to reach the 120 target, so a 30-question
 * round could repeat the same passage four times. Reading stays at its real
 * size until more passages are written.
 */
/**
 * Placeholder for generated filler. The generators above are kept for
 * reference but are NOT used any more: they produced one sentence template
 * per section ("「X」的读音最接近下列哪一项？"), which customers reasonably
 * called worthless. Real material from the local books replaces them; a
 * section simply stays as small as its real material until more is imported.
 */
const SUPPLEMENTAL_EXAM_QUESTIONS: ExamQuestion[] = [];

export const EXAM_QUESTIONS: ExamQuestion[] = [
  ...BASE_EXAM_QUESTIONS,
  ...SUPPLEMENTAL_EXAM_QUESTIONS,
];

/**
 * Honest bank composition. Real material covers questions shipped from the
 * user's local PDFs ("book-") and hand-written reading passages ("read-");
 * everything else comes from the generators. The UI shows both numbers
 * instead of one inflated total, so imported material is visible.
 */
function isGeneratedQuestion(question: ExamQuestion): boolean {
  // Generator ids look like exam-jp-n3-generated-characters-12; hand-written
  // ids (extra-char-01, lang-01, read-01, book-n1-3) never contain this token.
  return question.id.includes("generated");
}

export interface ExamBankStat {
  real: number;
  practice: number;
  total: number;
}

export function examBankStats(language: ExamLanguage): ExamBankStat {
  const rows = EXAM_QUESTIONS.filter((question) => question.examLanguage === language);
  const practice = rows.filter(isGeneratedQuestion).length;
  return { real: rows.length - practice, practice, total: rows.length };
}

export function examBankStatsByLevel(
  language: ExamLanguage,
): Array<ExamBankStat & { level: JapaneseExamLevel | EnglishExamLevel }> {
  const levels = language === "japanese" ? JAPANESE_LEVEL_ORDER : ENGLISH_LEVEL_ORDER;
  return levels.map((level) => {
    const rows = EXAM_QUESTIONS.filter(
      (question) => question.examLanguage === language && question.examLevel === level,
    );
    const practice = rows.filter(isGeneratedQuestion).length;
    return { level, real: rows.length - practice, practice, total: rows.length };
  });
}

export const JAPANESE_EXAM_LEVELS: JapaneseExamLevel[] = ["N3", "N2", "N1"];
export const ENGLISH_EXAM_LEVELS: EnglishExamLevel[] = ["CET-4", "CET-6", "TOEIC"];

export const EXAM_SECTION_LABELS: Record<ExamSection, string> = {
  characters: "文字",
  grammar: "文法",
  reading: "阅读",
};

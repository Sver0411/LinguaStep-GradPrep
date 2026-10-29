import type { GrammarPoint } from "./models";
export const GRAMMAR_COURSES = [
  ...[5,4,3,2,1].map((level) => ({ id: `jp-n${level}`, title: `蓝宝书 N${level}`, label: `N${level}`, language: "japanese" as const, level: `JLPT N${level}` })),
  { id: "en-core", title: "英语语法", label: "En", language: "english" as const, level: "英语基础" },
];
export function grammarCourse(id?: string) { return GRAMMAR_COURSES.find((course) => course.id === id) ?? GRAMMAR_COURSES[2]; }
export function grammarInCourse(point: GrammarPoint, id?: string) {
  const course = grammarCourse(id);
  return point.language === course.language && (course.language === "english" || point.level.includes(course.label));
}

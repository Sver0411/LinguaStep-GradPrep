"use client";
import { WordBookshelf } from "@/components/words/WordBookshelf";
import type { NavParams } from "../navigation";
export function MobileWordStudy({ params }: { params: NavParams }) { return <WordBookshelf mobile params={params} />; }

"use client";
import { GrammarWorkspace } from "@/components/grammar/GrammarWorkspace";
import type { NavParams } from "../navigation";
export function MobileGrammarHub({ params }: { params: NavParams }) { return <GrammarWorkspace mobile params={params} />; }

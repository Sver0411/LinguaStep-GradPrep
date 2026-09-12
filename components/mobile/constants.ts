"use client";

import { REFERENCE_TOPICS, type ReferenceTopic } from "@/data/reference";

export const RESOURCE_TOPICS = REFERENCE_TOPICS;

export type ResourceTopic = ReferenceTopic;

export const KANA_TOPIC: ResourceTopic = {
  id: "kana",
  title: "五十音图",
  subtitle: "平假名与片假名的发音基础",
  tone: "lavender",
  entries: [],
};

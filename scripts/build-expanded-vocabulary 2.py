#!/usr/bin/env python3
"""Build LinguaStep's compact JP-EN-ZH supplemental vocabulary dataset.

Usage:
  python3 scripts/build-expanded-vocabulary.py JMdict.json ecdict.csv output.json 6500

JMdict/EDICT data is CC BY-SA 4.0, copyright EDRDG. ECDICT is MIT.
The generated dataset is intentionally compact; the app materializes WordPair
objects and keeps the original hand-edited 300 entries ahead of these rows.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

from opencc import OpenCC


POS_JA = {
    "n": "名词",
    "vs": "サ变动词",
    "v1": "一段动词",
    "v5": "五段动词",
    "vk": "カ变动词",
    "adj-i": "い形容词",
    "adj-na": "な形容词",
    "adv": "副词",
    "adv-to": "副词",
    "pn": "代词",
    "conj": "接续词",
    "prt": "助词",
    "int": "感叹词",
    "exp": "表达",
    "pref": "前缀",
    "suf": "后缀",
    "ctr": "量词",
}

POS_EN = {
    "n": "noun",
    "v": "verb",
    "vt": "transitive verb",
    "vi": "intransitive verb",
    "a": "adjective",
    "ad": "adverb",
    "adv": "adverb",
    "prep": "preposition",
    "pron": "pronoun",
    "conj": "conjunction",
    "num": "number",
    "int": "interjection",
}

BANNED_ENGLISH = {
    "a", "an", "the", "be", "do", "does", "did", "have", "has", "had",
    "this", "that", "these", "those", "he", "she", "it", "they", "we", "you",
    "i", "me", "him", "her", "them", "us", "my", "your", "his", "its", "our",
    "their", "who", "what", "which", "where", "when", "why", "how", "there",
}

JP_TO_SIMPLIFIED = OpenCC("t2s")

ROMAJI = {
    "あ":"a","い":"i","う":"u","え":"e","お":"o",
    "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
    "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go",
    "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
    "ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
    "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
    "だ":"da","ぢ":"ji","づ":"zu","で":"de","ど":"do",
    "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
    "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
    "ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
    "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
    "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
    "や":"ya","ゆ":"yu","よ":"yo",
    "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
    "わ":"wa","を":"o","ん":"n",
    "ゔ":"vu","ー":"-",
}

DIGRAPHS = {
    "きゃ":"kya","きゅ":"kyu","きょ":"kyo","ぎゃ":"gya","ぎゅ":"gyu","ぎょ":"gyo",
    "しゃ":"sha","しゅ":"shu","しょ":"sho","じゃ":"ja","じゅ":"ju","じょ":"jo",
    "ちゃ":"cha","ちゅ":"chu","ちょ":"cho","にゃ":"nya","にゅ":"nyu","にょ":"nyo",
    "ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo","びゃ":"bya","びゅ":"byu","びょ":"byo",
    "ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo","みゃ":"mya","みゅ":"myu","みょ":"myo",
    "りゃ":"rya","りゅ":"ryu","りょ":"ryo","ふぁ":"fa","ふぃ":"fi","ふぇ":"fe","ふぉ":"fo",
    "てぃ":"ti","でぃ":"di","うぃ":"wi","うぇ":"we","うぉ":"wo","しぇ":"she","じぇ":"je",
    "ちぇ":"che","つぁ":"tsa","つぃ":"tsi","つぇ":"tse","つぉ":"tso",
}


def katakana_to_hiragana(value: str) -> str:
    return "".join(chr(ord(char) - 0x60) if "ァ" <= char <= "ヶ" else char for char in value)


def romanize(value: str) -> str:
    text = katakana_to_hiragana(value)
    result: list[str] = []
    geminate = False
    index = 0
    while index < len(text):
        char = text[index]
        if char == "っ":
            geminate = True
            index += 1
            continue
        pair = text[index:index + 2]
        syllable = DIGRAPHS.get(pair)
        if syllable:
            index += 2
        else:
            syllable = ROMAJI.get(char, char)
            index += 1
        if syllable == "-":
            if result:
                vowel = next((letter for letter in reversed(result[-1]) if letter in "aeiou"), "")
                if vowel:
                    result.append(vowel)
            continue
        if geminate and syllable:
            prefix = "t" if syllable.startswith("ch") else syllable[0]
            if prefix not in "aeioun":
                result.append(prefix)
            geminate = False
        result.append(syllable)
    return "".join(result)


def integer(value: str | None, fallback: int = 999_999) -> int:
    try:
        parsed = int(value or "")
        return parsed if parsed > 0 else fallback
    except ValueError:
        return fallback


def target_pos(tags: list[str]) -> str:
    if any(tag.startswith("adj") for tag in tags):
        return "adjective"
    if any(tag.startswith("adv") for tag in tags):
        return "adverb"
    if "vs" in tags and any(tag == "n" or tag.startswith("n-") for tag in tags):
        return "noun"
    if any(tag.startswith("v") and tag != "vs" for tag in tags):
        return "verb"
    if any(tag == "n" or tag.startswith("n-") for tag in tags):
        return "noun"
    if "vs" in tags:
        return "verb"
    if "conj" in tags:
        return "conjunction"
    if "pn" in tags:
        return "pronoun"
    if "int" in tags:
        return "interjection"
    return "other"


def clean_chinese(value: str, expected_pos: str) -> tuple[str, int] | None:
    lines = [line.strip() for line in value.replace("\\r", "").split("\\n")]
    prefixes = {
        "noun": ("n.",),
        "verb": ("v.", "vt.", "vi."),
        "adjective": ("a.", "adj."),
        "adverb": ("ad.", "adv."),
        "conjunction": ("conj.",),
        "pronoun": ("pron.",),
        "interjection": ("int.",),
    }.get(expected_pos, ())
    line = next(
        (line for line in lines if prefixes and line.lower().startswith(prefixes)),
        next((line for line in lines if line and not line.startswith("[网络]")), ""),
    )
    line = re.sub(r"^(?:n|v|vt|vi|a|ad|adv|prep|pron|conj|num|int|art)\.\s*", "", line, flags=re.I)
    line = re.sub(r"^\[[^]]+\]\s*", "", line)
    line = re.sub(r"\([^)]*\)|（[^）]*）", "", line)
    parts = [part.strip(" .()（）") for part in re.split(r"[;,，；]", line) if part.strip(" .()（）")]
    if not parts:
        return None
    meaning = parts[0]
    if len(meaning) <= 1 and len(parts) > 1:
        meaning = f"{meaning}、{parts[1]}"
    meaning = re.sub(r"\s*=.*$", "", meaning).strip()
    if not re.search(r"[\u3400-\u9fff]", meaning) or len(meaning) > 28:
        return None
    return meaning, len(parts)


def japanese_pos(tags: list[str]) -> str:
    values = []
    for tag in tags:
        normalized = "v5" if tag.startswith("v5") else tag
        label = POS_JA.get(normalized)
        if label and label not in values:
            values.append(label)
    return "・".join(values[:2]) or "词语"


def english_pos(value: str, japanese_tags: list[str]) -> str:
    labels = []
    for tag in value.split("/"):
        label = POS_EN.get(tag.strip().lower())
        if label and label not in labels:
            labels.append(label)
    if labels:
        return " / ".join(labels[:2])
    expected = target_pos(japanese_tags)
    if expected == "verb":
        return "verb"
    if expected == "adjective":
        return "adjective"
    if expected == "adverb":
        return "adverb"
    if expected == "conjunction":
        return "conjunction"
    if expected == "pronoun":
        return "pronoun"
    if expected == "interjection":
        return "interjection"
    return "noun"


def select_japanese(entry: dict) -> tuple[str, str] | None:
    common_kanji = next((item for item in entry["kanji"] if item.get("common")), None)
    common_kana = next((item for item in entry["kana"] if item.get("common")), None)
    kana = common_kana or (entry["kana"][0] if entry["kana"] else None)
    if not kana:
        return None
    if common_kanji:
        applicable = [
            item for item in entry["kana"]
            if "*" in item.get("appliesToKanji", []) or common_kanji["text"] in item.get("appliesToKanji", [])
        ]
        reading = next((item for item in applicable if item.get("common")), None) or (applicable[0] if applicable else kana)
        return common_kanji["text"], reading["text"]
    return kana["text"], kana["text"]


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit("Expected: JMdict.json ecdict.csv output.json count")
    jmdict_path, ecdict_path, output_path = map(Path, sys.argv[1:4])
    requested = int(sys.argv[4])

    english_rows: dict[str, dict[str, str]] = {}
    with ecdict_path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            word = row.get("word", "").strip().lower()
            if word and row.get("translation", "").strip():
                english_rows[word] = row

    source = json.loads(jmdict_path.read_text(encoding="utf-8"))
    candidates: list[tuple[tuple[int, int, int, str], list[object]]] = []
    for entry in source["words"]:
        selected = select_japanese(entry)
        if not selected:
            continue
        term, reading = selected
        if len(term) > 24:
            continue
        matched_options = []
        simplified_term = JP_TO_SIMPLIFIED.convert(term)
        term_hanzi = set(re.findall(r"[\u3400-\u9fff]", simplified_term))
        for sense_index, sense in enumerate(entry["sense"]):
            tags = sense.get("partOfSpeech", [])
            expected_pos = target_pos(tags)
            if expected_pos == "other":
                continue
            if any(flag in sense.get("misc", []) for flag in ("arch", "obs", "vulg", "derog")):
                continue
            for gloss in sense.get("gloss", []):
                english = gloss.get("text", "").strip().lower()
                if english in BANNED_ENGLISH:
                    continue
                if not re.fullmatch(r"[a-z][a-z '\-]{1,39}", english) or len(english.split()) > 3:
                    continue
                row = english_rows.get(english)
                if not row:
                    continue
                if not row.get("phonetic", "").strip():
                    continue
                rank = min(integer(row.get("bnc")), integer(row.get("frq")))
                # The original 300 hand-edited entries cover the very common,
                # highly polysemous function words. Starting below that band
                # produces much safer automatic dictionary alignment.
                if rank < 300:
                    continue
                cleaned = clean_chinese(row.get("translation", ""), expected_pos)
                if not cleaned:
                    continue
                chinese, ambiguity = cleaned
                chinese_hanzi = set(re.findall(r"[\u3400-\u9fff]", chinese))
                overlaps = bool(term_hanzi & chinese_hanzi)
                if term_hanzi and not overlaps and ambiguity > 1:
                    continue
                matched_options.append(
                    ((0 if overlaps else 1, sense_index, ambiguity, rank, len(english)), english, chinese, row, tags)
                )
        matched = None
        if matched_options:
            _, english, chinese, row, tags = min(matched_options, key=lambda item: item[0])
            matched = (english, chinese, row, tags)
        if not matched:
            continue
        english, chinese, row, tags = matched
        bnc = integer(row.get("bnc"))
        frq = integer(row.get("frq"))
        rank = min(bnc, frq)
        collins = integer(row.get("collins"), 0)
        score = (rank, -collins, len(english), entry["id"])
        compact = [
            term,
            reading,
            romanize(reading),
            english,
            row.get("phonetic", "").strip(),
            chinese,
            japanese_pos(tags),
            english_pos(row.get("pos", ""), tags),
            rank,
        ]
        candidates.append((score, compact))

    candidates.sort(key=lambda item: item[0])
    rows = []
    used_japanese: set[str] = set()
    used_english: set[str] = set()
    for _, row in candidates:
        term, english = str(row[0]), str(row[3])
        if term in used_japanese or english in used_english:
            continue
        rows.append(row)
        used_japanese.add(term)
        used_english.add(english)
        if len(rows) >= requested:
            break
    if len(rows) < requested:
        raise SystemExit(f"Only {len(rows)} aligned entries were available; requested {requested}")
    output_path.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"generated={len(rows)} jmdict={source['dictDate']} output={output_path}")


if __name__ == "__main__":
    main()

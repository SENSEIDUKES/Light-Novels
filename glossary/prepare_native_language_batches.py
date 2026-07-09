"""
prepare_native_language_batches.py

Same two-stage handoff pattern as the translation pipeline, but for a
different and more foundational job: filling in the ACTUAL SOURCE-LANGUAGE
WORD behind each term (Chinese hanzi/pinyin, Korean hangul/romanization,
Japanese kanji/romaji) — the `nativeLanguages` block, not `localizations`.

WHY THIS RUNS BEFORE ANY TRANSLATION WORK
    Translating "Qi" into Spanish or Thai from the English gloss alone
    means translating a translation. The reliable anchor for any language
    that doesn't have a clean one-word English equivalent is the original
    source word. This pass makes sure that anchor actually exists before
    any of the 5-language translation pipeline runs.

    prepare_native_language_batches.py   (this script)
        writes work orders to glossary_native_pipeline/pending/
              ↓
    Your IDE agent
        reads each one, researches/identifies the real source-language
        word, writes results to glossary_native_pipeline/completed/
              ↓
    merge_native_language_batches.py
        validates against the original request, merges what checks out,
        archives the rest

WHICH TERMS GET BATCHED FOR WHICH LANGUAGE
    A term is only asked about for a given native language if its
    sourceGenres actually implies that origin:
        Chinese  <- Xianxia, Xuanhuan, Wuxia, Chinese, Murim
        Korean   <- Korean
        Japanese <- Japanese
    (Murim is included under Chinese too, since Korean martial-arts web
    novels frequently use Sino-Korean/hanja vocabulary borrowed from
    Chinese martial-arts terminology — a Murim term can genuinely have a
    Chinese-character root worth capturing alongside its Korean form.)

    A term tagged for more than one origin (e.g. Korean + Murim) can
    legitimately appear in more than one language's batches.

USAGE
    # See what's missing, no files written:
    python3 prepare_native_language_batches.py master_glossary_schema_locked.json --dry-run

    # Create work orders for everything missing, all 3 native languages:
    python3 prepare_native_language_batches.py master_glossary_schema_locked.json

    # Just Chinese, capped small for a first test:
    python3 prepare_native_language_batches.py master_glossary_schema_locked.json --languages chinese --limit 10

Safe to re-run any time — it skips terms already covered, and skips terms
that already have an unprocessed work order sitting in pending/.
"""

import argparse
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

NATIVE_LANGS = {
    "chinese": {
        "display_name": "Chinese",
        "trigger_genres": ["Xianxia", "Xuanhuan", "Wuxia", "Chinese", "Murim"],
        "primary_field": "hanzi",
        "fields": ["hanzi", "pinyin", "traditional"],
        "field_descriptions": (
            "- hanzi: the simplified Chinese characters\n"
            "- pinyin: standard pinyin romanization, with tone marks\n"
            "- traditional: the traditional-character form (can be identical to hanzi "
            "if the characters don't differ between simplified/traditional)"
        ),
    },
    "korean": {
        "display_name": "Korean",
        "trigger_genres": ["Korean"],
        "primary_field": "hangul",
        "fields": ["hangul", "romanization"],
        "field_descriptions": (
            "- hangul: the Korean hangul spelling\n"
            "- romanization: standard Revised Romanization of Korean"
        ),
    },
    "japanese": {
        "display_name": "Japanese",
        "trigger_genres": ["Japanese"],
        "primary_field": "kanji",
        "fields": ["kanji", "romaji"],
        "field_descriptions": (
            "- kanji: the actual Japanese form as it would really appear — kanji where "
            "the word uses it, katakana for loanwords, hiragana where that's the real "
            "convention (this field name is historical, it doesn't mean 'must be kanji')\n"
            "- romaji: standard Hepburn romanization"
        ),
    },
}

BATCH_SIZE = 10000
PIPELINE_DIR_NAME = "glossary_native_pipeline"

# ---------------------------------------------------------------------------


def ensure_native_key(term_obj, lang_key):
    if "nativeLanguages" not in term_obj or not isinstance(term_obj["nativeLanguages"], dict):
        term_obj["nativeLanguages"] = {}
    if lang_key not in term_obj["nativeLanguages"] or not isinstance(term_obj["nativeLanguages"][lang_key], dict):
        term_obj["nativeLanguages"][lang_key] = {f: "" for f in NATIVE_LANGS[lang_key]["fields"]}


def term_needs_native(term_obj, lang_key):
    cfg = NATIVE_LANGS[lang_key]
    if not any(g in term_obj.get("sourceGenres", []) for g in cfg["trigger_genres"]):
        return False  # this native language doesn't even apply to this term
    ensure_native_key(term_obj, lang_key)
    primary_val = term_obj["nativeLanguages"][lang_key].get(cfg["primary_field"], "")
    return not (primary_val and primary_val.strip())


def get_in_flight_terms(pending_dir, lang_key):
    in_flight = set()
    if not pending_dir.exists():
        return in_flight
    for fp in pending_dir.glob(f"{lang_key}_*.json"):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                batch = json.load(f)
            for t in batch.get("terms", []):
                in_flight.add(t["term"])
        except Exception:
            continue
    return in_flight


def next_batch_number(pending_dir, archive_dir, lang_key):
    max_n = 0
    pattern = re.compile(rf"^{re.escape(lang_key)}_(\d+)\.json$")
    for d in (pending_dir, archive_dir / "pending"):
        if not d.exists():
            continue
        for fp in d.glob(f"{lang_key}_*.json"):
            m = pattern.match(fp.name)
            if m:
                max_n = max(max_n, int(m.group(1)))
    return max_n + 1


def build_batch_payload(batch_id, lang_key, terms):
    cfg = NATIVE_LANGS[lang_key]
    display_name = cfg["display_name"]
    fields_list = cfg["fields"]

    task_instructions = (
        f"For EACH term below, identify the actual {display_name} source-language word "
        f"this term is translated from, as it would appear in a real, original {display_name} "
        f"web novel or published work in this genre. Provide:\n"
        f"{cfg['field_descriptions']}\n\n"
        f"IMPORTANT: if you are not genuinely confident of the exact word for a given term, "
        f"leave that term out of your results entirely rather than guessing. This data "
        f"becomes the reference anchor for all future translation work — an honest 'I don't "
        f"know' (by omission) is far more valuable here than a plausible-sounding wrong answer. "
        f"If you have search/research access, use it to verify rather than relying on "
        f"assumption for anything but the most common, well-established terms."
    )
    output_instructions = (
        f"Save your result as a JSON file at glossary_native_pipeline/completed/{batch_id}.json "
        f"with EXACTLY this structure (top-level object, not a bare array):\n"
        f'{{"batch_id": "{batch_id}", "results": [\n'
        f'  {{"term": "<exact English term as given below>", '
        + ", ".join(f'"{f}": "..."' for f in fields_list) + "},\n"
        f"  ... one object per term you're confident about ...\n"
        f"]}}\n"
        f"Use the exact English 'term' value given below for each entry so results can be "
        f"matched back up. No markdown code fences, no commentary outside the JSON object. "
        f"Omit any term entirely from results if you're not confident — do not include it "
        f"with blank/guessed field values."
    )
    return {
        "batch_id": batch_id,
        "native_language": lang_key,
        "display_name": display_name,
        "task_instructions": task_instructions,
        "output_instructions": output_instructions,
        "terms": [
            {
                "term": t["term"],
                "definition": t["definition"],
                "category": t["category"],
                "translationNote": t.get("translationNote", ""),
                "translationStrategy": t.get("translationStrategy", ""),
            }
            for t in terms
        ],
    }


def chunk(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def main():
    parser = argparse.ArgumentParser(description="Stage 1: prepare native-language reference batch files.")
    parser.add_argument("glossary_path", help="Path to master_glossary_schema_locked.json")
    parser.add_argument("--pipeline-dir", default=PIPELINE_DIR_NAME,
                         help=f"Directory for pending/completed/archive/failed (default: {PIPELINE_DIR_NAME})")
    parser.add_argument("--languages", nargs="*", default=None,
                         help="Subset of native languages to prepare: chinese, korean, japanese (default: all)")
    parser.add_argument("--limit", type=int, default=None,
                         help="Max terms to batch PER NATIVE LANGUAGE this run")
    parser.add_argument("--dry-run", action="store_true",
                         help="Show what would be created; write no files")
    args = parser.parse_args()

    glossary_path = Path(args.glossary_path)
    if not glossary_path.exists():
        sys.exit(f"File not found: {glossary_path}")

    with open(glossary_path, "r", encoding="utf-8") as f:
        glossary = json.load(f)

    pipeline_dir = Path(args.pipeline_dir)
    pending_dir = pipeline_dir / "pending"
    archive_dir = pipeline_dir / "archive"

    langs_to_run = args.languages if args.languages else list(NATIVE_LANGS.keys())
    for lc in langs_to_run:
        if lc not in NATIVE_LANGS:
            sys.exit(f"Unknown native language '{lc}' — choose from: {', '.join(NATIVE_LANGS.keys())}")

    total_new_batches = 0
    total_new_terms = 0

    for lc in langs_to_run:
        display_name = NATIVE_LANGS[lc]["display_name"]
        in_flight = get_in_flight_terms(pending_dir, lc)
        pending_terms = [
            t for t in glossary
            if term_needs_native(t, lc) and t["term"] not in in_flight
        ]
        if args.limit:
            pending_terms = pending_terms[:args.limit]

        if not pending_terms:
            print(f"{lc} ({display_name}): nothing new to batch (already covered or already in flight).")
            continue

        batches = list(chunk(pending_terms, BATCH_SIZE))
        print(f"{lc} ({display_name}): {len(pending_terms)} terms -> {len(batches)} new batch file(s)")
        total_new_terms += len(pending_terms)
        total_new_batches += len(batches)

        if args.dry_run:
            continue

        pending_dir.mkdir(parents=True, exist_ok=True)
        n = next_batch_number(pending_dir, archive_dir, lc)
        for b in batches:
            batch_id = f"{lc}_{n:04d}"
            payload = build_batch_payload(batch_id, lc, b)
            out_path = pending_dir / f"{batch_id}.json"
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            n += 1

    print(f"\nTotal: {total_new_batches} batch file(s), {total_new_terms} term-slots, "
          f"across {len(langs_to_run)} native language(s).")
    if args.dry_run:
        print("(--dry-run: no files were written)")
    else:
        print(f"Batch files written to: {pending_dir}/")
        print("Hand these to your IDE agent along with README_FOR_AGENT_NATIVE.md, then run "
              "merge_native_language_batches.py once results start appearing in completed/.")


if __name__ == "__main__":
    main()

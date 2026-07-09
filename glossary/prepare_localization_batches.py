"""
prepare_localization_batches.py

STAGE 1 of the file-handoff localization pipeline:

    prepare_localization_batches.py   (this script)
        writes self-contained batch files to glossary_pipeline/pending/
              ↓
    Your IDE agent (Claude Code, Qwen, Gemini, whatever it has access to)
        reads each pending batch file, runs the embedded task against
        whatever model it wants, and writes a result file to
        glossary_pipeline/completed/
              ↓
    merge_localization_batches.py
        validates each completed file against its original pending batch,
        merges only what checks out into the glossary, and archives the
        pair so nothing gets processed twice

This script does NOT call any LLM API itself. It just figures out what's
missing and writes the work orders.

USAGE
    # See what would be created, no files written:
    python3 prepare_localization_batches.py master_glossary_schema_locked.json --dry-run

    # Create batch files for everything missing, all configured languages:
    python3 prepare_localization_batches.py master_glossary_schema_locked.json

    # Just one language, capped at a small number of terms (for a first test):
    python3 prepare_localization_batches.py master_glossary_schema_locked.json --languages es --limit 10

    Re-running this script is safe: it skips any term that already has an
    unprocessed batch file sitting in pending/ (so you don't get duplicate
    work orders for the same terms), and it skips anything already merged
    into the glossary (since needs_localization() will correctly say no).

ADDING LANGUAGES
    Edit the LANGUAGES dict below — any code you like, no fixed limit.
"""

import argparse
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

LANGUAGES = {
    "es": "Latin American Spanish",
    "es-es": "Castilian Spanish",
    "pt-br": "Brazilian Portuguese",
    "pt-pt": "European Portuguese",
    "id": "Indonesian",
    "th": "Thai",
    "ar": "Arabic",
    "fr": "French",
    "de": "German",
    "ru": "Russian",
    "vi": "Vietnamese",
    "tl": "Tagalog",
    "th": "Thai",
    "hi": "Hindi",
    "sw": "Swahili",
    "tr": "Turkish",
    "pl": "Polish",
    "yo": "Yoruba",
    "ig": "Igbo",
    "ha": "Hausa",
    "am": "Amharic",
    "so": "Somali",
    "zu": "Zulu",
    "xh": "Xhosa",
    "rw": "Kinyarwanda",
    "wo": "Wolof",
    "wo": "Wolof",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "ps": "Pashto",
    "kk": "Kazakh",
    "ms": "Malay",
    "my": "Burmese",
    "km": "Khmer",
    "lo": "Lao",
    "jv": "Javanese",
    "si": "Sinhala",
    "uz": "Uzbek",
    "fa": "Persian",
    "ur": "Urdu",
    "ne": "Nepali",
    "pa": "Punjabi",
    "ku": "Kurdish",
    "uk": "Ukrainian",
    "ro": "Romanian",
    "hu": "Hungarian",
    "cs": "Czech",
    "sr": "Serbian",
    "it": "Italian",
    "ln": "Lingala",
    "sn": "Shona",
    "ak": "Twi",
    "ht": "Haitian Creole",
    "qu": "Quechua",
    "gn": "Guarani",
    "mi": "Māori",
}

BATCH_SIZE = 10000
PIPELINE_DIR_NAME = "glossary_pipeline"

# ---------------------------------------------------------------------------


def ensure_language_key(term_obj, lang_code):
    if "localizations" not in term_obj or not isinstance(term_obj["localizations"], dict):
        term_obj["localizations"] = {}
    if lang_code not in term_obj["localizations"] or not isinstance(term_obj["localizations"][lang_code], dict):
        term_obj["localizations"][lang_code] = {"term": "", "aliases": [], "translationNote": ""}


def needs_localization(term_obj, lang_code):
    ensure_language_key(term_obj, lang_code)
    loc = term_obj["localizations"][lang_code]
    return not (loc.get("term") or "").strip()


def get_in_flight_terms(pending_dir, lang_code):
    """Terms already sitting in an unprocessed pending batch for this language,
    so a second prepare run doesn't create duplicate work orders."""
    in_flight = set()
    if not pending_dir.exists():
        return in_flight
    for fp in pending_dir.glob(f"{lang_code}_*.json"):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                batch = json.load(f)
            for t in batch.get("terms", []):
                in_flight.add(t["term"])
        except Exception:
            continue  # a corrupt pending file shouldn't block scanning the rest
    return in_flight


def next_batch_number(pending_dir, archive_dir, lang_code):
    """Scan both pending/ and archive/pending/ so numbering never collides,
    even across many prepare/merge cycles. (Merged batches get archived into
    archive/pending/ and archive/completed/ subfolders, not a flat archive/,
    since both files share the same batch_id filename.)"""
    max_n = 0
    pattern = re.compile(rf"^{re.escape(lang_code)}_(\d+)\.json$")
    for d in (pending_dir, archive_dir / "pending"):
        if not d.exists():
            continue
        for fp in d.glob(f"{lang_code}_*.json"):
            m = pattern.match(fp.name)
            if m:
                max_n = max(max_n, int(m.group(1)))
    return max_n + 1


def build_batch_payload(batch_id, lang_code, lang_name, terms):
    task_instructions = (
        f"Localize the terms below from a light-novel/web-novel translation glossary "
        f"into {lang_name}. For EACH term, produce:\n"
        f"- localized_term: the natural {lang_name} rendering that readers of {lang_name} "
        f"fan/official web-novel translations would recognize (preserve as a loanword where "
        f"that is the real-world convention for this kind of term, translate where that is "
        f"the convention instead)\n"
        f"- localized_aliases: 1-3 alternate {lang_name} renderings/spellings if any genuinely "
        f"exist; an empty list if none\n"
        f"- translationNote: ONE short sentence, in English, flagging anything specific a "
        f"translator into {lang_name} should watch for with this term (no direct equivalent, "
        f"risk of confusion with an unrelated local word, formality/register mismatch), or "
        f"state plainly there's no special consideration if that's the case"
    )
    output_instructions = (
        f"Save your result as a JSON file at glossary_pipeline/completed/{batch_id}.json "
        f"with EXACTLY this structure (top-level object, not a bare array):\n"
        f'{{"batch_id": "{batch_id}", "results": [\n'
        f'  {{"term": "<exact English term as given below>", "localized_term": "...", '
        f'"localized_aliases": [...], "translationNote": "..."}},\n'
        f"  ... one object per term below ...\n"
        f"]}}\n"
        f"Use the exact English 'term' value given below for each entry so results can be "
        f"matched back up. No markdown code fences, no commentary outside the JSON object."
    )
    return {
        "batch_id": batch_id,
        "language_code": lang_code,
        "language_name": lang_name,
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
    parser = argparse.ArgumentParser(description="Stage 1: prepare localization batch files.")
    parser.add_argument("glossary_path", help="Path to master_glossary_schema_locked.json")
    parser.add_argument("--pipeline-dir", default=PIPELINE_DIR_NAME,
                         help=f"Directory for pending/completed/archive/failed (default: {PIPELINE_DIR_NAME})")
    parser.add_argument("--languages", nargs="*", default=None,
                         help="Subset of language codes to prepare (default: all in LANGUAGES)")
    parser.add_argument("--limit", type=int, default=None,
                         help="Max terms to batch PER LANGUAGE this run")
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

    langs_to_run = args.languages if args.languages else list(LANGUAGES.keys())
    for lc in langs_to_run:
        if lc not in LANGUAGES:
            sys.exit(f"Unknown language code '{lc}' — add it to LANGUAGES at the top of this script first.")

    total_new_batches = 0
    total_new_terms = 0

    for lc in langs_to_run:
        lang_name = LANGUAGES[lc]
        in_flight = get_in_flight_terms(pending_dir, lc)
        pending_terms = [
            t for t in glossary
            if needs_localization(t, lc) and t["term"] not in in_flight
        ]
        if args.limit:
            pending_terms = pending_terms[:args.limit]

        if not pending_terms:
            print(f"{lc} ({lang_name}): nothing new to batch (already covered or already in flight).")
            continue

        batches = list(chunk(pending_terms, BATCH_SIZE))
        print(f"{lc} ({lang_name}): {len(pending_terms)} terms -> {len(batches)} new batch file(s)")
        total_new_terms += len(pending_terms)
        total_new_batches += len(batches)

        if args.dry_run:
            continue

        pending_dir.mkdir(parents=True, exist_ok=True)
        n = next_batch_number(pending_dir, archive_dir, lc)
        for b in batches:
            batch_id = f"{lc}_{n:04d}"
            payload = build_batch_payload(batch_id, lc, lang_name, b)
            out_path = pending_dir / f"{batch_id}.json"
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            n += 1

    print(f"\nTotal: {total_new_batches} batch file(s), {total_new_terms} term-slots, across {len(langs_to_run)} language(s).")
    if args.dry_run:
        print("(--dry-run: no files were written)")
    else:
        print(f"Batch files written to: {pending_dir}/")
        print("Hand these to your IDE agent along with README_FOR_AGENT.md, then run "
              "merge_localization_batches.py once results start appearing in completed/.")


if __name__ == "__main__":
    main()

"""
merge_native_language_batches.py

STAGE 2 for the native-language reference pipeline. Run this after your IDE
agent has dropped result files into glossary_native_pipeline/completed/.

Same validation philosophy as the translation pipeline's merge script:
    - Never trusts a completed file's own say-so about what it covers —
      always cross-checks against the original pending batch file.
    - Applies only entries where the PRIMARY field (hanzi for Chinese,
      hangul for Korean, kanji for Japanese) actually has content. An
      entry with the primary field blank is treated as "not answered,"
      same as if the term were omitted entirely — because a blank there
      means the agent wasn't confident, which is exactly the case where
      we don't want to write anything in.
    - Anything that doesn't check out is logged and skipped, not silently
      dropped and not allowed to crash the run.
    - Successfully merged batches get their pending+completed pair moved
      to archive/, so nothing is ever reprocessed.
    - A completed file with no matching pending file, or that fails to
      parse, goes to failed/ for a manual look.

USAGE
    python3 merge_native_language_batches.py master_glossary_schema_locked.json

    # Preview without changing anything:
    python3 merge_native_language_batches.py master_glossary_schema_locked.json --dry-run

Safe to run repeatedly — an empty completed/ folder just reports nothing
to do.
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

PIPELINE_DIR_NAME = "glossary_native_pipeline"

NATIVE_LANG_FIELDS = {
    "chinese": {"primary": "hanzi", "fields": ["hanzi", "pinyin", "traditional"]},
    "korean": {"primary": "hangul", "fields": ["hangul", "romanization"]},
    "japanese": {"primary": "kanji", "fields": ["kanji", "romaji"]},
}


def ensure_native_key(term_obj, lang_key):
    if "nativeLanguages" not in term_obj or not isinstance(term_obj["nativeLanguages"], dict):
        term_obj["nativeLanguages"] = {}
    if lang_key not in term_obj["nativeLanguages"] or not isinstance(term_obj["nativeLanguages"][lang_key], dict):
        term_obj["nativeLanguages"][lang_key] = {f: "" for f in NATIVE_LANG_FIELDS[lang_key]["fields"]}


def parse_json_loose(raw_text):
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    return json.loads(cleaned)


def main():
    parser = argparse.ArgumentParser(description="Stage 2: validate and merge completed native-language batches.")
    parser.add_argument("glossary_path", help="Path to master_glossary_schema_locked.json")
    parser.add_argument("--pipeline-dir", default=PIPELINE_DIR_NAME,
                         help=f"Directory containing pending/completed/archive/failed (default: {PIPELINE_DIR_NAME})")
    parser.add_argument("--dry-run", action="store_true",
                         help="Report what would be merged without changing any files")
    args = parser.parse_args()

    glossary_path = Path(args.glossary_path)
    if not glossary_path.exists():
        sys.exit(f"File not found: {glossary_path}")

    pipeline_dir = Path(args.pipeline_dir)
    pending_dir = pipeline_dir / "pending"
    completed_dir = pipeline_dir / "completed"
    archive_dir = pipeline_dir / "archive"
    failed_dir = pipeline_dir / "failed"

    completed_files = sorted(completed_dir.glob("*.json")) if completed_dir.exists() else []
    if not completed_files:
        print(f"Nothing to merge — {completed_dir}/ is empty or doesn't exist yet.")
        return

    with open(glossary_path, "r", encoding="utf-8") as f:
        glossary = json.load(f)
    term_index = {t["term"]: t for t in glossary}

    log_path = pipeline_dir / "merge.log"
    log_lines = []

    def log(msg):
        log_lines.append(msg)
        print(msg)

    merged_batches = 0
    merged_terms = 0
    skipped_entries = 0

    for completed_fp in completed_files:
        batch_id = completed_fp.stem

        try:
            with open(completed_fp, "r", encoding="utf-8") as f:
                raw = f.read()
            completed_payload = parse_json_loose(raw)
        except Exception as e:
            log(f"FAILED (unparseable JSON): {completed_fp.name} — {e}")
            if not args.dry_run:
                failed_dir.mkdir(parents=True, exist_ok=True)
                shutil.move(str(completed_fp), str(failed_dir / completed_fp.name))
            continue

        if not isinstance(completed_payload, dict) or "results" not in completed_payload:
            log(f"FAILED (missing top-level 'results' array): {completed_fp.name}")
            if not args.dry_run:
                failed_dir.mkdir(parents=True, exist_ok=True)
                shutil.move(str(completed_fp), str(failed_dir / completed_fp.name))
            continue

        results = completed_payload.get("results", [])

        pending_fp = pending_dir / f"{batch_id}.json"
        if not pending_fp.exists():
            log(f"FAILED (no matching pending batch for '{batch_id}'): {completed_fp.name}")
            if not args.dry_run:
                failed_dir.mkdir(parents=True, exist_ok=True)
                shutil.move(str(completed_fp), str(failed_dir / completed_fp.name))
            continue

        with open(pending_fp, "r", encoding="utf-8") as f:
            pending_payload = json.load(f)

        lang_key = pending_payload["native_language"]
        if lang_key not in NATIVE_LANG_FIELDS:
            log(f"FAILED (unknown native_language '{lang_key}' in pending batch): {batch_id}")
            if not args.dry_run:
                failed_dir.mkdir(parents=True, exist_ok=True)
                shutil.move(str(completed_fp), str(failed_dir / completed_fp.name))
            continue

        expected_terms = {t["term"] for t in pending_payload["terms"]}
        field_cfg = NATIVE_LANG_FIELDS[lang_key]
        primary_field = field_cfg["primary"]
        all_fields = field_cfg["fields"]

        applied_this_batch = 0
        for r in results:
            if not isinstance(r, dict) or "term" not in r:
                log(f"  SKIP (malformed entry, no 'term' key) in {batch_id}: {r!r}")
                skipped_entries += 1
                continue
            term_name = r["term"]
            if term_name not in expected_terms:
                log(f"  SKIP (term '{term_name}' was not part of batch {batch_id}'s request)")
                skipped_entries += 1
                continue
            term_obj = term_index.get(term_name)
            if term_obj is None:
                log(f"  SKIP (term '{term_name}' no longer exists in the glossary)")
                skipped_entries += 1
                continue
            primary_val = (r.get(primary_field) or "").strip()
            if not primary_val:
                log(f"  SKIP ('{term_name}' in {batch_id}: primary field '{primary_field}' is "
                    f"blank — treated as not answered, will stay pending)")
                skipped_entries += 1
                continue

            if not args.dry_run:
                ensure_native_key(term_obj, lang_key)
                for f in all_fields:
                    term_obj["nativeLanguages"][lang_key][f] = (r.get(f) or "").strip()
            applied_this_batch += 1

        missing = expected_terms - {r.get("term") for r in results if isinstance(r, dict)}
        for m in missing:
            log(f"  MISSING from {batch_id}'s results entirely (or blank primary field): {m}")

        log(f"Batch {batch_id} ({lang_key}): applied {applied_this_batch}/{len(expected_terms)} terms")
        merged_batches += 1
        merged_terms += applied_this_batch

        if not args.dry_run:
            with open(glossary_path, "w", encoding="utf-8") as f:
                json.dump(glossary, f, ensure_ascii=False, indent=2)
            archive_pending_dir = archive_dir / "pending"
            archive_completed_dir = archive_dir / "completed"
            archive_pending_dir.mkdir(parents=True, exist_ok=True)
            archive_completed_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(pending_fp), str(archive_pending_dir / pending_fp.name))
            shutil.move(str(completed_fp), str(archive_completed_dir / completed_fp.name))

    print(f"\n{'Would merge' if args.dry_run else 'Merged'} {merged_batches} batch(es), "
          f"{merged_terms} term(s) total, {skipped_entries} entries skipped.")

    if not args.dry_run:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write("\n".join(log_lines) + "\n")
        print(f"Full log appended to: {log_path}")
    else:
        print("(--dry-run: no files changed, nothing archived)")


if __name__ == "__main__":
    if "--dry-run" not in sys.argv and len(sys.argv) > 1:
        _glossary_path = Path(sys.argv[1])
        if _glossary_path.exists():
            _backup = _glossary_path.with_suffix(_glossary_path.suffix + ".bak")
            shutil.copy2(_glossary_path, _backup)
            print(f"Backup written to: {_backup}")
    main()

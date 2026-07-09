# SEIHOUSE — Light Novels: Language Expansion Audit

**Audit date:** 2026-07-09  
**Scope:** Target language launch-readiness against the current React/Vite/Tailwind frontend, reader viewport, glossary/localization flow, and TTS implementation.

> Note: the provided “60 language” target list currently contains **59 distinct entries**.

## Current Codebase Capability Baseline

This audit is tied to the current repository implementation:

- `src/index.css` imports Google Fonts for **Alegreya**, **Alegreya SC**, **Noto Serif**, and **Rubik** only.
- `src/components/ReaderViewport.tsx` sets `dir="auto"` on the prose body, but the surrounding reader still uses LTR assumptions such as `ml-*`, `mr-*`, left/right arrows, left/right swipe navigation, and fixed indentation.
- `src/components/ReaderChamber.tsx` has a partial language-name-to-locale mapper, not a complete 59-language registry.
- `src/lib/voice/kokoroVoiceRegistry.ts` and `src/lib/voice/voiceResolver.ts` currently support Kokoro presets for **English** and **Spanish** only.
- `src/server/routes/mediaRouter.ts` TTS fallback logic routes Kokoro-style language selection to only `en` or `es`.
- SEN/Focus narration and auto-scroll pacing are strongly coupled to speech timing and English-like word boundaries, which makes CJK and complex scripts higher risk.

## List A — Zero-Friction Integration

Languages in this list are LTR, mostly Latin/Cyrillic, space-delimited, and should work with the current reader without major layout, font, or TTS architecture changes. Minor selector/locale mapping additions are still needed where the language is not already mapped.

| Language | Code | Current-Stack Readiness |
|---|---:|---|
| Spanish | `es` | Already partially supported in locale mapping and Kokoro voice presets; Latin script; LTR; strong mainstream TTS. |
| Spanish — Latin America | `es-419` | Same rendering path as Spanish; needs accent/locale selection but no layout/font refactor. |
| Portuguese | `pt` | Latin script; LTR; Noto Serif/Rubik coverage; strong mainstream TTS. |
| Portuguese — Brazil | `pt-BR` | Already partially mapped as Portuguese; Latin script; strong mainstream Brazilian Portuguese TTS. |
| French | `fr` | Already mapped; Latin script; LTR; strong mainstream TTS. |
| German | `de` | Already mapped; Latin script; LTR; strong mainstream TTS. |
| Russian | `ru` | Already mapped in `ReaderChamber`; Cyrillic is supported by the current font stack; LTR; strong mainstream TTS. |
| Vietnamese | `vi` | Already mapped; Latin script with diacritics; LTR; mainstream TTS is mature enough. |
| Indonesian | `id` | Already mapped; Latin script; LTR; strong mainstream TTS. |
| Tagalog / Filipino | `tl` | Already mapped; Latin script; LTR; acceptable mainstream TTS. |
| Swahili | `sw` | Latin script; LTR; space-delimited; supported by major cloud TTS providers. |
| Turkish | `tr` | Latin script; LTR; Noto Serif handles Turkish characters; strong mainstream TTS. |
| Polish | `pl` | Latin script; LTR; Noto Serif handles Polish diacritics; strong mainstream TTS. |
| Somali | `so` | Latin script; LTR; no layout/font blocker; TTS support exists in mainstream cloud stacks. |
| Malay | `ms` | Already mapped; Latin script; LTR; strong mainstream TTS. |
| Ukrainian | `uk` | Cyrillic; LTR; Noto Serif/Rubik coverage; strong mainstream TTS. |
| Romanian | `ro` | Latin script; LTR; mainstream TTS; no viewport risk. |
| Hungarian | `hu` | Latin script; LTR; mainstream TTS; no viewport risk. |
| Czech | `cs` | Latin script; LTR; mainstream TTS; no viewport risk. |
| Serbian | `sr` | LTR Cyrillic/Latin can render with current fonts; mainstream TTS acceptable if locale is pinned to `sr-RS`. |
| Italian | `it` | Latin script; LTR; strong mainstream TTS. |

## List B — Phase 2: Requires Engineering Integration

Languages in this list need non-trivial engineering before a safe launch. Reasons are specific to the current SEIHOUSE stack and focus on font coverage, script behavior, layout direction, TTS quality, and cultural localization/prompt engineering.

| Language | Code | Primary Blocker Category | Technical Blocker |
|---|---:|---|---|
| Chinese | `zh` | Missing Noto Serif Coverage / TTS Segmentation | Add `Noto Serif SC/TC` or `Noto Sans CJK`, implement CJK line-break/paragraph tuning, and replace English word-count TTS pacing with character/token-based timing for SEN/Focus mode. |
| Japanese | `ja` | Missing Noto Serif Coverage / Cultural Remapping | Add `Noto Serif JP`; tune line-height and punctuation wrapping; add Japanese LN localization policy for xianxia concepts like `Qi`, `Dao`, `Sect`, and `Young Master` rather than direct literal output. |
| Korean | `ko` | Missing Noto Serif Coverage / Cultural Remapping | Add `Noto Serif KR`; validate Hangul line wrapping in `text-justify` reader; create Korean fantasy/wuxia term mapping for cultivation/system tropes. |
| Thai | `th` | Complex Script Rendering/Line-Height | Requires `Noto Serif Thai` or Thai fallback, larger line-height presets, Thai word segmentation for highlighting/search, and non-space TTS pacing fixes. Current `text-justify indent-8` reader is fragile. |
| Hindi | `hi` | Complex Script Rendering/Line-Height | Requires `Noto Serif Devanagari`, Devanagari shaping QA, increased line-height, and Hindi TTS voice routing. Current Kokoro/server TTS only handles `en/es`. |
| Arabic | `ar` | RTL/Layout Inversion | Requires `tailwindcss-rtl` or logical CSS utilities, `dir="rtl"` at app/story scope, mirrored swipe navigation, mirrored arrows/margins, Arabic font such as `Noto Naskh Arabic`/`Noto Serif Arabic`, and Arabic TTS voice routing. |
| Yoruba | `yo` | TTS Voice Quality Gap | Text can mostly render, but launch-quality narration requires Yoruba-capable cloud/regional TTS and language-specific voice selection; current voice resolver/browser defaults are English/Spanish-biased. |
| Igbo | `ig` | TTS Voice Quality Gap | Requires Igbo voice provider validation and locale-aware TTS routing; otherwise Web Speech/Kokoro playback will fall back to wrong-language voices. |
| Hausa | `ha` | TTS Voice Quality Gap | Needs Hausa-specific TTS voice selection and QA for tone/diacritics; current Kokoro registry cannot route Hausa. |
| Amharic | `am` | Missing Noto Serif Coverage / Complex Script | Requires Ethiopic font integration such as `Noto Serif Ethiopic`, line-height QA, and Amharic TTS provider routing. Current imported Noto Serif is not enough. |
| Zulu | `zu` | TTS Voice Quality Gap | Latin rendering is fine, but production narration needs Zulu voice provider support and locale-aware fallback; current voice stack will likely use English voices. |
| Xhosa | `xh` | TTS Voice Quality Gap | Requires Xhosa TTS provider validation and pronunciation QA; current TTS casting has no Xhosa locale support. |
| Kinyarwanda | `rw` | TTS Voice Quality Gap | Requires Kinyarwanda-capable TTS provider or local model; current Web Speech/Kokoro path is not reliable for narration. |
| Wolof | `wo` | TTS Voice Quality Gap | Requires specialized/regional TTS and glossary QA; mainstream browser voices are unlikely to provide acceptable Wolof narration. |
| Bengali | `bn` | Complex Script Rendering/Line-Height | Requires `Noto Serif Bengali`, Indic shaping QA, larger line-height, and Bengali TTS routing; current SEN highlighting/pacing is English word-based. |
| Tamil | `ta` | Complex Script Rendering/Line-Height | Requires `Noto Serif Tamil`, Tamil shaping/line-height QA, and Tamil TTS voice routing. Current font stack and Kokoro registry are insufficient. |
| Telugu | `te` | Complex Script Rendering/Line-Height | Requires `Noto Serif Telugu`, generous line-height presets, script shaping QA, and Telugu TTS routing. |
| Marathi | `mr` | Complex Script Rendering/Line-Height | Requires `Noto Serif Devanagari`, Marathi locale/TTS routing, and QA for Devanagari text in Focus/SEN mode. |
| Pashto | `ps` | RTL/Layout Inversion | Requires full RTL app/story mode, mirrored swipe/navigation, Arabic-script font fallback, Pashto TTS provider routing, and likely Pashto glossary adaptation. |
| Kazakh | `kk` | TTS Voice Quality Gap / Locale Ambiguity | Cyrillic text can render, but launch requires `kk-KZ` locale routing, Kazakh TTS provider validation, and script policy for Cyrillic vs Latin Kazakh. |
| Burmese | `my` | Complex Script Rendering/Line-Height | Requires Myanmar font such as `Noto Serif Myanmar`, large line-height QA, word segmentation, and Burmese TTS provider integration. Current reader is unsafe. |
| Khmer | `km` | Complex Script Rendering/Line-Height | Requires `Noto Serif Khmer`, Khmer line-break handling, larger line-height, and Khmer TTS routing; current text justification can break readability. |
| Lao | `lo` | Complex Script Rendering/Line-Height | Requires `Noto Serif Lao`, Lao segmentation/line-break QA, larger line-height, and Lao TTS provider integration. |
| Javanese | `jv` | TTS Voice Quality Gap / Locale Policy | If Latin Javanese, rendering is okay, but production needs Javanese TTS support and locale policy; if native Javanese script is supported later, add dedicated font and shaping QA. |
| Persian | `fa` | RTL/Layout Inversion | Requires RTL layout inversion, Persian font stack such as `Vazirmatn`/`Noto Naskh Arabic`, mirrored controls/swipes, Persian TTS routing, and Persian fantasy trope localization. |
| Urdu | `ur` | RTL/Layout Inversion / Font Fallback | Requires full RTL inversion plus Nastaliq-capable font integration such as `Noto Nastaliq Urdu`; current Noto Serif/Rubik will not give acceptable Urdu reading. |
| Nepali | `ne` | Complex Script Rendering/Line-Height | Requires `Noto Serif Devanagari`, Nepali locale/TTS routing, and QA for Devanagari line-height in reader and system panels. |
| Punjabi | `pa` | Complex Script Rendering/Line-Height | Requires script policy: Gurmukhi vs Shahmukhi. For Gurmukhi add `Noto Serif Gurmukhi`; for Shahmukhi also add RTL support. Needs Punjabi TTS routing. |
| Kurdish | `ku` | RTL/Layout Ambiguity / TTS Gap | Requires script policy: Kurmanji Latin can render, but Sorani uses Arabic RTL. Need locale split such as `ku-Latn`/`ckb-Arab`, RTL support for Sorani, and Kurdish TTS provider validation. |
| Sinhala | `si` | Complex Script Rendering/Line-Height | Requires `Noto Serif Sinhala`, Sinhala shaping/line-height QA, and Sinhala TTS routing. Current stack is not safe. |
| Lingala | `ln` | TTS Voice Quality Gap | Latin rendering is manageable, but launch-quality TTS requires Lingala provider/model validation; current TTS would likely use incorrect English/French voice fallback. |
| Shona | `sn` | TTS Voice Quality Gap | Requires Shona TTS provider support and pronunciation QA; current Web Speech/Kokoro path is not sufficient. |
| Twi / Akan | `ak` | TTS Voice Quality Gap | Requires Akan/Twi TTS provider or local model, plus glossary pronunciation QA; browser voices are unlikely to be reliable. |
| Malagasy | `mg` | TTS Voice Quality Gap | Latin rendering works, but production narration needs Malagasy TTS provider validation and locale-aware fallback. |
| Haitian Creole | `ht` | TTS Voice Quality Gap | Requires Haitian Creole TTS provider support and language-specific voice fallback; current TTS stack would likely use French/English voices incorrectly. |
| Quechua | `qu` | TTS Voice Quality Gap / Cultural Remapping | Requires specialized/regional TTS or local model and AI prompt localization for Andean fantasy equivalents if remapping cultivation concepts like `Qi`/`Dao`. |
| Guarani | `gn` | TTS Voice Quality Gap / Cultural Remapping | Requires Guarani TTS provider/model and cultural concept-remapping prompts for spiritual/progression systems instead of literal xianxia terms. |
| Māori | `mi` | TTS Voice Quality Gap / Cultural Remapping | Requires Māori-capable TTS, macron pronunciation QA, and cultural sensitivity prompt rules before remapping spiritual concepts. |

## Recommended Phase 2 Sequencing

| Phase | Languages | Engineering Theme |
|---|---|---|
| 2.1 | Chinese, Japanese, Korean | CJK font bundles, CJK line breaking, token/character-based TTS pacing, cultivation-term localization. |
| 2.2 | Arabic, Persian, Urdu, Pashto | RTL architecture, logical Tailwind utilities, mirrored navigation/swipes, Arabic/Nastaliq fonts, RTL TTS routing. |
| 2.3 | Thai, Burmese, Khmer, Lao, Hindi, Bengali, Tamil, Telugu, Marathi, Nepali, Punjabi, Sinhala | Complex-script font packs, shaping QA, line-height presets, segmentation, locale-specific TTS. |
| 2.4 | Yoruba, Igbo, Hausa, Zulu, Xhosa, Kinyarwanda, Wolof, Lingala, Shona, Twi/Akan, Malagasy, Haitian Creole, Quechua, Guarani, Māori, Kazakh, Javanese, Kurdish | TTS provider matrix, regional pronunciation QA, script policy, cultural concept remapping. |

## Implementation Checklist Before Promoting a Phase 2 Language

- [ ] Add locale code and display name to a centralized language registry.
- [ ] Add Google/local font family and Tailwind/CSS font override for the script.
- [ ] Validate reader viewport in mobile Focus/SEN mode.
- [ ] Validate paragraph indentation, justification, line-height, and wrapping.
- [ ] Add TTS provider routing and voice fallback rules.
- [ ] Add glossary localization rules for xianxia/LitRPG concepts.
- [ ] Add cultural concept remapping prompts where literal translation would be poor.
- [ ] Add smoke tests for translation cache, EPUB export metadata, and reader rendering.

# Quran word annotation review policy

This project displays Quran text from the configured Quran edition. The interactive word view currently splits that text on whitespace for navigation only. It is **not** a verified linguistic or morphological segmentation.

## Publication gate

No word meaning, Russian reading guide, or tajwid annotation may be presented as verified unless all of the following are satisfied:

1. The source is identified with a stable URL, edition, and exact surah/ayah reference.
2. The Arabic token is compared character-for-character with the same edition shown in the app, including diacritics and Quranic marks.
3. The token index is checked against the exact displayed ayah; whitespace tokenization must not be confused with morphology.
4. Permission to reproduce and distribute the source content in this application is documented. Public availability alone is not permission.
5. A qualified human reviewer checks the Russian wording, pronunciation guidance, and any tajwid interpretation.
6. A second reviewer or automated integrity test verifies the verse reference, token count, and absence of omitted or duplicated text.
7. The interface labels transliteration as an approximate learning aid and never as a substitute for correct recitation or teacher-led tajwid.

## Registry

`quran-word-sources.json` is intentionally empty until entries have cleared this review. Fields under `requirements` describe the intended provenance for future records. Adding an entry to the registry alone **does not** publish it in the reader. Integration requires separate validation and explicit review.

## Release checks

- Test Al-Fatiha (1:1–1:7) and a longer surah on narrow and wide screens.
- Check RTL order, word selection, repeated tap, keyboard focus, and screen-reader announcements.
- Confirm the original ayah text, translation, audio controls, bookmarks, and offline reading are unchanged.
- Reject missing metadata, mismatched tokens, unknown licenses, and partial annotation coverage without silently guessing.
- Record reviewer names and dates in release notes.

This is an engineering review policy, not a scholarly certification of the app.

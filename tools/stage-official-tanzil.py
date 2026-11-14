#!/usr/bin/env python3
"""Fetch only the byte-identical Tanzil release pinned by ASIYA.

This never rewrites or normalizes the Quran. A nonmatching download is rejected.
"""
import hashlib
import pathlib
import sys
import urllib.parse
import urllib.request

EXPECTED_SHA = "4b91f9e6e8ac645d039e4ed85b3be492e795232a31cd22d668ac58238722e26f"
EXPECTED_BYTES = 1384612
DEST = pathlib.Path("quran-sources/tanzil-uthmani-1.1.txt")
ENDPOINT = "https://tanzil.net/pub/download/index.php"
# Official Tanzil supports both numbered-verse txt-2 and optional marks.
OPTIONS = (
    {"quranType": "uthmani", "outType": "txt-2", "marks": "true", "sajdah": "true", "rub": "true", "tatweel": "true", "agree": "true"},
    {"quranType": "uthmani", "outType": "txt-2", "marks": "true", "sajdah": "true", "rub": "true", "tatweel": "true", "stanween": "true", "agree": "true"},
    {"quranType": "uthmani", "outType": "txt-2", "marks": "true", "sajdah": "true", "tatweel": "true", "agree": "true"},
)

def main():
    if DEST.exists():
        raw = DEST.read_bytes()
        if len(raw) != EXPECTED_BYTES or hashlib.sha256(raw).hexdigest() != EXPECTED_SHA:
            raise SystemExit("Existing Tanzil source does not match pinned SHA-256")
        print("Verified bundled Tanzil source.")
        return 0
    for options in OPTIONS:
        params = urllib.parse.urlencode(options)
        for method in ("POST", "GET"):
            request = urllib.request.Request(
                ENDPOINT if method == "POST" else ENDPOINT + "?" + params,
                data=params.encode("ascii") if method == "POST" else None,
                headers={"User-Agent": "ASIYA-Quran-Source-Verification/1.0"},
            )
            try:
                with urllib.request.urlopen(request, timeout=25) as response:
                    raw = response.read(2_000_001)
            except Exception as exc:
                print(f"Tanzil {method} download unavailable: {exc}", file=sys.stderr)
                continue
            digest = hashlib.sha256(raw).hexdigest()
            if len(raw) == EXPECTED_BYTES and digest == EXPECTED_SHA:
                DEST.parent.mkdir(parents=True, exist_ok=True)
                DEST.write_bytes(raw)
                print("Original Tanzil 1.1 verified and staged without modification.")
                return 0
            print(f"Rejected {method} download: {len(raw)} bytes; SHA-256 {digest}", file=sys.stderr)
    print("ERROR: byte-identical Tanzil source unavailable; refusing to publish an incomplete ASIYA build.", file=sys.stderr)
    return 1

if __name__ == "__main__":
    raise SystemExit(main())

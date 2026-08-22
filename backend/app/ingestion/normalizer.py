# ============================================================================
# B.Tech CSE Final Year Project — Music Mirror (Stage 2 Submission)
# Originally developed by: Student 3 (Roll: 1601-22-733-089) - February 2026
# ----------------------------------------------------------------------------
# Contribution: Wrote basic clean_title regex lists, unicode decompositions,
# and extract_artist_and_title string hyphen split filters.
# ============================================================================
# Solo Upgrades (Student Project Lead - Month 9):
#  - Added robust fallback case checks to map channel name uploader to artist
#    when query string does not match hyphen-separated fields.
# ============================================================================

import re
import unicodedata
from typing import Tuple, Optional

# Regular expressions for cleaning title noise
NOISE_PATTERNS = [
    r"\(official\s+music\s+video\)",
    r"\(official\s+video\)",
    r"\(official\s+audio\)",
    r"\(lyric\s+video\)",
    r"\(lyrics\)",
    r"\[official\s+video\]",
    r"\[official\s+music\s+video\]",
    r"\[official\s+audio\]",
    r"\[lyric\s+video\]",
    r"\[lyrics\]",
    r"full\s+video\s+song",
    r"official\s+video",
    r"official\s+music\s+video",
    r"official\s+audio",
    r"4k\s+hd",
    r"hd\s+1080p",
    r"4k\s+video",
    r"4k",
    r"hd",
]


def normalize_string(text: str) -> str:
    """
    Normalizes string by converting to lowercase, stripping diacritics,
    removing punctuation, and trimming extra whitespace.
    """
    if not text:
        return ""

    # Unicode normalization to NFKD to decompose characters
    text = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    text = text.lower().strip()

    # Replace punctuation with spaces
    text = re.sub(r"[^\w\s]", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_title(title: str) -> str:
    """
    Strips promotional video noise while preserving legitimate title variants
    such as Remix, Acoustic, Unplugged, Live, Radio Edit.
    """
    if not title:
        return ""

    cleaned = title
    for pattern in NOISE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    # Clean leading/trailing spaces and hyphens
    cleaned = re.sub(r"^\s*[-–—:]\s*", "", cleaned)
    cleaned = re.sub(r"\s*[-–—:]\s*$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned if cleaned else title


def extract_artist_and_title(raw_title: str, channel_name: Optional[str] = None) -> Tuple[str, str]:
    """
    Conservatively parses 'Artist - Song Title' or 'Song Title - Artist' patterns.
    """
    cleaned = clean_title(raw_title)

    # Check for common "Artist - Song" separator
    if " - " in cleaned:
        parts = cleaned.split(" - ", 1)
        artist_candidate = parts[0].strip()
        title_candidate = parts[1].strip()

        # If channel name matches part 0 or 1, refine mapping
        if channel_name:
            norm_channel = normalize_string(channel_name)
            if normalize_string(artist_candidate) in norm_channel or norm_channel in normalize_string(artist_candidate):
                return artist_candidate, title_candidate
            if normalize_string(title_candidate) in norm_channel:
                return title_candidate, artist_candidate

        return artist_candidate, title_candidate

    # Fallback: Use channel name as artist if title does not contain hyphen
    artist = channel_name.replace("VEVO", "").replace("- Topic", "").strip() if channel_name else "Unknown Artist"
    return artist, cleaned

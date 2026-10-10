# Rule: YouTube Music Title & Entity Normalization

## 1. Multi-Delimiter Support
- Media video titles from global and regional channels do not always use standard hyphens (`Artist - Title`).
- Support multiple structural delimiters: ` - `, ` | `, ` // `, and `: `.
- For multi-segment titles common in regional channels (`Title | Movie | Artist`), treat the first component as the primary track title and examine subsequent segments for artist and label entities.

## 2. Noise & Suffix Stripping
- Strip bracketed video metadata: `[...]`, `(...)` containing tags like `[Official Video]`, `(Lyrics)`.
- Strip unbracketed trailing pipe descriptors: `| Full Video Song`, `| Lyrical Video`, `| 4K`, `| HD`, `| Promo`.
- Preserve language markers where required for acoustic localization.

## 3. Artist Resolution & Channel Fallback
- Check channel names against known record labels (e.g. Aditya Music, T-Series, Sony Music, Saregama, Warner).
- When a video is published by a record label channel, extract artist names from the parsed title segments rather than falling back to the channel name or `"Various Artists"`.

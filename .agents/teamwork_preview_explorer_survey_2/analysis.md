# Technical Specification & Deep Analysis: Discovery & Optimization (R1, R2, R5, R6)

## Executive Summary
This document provides the authoritative technical specification, algorithm design, data structures, and architectural blueprint for upgrading **Music Mirror** into an autonomous, low-latency, fault-tolerant YouTube discovery, ranking, caching, and observability subsystem. 

Specifically, this report addresses:
- **R1: Query Intelligence & Candidate Discovery** (Normalization, token extraction, expansion heuristics, multi-candidate YouTube search fetching strategies)
- **R2: Weighted Scoring & Relevance Ranking** (Multi-criteria weighted formula, token/Levenshtein matching, channel authority heuristics, duration bounds, negative version penalties, threshold tuning)
- **R5: Optimization** (Dual-layer caching, in-flight request deduplication/SingleFlight, background next-candidate preparation and pre-fetching)
- **R6: Observability & Performance Monitoring** (Metric collectors, stage-by-stage latencies, fallback success tracking, failure reason taxonomy, diagnostic circular buffer, privacy boundaries)

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1: Query Intelligence | Unicode & Diacritic Normalization | Strips accents, unifies NFKD Unicode characters, converts to lowercase, trims whitespace | Raw search query string (e.g. `"Café del Mar"`, `"  Naatu   Naatu  "`) | Cleaned unicode string (`"cafe del mar"`, `"naatu naatu"`) | Returns empty string on null/whitespace-only input | `backend/app/ingestion/normalizer.py`, `frontend/src/architecture/layers/DiscoveryLayer.ts` |
| 2 | R1: Query Intelligence | Noise Token & Stop-Word Stripping | Removes video metadata noise (e.g., `[Official Video]`, `(Lyrics)`, `4K 60FPS`, `Full Song HD`, `Prod. by`) | Raw query / YouTube title | Core title & artist semantic tokens | Leaves original string intact if only noise words present | `backend/app/api/routes/songs.py`, Codebase audit |
| 3 | R1: Query Intelligence | Artist-Title Semantic Decomposition | Splits combined queries (e.g. `"The Weeknd - Blinding Lights"`, `"Armaan Malik Buttabomma"`) into primary artist and title tokens | Raw input query string | `{ artist: string, title: string, modifiers: string[] }` | Fallback to treating whole query as title if no separator/artist recognized | `frontend/src/architecture/layers/MusicIntentLayer.ts`, `backend/app/ingestion/deduplication.py` |
| 4 | R1: Query Intelligence | Intent-to-Acoustic Seed Mapping | Maps abstract emotion states (valence, energy, mood) into query search constraints and keywords | `MusicIntent` (valence, energy, mood, language) | `ProviderQueryConstraints` with target keywords | Uses default neutral genre/energy tags if intent is uncalibrated | `frontend/src/architecture/layers/MusicIntentLayer.ts`, `backend/app/services/auto_discovery_service.py` |
| 5 | R1: Query Intelligence | Tiered Query Expansion Ladder | Sequentially rewrites search terms when previous tier yields 0 valid results (Tier 0: exact, Tier 1: `+ official audio`, Tier 2: `+ Topic`, Tier 3: `+ lyric video`, Tier 4: `+ song`) | Query string, current broadening level (0..4) | Expanded YouTube search query | Caps at level 4; returns exhausted error state if all fail | `ORIGINAL_REQUEST.md`, `frontend/src/architecture/layers/DiscoveryLayer.ts` |
| 6 | R1: Candidate Discovery | Multi-Candidate Pool Fetching | Fetches a candidate pool of $K = 10 \text{ to } 25$ items per query instead of a single top result | Search query, limit $K$, `AbortSignal` | `MusicCandidate[]` containing raw YouTube items | Emits timeout or empty list if provider fails; triggers fallback | `backend/app/ingestion/youtube_provider.py`, `frontend/src/architecture/layers/ProviderAdapterLayer/YouTubeProviderAdapter.ts` |
| 7 | R1: Candidate Discovery | Multi-Source Provider Fallback | Cascades across local DB catalog $\to$ YouTube Metadata Provider $\to$ Jamendo/FreeSound Open Audio when primary fails | Search query, eligible providers list | Ranked candidate list from first healthy provider | Marks provider cooling down (30s) on error; increments failover counter | `frontend/src/architecture/layers/DiscoveryLayer.ts`, `backend/app/services/source_discovery.py` |
| 8 | R2: Scoring & Ranking | Multi-Criteria Weighted Scorer | Computes composite score balancing text similarity, channel authority, duration match, view popularity, and recency | Candidate metadata, expected query/intent metadata | Normalized score $S \in [0.0, 1.0]$ | Hard-blocks candidates failing hard constraints (score $- \infty$) | `frontend/src/architecture/layers/PersonalizationLayer/PersonalizationScorer.ts`, `backend/app/services/source_discovery.py` |
| 9 | R2: Scoring & Ranking | Token-Set & Levenshtein Title Match | Evaluates token intersection ratio and string edit distance between expected song and YouTube title | Expected title/artist, YouTube title | String similarity sub-score $S_{\text{sim}} \in [0.0, 1.0]$ | Yields $0.0$ on complete token divergence | `backend/app/api/routes/songs.py`, Fuzzy Matching Spec |
| 10 | R2: Scoring & Ranking | Channel Authority Recognition | Detects official channels (VEVO, `- Topic`, Official Artist Channel, Major Labels) to boost authentic studio tracks | YouTube channel name / uploader | Authority sub-score $S_{\text{auth}} \in [0.0, 1.0]$ | Defaults to unverified score ($0.30$) for unknown uploaders | `backend/app/ingestion/youtube_provider.py`, YouTube API standards |
| 11 | R2: Scoring & Ranking | Duration Proximity & Bounds Filter | Compares candidate duration against expected track length (hard window $\pm 60\text{s}$; Gaussian decay; rejects $<45\text{s}$ or $>900\text{s}$) | Candidate duration, expected duration | Duration sub-score $S_{\text{dur}} \in [0.0, 1.0]$ | Discards candidate if duration exceeds hard bounds | `backend/app/services/source_discovery.py`, `frontend/src/architecture/layers/PlaybackLayer/YouTubePlaybackAdapter.ts` |
| 12 | R2: Scoring & Ranking | Negative Semantic Penalty Filter | Penalizes clickbait, 1-hour loops, live recordings, cover versions, reactions, bass boosted, 8D audio | Candidate title / tags | Penalty deduction $P \in [0.0, 0.60]$ | Demotes or eliminates non-standard versions unless explicitly queried | `frontend/src/architecture/layers/PersonalizationLayer/PersonalizationScorer.ts` |
| 13 | R2: Scoring & Ranking | Dynamic Threshold Tuning | Adapts acceptance score cutoff based on query specificity and pool quality (Strict: 0.60, Normal: 0.35, Broad: 0.20) | Pool score distribution, intent specificity | Filtered & sorted `MusicCandidate[]` | Triggers query expansion if top candidate falls below threshold | `ORIGINAL_REQUEST.md`, `frontend/src/architecture/layers/PersonalizationLayer/PersonalizationScorer.ts` |
| 14 | R5: Optimization | L1 Query Cache (LRU + TTL) | In-memory LRU cache storing normalized query $\to$ ranked candidates list with 30-minute TTL | Normalized query key, TTL (30 min) | Cached `MusicCandidate[]` with instant $0\text{ms}$ return | Evicts least-recently-used entry when capacity (250) reached | `frontend/src/architecture/layers/DiscoveryLayer.ts`, `backend/app/services/auto_discovery_service.py` |
| 15 | R5: Optimization | L2 Video Metadata Cache | Persistent cache storing `video_id` $\to$ detailed metadata, duration, embeddability status with 24-hour TTL | `video_id`, metadata object | Cached verified video record | Automatically expires after 24 hours to re-check embed rights | `frontend/src/architecture/types/domain.ts`, `backend/app/db/models.py` |
| 16 | R5: Optimization | In-Flight SingleFlight Deduplicator | Prevents duplicate concurrent network requests by sharing a single in-flight Promise for identical query keys | Query key, async fetch generator | Promise resolving to `MusicCandidate[]` | Propagates rejection to all waiting subscribers if underlying fetch fails | `ORIGINAL_REQUEST.md` (Criteria 74), `frontend/src/architecture/layers/DiscoveryLayer.ts` |
| 17 | R5: Optimization | Generation Token Request Cancellation | Increments session/search generation token and aborts previous pending HTTP/adapter requests via `AbortController` | `generationId: number`, `AbortSignal` | Cancels obsolete tasks; ignores late responses | Aborted promise clean exit without error popup | `frontend/src/architecture/layers/DiscoveryLayer.ts` |
| 18 | R5: Optimization | Background Next-Candidate Preparation | Pre-verifies metadata and cues candidate[1] in the background while candidate[0] is actively playing | Next candidate in queue | Pre-warmed player state / verified candidate | Silent failover to candidate[2] if candidate[1] verification fails | `ORIGINAL_REQUEST.md` (Criteria 59), `frontend/src/architecture/layers/PlaybackLayer/YouTubePlaybackAdapter.ts` |
| 19 | R6: Observability | Stage-by-Stage Latency Collector | Measures microsecond-accurate durations for normalization, cache lookup, provider fetch, ranking, player cue | Start/end performance markers (`performance.now()`) | `LatencyBreakdown` object | Falls back to $0\text{ms}$ if marker missing | `frontend/src/architecture/layers/ObservabilityLayer.ts` |
| 20 | R6: Observability | Candidate Pool & Fallback Metrics | Records raw candidate count, filter count, top score, fallback transitions, and query expansion frequency | Discovery & Playback events | Aggregate counters & diagnostic telemetry | Safe in-memory counters; zero persistent disk bloat | `frontend/src/architecture/layers/ObservabilityLayer.ts`, `backend/app/api/routes/health.py` |
| 21 | R6: Observability | Playback Failure Breakdown Taxonomy | Categorizes player failures (`EMBED_DISABLED_150`, `VIDEO_NOT_FOUND_100`, `HTML5_ERROR_5`, `PROVIDER_TIMEOUT`) | IFrame / network error codes | Structured error logs with root-cause categorization | Triggers automated fallback without exposing raw error code to user UI | `frontend/src/architecture/layers/PlaybackLayer/YouTubePlaybackAdapter.ts` |
| 22 | R6: Observability | Circular Diagnostic Buffer & Privacy Boundary | Maintains rolling in-memory log buffer (200 events) for debugging; excludes all user PII and facial biometric data | Telemetry events | Structured telemetry payload for diagnostics endpoint | Discards oldest events past buffer capacity; guarantees 0 PII storage | `ARCHITECTURE.md` (Stage 07 & Privacy Inventory), `frontend/src/architecture/layers/ObservabilityLayer.ts` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | R1: Query Intelligence | Empty or whitespace-only search query (`"   "`) | Discovery layer skips network queries immediately, returns empty candidate list without invoking provider, avoids throwing 500 error. |
| 2 | R1: Query Intelligence | Query with special characters, emojis, or regex tokens (`"🎶 Blinding Lights (2020) [HD] +++ $#@!"`) | Sanitizer strips control symbols, emojis, and special regex operators while preserving alphanumeric title and artist tokens (`"blinding lights 2020 hd"`). |
| 3 | R1: Query Intelligence | Query with transliterated or alternative spelling (`"butta bomma"`, `"buttabomma"`, `"samaja varagamana"`) | Normalizer unifies space-separated and concatenated token variations; token intersection matcher recognizes character n-grams and phonetic variants. |
| 4 | R1: Query Intelligence | Non-English / Multilingual queries (Telugu, Hindi, Tamil, Spanish, Japanese) | Unicode NFKD normalizer preserves non-ASCII character scripts while stripping combining diacritical marks. |
| 5 | R1: Candidate Discovery | YouTube search returns 0 candidates for obscure query | Discovery engine initiates Query Expansion Tier 1 (`"{query} official audio"`). If still 0, cascades to Tier 2 and Tier 3 before entering graceful `NO_RESULTS` state. |
| 6 | R1: Candidate Discovery | YouTube provider hangs or experiences network blackout | 4000ms strict timeout aborts the request, marks the provider cooling down for 30s, increments `timeoutCount` and `failoverCount`, and falls back to secondary provider. |
| 7 | R2: Scoring & Ranking | YouTube returns an hour-long loop (`"Blinding Lights (1 Hour Loop)"` duration = 3600s) | Negative keyword penalty ($-0.50$) and duration mismatch penalty ($S_{\text{dur}} \le 0.10$) drop total score below threshold ($S < 0.35$), discarding the candidate. |
| 8 | R2: Scoring & Ranking | YouTube returns a cover/fan video with identical title but low channel authority | Token similarity is high ($0.9$), but channel authority is low ($0.30$) and negative token penalty for "cover" ($-0.30$) ranks it below the official artist channel upload ($0.95$). |
| 9 | R2: Scoring & Ranking | Expected duration is unknown/null (raw user keyword search) | Duration scorer activates default music duration heuristic (120s–360s gives full score $1.0$, $<45\text{s}$ or $>900\text{s}$ penalized). |
| 10 | R2: Scoring & Ranking | Multiple candidates have identical video IDs (duplicate search results across queries) | Deduplication module uses normalized `source_id` Set to ensure only the highest-scoring unique instance is preserved. |
| 11 | R5: Optimization | Rapid sequential searches (user rapidly types queries "b", "bl", "bli", "blind") | Previous in-flight fetch is immediately canceled via `AbortController.abort()`, `generationId` is incremented, and obsolete responses are rejected without updating UI state. |
| 12 | R5: Optimization | 10 concurrent requests arrive for the exact same query (SingleFlight deduplication) | Exactly 1 external fetch is dispatched. All 10 callers await the same in-flight Promise and receive the resulting candidates simultaneously. |
| 13 | R5: Optimization | L1 Query Cache hit occurs for a query prefetched in background | Instant cache return ($<1\text{ms}$), `cacheHits` and `prefetchHits` counters incremented, zero network latency experienced by user. |
| 14 | R5: Optimization | Candidate[0] fails playback mid-stream due to YouTube IFrame Error 150 (embed restricted) | Playback manager catches error 150, immediately transitions to candidate[1] (pre-warmed in background) within $<3\text{s}$, and logs recovery success. |
| 15 | R6: Observability | High-frequency telemetry events generated during rapid user scrubbing | Circular buffer caps at 200 events, auto-evicting oldest items; diagnostics endpoint returns aggregate stats without memory leak or UI lag. |
| 16 | R6: Observability | UI user views player interface | Standard end-user UI displays clean player states (Playing, Paused, Loading, Error); raw diagnostics, latency metrics, and failure codes are kept in diagnostic services only. |

---

## 1. Requirement 1 (R1): Query Intelligence & Candidate Discovery

### 1.1 Query Normalization Pipeline
The query intelligence subsystem transforms raw user input or emotion-derived intent into canonical, noise-free search representations through a deterministic multi-pass pipeline:

```
[Raw User Query / Intent]
         │
         ▼
[Pass 1: Unicode & NFKD Normalization]  ──► Strips combining diacritics, lowercases, decodes URL entities
         │
         ▼
[Pass 2: Punctuation & Regex Stripping] ──► Removes unsafe characters, brackets, quotes, punctuation
         │
         ▼
[Pass 3: Noise Word Filtering]          ──► Strips "official video", "4k", "full song", "lyrics", "hd"
         │
         ▼
[Pass 4: Artist-Title Entity Parsing]   ──► Extracts (Artist, Title, Version) via delimiters ('-', 'by', 'ft.')
         │
         ▼
[Pass 5: Phonetic & Token Signature]    ──► Generates token set and n-gram signature for fuzzy matching
```

#### Normalization Rule Specification
1. **Unicode & Diacritic Removal**:
   ```python
   import unicodedata, re

   def normalize_query(query: str) -> str:
       if not query or not query.strip():
           return ""
       # NFKD normalization decomposes combined characters (e.g. é -> e + ´)
       nfkd = unicodedata.normalize('NFKD', query)
       ascii_text = nfkd.encode('ASCII', 'ignore').decode('utf-8')
       # Lowercase and clean noise characters
       cleaned = re.sub(r'[^\w\s\-\(\)\[\]]', ' ', ascii_text).lower()
       # Collapse multi-spaces
       return re.sub(r'\s+', ' ', cleaned).strip()
   ```

2. **Noise Word & Metadata Tag Removal**:
   The following noise patterns are stripped from title candidates during similarity comparisons:
   - `r'\[official (music )?video\]'`
   - `r'\(official (audio|video|lyric video|hd)\)'`
   - `r'\[4k(\s*60fps)?\]'`
   - `r'\(lyrics?\)'`
   - `r'full (song|video|audio)'`
   - `r'prod\.?\s*by\s+[\w\s]+'`
   - `r'ft\.?|feat\.?|featuring'`

3. **Phonetic & Multi-Lingual Handling (Indic & International)**:
   - Transliterated variations are handled by stripping inter-token spaces for a secondary token-match pass (e.g. `"butta bomma"` $\to$ `"buttabomma"`, `"samaja varagamana"` $\to$ `"samajavaragamana"`).
   - Stop-words for music queries (`"song"`, `"mp3"`, `"music"`, `"track"`, `"audio"`) are isolated as modifiers rather than core title tokens.

### 1.2 Keyword Extraction & Semantic Intent Decomposition
When querying from an emotion state (e.g. `Valence = 0.88, Energy = 0.85, Mood = 'happy'`), the query generator creates intent constraints:
- **Primary Keywords**: Genre seed (`"Telugu Pop"`, `"Synthpop"`, `"Dance"`) + Mood descriptor (`"uplifting"`, `"energetic"`).
- **Acoustic Bounds**: Target Valence $[0.75, 1.0]$, Target Energy $[0.70, 1.0]$, Target BPM $[115, 135]$.
- **Language Filter**: Prioritizes user preference languages (e.g. `["Telugu", "English"]`).

### 1.3 Tiered Query Expansion Ladder
When initial search attempts return zero results or unplayable candidates, the autonomous recovery engine executes a deterministic 5-tier expansion ladder:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 0: Direct Query       ──► "{artist} {title}"                      │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Studio Audio       ──► "{artist} {title} official audio"       │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Topic / Label      ──► "{title} {artist} Topic"                │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Lyric Video        ──► "{artist} {title} official lyric video" │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Broad Song Match   ──► "{title} full song"                     │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Multi-Candidate YouTube Search Fetching Strategy
Instead of fetching a single video ID, the discovery engine retrieves a pool of $K = 10 \text{ to } 25$ candidate records per search.

#### Ingestion & Extraction Architecture
1. **Backend Extraction (`YouTubeMetadataProvider`)**:
   - Uses `yt-dlp` in flat-extraction mode (`extract_flat: 'in_playlist'`) with `--skip-download` and `--no-warnings`.
   - Extracts: `video_id`, `raw_title`, `channel_name`, `duration` (seconds), `view_count`, `upload_date`, `thumbnail_url`.
   - Execution time: $150\text{ms} - 350\text{ms}$ per query batch.
2. **Provider Failover Chain**:
   - Step 1: Local SQLite Cache / Known Songs table.
   - Step 2: YouTube Search (`YouTubeMetadataProvider` / YouTube Data API v3).
   - Step 3: Jamendo CC API / Fallback catalog.
3. **Cancellation & Timeout Management**:
   - Each provider call is wrapped in a 4000ms timeout promise.
   - If a new search starts, the previous `AbortController` triggers, discarding lingering network responses immediately.

---

## 2. Requirement 2 (R2): Weighted Scoring & Relevance Ranking

### 2.1 Composite Scoring Formula
Every candidate $c$ in the retrieved pool is evaluated using a normalized multi-criteria formula:

$$S_{\text{total}}(c, q, k) = \max\left(0.0, \; w_{\text{sim}} \cdot S_{\text{sim}}(c, q) + w_{\text{auth}} \cdot S_{\text{auth}}(c) + w_{\text{dur}} \cdot S_{\text{dur}}(c, k) + w_{\text{pop}} \cdot S_{\text{pop}}(c) + w_{\text{rec}} \cdot S_{\text{rec}}(c) - P_{\text{penalty}}(c)\right)$$

Where the baseline weights satisfy $\sum w_i = 1.0$:

| Weight Parameter | Symbol | Default Value | Description |
|---|---|---|---|
| Title / Artist Similarity | $w_{\text{sim}}$ | **0.35** | String & token alignment between query and YouTube metadata |
| Channel Authority | $w_{\text{auth}}$ | **0.25** | VEVO, Official Artist Channel (`- Topic`), Verified Labels |
| Duration Match | $w_{\text{dur}}$ | **0.20** | Proximity to expected song length or standard music window |
| Popularity / Views | $w_{\text{pop}}$ | **0.10** | Logarithmic view count scaling |
| Recency / Release Fit | $w_{\text{rec}}$ | **0.10** | Alignment with album release date or freshness |

### 2.2 Sub-Score Criteria Formulations

#### 1. Title & Artist String Similarity ($S_{\text{sim}}$)
Combines **Token Set Ratio** ($J_{\text{token}}$) and **Normalized Levenshtein Distance** ($L_{\text{norm}}$):

$$J_{\text{token}}(T_{\text{query}}, T_{\text{candidate}}) = \frac{|T_{\text{query}} \cap T_{\text{candidate}}|}{|T_{\text{query}}|}$$

$$L_{\text{norm}}(s_1, s_2) = 1.0 - \frac{\text{LevenshteinDistance}(s_1, s_2)}{\max(\text{len}(s_1), \text{len}(s_2))}$$

$$S_{\text{sim}}(c, q) = 0.60 \cdot J_{\text{token}} + 0.40 \cdot L_{\text{norm}}$$

- If the expected artist name appears in `channel_name` or `title`, a $+0.15$ match bonus is applied (capped at $1.0$).

#### 2. Channel Authority ($S_{\text{auth}}$)
Channel authority is determined by matching regex patterns against the uploader name:

| Channel Classification | Pattern Criteria | $S_{\text{auth}}$ Score |
|---|---|---|
| **VEVO Channel** | Ends with `VEVO` (case-insensitive) | **1.00** |
| **Official Artist Channel (OAC)** | Channel contains `- Topic` or verified music badge | **0.95** |
| **Major Record Label** | T-Series, Sony Music, Warner, Universal, Aditya Music, Lahari, Zee Music | **0.90** |
| **Verified Independent Creator** | Verified channel badge without label | **0.70** |
| **General User Upload** | Standard non-verified uploader | **0.30** |

#### 3. Duration Matching ($S_{\text{dur}}$)
Let $D_{\text{act}}$ be the candidate duration in seconds, and $D_{\text{exp}}$ be the expected song duration:

- **Case A: Known Expected Duration ($D_{\text{exp}} > 0$)**:
  $$\Delta D = |D_{\text{act}} - D_{\text{exp}}|$$
  $$S_{\text{dur}} = \begin{cases} 
  1.00 & \text{if } \Delta D \le 5\text{s} \\
  0.85 & \text{if } 5\text{s} < \Delta D \le 15\text{s} \\
  0.60 & \text{if } 15\text{s} < \Delta D \le 30\text{s} \\
  \max(0.0, \; 1.0 - \frac{\Delta D}{60}) & \text{if } 30\text{s} < \Delta D \le 60\text{s} \\
  0.00 & \text{if } \Delta D > 60\text{s} \text{ (Hard rejection)}
  \end{cases}$$

- **Case B: Unknown Expected Duration (General Search)**:
  $$S_{\text{dur}} = \begin{cases}
  1.00 & \text{if } 120\text{s} \le D_{\text{act}} \le 360\text{s} \text{ (Standard 2--6 min song)} \\
  0.75 & \text{if } 90\text{s} \le D_{\text{act}} < 120\text{s} \text{ or } 360\text{s} < D_{\text{act}} \le 480\text{s} \\
  0.30 & \text{if } 45\text{s} \le D_{\text{act}} < 90\text{s} \text{ or } 480\text{s} < D_{\text{act}} \le 600\text{s} \\
  0.00 & \text{if } D_{\text{act}} < 45\text{s} \text{ (Short clip / snippet)} \\
  0.00 & \text{if } D_{\text{act}} > 900\text{s} \text{ (Mix / compilation / loop)}
  \end{cases}$$

#### 4. Popularity / View Count ($S_{\text{pop}}$)
Logarithmic compression prevents ultra-viral videos from completely eclipsing authentic low-view studio releases:

$$S_{\text{pop}}(c) = \min\left(1.0, \; \frac{\log_{10}(\text{view\_count} + 1)}{7.0}\right)$$
*(e.g., $10\text{k views} \to 0.57$, $1\text{M views} \to 0.85$, $10\text{M views} \to 1.00$)*

#### 5. Recency / Release Alignment ($S_{\text{rec}}$)
- If candidate upload year matches canonical release year $\pm 1$ year $\implies S_{\text{rec}} = 1.0$.
- Otherwise, a decay of $0.05$ per year difference is applied ($\min 0.40$).

### 2.3 Negative Penalty Rules ($P_{\text{penalty}}$)
Specific patterns in the candidate title trigger deductions unless the user explicitly requested that version:

| Pattern Detected | Penalty Value ($P$) | Rationale |
|---|---|---|
| `reaction`, `review`, `podcast`, `interview` | **$-0.60$** | Non-music spoken content |
| `1 hour`, `10 hours`, `loop`, `extended mix` | **$-0.50$** | Artificial repetitious loop |
| `bass boosted`, `nightcore`, `slowed + reverb`, `8d audio` | **$-0.45$** | Non-standard pitch/tempo distortion |
| `karaoke`, `instrumental`, `backing track` | **$-0.40$** | Vocals missing when song expected |
| `live at`, `live in concert`, `tour 202` | **$-0.25$** | Live audio quality variance |
| `cover`, `tribute`, `remake` | **$-0.30$** | Non-original artist performance |

### 2.4 Configurable Threshold Tuning Profiles
The system supports dynamically swappable scoring profiles:

```typescript
export interface ScoringProfile {
  name: string;
  w_sim: number;
  w_auth: number;
  w_dur: number;
  w_pop: number;
  w_rec: number;
  minScoreThreshold: number;
  maxDurationDeltaSeconds: number;
}

export const SCORING_PROFILES: Record<string, ScoringProfile> = {
  STRICT_STUDIO: {
    name: 'Strict Studio Match',
    w_sim: 0.40,
    w_auth: 0.30,
    w_dur: 0.20,
    w_pop: 0.05,
    w_rec: 0.05,
    minScoreThreshold: 0.50,
    maxDurationDeltaSeconds: 30,
  },
  BALANCED_DEFAULT: {
    name: 'Balanced YouTube Match',
    w_sim: 0.35,
    w_auth: 0.25,
    w_dur: 0.20,
    w_pop: 0.10,
    w_rec: 0.10,
    minScoreThreshold: 0.35,
    maxDurationDeltaSeconds: 60,
  },
  DISCOVERY_EXPLORATION: {
    name: 'Discovery & Indie Exploration',
    w_sim: 0.25,
    w_auth: 0.15,
    w_dur: 0.20,
    w_pop: 0.20,
    w_rec: 0.20,
    minScoreThreshold: 0.25,
    maxDurationDeltaSeconds: 120,
  },
};
```

---

## 3. Requirement 5 (R5): Optimization (Caching, Deduplication, and Preparation)

### 3.1 Dual Caching Layer Architecture

```
                                  Client / API Query
                                         │
                                         ▼
                   ┌───────────────────────────────────────────┐
                   │       Level 1: Query Cache (L1)           │
                   │  - Key: hash(normalizedQuery + mood)      │
                   │  - Value: MusicCandidate[] (Ranked)       │
                   │  - TTL: 30 minutes                        │
                   │  - Eviction: LRU (Capacity: 250)          │
                   └─────────────────────┬─────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                     Hit │                               │ Miss
                         ▼                               ▼
                 [Instant Return]         ┌─────────────────────────────┐
                     (0-1 ms)             │  In-Flight Deduplication    │
                                          │   (SingleFlight Registry)   │
                                          └──────────────┬──────────────┘
                                                         │ Fetch
                                                         ▼
                   ┌───────────────────────────────────────────┐
                   │     Level 2: Video Metadata Cache (L2)    │
                   │  - Key: video_id (e.g. yt_A6BJ-PgNWXA)    │
                   │  - Value: Verified Video Metadata Record  │
                   │  - TTL: 24 Hours                          │
                   │  - Storage: In-Memory + IndexedDB / DB    │
                   └───────────────────────────────────────────┘
```

#### Cache Specifications & TTLs
1. **L1 Query Cache**:
   - **Key Formula**: `sha256(norm_query + ":" + mood + ":" + profile_hash)`
   - **Value**: Ranked `MusicCandidate[]` payload with full metadata.
   - **TTL**: 30 minutes ($1800\text{s}$).
   - **Eviction Policy**: Least-Recently-Used (LRU), max capacity 250 items.
   - **Hit Performance**: $< 1.0\text{ms}$ return.
2. **L2 Video Metadata Cache**:
   - **Key**: `video_id` (e.g. `"yt_4NRXx6U8ABQ"`).
   - **Value**: Duration, embeddability status (`playable` / `restricted`), channel info, audio features, artwork URLs.
   - **TTL**: 24 hours ($86400\text{s}$).
   - **Purpose**: Eliminates repeated metadata parsing and embed-permission checks for popular songs across different queries.

### 3.2 Request Deduplication (SingleFlight Pattern)
When multiple UI components or rapid user interactions trigger searches for the same query simultaneously, the **SingleFlight** pattern collapses concurrent lookups into a single execution:

```typescript
export class SingleFlightRegistry<T> {
  private activeCalls: Map<string, Promise<T>> = new Map();

  public async execute(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.activeCalls.get(key);
    if (existing) {
      // Return the in-flight promise to prevent redundant external API execution
      return existing;
    }

    const promise = fetcher()
      .finally(() => {
        this.activeCalls.delete(key);
      });

    this.activeCalls.set(key, promise);
    return promise;
  }

  public getInFlightCount(): number {
    return this.activeCalls.size;
  }
}
```

### 3.3 Generation Tokens & Stale Request Cancellation
To eliminate race conditions when users rapidly type or switch moods:
1. `generationId` is incremented on every discovery trigger.
2. The active `AbortController` issues `.abort()`.
3. If an async task finishes but its `generationToken !== currentGenerationId`, its result is discarded silently without updating UI state or corrupting the active playback queue.

### 3.4 Background Next-Candidate Preparation & Prefetching
When candidate[0] begins playing in the YouTube IFrame:
1. **Background Metadata Verification**: Candidate[1] metadata is verified against L2 cache.
2. **IFrame Pre-Warming**:
   - Playback adapter prepares next candidate state.
   - For audio streams / Jamendo fallbacks, an off-screen `Audio()` object pre-buffers the first 10 seconds (`preload="auto"`).
   - For YouTube IFrame, candidate[1] `videoId` is primed for instant transition via `player.loadVideoById(candidate[1].playbackRef)` upon track completion or error.
3. **Speculative Intent Prefetching**:
   - Secondary adjacent moods (e.g. if playing `happy`, prefetch `energetic` intent) are fetched in background with low CPU priority.

---

## 4. Requirement 6 (R6): Observability & Performance Monitoring

### 4.1 Metric Collectors & Stage Latencies
The observability subsystem records microsecond-level telemetry across every stage of the lifecycle:

```
[User Action]
     │
     ├──► t0: Start Marker
     │    ├──► t1: Normalization & Cache Lookup (t_cache = t1 - t0)
     │    ├──► t2: Provider Search Network Call (t_provider = t2 - t1)
     │    ├──► t3: Processing & Deduplication (t_proc = t3 - t2)
     │    ├──► t4: Multi-Criteria Scoring (t_score = t4 - t3)
     │    └──► t5: Discovery Ready (t_disc_total = t5 - t0)
     │
     └──► Playback Pipeline
          ├──► t6: Load Track & IFrame Cue (t_cue = t6 - t5)
          ├──► t7: First Audio Frame / PLAYING state (t_first_audio = t7 - t6)
          └──► t_e2e: Total Emotion-to-Audio (t7 - t0)
```

#### Diagnostic Metrics Data Schema
```typescript
export interface PerformanceDiagnostics {
  traceId: string;
  query: string;
  generationId: number;
  latencies: {
    tNormalizationMs: number;
    tCacheLookupMs: number;
    tProviderNetworkMs: number;
    tCandidateProcessingMs: number;
    tScoringAndRankingMs: number;
    tDiscoveryTotalMs: number;
    tPlayerInitMs: number;
    tCueToPlayingMs: number;
    tTotalEmotionToAudioMs: number;
  };
  counts: {
    rawCandidates: number;
    filteredCandidates: number;
    playableCandidates: number;
    cacheHits: number;
    prefetchHits: number;
    inFlightDedupHits: number;
  };
  scores: {
    topCandidateId: string;
    topCandidateTitle: string;
    topRelevanceScore: number;
    averagePoolScore: number;
  };
  fallbacks: {
    recoveryAttempts: number;
    recoverySuccess: boolean;
    tierExpansionsUsed: number;
    finalFallbackProvider?: string;
  };
  timestamp: number;
}
```

### 4.2 Failure Reason Breakdown & Recovery Taxonomy
All failures are categorized into a standard diagnostic code table:

| Failure Code | Category | Root Cause | Automated Recovery Strategy |
|---|---|---|---|
| `ERR_YT_EMBED_RESTRICTED_150` | Playback | Video owner prohibited 3rd-party IFrame embedding | Instantly transition to candidate[1] ($<3\text{s}$) |
| `ERR_YT_NOT_FOUND_100` | Playback | Video deleted, made private, or invalid ID | Instantly transition to candidate[1] |
| `ERR_YT_HTML5_DECODE_5` | Playback | HTML5 media player decoding error | Reload player instance and try next candidate |
| `ERR_PROVIDER_TIMEOUT` | Discovery | Provider search exceeded 4000ms | Failover to secondary provider; cool down primary 30s |
| `ERR_LOW_RELEVANCE_SCORE` | Discovery | No candidates passed minimum threshold ($0.35$) | Trigger Tier +1 query expansion ladder |
| `ERR_NO_RESULTS_EXHAUSTED` | Discovery | All candidate tiers and fallbacks returned 0 items | Enter graceful user error state (`NO_PLAYABLE_MUSIC`) |

### 4.3 Diagnostics Buffer & Privacy Boundaries
1. **Circular In-Memory Buffer**:
   - Stores up to 200 `PerformanceDiagnostics` objects in memory.
   - Older records are evicted FIFO ($O(1)$) to prevent memory growth.
2. **Privacy & Security Boundaries (100% Zero-Leakage Guarantee)**:
   - **Zero User PII**: No email addresses, user IDs, or IPs stored in diagnostics.
   - **Zero Facial Biometrics**: No camera frames, landmarks, or face tensors ever touch telemetry.
   - **Zero UI Exposure**: Raw latency markers, candidate counts, and internal stack traces are NEVER displayed to standard users; only user-friendly playback indicators (e.g. "Loading next song...") are presented.
   - **Diagnostic Access**: Available via internal logger service and secure admin endpoints (e.g., `GET /api/v2/health/playback` or `logger.getRecentErrors()`).

---

## 5. Architectural Integration Diagram

```mermaid
flowchart TD
    subgraph Client UI & Emotion Layer
        UserQuery[User Search Query / Emotion State]
        UIState[UI State: Playing / Buffering / Error]
    end

    subgraph Discovery & Intelligence Engine [R1, R5]
        Normalize[1. Normalizer & Decomposer]
        L1Cache{2. L1 Query Cache?}
        SingleFlight[3. SingleFlight In-Flight Dedup]
        TierExpansion[4. Tiered Query Expansion Ladder]
        ProviderFetch[5. YouTube & Audio Providers (yt-dlp / APIs)]
    end

    subgraph Scoring & Ranking Engine [R2]
        L2Cache[6. L2 Video Metadata Cache]
        Scorer[7. Multi-Criteria Weighted Scorer]
        Filter[8. Hard Constraint & Penalty Filter]
        RankedQueue[9. Ranked Candidates Queue]
    end

    subgraph Playback & Preparation [R5, R6]
        PrepNext[10. Background Next-Candidate Preparation]
        IFramePlayer[11. YouTube IFrame Playback Adapter]
        RecoveryEngine[12. Fallback Ladder & Error Recovery]
        Telemetry[13. Diagnostic Telemetry & Latency Breakdown]
    end

    UserQuery --> Normalize
    Normalize --> L1Cache
    L1Cache -- Cache Hit (0ms) --> RankedQueue
    L1Cache -- Cache Miss --> SingleFlight
    SingleFlight --> ProviderFetch
    ProviderFetch -- 0 Results --> TierExpansion
    TierExpansion --> ProviderFetch
    ProviderFetch --> L2Cache
    L2Cache --> Scorer
    Scorer --> Filter
    Filter --> RankedQueue
    RankedQueue --> L1Cache
    RankedQueue --> IFramePlayer
    RankedQueue --> PrepNext
    IFramePlayer --> UIState
    IFramePlayer -- Error 100/150 --> RecoveryEngine
    RecoveryEngine -- Next Candidate --> IFramePlayer
    IFramePlayer --> Telemetry
    Scorer --> Telemetry
```

---

## 6. Verification and Validation Strategy
To verify these specifications independently:
1. **R1 Verification**: Test normalization with accents, special symbols, and transliterated Indic titles (`"Butta Bomma"` vs `"buttabomma"`); verify expansion from Tier 0 to Tier 4 when mock returns empty.
2. **R2 Verification**: Score a test suite of candidates containing official audio ($S > 0.85$), cover versions ($S < 0.50$), 1-hour loops ($S < 0.20$), and reactions ($S < 0.20$); verify that the official track always ranks #1.
3. **R5 Verification**: Run 10 parallel search calls for identical query and assert external fetch count equals 1; verify second search completes in $<1\text{ms}$ from L1 cache.
4. **R6 Verification**: Verify `logger.getLatencyBreakdown()` and diagnostic telemetry capture all timing markers without recording any facial data or user PII.

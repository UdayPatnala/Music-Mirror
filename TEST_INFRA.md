# E2E Test Infra: Music Mirror Autonomous YouTube Discovery & Playback

## Test Philosophy
- Opaque-box, requirement-driven testing derived from ORIGINAL_REQUEST.md.
- Zero-flakiness & deterministic execution using mock YouTube IFrame player and discovery mocks for automated CI runs, with real integration capability.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinations + Real-World Workload Testing.

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| F1 | Multi-Pass Query Normalization | R1 | 5 | 5 | ✓ | ✓ |
| F2 | YouTube Candidate Pool Fetching | R1 | 5 | 5 | ✓ | ✓ |
| F3 | Multi-Factor Weighted Scoring | R2 | 5 | 5 | ✓ | ✓ |
| F4 | Channel Authority & Negative Filtering | R2 | 5 | 5 | ✓ | ✓ |
| F5 | In-App IFrame Playback Integration | R3 | 5 | 5 | ✓ | ✓ |
| F6 | Rich Player Controls & State Machine | R3 | 5 | 5 | ✓ | ✓ |
| F7 | Pre-Playback Candidate Validation | R4 | 5 | 5 | ✓ | ✓ |
| F8 | Automated Sequential Fallback Ladder | R4 | 5 | 5 | ✓ | ✓ |
| F9 | Query Strategy Expansion Retry | R4 | 5 | 5 | ✓ | ✓ |
| F10 | Graceful Terminal Error State | R4 | 5 | 5 | ✓ | ✓ |
| F11 | Dual-Tier Caching Layer | R5 | 5 | 5 | ✓ | ✓ |
| F12 | In-Flight SingleFlight Deduplication | R5 | 5 | 5 | ✓ | ✓ |
| F13 | Background Candidate Preparation | R5 | 5 | 5 | ✓ | ✓ |
| F14 | Observability & Diagnostic Metrics | R6 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Vitest (
pm test -- --run in rontend/) and Pytest (python -m pytest in ackend/).
- **Mock Player Fixture**: rontend/tests/e2e/fixtures/mockYouTubePlayer.ts simulating all standard YouTube IFrame API states (-1, 0, 1, 2, 3, 5) and error codes (2, 5, 100, 101, 150) with sub-millisecond precision.
- **Directory Layout**:
  - rontend/tests/e2e/tier1_feature_coverage.test.ts
  - rontend/tests/e2e/tier2_boundary_corner.test.ts
  - rontend/tests/e2e/tier3_cross_feature.test.ts
  - rontend/tests/e2e/tier4_real_world.test.ts
  - ackend/tests/test_youtube_discovery.py
  - ackend/tests/test_weighted_ranking.py
  - ackend/tests/test_cache_dedup.py

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Continuous Emotion Stream with Cascading Failover | F1, F2, F5, F8, F13, F14 | High |
| 2 | High-Concurrency Duplicate Search Burst Under Load | F1, F11, F12, F14 | High |
| 3 | Completely Blocked Candidate Pool with 5-Level Query Expansion Recovery | F1, F2, F8, F9, F10 | High |
| 4 | Rapid User Control Spamming (Play/Pause/Seek/Mute/Fullscreen) During Transition | F5, F6, F8 | Medium |
| 5 | Extended Multi-Track Listening Session with Background Pre-caching | F5, F11, F13, F14 | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: >= 5 test cases per feature (nominal functionality)
- **Tier 2 (Boundary & Corner)**: >= 5 test cases per feature (limits, zero/null values, timeout conditions)
- **Tier 3 (Cross-Feature Combinations)**: >= 14 pairwise interaction tests
- **Tier 4 (Real-World Application Scenarios)**: >= 5 end-to-end user workflows
- **Total minimum**: >= 150 comprehensive tests across backend and frontend suites.

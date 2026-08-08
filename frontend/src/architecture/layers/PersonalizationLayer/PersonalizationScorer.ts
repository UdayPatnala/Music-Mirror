/**
 * Personalization Scorer (STAGE 07 Implementation)
 * Evaluates hard constraints (blocked artists/genres, explicit content, unplayable tracks)
 * and computes soft ranking scores balancing MusicIntent fit, learned preferences, and repetition penalties.
 */

import type { MusicCandidate, MusicIntent, MusicPreferenceProfile, PersonalizationScoreResult } from '../../types/domain';
import { personalizationEngine } from './PersonalizationEngine';

export class PersonalizationScorer {
  private static instance: PersonalizationScorer | null = null;

  private constructor() {}

  public static getInstance(): PersonalizationScorer {
    if (!PersonalizationScorer.instance) {
      PersonalizationScorer.instance = new PersonalizationScorer();
    }
    return PersonalizationScorer.instance;
  }

  /**
   * Evaluate a single candidate against hard and soft constraints
   */
  public scoreCandidate(
    candidate: MusicCandidate,
    intent: MusicIntent,
    history: string[] = [],
    profile?: MusicPreferenceProfile
  ): PersonalizationScoreResult {
    const prefProfile = profile || personalizationEngine.getPreferences();

    // 1. HARD CONSTRAINTS EVALUATION
    if (candidate.playbackCapability === 'unavailable' || candidate.status === 'restricted') {
      return {
        candidateId: candidate.id,
        isHardBlocked: true,
        hardBlockReason: 'Candidate playback is unavailable or restricted',
        intentScore: 0,
        preferenceScore: 0,
        repetitionPenalty: 0,
        finalScore: -Infinity,
      };
    }

    const normArtist = (candidate.artist || candidate.artists[0] || '').toLowerCase().trim();
    if (prefProfile.blockedArtists.some((b) => b.toLowerCase().trim() === normArtist)) {
      return {
        candidateId: candidate.id,
        isHardBlocked: true,
        hardBlockReason: `Artist [${candidate.artist}] is explicitly blocked by user`,
        intentScore: 0,
        preferenceScore: 0,
        repetitionPenalty: 0,
        finalScore: -Infinity,
      };
    }

    const normGenre = candidate.genre.toLowerCase().trim();
    if (prefProfile.blockedGenres.some((b) => b.toLowerCase().trim() === normGenre)) {
      return {
        candidateId: candidate.id,
        isHardBlocked: true,
        hardBlockReason: `Genre [${candidate.genre}] is explicitly blocked by user`,
        intentScore: 0,
        preferenceScore: 0,
        repetitionPenalty: 0,
        finalScore: -Infinity,
      };
    }

    if ((candidate.explicitContent || candidate.isExplicit) && !prefProfile.explicitContentAllowed) {
      return {
        candidateId: candidate.id,
        isHardBlocked: true,
        hardBlockReason: 'Explicit content is disabled in user preferences',
        intentScore: 0,
        preferenceScore: 0,
        repetitionPenalty: 0,
        finalScore: -Infinity,
      };
    }

    // 2. SOFT CONSTRAINTS EVALUATION
    // Intent Fit (Valence & Energy distance)
    const vDiff = (candidate.musicAttributes.valence - intent.valenceTarget) ** 2;
    const eDiff = (candidate.musicAttributes.energy - intent.energyTarget) ** 2;
    const distance = Math.sqrt(vDiff + eDiff);
    const intentScore = Math.max(0.0, 1.0 - distance);

    // Learned Preference Score
    let preferenceScore = 0.50; // Baseline neutral score

    // Genre Weight
    for (const [gKey, gWeight] of Object.entries(prefProfile.preferredGenres)) {
      if (normGenre.includes(gKey.toLowerCase())) {
        preferenceScore += gWeight * 0.25;
      }
    }

    // Artist Weight
    for (const [aKey, aWeight] of Object.entries(prefProfile.preferredArtists)) {
      if (normArtist.includes(aKey.toLowerCase())) {
        preferenceScore += aWeight * 0.35;
      }
    }

    // Language Priority Boost
    if (prefProfile.preferredLanguages.some((l) => l.toLowerCase() === candidate.language.toLowerCase())) {
      preferenceScore += 0.15;
    }

    preferenceScore = Math.max(0.0, Math.min(1.0, preferenceScore));

    // Repetition Penalty
    let repetitionPenalty = 0.0;
    const historyIndex = history.indexOf(candidate.id);
    if (historyIndex !== -1) {
      // Recent track penalty: inverse of recency index
      const recency = history.length - historyIndex;
      repetitionPenalty = Math.min(0.50, (1.0 / recency) * 0.40);
    }

    // Composite Final Score: 50% Intent Fit + 35% Personalization + 15% Baseline - Repetition Penalty
    const rawFinalScore = 0.50 * intentScore + 0.35 * preferenceScore - repetitionPenalty;
    const finalScore = Math.round(Math.max(0.0, rawFinalScore) * 100) / 100;

    return {
      candidateId: candidate.id,
      isHardBlocked: false,
      intentScore: Math.round(intentScore * 100) / 100,
      preferenceScore: Math.round(preferenceScore * 100) / 100,
      repetitionPenalty: Math.round(repetitionPenalty * 100) / 100,
      finalScore,
    };
  }

  /**
   * Filter candidates by hard constraints and rank by final score descending
   */
  public scoreCandidates(
    candidates: MusicCandidate[],
    intent: MusicIntent,
    history: string[] = []
  ): MusicCandidate[] {
    const profile = personalizationEngine.getPreferences();

    const scored = candidates
      .map((c) => {
        const scoreRes = this.scoreCandidate(c, intent, history, profile);
        return {
          candidate: c,
          scoreRes,
        };
      })
      .filter((item) => !item.scoreRes.isHardBlocked);

    scored.sort((a, b) => b.scoreRes.finalScore - a.scoreRes.finalScore);

    return scored.map((item) => ({
      ...item.candidate,
      relevanceScore: item.scoreRes.finalScore,
      recommendationScore: item.scoreRes.finalScore,
      recommendationReason: `${Math.round(item.scoreRes.finalScore * 100)}% personalized fit · ${item.candidate.genre}`,
    }));
  }
}

export const personalizationScorer = PersonalizationScorer.getInstance();

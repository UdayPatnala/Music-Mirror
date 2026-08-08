import type { MusicIntent, MusicCandidate } from '../types/domain';
import type { MusicProviderAdapter } from './ProviderAdapterLayer/MusicProviderAdapter';
import { logger } from './ObservabilityLayer';

export class DiscoveryEngine {
  private static instance: DiscoveryEngine | null = null;
  private providers: Map<string, MusicProviderAdapter> = new Map();

  private constructor() {}

  public static getInstance(): DiscoveryEngine {
    if (!DiscoveryEngine.instance) {
      DiscoveryEngine.instance = new DiscoveryEngine();
    }
    return DiscoveryEngine.instance;
  }

  public registerProvider(adapter: MusicProviderAdapter): void {
    this.providers.set(adapter.getProviderId(), adapter);
    logger.info('DiscoveryLayer', `Registered Provider: ${adapter.getProviderName()} (${adapter.getProviderId()})`);
  }

  public getProvider(providerId: string): MusicProviderAdapter | undefined {
    return this.providers.get(providerId);
  }

  public async discoverCandidates(intent: MusicIntent, limit: number = 20): Promise<MusicCandidate[]> {
    logger.startPerfMarker('DiscoveryExecution');
    const allCandidates: MusicCandidate[] = [];

    for (const [id, provider] of this.providers.entries()) {
      try {
        if (await provider.isAvailable()) {
          const candidates = await provider.searchCandidates(intent, limit);
          allCandidates.push(...candidates);
        }
      } catch (err) {
        logger.warn('DiscoveryLayer', `Provider [${id}] search failed: ${String(err)}`);
      }
    }

    // Rank candidates using Euclidean acoustic distance + language priority boost
    const ranked = allCandidates.map((candidate) => {
      const valenceDiff = (candidate.audioFeatures.valence - intent.targetValence) ** 2;
      const energyDiff = (candidate.audioFeatures.energy - intent.targetEnergy) ** 2;
      const distance = Math.sqrt(valenceDiff + energyDiff);
      let similarityScore = Math.max(0.0, 1.0 - distance);

      // Language Priority Boost
      const langIdx = intent.priorityLanguages.findIndex((l) => l.toLowerCase() === candidate.language.toLowerCase());
      if (langIdx !== -1) {
        const boosts = [0.15, 0.10, 0.05, 0.02];
        similarityScore += boosts[langIdx] || 0.02;
      }

      // Genre Priority Boost
      if (intent.priorityGenres.some((g) => candidate.genre.toLowerCase().includes(g.toLowerCase()))) {
        similarityScore += 0.08;
      }

      const finalScore = Math.min(1.0, Math.round(similarityScore * 100) / 100);

      return {
        ...candidate,
        recommendationScore: finalScore,
        recommendationReason: `${Math.round(finalScore * 100)}% acoustic match · ${candidate.genre} (${candidate.language})`,
      };
    });

    // Sort descending by recommendation score
    ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);
    logger.endPerfMarker('DiscoveryExecution');

    return ranked.slice(0, limit);
  }
}

export const discoveryEngine = DiscoveryEngine.getInstance();

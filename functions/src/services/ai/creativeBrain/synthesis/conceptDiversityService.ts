/**
 * PHASE 13 — Concept Diversity Service
 * Evaluates candidate concepts for strategic diversity.
 * Removes near-duplicate concepts that differ only by wording rather than strategy.
 */

import type { CreativeConcept } from './synthesis.types';

export class ConceptDiversityService {
  /**
   * Filters candidate concepts to ensure all returned concepts are strategically distinct.
   * If two concepts are near-duplicates, keeps the higher-scoring candidate.
   */
  public static filterDiverseConcepts(concepts: CreativeConcept[]): CreativeConcept[] {
    if (concepts.length <= 1) return concepts;

    // Sort by score descending first
    const sorted = [...concepts].sort((a, b) => b.score.total - a.score.total);
    const result: CreativeConcept[] = [];

    for (const candidate of sorted) {
      const isDuplicate = result.some((existing) => this.calculateSimilarity(candidate, existing) > 0.75);
      if (!isDuplicate) {
        result.push(candidate);
      }
    }

    return result;
  }

  /**
   * Calculates similarity (0.0 to 1.0) between two concepts across mechanism, emotion, and insight.
   */
  public static calculateSimilarity(conceptA: CreativeConcept, conceptB: CreativeConcept): number {
    let score = 0;
    let tests = 0;

    // 1. Mechanism similarity
    tests++;
    if (
      conceptA.creativeMechanism.name.toLowerCase() === conceptB.creativeMechanism.name.toLowerCase() ||
      conceptA.creativeMechanism.id === conceptB.creativeMechanism.id
    ) {
      score += 1.0;
    } else if (this.wordOverlap(conceptA.creativeMechanism.explanation, conceptB.creativeMechanism.explanation) > 0.6) {
      score += 0.8;
    }

    // 2. Emotional response similarity
    tests++;
    if (conceptA.emotionalResponse.primary.toLowerCase() === conceptB.emotionalResponse.primary.toLowerCase()) {
      score += 1.0;
    }

    // 3. One-line idea similarity
    tests++;
    const ideaOverlap = this.wordOverlap(conceptA.oneLineIdea, conceptB.oneLineIdea);
    score += ideaOverlap;

    // 4. Hook similarity
    tests++;
    const hookOverlap = this.wordOverlap(conceptA.hook, conceptB.hook);
    score += hookOverlap;

    return score / tests;
  }

  private static wordOverlap(strA: string, strB: string): number {
    const wordsA = new Set(strA.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const wordsB = new Set(strB.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    wordsA.forEach((w) => {
      if (wordsB.has(w)) intersection++;
    });

    return intersection / Math.min(wordsA.size, wordsB.size);
  }
}

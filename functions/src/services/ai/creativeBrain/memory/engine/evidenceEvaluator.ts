import type { CreativeLearningCandidate, CreativeMemory } from "../../types/memory";
import type { ID, ISODateTime } from "../../types/primitives";

/**
 * Evaluates accumulated Creative Memory records to propose promotion candidates for Creative Bank.
 * 
 * CRITICAL INVARIANT: Memory DOES NOT automatically rewrite canonical bank objects.
 * It produces CreativeLearningCandidate proposals that undergo review/policy checks.
 */
export function evaluateLearningCandidates(memories: CreativeMemory[]): CreativeLearningCandidate[] {
  const candidates: CreativeLearningCandidate[] = [];
  const now: ISODateTime = new Date().toISOString();

  for (const memory of memories) {
    if (memory.status !== "ACTIVE") {
      continue;
    }

    // Must have HIGH confidence and high generalization to qualify as a candidate
    if (memory.confidence === "HIGH" && memory.generalization.overall >= 0.5) {
      const learningId: ID = `learn_cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const statement = `Proven performance learning candidate: ${memory.observation}`;

      candidates.push({
        learningId,
        statement,
        subjectType: memory.subjectType,
        subjectIds: memory.subjectIds,
        context: memory.context,
        evidence: memory.performanceEvidence,
        confidence: memory.confidence,
        relationship: memory.relationship,
        status: "CANDIDATE", // Always CANDIDATE - requires review before bank promotion
        createdAt: now,
      });
    }
  }

  return candidates;
}

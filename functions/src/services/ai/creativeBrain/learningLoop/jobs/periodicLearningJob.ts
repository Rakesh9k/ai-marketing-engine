import type {
  CreativeBankLearningUpdate,
  CreativeLearning,
  CreativeLineage,
  FailureLearning,
  LearningRun,
  MechanismCombinationLearning,
  NormalizedPerformanceEvidence,
} from "../../types/learningLoop";
import type { ID, ISODateTime } from "../../types/primitives";
import { CreativePerformanceAnalyzer } from "../analysis/creativePerformanceAnalyzer";
import { generateStrategicInterpretation } from "../interpretation/aiLearningInterpreter";
import { LearningValidationEngine } from "../validation/learningValidationEngine";
import { buildBankUpdate } from "../bank/creativeBankUpdateEngine";
import { ActiveLearningEngine } from "../activeLearning/activeLearningEngine";

export interface LearningFeatureFlags {
  CREATIVE_LEARNING_ENABLED: boolean;
  CREATIVE_LEARNING_GLOBAL_ENABLED: boolean;
  CREATIVE_EXPERIMENTS_ENABLED: boolean;
  CREATIVE_LEARNING_ADMIN_ENABLED: boolean;
}

export const DEFAULT_LEARNING_FEATURE_FLAGS: LearningFeatureFlags = {
  CREATIVE_LEARNING_ENABLED: true,
  CREATIVE_LEARNING_GLOBAL_ENABLED: true,
  CREATIVE_EXPERIMENTS_ENABLED: true,
  CREATIVE_LEARNING_ADMIN_ENABLED: true,
};

export interface JobExecutionOutput {
  run: LearningRun;
  validatedLearnings: CreativeLearning[];
  failures: FailureLearning[];
  combinations: MechanismCombinationLearning[];
  bankUpdates: CreativeBankLearningUpdate[];
}

/**
 * Periodic Learning Job Runner.
 * Executes the closed-loop learning pipeline:
 * Lineage + Evidence → Analyzer → Interpreter → Validation → Bank Updates → Active Learning.
 * 
 * CRITICAL INVARIANT: Failure Isolation.
 * Errors in the learning job are captured safely in the LearningRun log and NEVER break campaign generation.
 */
export class PeriodicLearningJob {
  private analyzer = new CreativePerformanceAnalyzer();
  private validationEngine = new LearningValidationEngine();
  private activeLearningEngine = new ActiveLearningEngine();

  runJob(
    lineageRecords: CreativeLineage[],
    evidenceRecords: NormalizedPerformanceEvidence[],
    flags: LearningFeatureFlags = DEFAULT_LEARNING_FEATURE_FLAGS
  ): JobExecutionOutput {
    const startTime: ISODateTime = new Date().toISOString();
    const runId: ID = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const errors: Array<{ campaignId?: ID; message: string; timestamp: ISODateTime }> = [];

    if (!flags.CREATIVE_LEARNING_ENABLED) {
      return {
        run: {
          runId,
          startedAt: startTime,
          completedAt: new Date().toISOString(),
          campaignsAnalyzed: 0,
          performanceRecordsAnalyzed: 0,
          candidatesGenerated: 0,
          learningsValidated: 0,
          learningsUpdated: 0,
          learningsDecayed: 0,
          errors: [{ message: "Learning job disabled via feature flag", timestamp: startTime }],
          status: "COMPLETED",
        },
        validatedLearnings: [],
        failures: [],
        combinations: [],
        bankUpdates: [],
      };
    }

    try {
      // 1. Analyze performance evidence against lineage attribution
      const analysis = this.analyzer.analyze({ lineageRecords, evidenceRecords });

      // 2. Apply AI interpretation & validation engine to candidates
      const validatedLearnings: CreativeLearning[] = [];
      const bankUpdates: CreativeBankLearningUpdate[] = [];

      for (const rawLearning of analysis.learnings) {
        // AI interpretation adds structured strategic text
        const interpretation = generateStrategicInterpretation(rawLearning);
        const interpolated: CreativeLearning = { ...rawLearning, ...interpretation };

        // Lifecycle validation
        const evaluated = this.validationEngine.evaluateLifecycle(interpolated);
        validatedLearnings.push(evaluated);

        // Formulate Creative Bank update contract if validated
        const update = buildBankUpdate(evaluated);
        if (update) {
          bankUpdates.push(update);
        }
      }

      const completedTime: ISODateTime = new Date().toISOString();

      return {
        run: {
          runId,
          startedAt: startTime,
          completedAt: completedTime,
          campaignsAnalyzed: lineageRecords.length,
          performanceRecordsAnalyzed: evidenceRecords.length,
          candidatesGenerated: analysis.learnings.length,
          learningsValidated: validatedLearnings.filter((l) => l.status === "VALIDATED").length,
          learningsUpdated: bankUpdates.length,
          learningsDecayed: validatedLearnings.filter((l) => l.status === "DECAYING").length,
          errors,
          status: "COMPLETED",
        },
        validatedLearnings,
        failures: analysis.failures,
        combinations: analysis.combinations,
        bankUpdates,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push({ message: errMsg, timestamp: new Date().toISOString() });

      return {
        run: {
          runId,
          startedAt: startTime,
          completedAt: new Date().toISOString(),
          campaignsAnalyzed: lineageRecords.length,
          performanceRecordsAnalyzed: evidenceRecords.length,
          candidatesGenerated: 0,
          learningsValidated: 0,
          learningsUpdated: 0,
          learningsDecayed: 0,
          errors,
          status: "FAILED",
        },
        validatedLearnings: [],
        failures: [],
        combinations: [],
        bankUpdates: [],
      };
    }
  }
}

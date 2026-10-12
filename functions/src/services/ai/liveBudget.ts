import {
  ASSUMED_LIVE_PRICES,
  PRICES_VERIFIED_ON,
  UsageMeter,
  installUsageMeter,
  liveRunModelProblems,
} from './usageMeter';
import { discoveryModel, imageModel, textModel, visionModel } from '../../config/geminiModels';

/** No live run may ask for more than this, whatever LIVE_BUDGET_INR says (the ₹300 batch cap is not yet approved). */
export const LIVE_BUDGET_CEILING_INR = 100;

/**
 * Installs the hard-capped meter for an opt-in live harness, or throws with every reason it cannot run.
 * The budget must be stated explicitly (LIVE_BUDGET_INR); there is no default, so a live run can never start
 * with an implicit allowance.
 */
export function installLiveBudgetOrThrow(
  env: NodeJS.ProcessEnv = process.env,
  models: Record<string, string> = {
    text: textModel(),
    vision: visionModel(),
    discovery: discoveryModel(),
    image: imageModel(),
  }
): UsageMeter {
  const problems: string[] = [];
  const raw = env['LIVE_BUDGET_INR'];
  const budget = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  if (!Number.isFinite(budget) || budget <= 0) {
    problems.push('LIVE_BUDGET_INR must be set to a positive number (there is no default)');
  } else if (budget > LIVE_BUDGET_CEILING_INR) {
    problems.push(
      `LIVE_BUDGET_INR=${budget} is above the approved ceiling of ₹${LIVE_BUDGET_CEILING_INR}`
    );
  }
  if (!env['GEMINI_API_KEY']) problems.push('GEMINI_API_KEY is not set');
  problems.push(...liveRunModelProblems(models));
  if (problems.length) {
    throw new Error(
      `Live AI run refused (prices verified ${PRICES_VERIFIED_ON}):\n - ${problems.join('\n - ')}`
    );
  }
  const meter = new UsageMeter({ ...ASSUMED_LIVE_PRICES, budgetInr: budget });
  installUsageMeter(meter);
  return meter;
}

import { CreativeGovernanceStatus } from "../../types/governance";

export class CreativeGovernanceStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<
    CreativeGovernanceStatus,
    CreativeGovernanceStatus[]
  > = {
    [CreativeGovernanceStatus.NOT_STARTED]: [
      CreativeGovernanceStatus.TRUTH_CHECKING,
    ],
    [CreativeGovernanceStatus.TRUTH_CHECKING]: [
      CreativeGovernanceStatus.SAFETY_CHECKING,
      CreativeGovernanceStatus.FAILED,
      CreativeGovernanceStatus.BLOCKED,
    ],
    [CreativeGovernanceStatus.SAFETY_CHECKING]: [
      CreativeGovernanceStatus.BRAND_CHECKING,
      CreativeGovernanceStatus.FAILED,
      CreativeGovernanceStatus.BLOCKED,
      CreativeGovernanceStatus.REVIEW_REQUIRED,
    ],
    [CreativeGovernanceStatus.BRAND_CHECKING]: [
      CreativeGovernanceStatus.PASSED,
      CreativeGovernanceStatus.FAILED,
      CreativeGovernanceStatus.BLOCKED,
      CreativeGovernanceStatus.REVIEW_REQUIRED,
    ],
    [CreativeGovernanceStatus.REVIEW_REQUIRED]: [
      CreativeGovernanceStatus.PASSED,
      CreativeGovernanceStatus.FAILED,
      CreativeGovernanceStatus.BLOCKED,
      CreativeGovernanceStatus.TRUTH_CHECKING,
    ],
    [CreativeGovernanceStatus.BLOCKED]: [
      CreativeGovernanceStatus.TRUTH_CHECKING,
    ],
    [CreativeGovernanceStatus.FAILED]: [
      CreativeGovernanceStatus.TRUTH_CHECKING,
    ],
    [CreativeGovernanceStatus.PASSED]: [
      CreativeGovernanceStatus.STALE,
      CreativeGovernanceStatus.TRUTH_CHECKING,
    ],
    [CreativeGovernanceStatus.STALE]: [
      CreativeGovernanceStatus.TRUTH_CHECKING,
    ],
  };

  public canTransition(
    current: CreativeGovernanceStatus,
    next: CreativeGovernanceStatus
  ): boolean {
    const allowed = CreativeGovernanceStateMachine.ALLOWED_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  public validateTransition(
    current: CreativeGovernanceStatus,
    next: CreativeGovernanceStatus
  ): void {
    if (!this.canTransition(current, next)) {
      throw new Error(
        `Invalid Governance State Machine transition: Cannot transition from '${current}' to '${next}'`
      );
    }
  }
}

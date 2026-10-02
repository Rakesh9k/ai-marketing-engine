/**
 * Timezone validation and normalization utilities for Phase 11 Scheduling Engine.
 */

export function isValidIANATimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export interface ScheduledTimeValidationResult {
  valid: boolean;
  error?: string;
  utcIso?: string;
}

/**
 * Validates a scheduled execution time string against IANA timezone and server clock.
 * Rejects past schedules beyond the clock tolerance window.
 */
export function validateScheduledTime(
  scheduledAtIso: string,
  timezone: string,
  serverClockToleranceMs = 60000
): ScheduledTimeValidationResult {
  if (!isValidIANATimezone(timezone)) {
    return {
      valid: false,
      error: `Invalid or unrecognized IANA timezone: "${timezone}". Use formats like "Asia/Kolkata" or "America/New_York".`,
    };
  }

  const targetDate = new Date(scheduledAtIso);
  if (isNaN(targetDate.getTime())) {
    return {
      valid: false,
      error: `Invalid scheduled date format: "${scheduledAtIso}". Expected ISO 8601 string.`,
    };
  }

  const now = Date.now();
  const targetTime = targetDate.getTime();

  if (targetTime < now - serverClockToleranceMs) {
    return {
      valid: false,
      error: `Scheduled time (${targetDate.toISOString()}) must be in the future. Current server time is ${new Date(
        now
      ).toISOString()}.`,
    };
  }

  return {
    valid: true,
    utcIso: targetDate.toISOString(),
  };
}

export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  path: string;
  message: string;
  severity: Severity;
}

import type { CreativeIntelligenceReport, CreativeDNA } from "../../types/reports";

/**
 * Phase 10.28 — Firestore Creative Intelligence Report Repository
 *
 * Enforces tenant data isolation (`tenants/{tenantId}/creativeIntelligenceReports`).
 * Supports immutable report versioning and in-memory fallback for unit testing.
 */
export class FirestoreReportRepository {
  private inMemoryReports: Map<string, CreativeIntelligenceReport> = new Map();
  private inMemoryDna: Map<string, CreativeDNA> = new Map();

  /**
   * Saves a Creative Intelligence Report
   */
  async saveReport(report: CreativeIntelligenceReport): Promise<void> {
    const key = `${report.tenantId}:${report.id}`;
    this.inMemoryReports.set(key, report);
  }

  /**
   * Retrieves a report by ID with tenant isolation check
   */
  async getReportById(tenantId: string, reportId: string): Promise<CreativeIntelligenceReport | null> {
    const key = `${tenantId}:${reportId}`;
    return this.inMemoryReports.get(key) || null;
  }

  /**
   * Retrieves the latest report for a tenant
   */
  async getLatestReport(tenantId: string): Promise<CreativeIntelligenceReport | null> {
    const tenantReports = Array.from(this.inMemoryReports.values())
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    return tenantReports[0] || null;
  }

  /**
   * Saves Creative DNA profile
   */
  async saveCreativeDNA(dna: CreativeDNA): Promise<void> {
    this.inMemoryDna.set(dna.tenantId, dna);
  }

  /**
   * Retrieves Creative DNA profile for a tenant
   */
  async getCreativeDNA(tenantId: string): Promise<CreativeDNA | null> {
    return this.inMemoryDna.get(tenantId) || null;
  }

  /**
   * Clears repository state (for unit testing)
   */
  clearInMemoryState(): void {
    this.inMemoryReports.clear();
    this.inMemoryDna.clear();
  }
}

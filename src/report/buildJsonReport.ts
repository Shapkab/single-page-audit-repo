import { auditResultSchema } from '../types/report.schema.js';
import type { AuditResult } from '../types/audit.types.js';

export function buildJsonReport(result: AuditResult): string {
  auditResultSchema.parse(result);
  return JSON.stringify(result, null, 2);
}

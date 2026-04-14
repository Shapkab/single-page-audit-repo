import type { AuditIssue, PageAuditData } from '../types/audit.types.js';
import { normalizeUrlForComparison } from './urlNormalization.js';

export function runTechnicalRules(data: PageAuditData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (data.httpStatus !== null && data.httpStatus >= 400) {
    issues.push({
      id: 'TECH_HTTP_ERROR_STATUS',
      category: 'technical',
      severity: 'high',
      title: 'Page returned an error HTTP status',
      evidence: `Final response status: ${data.httpStatus}.`,
      recommendedAction: 'Fix the response status before using the page operationally.',
    });
  }

  const consoleErrors = data.consoleEvents.filter((event) => event.type === 'error');
  if (consoleErrors.length > 0) {
    issues.push({
      id: 'TECH_CONSOLE_ERRORS',
      category: 'technical',
      severity: 'medium',
      title: 'Console errors detected',
      evidence: `${consoleErrors.length} console error(s) were captured during the audit window.`,
      recommendedAction: 'Review and resolve frontend runtime errors.',
    });
  }

  const normalizedInputUrl = normalizeUrlForComparison(data.url);
  const normalizedFinalUrl = normalizeUrlForComparison(data.finalUrl);
  const urlsDiffer = normalizedInputUrl !== null && normalizedFinalUrl !== null
    ? normalizedInputUrl !== normalizedFinalUrl
    : data.finalUrl !== data.url;

  if (urlsDiffer) {
    issues.push({
      id: 'TECH_FINAL_URL_DIFFERS',
      category: 'technical',
      severity: 'low',
      title: 'Final URL differs from input URL',
      evidence: `Input URL: ${data.url}; final URL: ${data.finalUrl}.`,
      recommendedAction: 'Confirm whether redirect behavior is expected.',
    });
  }

  return issues;
}

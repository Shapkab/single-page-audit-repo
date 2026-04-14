import type { AuditIssue, PageAuditData } from '../types/audit.types.js';
import { runSeoRules } from './seoRules.js';
import { runTechnicalRules } from './technicalRules.js';
import { runTrackingRules } from './trackingRules.js';

interface RuleOptions {
  flagCrossDomainCanonical?: boolean;
}

export function runRules(data: PageAuditData, options: RuleOptions = {}): AuditIssue[] {
  const issues: AuditIssue[] = [
    ...runSeoRules(data, { flagCrossDomainCanonical: options.flagCrossDomainCanonical }),
    ...runTechnicalRules(data),
    ...runTrackingRules(data),
  ];
  const confidentCtaCandidates = data.ctaCandidates.filter((candidate) => candidate.confidence !== 'low');

  if (confidentCtaCandidates.length === 0) {
    issues.push({
      id: 'UX_CTA_NOT_FOUND',
      category: 'ux',
      severity: 'medium',
      title: 'No obvious CTA candidate was detected',
      evidence: `Detected ${data.ctaCandidates.length} candidate(s), but none met medium/high CTA confidence thresholds.`,
      recommendedAction: 'Ensure at least one visible, descriptive, and actionable CTA is present in the primary content area.',
    });
  }

  return issues;
}

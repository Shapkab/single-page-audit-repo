import type { AuditIssue, PageAuditData } from '../types/audit.types.js';

export function runTrackingRules(data: PageAuditData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (data.trackingStatus === 'not_observed') {
    issues.push({
      id: 'TRACKING_NOT_OBSERVED',
      category: 'tracking',
      severity: 'medium',
      title: 'No common tracking requests were observed',
      evidence: 'No GA, GTM, Meta Pixel, or Segment-style requests were captured during the initial audit window.',
      recommendedAction: 'Verify whether tracking is intentionally absent or not firing during initial load.',
    });
  }
  if (data.trackingStatus === 'undetermined') {
    issues.push({
      id: 'TRACKING_OBSERVED_BUT_FAILED',
      category: 'tracking',
      severity: 'medium',
      title: 'Tracking requests were attempted but did not complete successfully',
      evidence: 'Tracking vendor requests were detected, but completion could not be confirmed due to failed or still-pending requests.',
      recommendedAction: 'Verify consent flow, CSP/ad blockers, network access, and tracker endpoint availability.',
    });
  }

  return issues;
}

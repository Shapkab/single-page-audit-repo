import type { AuditIssue, AuditResult } from '../types/audit.types.js';

function renderIssueList(issues: AuditIssue[]): string[] {
  return issues.map((issue, index) => [
    `### ${index + 1}. ${issue.title}`,
    `- Category: ${issue.category}`,
    `- Severity: ${issue.severity}`,
    `- Evidence: ${issue.evidence}`,
    `- Recommended action: ${issue.recommendedAction}`,
  ].join('\n'));
}

export function buildMarkdownReport(result: AuditResult): string {
  const high = result.issues.filter((issue) => issue.severity === 'high');
  const medium = result.issues.filter((issue) => issue.severity === 'medium');
  const low = result.issues.filter((issue) => issue.severity === 'low');
  const trackingSucceeded = result.data.trackingObservations.filter((observation) => observation.outcome === 'succeeded').length;
  const trackingFailed = result.data.trackingObservations.filter((observation) => observation.outcome === 'failed').length;

  return [
    '# Single Page Audit Report',
    '',
    `- Input URL: ${result.metadata.inputUrl}`,
    `- Final URL: ${result.metadata.finalUrl}`,
    `- Audited at: ${result.metadata.auditedAt}`,
    `- HTTP status: ${result.metadata.httpStatus ?? 'Unknown'}`,
    `- Summary: ${result.summary}`,
    `- Screenshot: ${result.data.screenshotPath ?? 'Not captured'}`,
    '',
    '## Critical findings',
    ...(high.length > 0 ? renderIssueList(high) : ['No high-severity issues detected in the current audit scope.']),
    '',
    '## Recommended review items',
    ...(medium.length > 0 ? renderIssueList(medium) : ['No medium-severity issues detected in the current audit scope.']),
    '',
    '## Minor observations',
    ...(low.length > 0 ? renderIssueList(low) : ['No low-severity issues detected in the current audit scope.']),
    '',
    '## Observed page basics',
    `- Title: ${result.data.meta.title ?? 'Missing'}`,
    `- Meta description: ${result.data.meta.description ?? 'Missing'}`,
    `- Canonical: ${result.data.meta.canonical ?? 'Missing'}`,
    `- Robots: ${result.data.meta.robots ?? 'Not present'}`,
    `- H1 count: ${result.data.headings.h1.length}`,
    `- H2 count: ${result.data.headings.h2.length}`,
    `- Console events captured: ${result.data.consoleEvents.length} (dropped: ${result.data.consoleEventsDropped})`,
    `- Tracking status: ${result.data.trackingStatus}`,
    `- Tracking observations: ${result.data.trackingObservations.length} (succeeded: ${trackingSucceeded}, failed: ${trackingFailed}, dropped: ${result.data.trackingObservationsDropped})`,
    '',
    '## CTA candidates captured',
    ...(result.data.ctaCandidates.length > 0
      ? result.data.ctaCandidates.map((candidate) => `- [${candidate.tagName}] ${candidate.text} (confidence: ${candidate.confidence}, score: ${candidate.score})`)
      : ['- None detected']),
    '',
    '## Scope note',
    'This is a technical single-page audit. It is not a full SEO strategy audit and does not prove tracking correctness beyond observed requests in the current audit window.',
    '',
  ].join('\n');
}

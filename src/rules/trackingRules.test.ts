import { describe, expect, it } from 'vitest';
import type { PageAuditData } from '../types/audit.types.js';
import { runTrackingRules } from './trackingRules.js';

function baseData(trackingStatus: PageAuditData['trackingStatus']): PageAuditData {
  return {
    url: 'https://example.com',
    finalUrl: 'https://example.com',
    httpStatus: 200,
    meta: {
      title: 'Example',
      description: 'Description',
      canonical: 'https://example.com',
      robots: null,
    },
    headings: {
      h1: ['Example'],
      h2: [],
    },
    ctaCandidates: [],
    consoleEvents: [],
    consoleEventsDropped: 0,
    trackingObservations: [],
    trackingObservationsDropped: 0,
    trackingStatus,
    screenshotPath: undefined,
  };
}

describe('runTrackingRules', () => {
  it('returns TRACKING_NOT_OBSERVED when no tracking is detected', () => {
    const issues = runTrackingRules(baseData('not_observed'));
    expect(issues.map((issue) => issue.id)).toContain('TRACKING_NOT_OBSERVED');
  });

  it('returns TRACKING_OBSERVED_BUT_FAILED when tracking status is undetermined', () => {
    const issues = runTrackingRules(baseData('undetermined'));
    expect(issues.map((issue) => issue.id)).toContain('TRACKING_OBSERVED_BUT_FAILED');
  });

  it('returns no tracking issues when tracking is observed', () => {
    const issues = runTrackingRules(baseData('observed'));
    expect(issues).toEqual([]);
  });
});

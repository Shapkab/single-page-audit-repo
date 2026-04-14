import { describe, expect, it } from 'vitest';
import type { PageAuditData } from '../types/audit.types.js';
import { runSeoRules } from './seoRules.js';

function baseData(canonical: string | null, finalUrl = 'https://example.com/landing'): PageAuditData {
  return {
    url: 'https://example.com/landing',
    finalUrl,
    httpStatus: 200,
    meta: {
      title: 'Comprehensive Landing Page Title',
      description: 'This is a valid meta description for SEO rule tests.',
      canonical,
      robots: null,
    },
    headings: {
      h1: ['Landing Page'],
      h2: ['Section'],
    },
    ctaCandidates: [],
    consoleEvents: [],
    consoleEventsDropped: 0,
    trackingObservations: [],
    trackingObservationsDropped: 0,
    trackingStatus: 'not_observed',
    screenshotPath: undefined,
  };
}

describe('runSeoRules canonical validation', () => {
  it('flags malformed canonical values', () => {
    const issues = runSeoRules(baseData('https://[::1'));
    expect(issues.map((issue) => issue.id)).toContain('SEO_CANONICAL_INVALID');
  });

  it('flags unsupported canonical protocol', () => {
    const issues = runSeoRules(baseData('ftp://example.com/landing'));
    expect(issues.map((issue) => issue.id)).toContain('SEO_CANONICAL_INVALID_PROTOCOL');
  });

  it('does not flag cross-domain canonical values by default', () => {
    const issues = runSeoRules(baseData('https://other-domain.com/landing'));
    expect(issues.map((issue) => issue.id)).not.toContain('SEO_CANONICAL_CROSS_DOMAIN');
  });

  it('flags cross-domain canonical values when explicitly enabled', () => {
    const issues = runSeoRules(
      baseData('https://other-domain.com/landing'),
      { flagCrossDomainCanonical: true },
    );
    expect(issues.map((issue) => issue.id)).toContain('SEO_CANONICAL_CROSS_DOMAIN');
  });

  it('flags same-domain canonical mismatch', () => {
    const issues = runSeoRules(baseData('https://example.com/other-page'));
    expect(issues.map((issue) => issue.id)).toContain('SEO_CANONICAL_DIFFERS_FROM_FINAL_URL');
  });

  it('does not flag canonical mismatch when only query parameter order differs', () => {
    const issues = runSeoRules(
      baseData('https://example.com/landing?b=2&a=1', 'https://example.com/landing?a=1&b=2'),
    );
    expect(issues.map((issue) => issue.id)).not.toContain('SEO_CANONICAL_DIFFERS_FROM_FINAL_URL');
  });

  it('accepts a relative canonical that resolves to the final URL', () => {
    const issues = runSeoRules(baseData('/landing'));
    const canonicalIssueIds = issues
      .map((issue) => issue.id)
      .filter((id) => id.startsWith('SEO_CANONICAL'));

    expect(canonicalIssueIds).toEqual([]);
  });
});

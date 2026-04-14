import { describe, expect, it } from 'vitest';
import type { CtaCandidate, PageAuditData } from '../types/audit.types.js';
import { runRules } from './runRules.js';

function baseData(ctaCandidates: CtaCandidate[]): PageAuditData {
  return {
    url: 'https://example.com',
    finalUrl: 'https://example.com',
    httpStatus: 200,
    meta: {
      title: 'Example Title',
      description: 'Example description for page audit.',
      canonical: 'https://example.com',
      robots: null,
    },
    headings: {
      h1: ['Example Heading'],
      h2: ['Sub heading'],
    },
    ctaCandidates,
    consoleEvents: [],
    consoleEventsDropped: 0,
    trackingObservations: [{ vendor: 'ga', url: 'https://www.google-analytics.com/g/collect', outcome: 'succeeded' }],
    trackingObservationsDropped: 0,
    trackingStatus: 'observed',
    screenshotPath: undefined,
  };
}

describe('runRules CTA confidence behavior', () => {
  it('adds UX_CTA_NOT_FOUND when only low-confidence candidates exist', () => {
    const issues = runRules(baseData([
      {
        tagName: 'a',
        text: 'Home',
        role: null,
        href: 'https://example.com/home',
        confidence: 'low',
        score: 0,
        signals: ['navigation-like-copy'],
      },
    ]));

    expect(issues.map((issue) => issue.id)).toContain('UX_CTA_NOT_FOUND');
  });

  it('does not add UX_CTA_NOT_FOUND when a medium/high confidence CTA exists', () => {
    const issues = runRules(baseData([
      {
        tagName: 'button',
        text: 'Start Free Trial',
        role: null,
        href: null,
        confidence: 'high',
        score: 6,
        signals: ['button-element', 'cta-action-copy'],
      },
    ]));

    expect(issues.map((issue) => issue.id)).not.toContain('UX_CTA_NOT_FOUND');
  });

  it('flags cross-domain canonical only when explicitly enabled', () => {
    const withCrossDomainCanonical = baseData([
      {
        tagName: 'button',
        text: 'Start Free Trial',
        role: null,
        href: null,
        confidence: 'high',
        score: 6,
        signals: ['button-element', 'cta-action-copy'],
      },
    ]);
    withCrossDomainCanonical.meta.canonical = 'https://external-domain.example/landing';

    const defaultIssues = runRules(withCrossDomainCanonical);
    expect(defaultIssues.map((issue) => issue.id)).not.toContain('SEO_CANONICAL_CROSS_DOMAIN');

    const strictIssues = runRules(withCrossDomainCanonical, { flagCrossDomainCanonical: true });
    expect(strictIssues.map((issue) => issue.id)).toContain('SEO_CANONICAL_CROSS_DOMAIN');
  });
});

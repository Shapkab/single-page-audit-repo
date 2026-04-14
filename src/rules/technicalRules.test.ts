import { describe, expect, it } from 'vitest';
import type { PageAuditData } from '../types/audit.types.js';
import { runTechnicalRules } from './technicalRules.js';

function baseData(inputUrl: string, finalUrl: string): PageAuditData {
  return {
    url: inputUrl,
    finalUrl,
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
    trackingStatus: 'not_observed',
    screenshotPath: undefined,
  };
}

describe('runTechnicalRules redirect-difference signal', () => {
  it('does not flag differences caused only by case/trailing slash/default port/query order/hash', () => {
    const issues = runTechnicalRules(
      baseData(
        'https://Example.com:443/path/?b=2&a=1#section',
        'https://example.com/path?a=1&b=2',
      ),
    );

    expect(issues.map((issue) => issue.id)).not.toContain('TECH_FINAL_URL_DIFFERS');
  });

  it('flags actual destination changes', () => {
    const issues = runTechnicalRules(
      baseData('https://example.com/landing', 'https://example.com/pricing'),
    );

    expect(issues.map((issue) => issue.id)).toContain('TECH_FINAL_URL_DIFFERS');
  });
});

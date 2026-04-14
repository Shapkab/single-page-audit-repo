import { describe, expect, it } from 'vitest';
import type { PageAuditData } from '../types/audit.types.js';
import { redactPageAuditDataForArtifact, redactUrlForArtifact } from './urlRedaction.js';

describe('redactUrlForArtifact', () => {
  it('removes credentials, query, and fragment from absolute URLs', () => {
    const redacted = redactUrlForArtifact('https://user:pass@example.com/path?token=secret#frag');
    expect(redacted).toBe('https://example.com/path');
  });

  it('removes query and fragment from relative URL-like strings', () => {
    const redacted = redactUrlForArtifact('/path/sub?token=secret#frag');
    expect(redacted).toBe('/path/sub');
  });
});

describe('redactPageAuditDataForArtifact', () => {
  it('redacts URL fields in persisted audit data', () => {
    const data: PageAuditData = {
      url: 'https://example.com/landing?utm=1',
      finalUrl: 'https://example.com/landing?session=abc#section',
      httpStatus: 200,
      meta: {
        title: 'Title',
        description: 'Description',
        canonical: 'https://example.com/canonical?page=2',
        robots: null,
      },
      headings: {
        h1: ['Heading'],
        h2: [],
      },
      ctaCandidates: [
        {
          tagName: 'a',
          text: 'Start',
          role: null,
          href: 'https://example.com/start?invite=abc',
          confidence: 'high',
          score: 5,
          signals: ['cta-action-copy'],
        },
      ],
      consoleEvents: [],
      consoleEventsDropped: 0,
      trackingObservations: [
        {
          vendor: 'ga',
          url: 'https://www.google-analytics.com/g/collect?cid=123',
          outcome: 'succeeded',
        },
      ],
      trackingObservationsDropped: 0,
      trackingStatus: 'observed',
      screenshotPath: 'reports/screenshot.png',
    };

    const redacted = redactPageAuditDataForArtifact(data);

    expect(redacted.url).toBe('https://example.com/landing');
    expect(redacted.finalUrl).toBe('https://example.com/landing');
    expect(redacted.meta.canonical).toBe('https://example.com/canonical');
    expect(redacted.ctaCandidates[0]?.href).toBe('https://example.com/start');
    expect(redacted.trackingObservations[0]?.url).toBe('https://www.google-analytics.com/g/collect');
  });
});

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => {
  const page = {
    on: vi.fn(),
    waitForLoadState: vi.fn(async () => undefined),
    waitForTimeout: vi.fn(async () => undefined),
    evaluate: vi.fn(async () => '{"stable":true}'),
  };

  const browser = {
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => undefined),
  };

  return {
    page,
    browser,
    launch: vi.fn(async () => browser),
    navigateToUrl: vi.fn(async () => ({ finalUrl: 'https://example.com/landing?session=abc#section', httpStatus: 200 })),
    collectMeta: vi.fn(async () => ({
      title: 'Landing Page',
      description: 'Landing description',
      canonical: 'https://example.com/landing?b=2&a=1',
      robots: 'index,follow',
    })),
    collectHeadings: vi.fn(async () => ({ h1: ['Landing'], h2: ['Section'] })),
    collectCtaCandidates: vi.fn(async () => ([
      {
        tagName: 'a',
        text: 'Start',
        role: null,
        href: 'https://example.com/start?invite=abc',
        confidence: 'high',
        score: 6,
        signals: ['cta-action-copy'],
      },
    ])),
    collectScreenshot: vi.fn(async () => undefined),
    createConsoleCollector: vi.fn(() => ({
      onConsole: vi.fn(),
      getEvents: vi.fn(() => []),
      getDroppedCount: vi.fn(() => 0),
    })),
    createNetworkCollector: vi.fn(() => ({
      onRequest: vi.fn(),
      onRequestFinished: vi.fn(),
      onRequestFailed: vi.fn(),
      getTrackingObservations: vi.fn(() => [
        {
          vendor: 'ga',
          url: 'https://www.google-analytics.com/g/collect?cid=123',
          outcome: 'succeeded',
        },
      ]),
      getDroppedCount: vi.fn(() => 0),
      getTrackingStatus: vi.fn(() => 'observed'),
    })),
  };
});

vi.mock('playwright', () => ({
  chromium: {
    launch: mocked.launch,
  },
}));

vi.mock('./navigation.js', () => ({
  navigateToUrl: mocked.navigateToUrl,
}));

vi.mock('./collectors/collectMeta.js', () => ({
  collectMeta: mocked.collectMeta,
}));

vi.mock('./collectors/collectHeadings.js', () => ({
  collectHeadings: mocked.collectHeadings,
}));

vi.mock('./collectors/collectCtaCandidates.js', () => ({
  collectCtaCandidates: mocked.collectCtaCandidates,
}));

vi.mock('./collectors/collectScreenshot.js', () => ({
  collectScreenshot: mocked.collectScreenshot,
}));

vi.mock('./collectors/collectConsoleEvents.js', () => ({
  createConsoleCollector: mocked.createConsoleCollector,
}));

vi.mock('./collectors/collectNetworkEvents.js', () => ({
  createNetworkCollector: mocked.createNetworkCollector,
}));

import { auditPage } from './auditPage.js';

async function readJsonReport(outputDir: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(path.join(outputDir, 'report.json'), 'utf-8');
  return JSON.parse(content) as Record<string, unknown>;
}

describe('auditPage integration workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.collectScreenshot.mockResolvedValue(undefined);
    mocked.collectMeta.mockResolvedValue({
      title: 'Landing Page',
      description: 'Landing description',
      canonical: 'https://example.com/landing?b=2&a=1',
      robots: 'index,follow',
    });
  });

  it('writes redacted artifacts by default and tolerates screenshot failure', async () => {
    mocked.collectScreenshot.mockRejectedValueOnce(new Error('screenshot failed'));
    const outputBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spa-audit-it-'));

    const result = await auditPage('https://example.com/landing?token=secret#frag', {
      outputBaseDir,
      requiredStablePolls: 1,
      stabilityPollIntervalMs: 1,
    });
    const report = await readJsonReport(result.outputDir);
    const reportData = report.data as Record<string, unknown>;
    const reportMetadata = report.metadata as Record<string, unknown>;
    const reportIssues = report.issues as Array<Record<string, unknown>>;

    expect(path.basename(result.outputDir)).not.toContain('token');
    expect(reportMetadata.inputUrl).toBe('https://example.com/landing');
    expect(reportMetadata.finalUrl).toBe('https://example.com/landing');
    expect(reportData.url).toBe('https://example.com/landing');
    expect(reportData.finalUrl).toBe('https://example.com/landing');
    expect((reportData.meta as Record<string, unknown>).canonical).toBe('https://example.com/landing');
    expect(((reportData.ctaCandidates as Array<Record<string, unknown>>)[0] as Record<string, unknown>).href).toBe('https://example.com/start');
    expect(((reportData.trackingObservations as Array<Record<string, unknown>>)[0] as Record<string, unknown>).url).toBe('https://www.google-analytics.com/g/collect');
    expect(reportIssues.map((issue) => issue.id)).toContain('TECH_SCREENSHOT_CAPTURE_FAILED');

    await fs.rm(outputBaseDir, { recursive: true, force: true });
  });

  it('keeps full URLs when includeFullUrlsInArtifacts is enabled', async () => {
    const outputBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spa-audit-it-'));

    const result = await auditPage('https://example.com/landing?token=secret#frag', {
      outputBaseDir,
      includeFullUrlsInArtifacts: true,
      requiredStablePolls: 1,
      stabilityPollIntervalMs: 1,
    });
    const report = await readJsonReport(result.outputDir);
    const reportMetadata = report.metadata as Record<string, unknown>;

    expect(path.basename(result.outputDir)).toContain('token');
    expect(reportMetadata.inputUrl).toBe('https://example.com/landing?token=secret#frag');
    expect(reportMetadata.finalUrl).toBe('https://example.com/landing?session=abc#section');

    await fs.rm(outputBaseDir, { recursive: true, force: true });
  });

  it('propagates flagCrossDomainCanonical into rule evaluation', async () => {
    mocked.collectMeta.mockResolvedValue({
      title: 'Landing Page',
      description: 'Landing description',
      canonical: 'https://external-domain.example/landing',
      robots: 'index,follow',
    });

    const outputBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spa-audit-it-'));
    const defaultResult = await auditPage('https://example.com/landing?token=secret', {
      outputBaseDir,
      requiredStablePolls: 1,
      stabilityPollIntervalMs: 1,
    });
    expect(defaultResult.issues.map((issue) => issue.id)).not.toContain('SEO_CANONICAL_CROSS_DOMAIN');

    const strictResult = await auditPage('https://example.com/landing?token=secret', {
      outputBaseDir,
      flagCrossDomainCanonical: true,
      requiredStablePolls: 1,
      stabilityPollIntervalMs: 1,
    });
    expect(strictResult.issues.map((issue) => issue.id)).toContain('SEO_CANONICAL_CROSS_DOMAIN');

    await fs.rm(outputBaseDir, { recursive: true, force: true });
  });
});

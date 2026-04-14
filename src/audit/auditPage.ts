import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { navigateToUrl } from './navigation.js';
import { collectMeta } from './collectors/collectMeta.js';
import { collectHeadings } from './collectors/collectHeadings.js';
import { createConsoleCollector } from './collectors/collectConsoleEvents.js';
import { createNetworkCollector } from './collectors/collectNetworkEvents.js';
import { collectCtaCandidates } from './collectors/collectCtaCandidates.js';
import { collectScreenshot } from './collectors/collectScreenshot.js';
import { redactPageAuditDataForArtifact, redactUrlForArtifact } from './urlRedaction.js';
import { runRules } from '../rules/runRules.js';
import { buildJsonReport } from '../report/buildJsonReport.js';
import { buildMarkdownReport } from '../report/buildMarkdownReport.js';
import type { AuditMetadata, AuditOptions, AuditResult, PageAuditData } from '../types/audit.types.js';

const TOOL_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.0.0';
const MAX_CONSOLE_EVENTS = 200;
const MAX_TRACKING_OBSERVATIONS = 200;
const DEFAULT_NETWORK_IDLE_TIMEOUT_MS = 5_000;
const DEFAULT_POST_LOAD_WAIT_MS = 1_000;
const DEFAULT_STABILITY_TIMEOUT_MS = 4_000;
const DEFAULT_STABILITY_POLL_INTERVAL_MS = 250;
const DEFAULT_REQUIRED_STABLE_POLLS = 3;
const STABILITY_SNAPSHOT_SCRIPT = `(() => {
  const title = document.title?.trim() ?? '';
  const description = document.querySelector('meta[name="description" i]')?.getAttribute('content')?.trim() ?? '';
  const canonical = document.querySelector('link[rel~="canonical" i]')?.getAttribute('href')?.trim() ?? '';
  const robots = document.querySelector('meta[name="robots" i]')?.getAttribute('content')?.trim() ?? '';
  const h1Count = document.querySelectorAll('h1').length;
  const h2Count = document.querySelectorAll('h2').length;
  const bodyTextLength = document.body?.innerText?.trim().length ?? 0;
  return JSON.stringify({ title, description, canonical, robots, h1Count, h2Count, bodyTextLength });
})()`;

function ensureValidHttpUrl(url: string): URL {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }
  return parsed;
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function toFolderSafeUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '-');
}

function buildSummary(issueCount: number): string {
  if (issueCount === 0) return 'No issues were detected within the current audit scope.';
  if (issueCount === 1) return '1 issue was detected within the current audit scope.';
  return `${issueCount} issues were detected within the current audit scope.`;
}

async function settleDynamicPageSignals(page: Page, options: AuditOptions): Promise<void> {
  const networkIdleTimeoutMs = options.networkIdleTimeoutMs ?? DEFAULT_NETWORK_IDLE_TIMEOUT_MS;
  const postLoadWaitMs = options.postLoadWaitMs ?? DEFAULT_POST_LOAD_WAIT_MS;
  const stabilityTimeoutMs = options.stabilityTimeoutMs ?? DEFAULT_STABILITY_TIMEOUT_MS;
  const stabilityPollIntervalMs = options.stabilityPollIntervalMs ?? DEFAULT_STABILITY_POLL_INTERVAL_MS;
  const requiredStablePolls = options.requiredStablePolls ?? DEFAULT_REQUIRED_STABLE_POLLS;

  try {
    await page.waitForLoadState('networkidle', { timeout: networkIdleTimeoutMs });
  } catch {
    // Ignore networkidle timeout since long-polling/websocket pages may never become idle.
  }

  if (postLoadWaitMs > 0) {
    await page.waitForTimeout(postLoadWaitMs);
  }

  const deadline = Date.now() + stabilityTimeoutMs;
  let previousSnapshot: string | null = null;
  let stablePolls = 0;

  while (Date.now() < deadline) {
    const snapshot = await page.evaluate(STABILITY_SNAPSHOT_SCRIPT) as string;

    if (snapshot === previousSnapshot) {
      stablePolls += 1;
      if (stablePolls >= requiredStablePolls) {
        return;
      }
    } else {
      previousSnapshot = snapshot;
      stablePolls = 0;
    }

    await page.waitForTimeout(stabilityPollIntervalMs);
  }
}

export async function auditPage(inputUrl: string, options: AuditOptions = {}): Promise<AuditResult> {
  const validatedUrl = ensureValidHttpUrl(inputUrl);
  const includeFullUrlsInArtifacts = options.includeFullUrlsInArtifacts === true;
  const outputBaseDir = options.outputBaseDir ?? 'reports';
  const folderUrl = includeFullUrlsInArtifacts ? validatedUrl.toString() : redactUrlForArtifact(validatedUrl.toString());
  const outputDir = path.join(outputBaseDir, `${getTimestamp()}_${toFolderSafeUrl(folderUrl)}`);
  const intendedScreenshotPath = options.takeScreenshot === false ? undefined : path.join(outputDir, 'screenshot.png');

  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const consoleCollector = createConsoleCollector(MAX_CONSOLE_EVENTS);
    const networkCollector = createNetworkCollector(MAX_TRACKING_OBSERVATIONS);

    page.on('console', (message) => {
      consoleCollector.onConsole(message.type(), message.text());
    });

    page.on('request', (request) => {
      networkCollector.onRequest(request);
    });

    page.on('requestfinished', (request) => {
      networkCollector.onRequestFinished(request);
    });

    page.on('requestfailed', (request) => {
      networkCollector.onRequestFailed(request);
    });

    const navigation = await navigateToUrl(page, validatedUrl.toString(), options);
    await settleDynamicPageSignals(page, options);
    const meta = await collectMeta(page);
    const headings = await collectHeadings(page);
    const ctaCandidates = await collectCtaCandidates(page);
    let screenshotPath = intendedScreenshotPath;
    let screenshotCaptureError: string | undefined;

    if (intendedScreenshotPath) {
      try {
        await collectScreenshot(page, intendedScreenshotPath);
      } catch (error: unknown) {
        screenshotPath = undefined;
        screenshotCaptureError = error instanceof Error ? error.message : String(error);
      }
    }

    const rawData: PageAuditData = {
      url: validatedUrl.toString(),
      finalUrl: navigation.finalUrl,
      httpStatus: navigation.httpStatus,
      meta,
      headings,
      ctaCandidates,
      consoleEvents: consoleCollector.getEvents(),
      consoleEventsDropped: consoleCollector.getDroppedCount(),
      trackingObservations: networkCollector.getTrackingObservations(),
      trackingObservationsDropped: networkCollector.getDroppedCount(),
      trackingStatus: networkCollector.getTrackingStatus(),
      screenshotPath,
    };
    const data = includeFullUrlsInArtifacts ? rawData : redactPageAuditDataForArtifact(rawData);

    const issues = runRules(rawData, { flagCrossDomainCanonical: options.flagCrossDomainCanonical });
    if (screenshotCaptureError) {
      issues.push({
        id: 'TECH_SCREENSHOT_CAPTURE_FAILED',
        category: 'technical',
        severity: 'medium',
        title: 'Screenshot capture failed',
        evidence: screenshotCaptureError,
        recommendedAction: 'Retry screenshot capture or review page stability and rendering constraints.',
      });
    }
    if (data.consoleEventsDropped > 0) {
      issues.push({
        id: 'TECH_CONSOLE_EVIDENCE_TRUNCATED',
        category: 'technical',
        severity: 'low',
        title: 'Console evidence was truncated',
        evidence: `${data.consoleEventsDropped} console event(s) exceeded the capture cap of ${MAX_CONSOLE_EVENTS}.`,
        recommendedAction: 'Increase the capture cap only if deeper debugging evidence is required.',
      });
    }
    if (data.trackingObservationsDropped > 0) {
      issues.push({
        id: 'TRACKING_EVIDENCE_TRUNCATED',
        category: 'tracking',
        severity: 'low',
        title: 'Tracking evidence was truncated',
        evidence: `${data.trackingObservationsDropped} tracking observation(s) exceeded the capture cap of ${MAX_TRACKING_OBSERVATIONS}.`,
        recommendedAction: 'Increase the capture cap only for debugging-heavy investigations.',
      });
    }

    const metadata: AuditMetadata = {
      schemaVersion: SCHEMA_VERSION,
      toolVersion: TOOL_VERSION,
      auditedAt: new Date().toISOString(),
      inputUrl: includeFullUrlsInArtifacts ? validatedUrl.toString() : redactUrlForArtifact(validatedUrl.toString()),
      finalUrl: includeFullUrlsInArtifacts ? navigation.finalUrl : redactUrlForArtifact(navigation.finalUrl),
      httpStatus: navigation.httpStatus,
    };

    const result: AuditResult = {
      metadata,
      summary: buildSummary(issues.length),
      issues,
      data,
      outputDir,
    };

    await fs.writeFile(path.join(outputDir, 'report.json'), buildJsonReport(result), 'utf-8');
    await fs.writeFile(path.join(outputDir, 'report.md'), buildMarkdownReport(result), 'utf-8');

    return result;
  } finally {
    await browser.close();
  }
}

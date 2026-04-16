# Single-Page Website Audit Tool

TypeScript + Playwright tool that audits a public landing page and generates structured JSON, client-readable Markdown, and visual evidence.

It covers SEO basics, technical issues, tracking observations, and CTA detection with deterministic rules.

## Who This Is For

- Founders and agencies who need a fast technical audit deliverable before redesign or SEO retainers.
- QA/SEO consultants who need reproducible evidence (JSON + Markdown + screenshot) for client reports.
- Engineering teams that want a CI-friendly single-page audit baseline before deeper multi-page crawling.

## Features

- Single-page audit from URL input.
- Local artifact storage (`report.json`, `report.md`, `screenshot.png`).
- CLI and importable API usage.
- Deterministic rule-based findings.
- Bounded evidence collection for console and tracking streams.

## Sample Audit Runs

### Run 1: Speedtest baseline
- URL: `https://www.speedtest.net/`
- Evidence:
  - [screenshot](docs/samples/run-01-speedtest-baseline/screenshot.png)
  - [clipped excerpt](docs/samples/run-01-speedtest-baseline/excerpt.md)
  - [summary JSON](docs/samples/run-01-speedtest-baseline/summary.json)

Excerpt:
```json
{
  "summary": "2 issues were detected within the current audit scope.",
  "issues": [
    { "id": "SEO_H1_MISSING", "severity": "high" },
    { "id": "TECH_CONSOLE_ERRORS", "severity": "medium" }
  ],
  "trackingStatus": "observed"
}
```

### Run 2: Example.com baseline
- URL: `https://example.com/`
- Evidence:
  - [screenshot](docs/samples/run-02-example-com/screenshot.png)
  - [clipped excerpt](docs/samples/run-02-example-com/excerpt.md)
  - [summary JSON](docs/samples/run-02-example-com/summary.json)

Excerpt:
```json
{
  "summary": "4 issues were detected within the current audit scope.",
  "issues": [
    { "id": "SEO_META_DESCRIPTION_MISSING", "severity": "high" },
    { "id": "SEO_CANONICAL_MISSING", "severity": "medium" },
    { "id": "TRACKING_NOT_OBSERVED", "severity": "medium" }
  ],
  "trackingStatus": "not_observed"
}
```

## Limitations

- This is a single-page technical audit, not a full-site crawler.
- Tracking results indicate observed network behavior during the audit window, not full analytics correctness.
- JS-heavy pages can vary by geo, consent, or bot defenses, so repeat runs may differ.
- Findings are deterministic rule outputs and should be combined with manual review for strategy decisions.
- The current output is local-file based; there is no built-in report database/API service layer yet.

## Distribution Model

- This repository is intentionally `private: true` and is not published as an npm package.
- Use it as a repository-level tool via CLI/API inside your engineering workflow.

## Install

```bash
pnpm install
npx playwright install chromium
```

If `pnpm` is not available:

```bash
npm install
npx playwright install chromium
```

## Quality Gates

```bash
npm run check
```

This enforces:
- TypeScript typecheck
- ESLint (`--max-warnings=0`)
- Vitest unit and integration tests

## Run from CLI

```bash
pnpm audit https://example.com
```

Optional flags:

```bash
pnpm audit https://example.com --output-dir ./reports --no-screenshot --wait-until networkidle --network-idle-timeout-ms 5000 --post-load-wait-ms 1000 --stability-timeout-ms 4000 --stability-poll-interval-ms 250 --required-stable-polls 3 --include-full-urls
```

SPA/async fidelity behavior:
- After navigation, the auditor waits for `networkidle` (bounded timeout), then a short post-load delay, then a DOM signal-stability loop.
- Stability is based on repeated snapshots of title/meta canonical/robots + heading counts + body text length.
- Tune with `--network-idle-timeout-ms`, `--post-load-wait-ms`, `--stability-timeout-ms`, `--stability-poll-interval-ms`, and `--required-stable-polls`.

Canonical behavior:
- Cross-domain canonical targets are allowed by default.
- Add `--flag-cross-domain-canonical` to explicitly report them as findings.

URL artifact privacy:
- URL query strings and fragments are redacted in report artifacts and output directory naming by default.
- Add `--include-full-urls` only when full URL persistence is explicitly required.

## Use from Code

```ts
import { auditPage } from './src/index.js';

const result = await auditPage('https://example.com', {
  outputBaseDir: 'reports',
  takeScreenshot: true
});

console.log(result.summary);
```

## Output Structure

```text
reports/
  2026-04-13T10-42-11-123Z_example.com/
    report.json
    report.md
    screenshot.png
```

## Scope Notes

Current rule areas:
- SEO basics
- Technical quality
- Tracking observations
- UX/CTA presence (confidence-scored candidates)

## Next Sensible Extensions

- HTTP response and redirect chain capture
- More precise CTA detection
- Audience-specific Markdown templates
- Optional AI summary layer over the deterministic report

# Single Page Audit Tool

TypeScript + Playwright repository for auditing one public web page and producing:
- `report.json` for developers
- `report.md` for client-facing summary
- `screenshot.png` as evidence

## Features
- Single-page audit
- Local artifact storage
- CLI and importable API usage
- Deterministic rule-based findings
- Bounded evidence collection (console and tracking streams are capped)

## Install
```bash
pnpm install
npx playwright install chromium
```

## Quality gates
```bash
npm run check
```

This command enforces:
- TypeScript typecheck
- ESLint (zero warnings allowed)
- Vitest unit + integration test suite

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

## Use from code
```ts
import { auditPage } from './src/index.js';

const result = await auditPage('https://example.com', {
  outputBaseDir: 'reports',
  takeScreenshot: true,
});

console.log(result.summary);
```

## Output structure
```text
reports/
  2026-04-13T10-42-11-123Z_example.com/
    report.json
    report.md
    screenshot.png
```

## Scope notes
This tool performs a **technical page audit**, not a full SEO strategy audit.

Current rule areas:
- SEO basics
- Technical quality
- Tracking observations
- UX/CTA presence (confidence-scored candidates)

## Next sensible extensions
- HTTP response and redirect chain capture
- More precise CTA detection
- Audience-specific Markdown templates
- Optional AI summary layer over the deterministic report

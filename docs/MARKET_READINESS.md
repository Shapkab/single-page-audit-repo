# Market Readiness Checklist

This checklist covers the GitHub-facing items needed before using this repository in Upwork proposals.

## 1) Add Repository Description and Topics

Suggested description:

`TypeScript + Playwright single-page audit tool that outputs JSON, client-readable Markdown, and screenshot evidence for SEO/technical/tracking audits.`

Suggested topics:
- `typescript`
- `playwright`
- `technical-seo`
- `website-audit`
- `qa-automation`
- `reporting`
- `cli-tool`

How to apply:
1. Open the GitHub repo page.
2. Click the gear icon in the `About` section.
3. Set description and topics.
4. Save.

## 2) Rename Repository to a Client-Readable Name

Name options:
- `single-page-website-audit-tool`
- `landing-page-audit-tool`
- `playwright-seo-audit-tool`

How to apply:
1. GitHub `Settings`.
2. Change `Repository name`.
3. Save.

Then update local remote URL:

```bash
git remote set-url origin <new-repo-url>
git remote -v
```

## 3) Showcase Sample Runs

Included in this repo under `docs/samples`:
- `run-01-speedtest-baseline`
- `run-02-speedtest-repeatability`
- `run-03-example-com`

Each contains:
- screenshot evidence (`screenshot.png`)
- clipped excerpt (`excerpt.md`)
- concise summary (`summary.json`)

## 4) Publish a Stable Release Tag

Current package version is `1.0.0`.

Commands:

```bash
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Initial stable release"
git push origin v1.0.0
```

Then in GitHub:
1. Open `Releases`.
2. Click `Draft a new release`.
3. Select tag `v1.0.0`.
4. Add title and release notes.
5. Publish.

## 5) Suggested Release Notes Template

- Added deterministic single-page audit pipeline (SEO, technical, tracking, CTA).
- Added JSON + Markdown outputs and screenshot evidence artifacts.
- Added quality gates (`typecheck`, `lint`, `tests`) via `npm run check`.
- Added sample audit runs and explicit limitations in README.


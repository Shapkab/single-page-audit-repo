import { auditPage } from './audit/auditPage.js';
import type { AuditOptions, WaitUntilOption } from './types/audit.types.js';

function readFlag(name: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseWaitUntil(value: string | undefined): WaitUntilOption | undefined {
  if (!value) return undefined;
  if (value === 'domcontentloaded' || value === 'load' || value === 'networkidle' || value === 'commit') {
    return value;
  }
  throw new Error(`Unsupported --wait-until value: ${value}`);
}

function parsePositiveIntegerFlag(value: string | undefined, flagName: string, expectedDescription = 'a positive integer'): number | undefined {
  if (value === undefined) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flagName} value: ${value}. Expected ${expectedDescription}.`);
  }

  return parsed;
}

async function main() {
  const url = process.argv[2];

  if (!url || url.startsWith('--')) {
    console.error('Usage: pnpm audit <url> [--output-dir <dir>] [--no-screenshot] [--wait-until <mode>] [--timeout-ms <number>] [--network-idle-timeout-ms <number>] [--post-load-wait-ms <number>] [--stability-timeout-ms <number>] [--stability-poll-interval-ms <number>] [--required-stable-polls <number>] [--flag-cross-domain-canonical] [--include-full-urls]');
    process.exit(1);
  }

  const options: AuditOptions = {
    outputBaseDir: readFlag('--output-dir'),
    takeScreenshot: !hasFlag('--no-screenshot'),
    waitUntil: parseWaitUntil(readFlag('--wait-until')),
    timeoutMs: parsePositiveIntegerFlag(readFlag('--timeout-ms'), '--timeout-ms', 'a positive integer in milliseconds'),
    networkIdleTimeoutMs: parsePositiveIntegerFlag(readFlag('--network-idle-timeout-ms'), '--network-idle-timeout-ms', 'a positive integer in milliseconds'),
    postLoadWaitMs: parsePositiveIntegerFlag(readFlag('--post-load-wait-ms'), '--post-load-wait-ms', 'a positive integer in milliseconds'),
    stabilityTimeoutMs: parsePositiveIntegerFlag(readFlag('--stability-timeout-ms'), '--stability-timeout-ms', 'a positive integer in milliseconds'),
    stabilityPollIntervalMs: parsePositiveIntegerFlag(readFlag('--stability-poll-interval-ms'), '--stability-poll-interval-ms', 'a positive integer in milliseconds'),
    requiredStablePolls: parsePositiveIntegerFlag(readFlag('--required-stable-polls'), '--required-stable-polls'),
    flagCrossDomainCanonical: hasFlag('--flag-cross-domain-canonical'),
    includeFullUrlsInArtifacts: hasFlag('--include-full-urls'),
  };

  const result = await auditPage(url, options);

  console.log('Audit completed.');
  console.log(`Output directory: ${result.outputDir}`);
  console.log(`Summary: ${result.summary}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Audit failed: ${message}`);
  process.exit(1);
});

import type { Page } from 'playwright';
import type { AuditOptions, NavigationResult } from '../types/audit.types.js';

export async function navigateToUrl(page: Page, url: string, options: AuditOptions): Promise<NavigationResult> {
  const response = await page.goto(url, {
    waitUntil: options.waitUntil ?? 'domcontentloaded',
    timeout: options.timeoutMs ?? 20_000,
  });

  return {
    finalUrl: page.url(),
    httpStatus: response?.status() ?? null,
  };
}

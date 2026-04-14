import type { Page, Locator } from 'playwright';
import type { PageMeta } from '../../types/audit.types.js';

async function readAttribute(locator: Locator, name: string): Promise<string | null> {
  const count = await locator.count();
  if (count === 0) return null;
  return locator.first().getAttribute(name);
}

async function readFirstMatchingAttribute(page: Page, selectors: string[], attribute: string): Promise<string | null> {
  for (const selector of selectors) {
    const value = await readAttribute(page.locator(selector), attribute);
    const normalized = value?.trim() ?? null;
    if (normalized) return normalized;
  }
  return null;
}

export async function collectMeta(page: Page): Promise<PageMeta> {
  const title = await page.title();
  const description = await readFirstMatchingAttribute(
    page,
    ['meta[name="description" i]', 'meta[property="og:description" i]'],
    'content',
  );
  const canonical = await readFirstMatchingAttribute(
    page,
    ['link[rel~="canonical" i][href]'],
    'href',
  );
  const robots = await readFirstMatchingAttribute(
    page,
    ['meta[name="robots" i]', 'meta[name="googlebot" i]'],
    'content',
  );

  return {
    title: title.trim() || null,
    description,
    canonical,
    robots,
  };
}

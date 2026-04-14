import type { Page } from 'playwright';
import type { PageHeadings } from '../../types/audit.types.js';

const COLLECT_HEADINGS_SCRIPT = `(() => {
  const read = (selector) => Array.from(document.querySelectorAll(selector))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean);

  return {
    h1: read('h1'),
    h2: read('h2'),
  };
})()`;

export async function collectHeadings(page: Page): Promise<PageHeadings> {
  const headings = await page.evaluate(COLLECT_HEADINGS_SCRIPT);
  return headings as PageHeadings;
}

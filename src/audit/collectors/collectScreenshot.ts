import type { Page } from 'playwright';

export async function collectScreenshot(page: Page, screenshotPath: string): Promise<void> {
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

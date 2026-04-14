import type { Page } from 'playwright';
import type { CtaCandidate } from '../../types/audit.types.js';

const CTA_COLLECTION_SCRIPT = `(() => {
  const CTA_HINT_PATTERN = /\\b(start|try|book|buy|get|download|subscribe|sign up|signup|join|register|contact|request demo|learn more|schedule|apply|shop)\\b/i;
  const NAV_LABEL_PATTERN = /^(home|about|blog|news|careers|support|privacy|terms|faq|pricing)$/i;
  const selector = [
    'a',
    'button',
    'input[type="submit"]',
    'input[type="button"]',
    '[role="button"]',
    '[role="link"]',
    '[data-cta]',
    '[data-testid*="cta" i]',
  ].join(', ');

  const normalizeText = (raw) => {
    if (!raw) return null;
    const normalized = raw.replace(/\\s+/g, ' ').trim();
    return normalized.length > 0 ? normalized : null;
  };

  const getCandidateText = (node) => {
    if (node instanceof HTMLInputElement) {
      return normalizeText(node.value);
    }
    const element = node;
    return (
      normalizeText(element.innerText) ??
      normalizeText(node.textContent) ??
      normalizeText(element.getAttribute('aria-label')) ??
      normalizeText(element.getAttribute('title'))
    );
  };

  const isVisibleAndInteractive = (element) => {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (Number.parseFloat(style.opacity) <= 0.01) return false;
    if (style.pointerEvents === 'none') return false;
    if (element.hasAttribute('hidden')) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.getAttribute('aria-disabled') === 'true') return false;
    if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    if (element.closest('fieldset[disabled]')) return false;
    if (element instanceof HTMLButtonElement && element.disabled) return false;
    if (element instanceof HTMLInputElement && element.disabled) return false;
    if (element.tabIndex < 0 && !element.hasAttribute('onclick')) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const intersectsViewport = rect.right > 0 && rect.bottom > 0 && rect.left < viewportWidth && rect.top < viewportHeight;
    if (!intersectsViewport) return false;

    const visibleLeft = Math.max(0, rect.left);
    const visibleTop = Math.max(0, rect.top);
    const visibleRight = Math.min(viewportWidth, rect.right);
    const visibleBottom = Math.min(viewportHeight, rect.bottom);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = rect.width * rect.height;
    const visibleRatio = totalArea > 0 ? visibleArea / totalArea : 0;
    if (visibleArea < 16 || visibleRatio < 0.15) return false;

    const points = [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + Math.min(rect.width * 0.25, rect.width - 1), rect.top + Math.min(rect.height * 0.25, rect.height - 1)],
      [rect.right - Math.min(rect.width * 0.25, rect.width - 1), rect.bottom - Math.min(rect.height * 0.25, rect.height - 1)],
    ];

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const maxX = Math.max(viewportWidth - 1, 0);
    const maxY = Math.max(viewportHeight - 1, 0);

    for (const [rawX, rawY] of points) {
      const x = clamp(rawX, 0, maxX);
      const y = clamp(rawY, 0, maxY);
      const topElement = document.elementFromPoint(x, y);
      if (!topElement) continue;
      if (topElement === element || element.contains(topElement) || topElement.contains(element)) {
        return true;
      }
    }

    return false;
  };

  const hasActionTarget = (node, role, href) => {
    if (node instanceof HTMLButtonElement || node instanceof HTMLInputElement) return true;
    if (role === 'button') return true;

    const element = node;
    if (element.hasAttribute('onclick')) return true;
    if (element.hasAttribute('data-cta') || element.closest('[data-cta], [data-testid*="cta" i]')) return true;

    if (!href) return false;
    const normalizedHref = href.trim().toLowerCase();
    if (!normalizedHref) return false;
    if (normalizedHref === '#' || normalizedHref.startsWith('#')) return false;
    if (normalizedHref.startsWith('javascript:')) return false;
    return true;
  };

  const scoreCandidate = (node, text, role, href) => {
    const signals = [];
    let score = 0;
    const tagName = node.tagName.toLowerCase();
    const loweredText = text.toLowerCase();
    const element = node;

    if (tagName === 'button') {
      score += 3;
      signals.push('button-element');
    }
    if (node instanceof HTMLInputElement) {
      score += 3;
      signals.push('button-input');
    }
    if (role === 'button') {
      score += 2;
      signals.push('button-role');
    }
    if (role === 'link') {
      score += 1;
      signals.push('link-role');
    }
    if (href && !href.startsWith('javascript:')) {
      score += 1;
      signals.push('navigable-href');
    }
    if (CTA_HINT_PATTERN.test(loweredText)) {
      score += 3;
      signals.push('cta-action-copy');
    }
    if (element.hasAttribute('onclick')) {
      score += 1;
      signals.push('onclick-handler');
    }
    if (element.closest('[data-cta], [data-testid*="cta" i]')) {
      score += 2;
      signals.push('cta-attribute-context');
    }
    if (element.closest('nav, footer')) {
      score -= 2;
      signals.push('navigation-context');
    }
    if (NAV_LABEL_PATTERN.test(loweredText)) {
      score -= 1;
      signals.push('navigation-like-copy');
    }

    return { score, signals };
  };

  const getConfidence = (score) => {
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  };

  const nodes = Array.from(new Set(Array.from(document.querySelectorAll(selector))));

  return nodes
    .map((node) => {
      if (!(node instanceof HTMLElement)) return null;
      if (!isVisibleAndInteractive(node)) return null;

      const text = getCandidateText(node);
      if (!text) return null;

      const role = node.getAttribute('role');
      const href = node instanceof HTMLAnchorElement ? node.href : null;
      if (!hasActionTarget(node, role, href)) return null;
      const scored = scoreCandidate(node, text, role, href);

      return {
        tagName: node.tagName.toLowerCase(),
        text,
        role,
        href,
        confidence: getConfidence(scored.score),
        score: scored.score,
        signals: scored.signals,
      };
    })
    .filter((item) => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
})()`;

export async function collectCtaCandidates(page: Page): Promise<CtaCandidate[]> {
  const result = await page.evaluate(CTA_COLLECTION_SCRIPT);
  return result as CtaCandidate[];
}

import type { AuditIssue, PageAuditData } from '../types/audit.types.js';
import { isProbablyTooLong, isProbablyTooShort, normalizeWhitespace } from './normalize.js';
import { normalizeUrlForComparison } from './urlNormalization.js';

interface SeoRuleOptions {
  flagCrossDomainCanonical?: boolean;
}

export function runSeoRules(data: PageAuditData, options: SeoRuleOptions = {}): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const title = normalizeWhitespace(data.meta.title);
  const description = normalizeWhitespace(data.meta.description);
  const canonical = normalizeWhitespace(data.meta.canonical);
  const robots = normalizeWhitespace(data.meta.robots)?.toLowerCase() ?? null;

  if (!title) {
    issues.push({
      id: 'SEO_TITLE_MISSING',
      category: 'seo',
      severity: 'high',
      title: 'Title tag is missing',
      evidence: 'No page title was detected.',
      recommendedAction: 'Add a descriptive title tag.',
    });
  } else {
    if (isProbablyTooShort(title, 20)) {
      issues.push({
        id: 'SEO_TITLE_TOO_SHORT',
        category: 'seo',
        severity: 'low',
        title: 'Title tag may be too short',
        evidence: `Detected title length: ${title.length}.`,
        recommendedAction: 'Review title length and make it more descriptive if needed.',
      });
    }
    if (isProbablyTooLong(title, 65)) {
      issues.push({
        id: 'SEO_TITLE_TOO_LONG',
        category: 'seo',
        severity: 'low',
        title: 'Title tag may be too long',
        evidence: `Detected title length: ${title.length}.`,
        recommendedAction: 'Review title length to reduce truncation risk in search results.',
      });
    }
  }

  if (!description) {
    issues.push({
      id: 'SEO_META_DESCRIPTION_MISSING',
      category: 'seo',
      severity: 'high',
      title: 'Meta description is missing',
      evidence: 'No meta description tag was detected.',
      recommendedAction: 'Add a concise meta description.',
    });
  } else if (isProbablyTooLong(description, 160)) {
    issues.push({
      id: 'SEO_META_DESCRIPTION_TOO_LONG',
      category: 'seo',
      severity: 'low',
      title: 'Meta description may be too long',
      evidence: `Detected meta description length: ${description.length}.`,
      recommendedAction: 'Shorten the meta description if search snippet length matters.',
    });
  }

  if (!canonical) {
    issues.push({
      id: 'SEO_CANONICAL_MISSING',
      category: 'seo',
      severity: 'medium',
      title: 'Canonical tag is missing',
      evidence: 'No canonical link tag was detected.',
      recommendedAction: 'Add a canonical URL to reduce URL ambiguity.',
    });
  } else {
    let canonicalUrl: URL | null = null;

    try {
      canonicalUrl = new URL(canonical, data.finalUrl);
    } catch {
      issues.push({
        id: 'SEO_CANONICAL_INVALID',
        category: 'seo',
        severity: 'medium',
        title: 'Canonical URL is invalid',
        evidence: `Canonical value could not be parsed: ${canonical}`,
        recommendedAction: 'Provide a valid absolute or root-relative canonical URL.',
      });
    }

    if (canonicalUrl) {
      if (!['http:', 'https:'].includes(canonicalUrl.protocol)) {
        issues.push({
          id: 'SEO_CANONICAL_INVALID_PROTOCOL',
          category: 'seo',
          severity: 'medium',
          title: 'Canonical URL uses an unsupported protocol',
          evidence: `Detected canonical protocol: ${canonicalUrl.protocol}`,
          recommendedAction: 'Use an http or https canonical URL.',
        });
      } else if (canonicalUrl.hash) {
        issues.push({
          id: 'SEO_CANONICAL_HAS_FRAGMENT',
          category: 'seo',
          severity: 'low',
          title: 'Canonical URL contains a fragment',
          evidence: `Detected canonical fragment: ${canonicalUrl.hash}`,
          recommendedAction: 'Remove hash fragments from canonical URLs.',
        });
      }

      let finalUrl: URL | null = null;
      try {
        finalUrl = new URL(data.finalUrl);
      } catch {
        // Ignore invalid final URL parsing; canonical comparison is skipped.
      }

      if (finalUrl && ['http:', 'https:'].includes(canonicalUrl.protocol)) {
        if (canonicalUrl.origin !== finalUrl.origin && options.flagCrossDomainCanonical === true) {
          issues.push({
            id: 'SEO_CANONICAL_CROSS_DOMAIN',
            category: 'seo',
            severity: 'medium',
            title: 'Canonical URL points to a different domain',
            evidence: `Canonical origin: ${canonicalUrl.origin}; final origin: ${finalUrl.origin}.`,
            recommendedAction: 'Confirm cross-domain canonicalization is intentional and correct.',
          });
        } else if (normalizeUrlForComparison(canonicalUrl) !== normalizeUrlForComparison(finalUrl)) {
          issues.push({
            id: 'SEO_CANONICAL_DIFFERS_FROM_FINAL_URL',
            category: 'seo',
            severity: 'low',
            title: 'Canonical URL differs from final URL',
            evidence: `Canonical: ${canonicalUrl.toString()}; final: ${finalUrl.toString()}.`,
            recommendedAction: 'Confirm canonical URL accurately represents the preferred version of this page.',
          });
        }
      }
    }
  }

  if (robots?.includes('noindex')) {
    issues.push({
      id: 'SEO_NOINDEX_PRESENT',
      category: 'seo',
      severity: 'high',
      title: 'Noindex directive detected',
      evidence: `Robots meta content: ${robots}`,
      recommendedAction: 'Confirm whether this page is intentionally blocked from indexing.',
    });
  }

  if (data.headings.h1.length === 0) {
    issues.push({
      id: 'SEO_H1_MISSING',
      category: 'seo',
      severity: 'high',
      title: 'H1 heading is missing',
      evidence: 'No H1 element was detected.',
      recommendedAction: 'Add one primary H1 heading.',
    });
  }

  if (data.headings.h1.length > 1) {
    issues.push({
      id: 'SEO_MULTIPLE_H1',
      category: 'seo',
      severity: 'medium',
      title: 'Multiple H1 headings detected',
      evidence: `Detected ${data.headings.h1.length} H1 elements.`,
      recommendedAction: 'Review heading hierarchy and keep one primary H1 if possible.',
    });
  }

  return issues;
}

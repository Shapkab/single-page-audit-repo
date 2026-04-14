import type { PageAuditData } from '../types/audit.types.js';

function stripQueryAndHash(raw: string): string {
  const queryIndex = raw.indexOf('?');
  const hashIndex = raw.indexOf('#');
  const cutIndex = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (cutIndex === undefined) return raw;
  return raw.slice(0, cutIndex);
}

export function redactUrlForArtifact(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return stripQueryAndHash(rawUrl);
  }
}

export function redactPageAuditDataForArtifact(data: PageAuditData): PageAuditData {
  return {
    ...data,
    url: redactUrlForArtifact(data.url),
    finalUrl: redactUrlForArtifact(data.finalUrl),
    meta: {
      ...data.meta,
      canonical: data.meta.canonical ? redactUrlForArtifact(data.meta.canonical) : null,
    },
    ctaCandidates: data.ctaCandidates.map((candidate) => ({
      ...candidate,
      href: candidate.href ? redactUrlForArtifact(candidate.href) : null,
    })),
    trackingObservations: data.trackingObservations.map((observation) => ({
      ...observation,
      url: redactUrlForArtifact(observation.url),
    })),
  };
}

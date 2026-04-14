import { z } from 'zod';

export const auditIssueSchema = z.object({
  id: z.string(),
  category: z.enum(['seo', 'technical', 'tracking', 'ux']),
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string(),
  evidence: z.string(),
  recommendedAction: z.string(),
});

export const auditResultSchema = z.object({
  metadata: z.object({
    schemaVersion: z.string(),
    toolVersion: z.string(),
    auditedAt: z.string(),
    inputUrl: z.string(),
    finalUrl: z.string(),
    httpStatus: z.number().nullable(),
  }),
  summary: z.string(),
  issues: z.array(auditIssueSchema),
  data: z.object({
    url: z.string(),
    finalUrl: z.string(),
    httpStatus: z.number().nullable(),
    meta: z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      canonical: z.string().nullable(),
      robots: z.string().nullable(),
    }),
    headings: z.object({
      h1: z.array(z.string()),
      h2: z.array(z.string()),
    }),
    ctaCandidates: z.array(z.object({
      tagName: z.string(),
      text: z.string(),
      role: z.string().nullable(),
      href: z.string().nullable(),
      confidence: z.enum(['low', 'medium', 'high']),
      score: z.number().int(),
      signals: z.array(z.string()),
    })),
    consoleEvents: z.array(z.object({
      type: z.string(),
      text: z.string(),
    })),
    consoleEventsDropped: z.number().int().nonnegative(),
    trackingObservations: z.array(z.object({
      vendor: z.enum(['ga', 'gtm', 'segment', 'meta']),
      url: z.string(),
      outcome: z.enum(['succeeded', 'failed']),
      errorText: z.string().optional(),
    })),
    trackingObservationsDropped: z.number().int().nonnegative(),
    trackingStatus: z.enum(['observed', 'not_observed', 'undetermined']),
    screenshotPath: z.string().optional(),
  }),
  outputDir: z.string(),
});

export type Severity = 'low' | 'medium' | 'high';
export type IssueCategory = 'seo' | 'technical' | 'tracking' | 'ux';
export type ObservationStatus = 'observed' | 'not_observed' | 'undetermined';
export type TrackingObservationOutcome = 'succeeded' | 'failed';
export type CtaConfidence = 'low' | 'medium' | 'high';
export type WaitUntilOption = 'domcontentloaded' | 'load' | 'networkidle' | 'commit';

export interface AuditOptions {
  outputBaseDir?: string;
  takeScreenshot?: boolean;
  waitUntil?: WaitUntilOption;
  timeoutMs?: number;
  networkIdleTimeoutMs?: number;
  postLoadWaitMs?: number;
  stabilityTimeoutMs?: number;
  stabilityPollIntervalMs?: number;
  requiredStablePolls?: number;
  flagCrossDomainCanonical?: boolean;
  includeFullUrlsInArtifacts?: boolean;
}

export interface AuditMetadata {
  schemaVersion: string;
  toolVersion: string;
  auditedAt: string;
  inputUrl: string;
  finalUrl: string;
  httpStatus: number | null;
}

export interface NavigationResult {
  finalUrl: string;
  httpStatus: number | null;
}

export interface PageMeta {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
}

export interface PageHeadings {
  h1: string[];
  h2: string[];
}

export interface ConsoleEvent {
  type: string;
  text: string;
}

export type TrackingVendor = 'ga' | 'gtm' | 'segment' | 'meta';

export interface TrackingObservation {
  vendor: TrackingVendor;
  url: string;
  outcome: TrackingObservationOutcome;
  errorText?: string;
}

export interface CtaCandidate {
  tagName: string;
  text: string;
  role: string | null;
  href: string | null;
  confidence: CtaConfidence;
  score: number;
  signals: string[];
}

export interface PageAuditData {
  url: string;
  finalUrl: string;
  httpStatus: number | null;
  meta: PageMeta;
  headings: PageHeadings;
  ctaCandidates: CtaCandidate[];
  consoleEvents: ConsoleEvent[];
  consoleEventsDropped: number;
  trackingObservations: TrackingObservation[];
  trackingObservationsDropped: number;
  trackingStatus: ObservationStatus;
  screenshotPath?: string;
}

export interface AuditIssue {
  id: string;
  category: IssueCategory;
  severity: Severity;
  title: string;
  evidence: string;
  recommendedAction: string;
}

export interface AuditResult {
  metadata: AuditMetadata;
  summary: string;
  issues: AuditIssue[];
  data: PageAuditData;
  outputDir: string;
}

import type { ObservationStatus, TrackingObservation, TrackingVendor } from '../../types/audit.types.js';
import type { Request } from 'playwright';

function classifyVendor(url: string): TrackingVendor | null {
  const lower = url.toLowerCase();
  if (lower.includes('googletagmanager')) return 'gtm';
  if (lower.includes('google-analytics') || lower.includes('/g/collect') || lower.includes('/collect?v=')) return 'ga';
  if (lower.includes('segment.io')) return 'segment';
  if (lower.includes('connect.facebook.net') || lower.includes('facebook.com/tr')) return 'meta';
  return null;
}

export function createNetworkCollector(maxObservations = 200) {
  const trackingObservations: TrackingObservation[] = [];
  const pendingRequests = new Map<Request, { vendor: TrackingVendor; url: string }>();
  let droppedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;

  function storeObservation(observation: TrackingObservation): void {
    if (observation.outcome === 'succeeded') {
      succeededCount += 1;
    } else {
      failedCount += 1;
    }

    if (trackingObservations.length < maxObservations) {
      trackingObservations.push(observation);
    } else {
      droppedCount += 1;
    }
  }

  return {
    onRequest(request: Request) {
      const url = request.url();
      const vendor = classifyVendor(url);
      if (vendor) {
        pendingRequests.set(request, { vendor, url });
      }
    },
    onRequestFinished(request: Request) {
      const trackedRequest = pendingRequests.get(request);
      if (trackedRequest) {
        storeObservation({
          vendor: trackedRequest.vendor,
          url: trackedRequest.url,
          outcome: 'succeeded',
        });
        pendingRequests.delete(request);
      }
    },
    onRequestFailed(request: Request) {
      const trackedRequest = pendingRequests.get(request);
      if (trackedRequest) {
        storeObservation({
          vendor: trackedRequest.vendor,
          url: trackedRequest.url,
          outcome: 'failed',
          errorText: request.failure()?.errorText,
        });
        pendingRequests.delete(request);
      }
    },
    getTrackingObservations(): TrackingObservation[] {
      return [...trackingObservations];
    },
    getTrackingStatus(): ObservationStatus {
      if (succeededCount > 0) {
        return 'observed';
      }
      if (failedCount > 0 || pendingRequests.size > 0) {
        return 'undetermined';
      }
      return 'not_observed';
    },
    getDroppedCount(): number {
      return droppedCount;
    },
  };
}

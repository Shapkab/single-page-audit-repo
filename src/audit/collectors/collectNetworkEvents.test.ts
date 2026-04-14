import { describe, expect, it } from 'vitest';
import type { Request } from 'playwright';
import { createNetworkCollector } from './collectNetworkEvents.js';

function createRequest(url: string, errorText?: string): Request {
  const requestLike = {
    url: () => url,
    failure: () => (errorText ? { errorText } : null),
  };
  return requestLike as unknown as Request;
}

describe('createNetworkCollector', () => {
  it('does not mark tracking as observed when request only started', () => {
    const collector = createNetworkCollector();
    const request = createRequest('https://www.google-analytics.com/g/collect');

    collector.onRequest(request);

    expect(collector.getTrackingStatus()).toBe('undetermined');
    expect(collector.getTrackingObservations()).toEqual([]);
  });

  it('marks tracking as observed only when request finishes successfully', () => {
    const collector = createNetworkCollector();
    const request = createRequest('https://www.google-analytics.com/g/collect');

    collector.onRequest(request);
    collector.onRequestFinished(request);

    expect(collector.getTrackingStatus()).toBe('observed');
    expect(collector.getTrackingObservations()).toEqual([
      {
        vendor: 'ga',
        url: 'https://www.google-analytics.com/g/collect',
        outcome: 'succeeded',
      },
    ]);
  });

  it('marks tracking as undetermined when request fails', () => {
    const collector = createNetworkCollector();
    const request = createRequest('https://connect.facebook.net/en_US/fbevents.js', 'net::ERR_BLOCKED_BY_CLIENT');

    collector.onRequest(request);
    collector.onRequestFailed(request);

    expect(collector.getTrackingStatus()).toBe('undetermined');
    expect(collector.getTrackingObservations()).toEqual([
      {
        vendor: 'meta',
        url: 'https://connect.facebook.net/en_US/fbevents.js',
        outcome: 'failed',
        errorText: 'net::ERR_BLOCKED_BY_CLIENT',
      },
    ]);
  });

  it('caps stored tracking observations and reports dropped count', () => {
    const collector = createNetworkCollector(1);
    const first = createRequest('https://www.google-analytics.com/g/collect?event=1');
    const second = createRequest('https://www.google-analytics.com/g/collect?event=2');

    collector.onRequest(first);
    collector.onRequestFinished(first);
    collector.onRequest(second);
    collector.onRequestFinished(second);

    expect(collector.getTrackingObservations()).toHaveLength(1);
    expect(collector.getDroppedCount()).toBe(1);
    expect(collector.getTrackingStatus()).toBe('observed');
  });
});

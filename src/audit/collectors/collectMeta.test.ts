import { describe, expect, it } from 'vitest';
import type { Locator, Page } from 'playwright';
import { collectMeta } from './collectMeta.js';

interface LocatorState {
  count: number;
  value: string | null;
}

function createLocator(state: LocatorState): Locator {
  return {
    count: async () => state.count,
    first: () => ({
      getAttribute: async () => state.value,
    }),
  } as unknown as Locator;
}

function createPageMock(title: string, states: Record<string, LocatorState>): Page {
  return {
    title: async () => title,
    locator: (selector: string) => createLocator(states[selector] ?? { count: 0, value: null }),
  } as unknown as Page;
}

describe('collectMeta', () => {
  it('reads canonical via tokenized rel and case-insensitive name selectors', async () => {
    const page = createPageMock(' Title ', {
      'meta[name="description" i]': { count: 1, value: ' Primary description ' },
      'link[rel~="canonical" i][href]': { count: 1, value: ' /landing ' },
      'meta[name="robots" i]': { count: 1, value: ' index,follow ' },
    });

    const meta = await collectMeta(page);

    expect(meta).toEqual({
      title: 'Title',
      description: 'Primary description',
      canonical: '/landing',
      robots: 'index,follow',
    });
  });

  it('falls back to og:description and googlebot when primary tags are missing', async () => {
    const page = createPageMock('Title', {
      'meta[name="description" i]': { count: 0, value: null },
      'meta[property="og:description" i]': { count: 1, value: ' OG description ' },
      'link[rel~="canonical" i][href]': { count: 1, value: 'https://example.com/page' },
      'meta[name="robots" i]': { count: 0, value: null },
      'meta[name="googlebot" i]': { count: 1, value: ' noindex ' },
    });

    const meta = await collectMeta(page);

    expect(meta.description).toBe('OG description');
    expect(meta.robots).toBe('noindex');
  });

  it('returns null for empty metadata values', async () => {
    const page = createPageMock('   ', {
      'meta[name="description" i]': { count: 1, value: '   ' },
      'meta[property="og:description" i]': { count: 1, value: null },
      'link[rel~="canonical" i][href]': { count: 1, value: '' },
      'meta[name="robots" i]': { count: 1, value: null },
      'meta[name="googlebot" i]': { count: 1, value: '' },
    });

    const meta = await collectMeta(page);

    expect(meta).toEqual({
      title: null,
      description: null,
      canonical: null,
      robots: null,
    });
  });
});

export function normalizeUrlForComparison(input: string | URL): string | null {
  try {
    const parsed = new URL(input.toString());

    if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }

    parsed.hash = '';
    const normalizedPath = parsed.pathname !== '/' && parsed.pathname.endsWith('/') ? parsed.pathname.slice(0, -1) : parsed.pathname;
    const sortedSearch = [...parsed.searchParams.entries()]
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        if (leftKey === rightKey) return leftValue.localeCompare(rightValue);
        return leftKey.localeCompare(rightKey);
      })
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}${normalizedPath}${sortedSearch ? `?${sortedSearch}` : ''}`;
  } catch {
    return null;
  }
}

export function normalizeWhitespace(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

export function isProbablyTooShort(value: string | null, minLength: number): boolean {
  return Boolean(value && value.length < minLength);
}

export function isProbablyTooLong(value: string | null, maxLength: number): boolean {
  return Boolean(value && value.length > maxLength);
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const timestamp = value as { toDate: () => Date };
    return timestamp.toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const timestamp = value as { seconds: number };
    return new Date(timestamp.seconds * 1000);
  }
  return null;
}

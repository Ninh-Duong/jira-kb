import { createHash } from 'node:crypto';

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};

    for (const key of Object.keys(record).sort((left, right) => left.localeCompare(right))) {
      sorted[key] = sortValue(record[key]);
    }

    return sorted;
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sha256Text(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function digestValue(value: unknown): string {
  return sha256Text(stableStringify(value));
}

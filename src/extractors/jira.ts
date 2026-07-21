import { digestValue } from '../utils/hash';
import type { JiraIssuePayload, JiraIssueSnapshot } from '../models/ticket';

export interface JiraExtractionOptions {
  repoId: string;
  sprintFieldIds?: string[];
  epicFieldIds?: string[];
  sourcePath?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

function toText(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean).join(' ');
  }

  const record = asRecord(value);
  if (!record) {
    return '';
  }

  if (typeof record.text === 'string') {
    return record.text;
  }

  const parts: string[] = [];
  for (const key of ['summary', 'name', 'value', 'title', 'description', 'content', 'children', 'items']) {
    if (key in record) {
      const text = toText(record[key]);
      if (text) {
        parts.push(text);
      }
    }
  }

  return parts.join(' ');
}

function toStringList(value: unknown): string[] {
  if (value == null) {
    return [];
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => toStringList(item));
  }

  const record = asRecord(value);
  if (!record) {
    return [String(value)];
  }

  for (const key of ['name', 'value', 'key', 'summary', 'text']) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return [candidate.trim()];
    }
  }

  return Object.values(record)
    .map(toText)
    .filter(Boolean);
}

function extractLinkedKeys(fields: Record<string, unknown>): string[] {
  const links = fields.issuelinks;
  if (!Array.isArray(links)) {
    return [];
  }

  const keys = new Set<string>();

  for (const link of links) {
    const record = asRecord(link);
    if (!record) {
      continue;
    }

    const inwardIssue = asRecord(record.inwardIssue);
    const outwardIssue = asRecord(record.outwardIssue);

    if (inwardIssue?.key && typeof inwardIssue.key === 'string') {
      keys.add(inwardIssue.key);
    }

    if (outwardIssue?.key && typeof outwardIssue.key === 'string') {
      keys.add(outwardIssue.key);
    }
  }

  return [...keys];
}

function extractFieldValues(fields: Record<string, unknown>, fieldIds: string[] | undefined): string[] {
  if (!fieldIds || fieldIds.length === 0) {
    return [];
  }

  const values = new Set<string>();
  for (const fieldId of fieldIds) {
    const fieldValue = fields[fieldId];
    for (const item of toStringList(fieldValue)) {
      if (item) {
        values.add(item);
      }
    }
  }

  return [...values];
}

function extractEpicKey(fields: Record<string, unknown>, epicFieldIds: string[] | undefined): string | undefined {
  if (!epicFieldIds || epicFieldIds.length === 0) {
    return undefined;
  }

  for (const fieldId of epicFieldIds) {
    const value = fields[fieldId];
    const text = toStringList(value).find(Boolean);
    if (text) {
      return text;
    }
  }

  return undefined;
}

export function extractJiraIssueSnapshot(
  issue: JiraIssuePayload,
  options: JiraExtractionOptions
): JiraIssueSnapshot {
  const fields = issue.fields;
  const summary = toText(fields.summary);
  const status = toText(asRecord(fields.status)?.name ?? fields.status);
  const issueType = toText(asRecord(fields.issuetype)?.name ?? fields.issuetype);
  const labels = toStringList(fields.labels);
  const components = Array.isArray(fields.components)
    ? fields.components.flatMap((component) => toStringList(component))
    : [];
  const sprintNames = extractFieldValues(fields, options.sprintFieldIds);
  const epicKey = extractEpicKey(fields, options.epicFieldIds);
  const linkedKeys = extractLinkedKeys(fields);
  const description = toText(fields.description) || undefined;
  const updatedAt = toText(fields.updated);

  const snapshotBase = {
    repoId: options.repoId,
    key: issue.key,
    summary,
    status,
    issueType,
    labels,
    components,
    sprintNames,
    epicKey,
    linkedKeys,
    description,
    updatedAt,
    sourcePath: options.sourcePath
  };

  return {
    ...snapshotBase,
    digest: digestValue(snapshotBase)
  };
}

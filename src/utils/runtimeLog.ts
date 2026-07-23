import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { getProjectRoot, getRepoWorkspacePaths } from './paths';

export const RUNTIME_LOG_FILE = 'system.jsonl';
export const RUNTIME_LOG_DIR = 'logs';

export type RuntimeLogLevel = 'info' | 'warn' | 'error';

export interface RuntimeLogEntry {
  runId: string;
  operation: string;
  status: string;
  level: RuntimeLogLevel;
  message: string;
  repoId?: string;
  projectKey?: string;
  durationMs?: number;
  httpStatus?: number;
  metadata?: Record<string, unknown>;
}

export function createRunId(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${suffix}`;
}

export function getRuntimeLogPath(cwd = process.cwd()): string {
  return join(getProjectRoot(cwd), RUNTIME_LOG_DIR, RUNTIME_LOG_FILE);
}

async function appendJsonLine(filePath: string, line: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, line, 'utf8');
}

export async function appendRuntimeLog(entry: RuntimeLogEntry, cwd = process.cwd()): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };
  const line = `${JSON.stringify(logEntry)}\n`;

  await appendJsonLine(getRuntimeLogPath(cwd), line);

  if (entry.repoId) {
    const workspace = getRepoWorkspacePaths(entry.repoId, cwd);
    await appendJsonLine(join(workspace.logsDir, RUNTIME_LOG_FILE), line);
  }
}

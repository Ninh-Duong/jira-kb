export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RunLogEntry {
  runId: string;
  repoId: string;
  step: string;
  level: LogLevel;
  message: string;
  note?: string;
  createdAt: string;
}

export interface RunSummary {
  runId: string;
  repoId: string;
  status: 'idle' | 'running' | 'done' | 'failed';
  startedAt: string;
  endedAt?: string;
  note?: string;
  lastError?: string;
}

export interface DependencyCheckResult {
  name: string;
  required: boolean;
  present: boolean;
  version?: string;
  installHint?: string;
  reason?: string;
}

export interface PreflightReport {
  ready: boolean;
  checkedAt: string;
  missing: DependencyCheckResult[];
  present: DependencyCheckResult[];
  bootstrapCommand: string;
  note?: string;
}

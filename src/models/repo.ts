export type JiraMode = 'cloud' | 'server';

export type SyncStatus = 'idle' | 'testing' | 'connected' | 'syncing' | 'failed';

export interface JiraCredentialDraft {
  repoId: string;
  displayName: string;
  jiraBaseUrl: string;
  accountEmail: string;
  apiToken: string;
  projectKey: string;
  mode: JiraMode;
}

export interface RepoManifest {
  repoId: string;
  displayName: string;
  jiraBaseUrl: string;
  projectKey: string;
  authRef: string;
  mode: JiraMode;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  lastSyncStatus?: SyncStatus;
  lastError?: string;
}

export interface RepoWorkspaceState {
  repoId: string;
  trackedIssueCount: number;
  lastFullSyncAt?: string;
  lastDeltaSyncAt?: string;
  lastIssueUpdateCursor?: string;
  lastRunId?: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  status: SyncStatus;
  message: string;
  httpStatus?: number;
  durationMs: number;
  checkedAt: string;
}

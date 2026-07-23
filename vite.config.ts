import type { IncomingMessage, ServerResponse } from 'node:http';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import {
  buildJiraBoardSprintsUrl,
  buildJiraAuthHeader,
  buildJiraSearchUrl,
  getJiraSearchPath,
  normalizeBaseUrl,
  testJiraConnection
} from './src/connectors/jira';
import { extractJiraIssueSnapshot } from './src/extractors/jira';
import type { JiraCredentialDraft } from './src/models/repo';
import type { JiraIssuePayload } from './src/models/ticket';
import {
  appendRuntimeLog,
  createRunId,
  RUNTIME_LOG_DIR,
  RUNTIME_LOG_FILE,
  type RuntimeLogEntry
} from './src/utils/runtimeLog';

const JIRA_TEST_CONNECTION_PATH = '/api/jira/test-connection';
const JIRA_SCAN_PATH = '/api/jira/scan';
const SCAN_PAGE_SIZE = 100;
const SCAN_MAX_ISSUES = 1000;
const SPRINT_PAGE_SIZE = 50;
const DEFAULT_SPRINT_FIELD_IDS = ['customfield_10020'];
const LOG_FILE_HINT = `${RUNTIME_LOG_DIR}/${RUNTIME_LOG_FILE}`;

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8');

      if (body.length > 64_000) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function recordRuntimeLog(entry: RuntimeLogEntry): Promise<void> {
  try {
    await appendRuntimeLog(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[jira-kb] Failed to write runtime log: ${message}`);
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(readString).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseCredentialDraft(body: string): JiraCredentialDraft {
  const payload = JSON.parse(body) as Record<string, unknown>;

  return {
    repoId: readString(payload.repoId),
    displayName: readString(payload.displayName),
    jiraBaseUrl: readString(payload.jiraBaseUrl),
    accountEmail: readString(payload.accountEmail),
    apiToken: readString(payload.apiToken),
    projectKey: readString(payload.projectKey),
    boardId: readString(payload.boardId) || undefined,
    jqlScope: readString(payload.jqlScope) || undefined,
    sprintFieldIds: readStringList(payload.sprintFieldIds),
    epicFieldIds: readStringList(payload.epicFieldIds),
    mode: payload.mode === 'server' ? 'server' : 'cloud'
  };
}

interface JiraSearchResponse {
  issues?: unknown[];
  total?: unknown;
  nextPageToken?: unknown;
  isLast?: unknown;
}

interface JiraSprintResponse {
  values?: unknown[];
  total?: unknown;
  startAt?: unknown;
  maxResults?: unknown;
  isLast?: unknown;
}

interface JiraScanIssue {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  priority?: string;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  sprintNames: string[];
  updatedAt: string;
  createdAt?: string;
  url: string;
}

interface JiraSprint {
  id: number;
  name: string;
  state: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

interface JiraScanResult {
  ok: boolean;
  status: 'succeeded' | 'failed';
  message: string;
  runId: string;
  logFile: string;
  repoId: string;
  projectKey: string;
  boardId?: string;
  jql: string;
  issueCount: number;
  total?: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  issues: JiraScanIssue[];
  sprints: JiraSprint[];
  warnings?: string[];
  durationMs: number;
  scannedAt: string;
  httpStatus?: number;
}

function countBy<T>(items: T[], getKey: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item) || 'Unknown';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isJiraIssuePayload(value: unknown): value is JiraIssuePayload {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.key === 'string' && isRecord(value.fields);
}

function readTextValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(readTextValue).filter(Boolean).join(' ');
  }

  if (!isRecord(value)) {
    return '';
  }

  for (const key of ['displayName', 'name', 'value', 'key', 'summary', 'text']) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
}

function readAvatarUrl(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const avatarUrls = value.avatarUrls;
  if (!isRecord(avatarUrls)) {
    return undefined;
  }

  for (const size of ['48x48', '32x32', '24x24', '16x16']) {
    const url = avatarUrls[size];
    if (typeof url === 'string' && url.trim()) {
      return url;
    }
  }

  return undefined;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getSprintFieldIds(config: JiraCredentialDraft): string[] {
  return uniqueValues([...(config.sprintFieldIds ?? []), ...DEFAULT_SPRINT_FIELD_IDS]);
}

function hasOrderBy(jql: string): boolean {
  return /\border\s+by\b/i.test(jql);
}

function buildScanJql(config: JiraCredentialDraft, projectKey: string): string {
  const scope = config.jqlScope?.trim() || `project = ${projectKey}`;
  return hasOrderBy(scope) ? scope : `${scope} ORDER BY updated DESC`;
}

function isJiraSprintPayload(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string';
}

function toJiraSprint(value: Record<string, unknown>): JiraSprint {
  return {
    id: value.id as number,
    name: readTextValue(value.name),
    state: readTextValue(value.state),
    goal: readTextValue(value.goal) || undefined,
    startDate: readTextValue(value.startDate) || undefined,
    endDate: readTextValue(value.endDate) || undefined,
    completeDate: readTextValue(value.completeDate) || undefined
  };
}

function readJiraError(payload: Record<string, unknown>): string {
  const errorMessages = payload.errorMessages;
  if (Array.isArray(errorMessages)) {
    const messages = errorMessages.filter((item): item is string => typeof item === 'string');
    if (messages.length > 0) {
      return messages.join('; ');
    }
  }

  const errors = payload.errors;
  if (isRecord(errors)) {
    const messages = Object.values(errors).filter((item): item is string => typeof item === 'string');
    if (messages.length > 0) {
      return messages.join('; ');
    }
  }

  return 'Jira scan request failed';
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.text();
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {
      errorMessages: [body.slice(0, 240)]
    };
  }
}

function validateScanConfig(config: JiraCredentialDraft): string | null {
  if (!config.repoId || !config.jiraBaseUrl || !config.accountEmail || !config.apiToken || !config.projectKey) {
    return 'Missing Jira scan fields';
  }

  if (!/^[A-Z][A-Z0-9_]*$/i.test(config.projectKey)) {
    return 'Project key must contain only letters, numbers, or underscores';
  }

  if (config.boardId && !/^\d+$/.test(config.boardId)) {
    return 'Board ID must be a number';
  }

  return null;
}

async function fetchJiraIssues(
  config: JiraCredentialDraft,
  jql: string,
  fields: string[]
): Promise<{
  ok: true;
  issues: JiraIssuePayload[];
  total?: number;
  httpStatus: number;
} | {
  ok: false;
  message: string;
  httpStatus?: number;
}> {
  const issues: JiraIssuePayload[] = [];
  let total: number | undefined;
  let startAt = 0;
  let nextPageToken: string | undefined;
  let httpStatus = 0;

  while (issues.length < SCAN_MAX_ISSUES) {
    const url = buildJiraSearchUrl(config, jql, fields, startAt, SCAN_PAGE_SIZE, nextPageToken);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: buildJiraAuthHeader(config.accountEmail, config.apiToken)
      }
    });
    const payload = await readJsonResponse(response);
    httpStatus = response.status;

    if (!response.ok) {
      return {
        ok: false,
        message: readJiraError(payload),
        httpStatus: response.status
      };
    }

    const searchPayload = payload as JiraSearchResponse;
    if (typeof searchPayload.total === 'number') {
      total = searchPayload.total;
    }

    const pageIssues = Array.isArray(searchPayload.issues)
      ? searchPayload.issues.filter(isJiraIssuePayload)
      : [];

    issues.push(...pageIssues);

    if (config.mode === 'server') {
      startAt += pageIssues.length;
      if (pageIssues.length === 0 || (typeof total === 'number' && startAt >= total)) {
        break;
      }
      continue;
    }

    nextPageToken = typeof searchPayload.nextPageToken === 'string' ? searchPayload.nextPageToken : undefined;
    if (searchPayload.isLast === true || !nextPageToken || pageIssues.length === 0) {
      break;
    }
  }

  return {
    ok: true,
    issues: issues.slice(0, SCAN_MAX_ISSUES),
    total,
    httpStatus
  };
}

async function fetchJiraSprints(config: JiraCredentialDraft): Promise<{
  sprints: JiraSprint[];
  warnings: string[];
}> {
  if (!config.boardId) {
    return {
      sprints: [],
      warnings: []
    };
  }

  const sprints: JiraSprint[] = [];
  const warnings: string[] = [];
  let startAt = 0;

  while (true) {
    const url = buildJiraBoardSprintsUrl(config, config.boardId, startAt, SPRINT_PAGE_SIZE);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: buildJiraAuthHeader(config.accountEmail, config.apiToken)
      }
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      warnings.push(`Unable to fetch board ${config.boardId} sprints: ${readJiraError(payload)} (HTTP ${response.status})`);
      break;
    }

    const sprintPayload = payload as JiraSprintResponse;
    const pageSprints = Array.isArray(sprintPayload.values)
      ? sprintPayload.values.filter(isJiraSprintPayload).map(toJiraSprint)
      : [];

    sprints.push(...pageSprints);

    if (sprintPayload.isLast === true || pageSprints.length === 0) {
      break;
    }

    startAt += typeof sprintPayload.maxResults === 'number' ? sprintPayload.maxResults : pageSprints.length;
    if (typeof sprintPayload.total === 'number' && startAt >= sprintPayload.total) {
      break;
    }
  }

  return {
    sprints,
    warnings
  };
}

async function scanJiraProject(config: JiraCredentialDraft): Promise<JiraScanResult> {
  const startedAt = Date.now();
  const scannedAt = new Date().toISOString();
  const runId = createRunId('jira-scan');
  const projectKey = config.projectKey.toUpperCase();
  const jql = buildScanJql(config, projectKey);
  const validationError = validateScanConfig(config);

  if (validationError) {
    return {
      ok: false,
      status: 'failed',
      message: validationError,
      runId,
      logFile: LOG_FILE_HINT,
      repoId: config.repoId,
      projectKey,
      boardId: config.boardId,
      jql,
      issueCount: 0,
      statusCounts: {},
      typeCounts: {},
      issues: [],
      sprints: [],
      durationMs: Date.now() - startedAt,
      scannedAt
    };
  }

  const fields = uniqueValues([
    'summary',
    'status',
    'issuetype',
    'labels',
    'components',
    'updated',
    'created',
    'priority',
    'assignee',
    'description',
    'issuelinks',
    ...getSprintFieldIds(config)
  ]);

  try {
    const searchResult = await fetchJiraIssues(config, jql, fields);

    if (!searchResult.ok) {
      return {
        ok: false,
        status: 'failed',
        message: searchResult.message,
        runId,
        logFile: LOG_FILE_HINT,
        repoId: config.repoId,
        projectKey,
        boardId: config.boardId,
        jql,
        issueCount: 0,
        statusCounts: {},
        typeCounts: {},
        issues: [],
        sprints: [],
        durationMs: Date.now() - startedAt,
        scannedAt,
        httpStatus: searchResult.httpStatus
      };
    }

    const sprintResult = await fetchJiraSprints(config);

    const scanIssues = searchResult.issues.map((issue) => {
      const snapshot = extractJiraIssueSnapshot(issue, {
        repoId: config.repoId,
        sprintFieldIds: getSprintFieldIds(config),
        epicFieldIds: config.epicFieldIds
      });
      const fields = issue.fields;
      const assignee = fields.assignee;

      return {
        key: snapshot.key,
        summary: snapshot.summary,
        status: snapshot.status,
        issueType: snapshot.issueType,
        priority: readTextValue(fields.priority) || undefined,
        assigneeName: readTextValue(assignee) || undefined,
        assigneeAvatarUrl: readAvatarUrl(assignee),
        sprintNames: snapshot.sprintNames,
        updatedAt: snapshot.updatedAt,
        createdAt: readTextValue(fields.created) || undefined,
        url: `${normalizeBaseUrl(config.jiraBaseUrl)}/browse/${encodeURIComponent(snapshot.key)}`
      };
    });

    return {
      ok: true,
      status: 'succeeded',
      message: `Scanned ${scanIssues.length} Jira issues for ${projectKey}`,
      runId,
      logFile: LOG_FILE_HINT,
      repoId: config.repoId,
      projectKey,
      boardId: config.boardId,
      jql,
      issueCount: scanIssues.length,
      total: searchResult.total,
      statusCounts: countBy(scanIssues, (issue) => issue.status),
      typeCounts: countBy(scanIssues, (issue) => issue.issueType),
      issues: scanIssues,
      sprints: sprintResult.sprints,
      warnings: sprintResult.warnings.length > 0 ? sprintResult.warnings : undefined,
      durationMs: Date.now() - startedAt,
      scannedAt,
      httpStatus: searchResult.httpStatus
    };
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown Jira scan error',
      runId,
      logFile: LOG_FILE_HINT,
      repoId: config.repoId,
      projectKey,
      boardId: config.boardId,
      jql,
      issueCount: 0,
      statusCounts: {},
      typeCounts: {},
      issues: [],
      sprints: [],
      durationMs: Date.now() - startedAt,
      scannedAt
    };
  }
}

async function handleJiraTestConnection(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, {
      ok: false,
      status: 'failed',
      message: 'Use POST to test a Jira connection'
    });
    return;
  }

  const runId = createRunId('jira-test');

  try {
    const config = parseCredentialDraft(await readBody(req));
    const result = await testJiraConnection(config);
    await recordRuntimeLog({
      runId,
      operation: 'jira.testConnection',
      status: result.ok ? 'succeeded' : 'failed',
      level: result.ok ? 'info' : 'error',
      repoId: config.repoId,
      projectKey: config.projectKey,
      message: result.message,
      durationMs: result.durationMs,
      httpStatus: result.httpStatus,
      metadata: {
        endpoint: `/rest/api/${config.mode === 'server' ? 2 : 3}/myself`,
        mode: config.mode,
        boardId: config.boardId,
        jqlScope: config.jqlScope
      }
    });
    sendJson(res, 200, {
      ...result,
      runId,
      logFile: LOG_FILE_HINT
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Jira connection request';
    await recordRuntimeLog({
      runId,
      operation: 'jira.testConnection',
      status: 'failed',
      level: 'error',
      message
    });
    sendJson(res, 400, {
      ok: false,
      status: 'failed',
      message,
      runId,
      logFile: LOG_FILE_HINT
    });
  }
}

async function handleJiraScan(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, {
      ok: false,
      status: 'failed',
      message: 'Use POST to scan Jira'
    });
    return;
  }

  try {
    const config = parseCredentialDraft(await readBody(req));
    const result = await scanJiraProject(config);
    await recordRuntimeLog({
      runId: result.runId,
      operation: 'jira.scan',
      status: result.status,
      level: result.ok ? 'info' : 'error',
      repoId: result.repoId,
      projectKey: result.projectKey,
      message: result.message,
      durationMs: result.durationMs,
      httpStatus: result.httpStatus,
      metadata: {
        endpoint: getJiraSearchPath(config.mode),
        boardId: result.boardId,
        issueCount: result.issueCount,
        total: result.total,
        sprintCount: result.sprints.length,
        warnings: result.warnings,
        jql: result.jql
      }
    });
    sendJson(res, result.ok ? 200 : 400, result);
  } catch (error) {
    const runId = createRunId('jira-scan');
    const message = error instanceof Error ? error.message : 'Invalid Jira scan request';
    await recordRuntimeLog({
      runId,
      operation: 'jira.scan',
      status: 'failed',
      level: 'error',
      message
    });
    sendJson(res, 400, {
      ok: false,
      status: 'failed',
      message,
      runId,
      logFile: LOG_FILE_HINT
    });
  }
}

export default defineConfig({
  root: 'web',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'jira-kb-local-api',
      configureServer(server) {
        server.middlewares.use(JIRA_TEST_CONNECTION_PATH, handleJiraTestConnection);
        server.middlewares.use(JIRA_SCAN_PATH, handleJiraScan);
      },
      configurePreviewServer(server) {
        server.middlewares.use(JIRA_TEST_CONNECTION_PATH, handleJiraTestConnection);
        server.middlewares.use(JIRA_SCAN_PATH, handleJiraScan);
      }
    }
  ],
  server: {
    host: '127.0.0.1',
    port: 4173
  },
  build: {
    outDir: '../dist/web',
    emptyOutDir: true
  }
});

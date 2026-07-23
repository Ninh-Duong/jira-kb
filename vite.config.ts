import type { IncomingMessage, ServerResponse } from 'node:http';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import {
  buildJiraAuthHeader,
  buildJiraSearchUrl,
  normalizeBaseUrl,
  testJiraConnection
} from './src/connectors/jira';
import { extractJiraIssueSnapshot } from './src/extractors/jira';
import type { JiraCredentialDraft } from './src/models/repo';
import type { JiraIssuePayload } from './src/models/ticket';

const JIRA_TEST_CONNECTION_PATH = '/api/jira/test-connection';
const JIRA_SCAN_PATH = '/api/jira/scan';
const SCAN_MAX_RESULTS = 25;

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

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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
    mode: payload.mode === 'server' ? 'server' : 'cloud'
  };
}

interface JiraSearchResponse {
  issues?: unknown[];
  total?: unknown;
}

interface JiraScanIssue {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  updatedAt: string;
  url: string;
}

interface JiraScanResult {
  ok: boolean;
  status: 'succeeded' | 'failed';
  message: string;
  repoId: string;
  projectKey: string;
  jql: string;
  issueCount: number;
  total?: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  issues: JiraScanIssue[];
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

function buildProjectJql(projectKey: string): string {
  return `project = ${projectKey.toUpperCase()} ORDER BY updated DESC`;
}

function validateScanConfig(config: JiraCredentialDraft): string | null {
  if (!config.repoId || !config.jiraBaseUrl || !config.accountEmail || !config.apiToken || !config.projectKey) {
    return 'Missing Jira scan fields';
  }

  if (!/^[A-Z][A-Z0-9_]*$/i.test(config.projectKey)) {
    return 'Project key must contain only letters, numbers, or underscores';
  }

  return null;
}

async function scanJiraProject(config: JiraCredentialDraft): Promise<JiraScanResult> {
  const startedAt = Date.now();
  const scannedAt = new Date().toISOString();
  const projectKey = config.projectKey.toUpperCase();
  const jql = buildProjectJql(projectKey);
  const validationError = validateScanConfig(config);

  if (validationError) {
    return {
      ok: false,
      status: 'failed',
      message: validationError,
      repoId: config.repoId,
      projectKey,
      jql,
      issueCount: 0,
      statusCounts: {},
      typeCounts: {},
      issues: [],
      durationMs: Date.now() - startedAt,
      scannedAt
    };
  }

  const url = buildJiraSearchUrl(
    config,
    jql,
    ['summary', 'status', 'issuetype', 'labels', 'components', 'updated', 'description', 'issuelinks'],
    0,
    SCAN_MAX_RESULTS
  );

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: buildJiraAuthHeader(config.accountEmail, config.apiToken)
      }
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: 'failed',
        message: readJiraError(payload),
        repoId: config.repoId,
        projectKey,
        jql,
        issueCount: 0,
        statusCounts: {},
        typeCounts: {},
        issues: [],
        durationMs: Date.now() - startedAt,
        scannedAt,
        httpStatus: response.status
      };
    }

    const searchPayload = payload as JiraSearchResponse;
    const issues = Array.isArray(searchPayload.issues)
      ? searchPayload.issues.filter(isJiraIssuePayload)
      : [];

    const scanIssues = issues.map((issue) => {
      const snapshot = extractJiraIssueSnapshot(issue, {
        repoId: config.repoId
      });

      return {
        key: snapshot.key,
        summary: snapshot.summary,
        status: snapshot.status,
        issueType: snapshot.issueType,
        updatedAt: snapshot.updatedAt,
        url: `${normalizeBaseUrl(config.jiraBaseUrl)}/browse/${encodeURIComponent(snapshot.key)}`
      };
    });

    return {
      ok: true,
      status: 'succeeded',
      message: `Scanned ${scanIssues.length} Jira issues for ${projectKey}`,
      repoId: config.repoId,
      projectKey,
      jql,
      issueCount: scanIssues.length,
      total: typeof searchPayload.total === 'number' ? searchPayload.total : undefined,
      statusCounts: countBy(scanIssues, (issue) => issue.status),
      typeCounts: countBy(scanIssues, (issue) => issue.issueType),
      issues: scanIssues,
      durationMs: Date.now() - startedAt,
      scannedAt,
      httpStatus: response.status
    };
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown Jira scan error',
      repoId: config.repoId,
      projectKey,
      jql,
      issueCount: 0,
      statusCounts: {},
      typeCounts: {},
      issues: [],
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

  try {
    const config = parseCredentialDraft(await readBody(req));
    const result = await testJiraConnection(config);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Invalid Jira connection request'
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
    sendJson(res, result.ok ? 200 : 400, result);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Invalid Jira scan request'
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

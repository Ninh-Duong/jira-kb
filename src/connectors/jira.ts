import type { ConnectionTestResult, JiraCredentialDraft } from '../models/repo';

const DEFAULT_FIELDS = [
  'summary',
  'status',
  'issuetype',
  'labels',
  'components',
  'updated',
  'description',
  'issuelinks'
];

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function getJiraApiVersion(mode: JiraCredentialDraft['mode']): 2 | 3 {
  return mode === 'server' ? 2 : 3;
}

export function buildJiraAuthHeader(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
}

export function buildJiraSearchUrl(
  config: Pick<JiraCredentialDraft, 'jiraBaseUrl' | 'mode'>,
  jql: string,
  fields = DEFAULT_FIELDS,
  startAt = 0,
  maxResults = 50
): string {
  const baseUrl = normalizeBaseUrl(config.jiraBaseUrl);
  const apiVersion = getJiraApiVersion(config.mode);
  const url = new URL(`${baseUrl}/rest/api/${apiVersion}/search`);
  url.searchParams.set('jql', jql);
  url.searchParams.set('fields', fields.join(','));
  url.searchParams.set('startAt', String(startAt));
  url.searchParams.set('maxResults', String(maxResults));
  return url.toString();
}

export function buildJiraIssueUrl(config: Pick<JiraCredentialDraft, 'jiraBaseUrl' | 'mode'>, key: string): string {
  const baseUrl = normalizeBaseUrl(config.jiraBaseUrl);
  const apiVersion = getJiraApiVersion(config.mode);
  return `${baseUrl}/rest/api/${apiVersion}/issue/${encodeURIComponent(key)}`;
}

export async function testJiraConnection(config: JiraCredentialDraft): Promise<ConnectionTestResult> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  if (!config.jiraBaseUrl || !config.accountEmail || !config.apiToken) {
    return {
      ok: false,
      status: 'failed',
      message: 'Missing Jira credentials',
      durationMs: Date.now() - startedAt,
      checkedAt
    };
  }

  try {
    const response = await fetch(`${normalizeBaseUrl(config.jiraBaseUrl)}/rest/api/${getJiraApiVersion(config.mode)}/myself`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: buildJiraAuthHeader(config.accountEmail, config.apiToken)
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 'failed',
        message: `Jira rejected the connection with HTTP ${response.status}`,
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        checkedAt
      };
    }

    return {
      ok: true,
      status: 'connected',
      message: `Connected to ${config.displayName}`,
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      checkedAt
    };
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown Jira connection error',
      durationMs: Date.now() - startedAt,
      checkedAt
    };
  }
}

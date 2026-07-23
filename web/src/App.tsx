import { useEffect, useMemo, useState } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { HeaderNav } from './components/HeaderNav';
import { Activity, Kanban as KanbanIcon, ClipboardList } from 'lucide-react';
import { ProjectInfoPage } from './components/ProjectInfoPage';
import type { ColumnStatus, Priority, Ticket } from './types/kanban';
import type { RepoSprint, RepoView, SprintStatus } from './types/project';

type ConnectionState = 'idle' | 'testing' | 'connected' | 'failed';
type ScanState = 'idle' | 'scanning' | 'succeeded' | 'failed';
type WorkspaceView = 'board' | 'project' | 'activity';

interface JiraCredentialPayload {
  repoId: string;
  displayName: string;
  jiraBaseUrl: string;
  accountEmail: string;
  apiToken: string;
  projectKey: string;
  boardId: string;
  jqlScope: string;
  sprintFieldIds: string[];
  mode: 'cloud' | 'server';
}

interface LogEntry {
  id: string;
  step: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  time: string;
  note?: string;
}

interface ConnectionTestResponse {
  ok: boolean;
  message?: string;
  httpStatus?: number;
  durationMs?: number;
  runId?: string;
  logFile?: string;
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

interface JiraScanSprint {
  id: number;
  name: string;
  state: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

interface JiraScanResponse {
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
  sprints: JiraScanSprint[];
  warnings?: string[];
  durationMs: number;
  scannedAt: string;
  httpStatus?: number;
}

const TICKET_STORAGE_KEY = 'jira-kb-tickets';

const repos: RepoView[] = [
  {
    id: 'wecrm-eager',
    name: 'WeCRM-Eager',
    projectKey: 'WCE',
    sprints: [
      { name: 'Sprint 41', status: 'completed', goal: 'Stabilize billing and sync flows' },
      { name: 'Sprint 42', status: 'completed', goal: 'Finish intake cleanup and QA fixes' },
      { name: 'Sprint 43', status: 'in-progress', goal: 'Close current delivery blockers' },
      { name: 'Sprint 44', status: 'planned', goal: 'Hardening and release prep' }
    ]
  }
];

function loadStoredTickets(): Ticket[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(TICKET_STORAGE_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as Ticket[]) : [];
  } catch (error) {
    console.warn('Failed to load tickets from localStorage:', error);
    return [];
  }
}

function mapJiraStatusToColumn(status: string): ColumnStatus {
  const normalized = status.trim().toLowerCase();

  if (normalized.includes('done') || normalized.includes('closed') || normalized.includes('resolved')) {
    return 'Done';
  }

  if (normalized.includes('in progress') || normalized.includes('development')) {
    return 'In Progress';
  }

  if (normalized.includes('review') || normalized.includes('testing') || normalized.includes('uat') || normalized.includes('ready')) {
    return 'Review / QA';
  }

  if (normalized.includes('selected')) {
    return 'Selected for Development';
  }

  return 'Backlog';
}

function normalizePriority(priority: string | undefined): Priority {
  switch (priority) {
    case 'Highest':
    case 'High':
    case 'Medium':
    case 'Low':
    case 'Lowest':
      return priority;
    default:
      return 'Medium';
  }
}

function mapSprintState(state: string): SprintStatus {
  switch (state.toLowerCase()) {
    case 'closed':
      return 'completed';
    case 'active':
      return 'in-progress';
    default:
      return 'planned';
  }
}

function mapScanSprints(sprints: JiraScanSprint[]): RepoSprint[] {
  return sprints.map((sprint) => ({
    name: sprint.name,
    status: mapSprintState(sprint.state),
    goal: sprint.goal
  }));
}

function mapScanIssuesToTickets(issues: JiraScanIssue[]): Ticket[] {
  return issues.map((issue) => ({
    id: issue.key,
    key: issue.key,
    summary: issue.summary,
    type: issue.issueType,
    priority: normalizePriority(issue.priority),
    status: mapJiraStatusToColumn(issue.status),
    jiraStatus: issue.status,
    assignee: issue.assigneeName
      ? {
          id: issue.assigneeName,
          name: issue.assigneeName,
          avatarUrl: issue.assigneeAvatarUrl ?? ''
        }
      : null,
    sprintName: issue.sprintNames[0],
    createdAt: issue.createdAt ? issue.createdAt.split('T')[0] : issue.updatedAt.split('T')[0],
    description: issue.url
  }));
}

const initialLogs: LogEntry[] = [
  {
    id: 'log-1',
    step: 'preflight',
    level: 'info',
    message: 'Workspace initialized',
    time: 'local',
    note: 'jira-kb workspace ready.'
  }
];

function ConfigHint({ children }: { children: string }) {
  return <p className="mt-1 text-[11px] leading-snug text-slate-500">{children}</p>;
}

export default function App() {
  const [selectedRepoId] = useState(repos[0].id);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('board');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectionMessage, setConnectionMessage] = useState('Jira connection has not been tested yet.');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanMessage, setScanMessage] = useState('No Jira scan has run yet.');
  const [scanResult, setScanResult] = useState<JiraScanResponse | null>(null);
  const [logs, setLogs] = useState(initialLogs);
  const [tickets, setTickets] = useState<Ticket[]>(loadStoredTickets);
  const [credentialForm, setCredentialForm] = useState({
    displayName: 'WeCRM-Eager',
    baseUrl: 'https://siliconstack.atlassian.net',
    accountEmail: 'ninh.duong@wecrm.io',
    apiToken: '',
    projectKey: 'WCE',
    boardId: '',
    jqlScope: 'project = WCE',
    sprintFieldIds: 'customfield_10020'
  });

  const repo = useMemo(
    () => repos.find((item) => item.id === selectedRepoId) ?? repos[0],
    [selectedRepoId]
  );
  const scannedSprints = scanResult?.sprints ? mapScanSprints(scanResult.sprints) : [];
  const activeRepo: RepoView = {
    ...repo,
    name: credentialForm.displayName.trim() || repo.name,
    projectKey: credentialForm.projectKey.trim() || repo.projectKey,
    sprints: scannedSprints.length > 0 ? scannedSprints : repo.sprints
  };
  const viewLabel = workspaceView === 'board' ? 'Kanban Board' : workspaceView === 'project' ? 'Project Info' : 'Activity Logs';
  const defaultSprintName = activeRepo.sprints.find((sprint) => sprint.status === 'in-progress')?.name ?? activeRepo.sprints[0]?.name ?? '';
  const sprintOptions = activeRepo.sprints.map((sprint) => sprint.name);

  useEffect(() => {
    try {
      window.localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(tickets));
    } catch (error) {
      console.warn('Failed to save tickets to localStorage:', error);
    }
  }, [tickets]);

  function appendLog(entry: Omit<LogEntry, 'id' | 'time'>) {
    const nextEntry: LogEntry = {
      ...entry,
      id: `log-${Date.now()}`,
      time: new Date().toLocaleTimeString()
    };
    setLogs((current) => [nextEntry, ...current]);
  }

  function formatLogRef(message: string, result: { runId?: string; logFile?: string }): string {
    return result.runId ? `${message} | ${result.logFile ?? 'logs/system.jsonl'} | runId: ${result.runId}` : message;
  }

  function updateCredentialField(field: keyof typeof credentialForm, value: string) {
    setCredentialForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function buildCredentialPayload(): JiraCredentialPayload {
    return {
      repoId: selectedRepoId,
      displayName: credentialForm.displayName.trim(),
      jiraBaseUrl: credentialForm.baseUrl.trim(),
      accountEmail: credentialForm.accountEmail.trim(),
      apiToken: credentialForm.apiToken.trim(),
      projectKey: credentialForm.projectKey.trim(),
      boardId: credentialForm.boardId.trim(),
      jqlScope: credentialForm.jqlScope.trim(),
      sprintFieldIds: credentialForm.sprintFieldIds
        .split(',')
        .map((fieldId) => fieldId.trim())
        .filter(Boolean),
      mode: 'cloud'
    };
  }

  function hasRequiredCredentialFields(credentials: JiraCredentialPayload): boolean {
    return Boolean(
      credentials.displayName &&
        credentials.jiraBaseUrl &&
        credentials.accountEmail &&
        credentials.apiToken &&
        credentials.projectKey
    );
  }

  async function testConnection() {
    const credentials = buildCredentialPayload();

    if (!hasRequiredCredentialFields(credentials)) {
      setConnectionState('failed');
      setConnectionMessage('Missing Jira credential fields.');
      appendLog({
        step: 'credential',
        level: 'error',
        message: 'Connection failed',
        note: 'Missing Jira credential fields.'
      });
      return;
    }

    if (credentials.apiToken.includes('•')) {
      setConnectionState('failed');
      setConnectionMessage('Enter a real Jira API token before testing.');
      appendLog({
        step: 'credential',
        level: 'error',
        message: 'Connection failed',
        note: 'API token is still masked.'
      });
      return;
    }

    setConnectionState('testing');
    setConnectionMessage('Testing Jira connection...');

    try {
      const response = await fetch('/api/jira/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const result = (await response.json()) as ConnectionTestResponse;

      if (!response.ok || !result.ok) {
        const message = result.message ?? `Connection failed with HTTP ${response.status}`;
        const note = formatLogRef(message, result);
        setConnectionState('failed');
        setConnectionMessage(note);
        appendLog({
          step: 'credential',
          level: 'error',
          message: 'Connection failed',
          note
        });
        return;
      }

      const successMessage = result.message ?? 'Connection succeeded';
      setConnectionState('connected');
      setConnectionMessage(successMessage);
      appendLog({
        step: 'credential',
        level: 'info',
        message: 'Connection succeeded',
        note: result.durationMs ? `${successMessage} (${result.durationMs}ms)` : successMessage
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach local Jira test endpoint.';
      setConnectionState('failed');
      setConnectionMessage(message);
      appendLog({
        step: 'credential',
        level: 'error',
        message: 'Connection failed',
        note: message
      });
    }
  }

  async function scanJira() {
    const credentials = buildCredentialPayload();

    if (!hasRequiredCredentialFields(credentials)) {
      const message = 'Missing Jira credential fields.';
      setScanState('failed');
      setScanMessage(message);
      setScanResult(null);
      appendLog({
        step: 'scan',
        level: 'error',
        message: 'Jira scan failed',
        note: message
      });
      return;
    }

    if (credentials.apiToken.includes('•')) {
      const message = 'Enter a real Jira API token before scanning.';
      setScanState('failed');
      setScanMessage(message);
      setScanResult(null);
      appendLog({
        step: 'scan',
        level: 'error',
        message: 'Jira scan failed',
        note: 'API token is still masked.'
      });
      return;
    }

    setScanState('scanning');
    setScanMessage(`Scanning Jira project ${credentials.projectKey}...`);
    setScanResult(null);
    setWorkspaceView('project');
    appendLog({
      step: 'scan',
      level: 'info',
      message: 'Jira scan started',
      note: credentials.projectKey
    });

    try {
      const response = await fetch('/api/jira/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const result = (await response.json()) as JiraScanResponse;

      if (!response.ok || !result.ok) {
        const message = result.message ?? `Jira scan failed with HTTP ${response.status}`;
        const note = formatLogRef(message, result);
        setScanState('failed');
        setScanMessage(note);
        setScanResult(null);
        appendLog({
          step: 'scan',
          level: 'error',
          message: 'Jira scan failed',
          note
        });
        return;
      }

      setScanState('succeeded');
      setScanResult(result);
      setTickets(mapScanIssuesToTickets(result.issues));
      setScanMessage(result.message);
      appendLog({
        step: 'scan',
        level: 'info',
        message: 'Jira scan completed',
        note: `${result.issueCount} issues scanned in ${result.durationMs}ms${result.warnings?.length ? ` | ${result.warnings.join('; ')}` : ''}`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach local Jira scan endpoint.';
      setScanState('failed');
      setScanMessage(message);
      setScanResult(null);
      appendLog({
        step: 'scan',
        level: 'error',
        message: 'Jira scan failed',
        note: message
      });
    }
  }

  function saveCredential() {
    appendLog({
      step: 'credential',
      level: 'info',
      message: 'Credential profile stored',
      note: credentialForm.displayName
    });
    setConnectionMessage(`Saved profile for ${credentialForm.displayName}`);
    setDrawerOpen(false);
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* Left Navigation Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 flex-shrink-0 z-20">
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-black text-white text-sm shadow">
                J
              </div>
              <div>
                <h1 className="font-bold text-sm text-white tracking-wide">jira-kb</h1>
                <p className="text-[10px] text-slate-400 font-medium">Local Jira Workspace</p>
              </div>
            </div>

            <button
              onClick={() => setDrawerOpen(true)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors"
            >
              Config
            </button>
          </div>

          {/* Active Workspace Info */}
          <div className="p-4">
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase">
                <span>Active Project</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="font-bold text-sm text-white">{activeRepo.name}</p>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-700/60">
                <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-blue-400">
                  {activeRepo.projectKey}
                </span>
                <span>{tickets.length} issues</span>
              </div>
            </div>
          </div>

          {/* View Mode Navigation Links */}
          <nav className="px-3 space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Views
            </p>

            <button
              onClick={() => setWorkspaceView('board')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                workspaceView === 'board'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <KanbanIcon className="w-4 h-4" />
              <span>Kanban Board</span>
            </button>

            <button
              onClick={() => setWorkspaceView('project')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                workspaceView === 'project'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Project Info</span>
            </button>

            <button
              onClick={() => setWorkspaceView('activity')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                workspaceView === 'activity'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Activity Logs ({logs.length})</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed">
          jira-kb local workspace engine
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <HeaderNav
          projectName={activeRepo.name}
          projectKey={activeRepo.projectKey}
          viewLabel={viewLabel}
          connectionState={connectionState}
          scanState={scanState}
          onOpenCredential={() => setDrawerOpen(true)}
          onScan={scanJira}
        />

        {/* View Switch Content */}
        {workspaceView === 'board' && (
          <KanbanBoard
            tickets={tickets}
            onTicketsChange={setTickets}
            projectKey={activeRepo.projectKey}
            sprintOptions={sprintOptions}
            defaultSprintName={defaultSprintName}
          />
        )}

        {workspaceView === 'project' && (
          <ProjectInfoPage repo={activeRepo} tickets={tickets} scanResult={scanResult} />
        )}

        {workspaceView === 'activity' && (
          <div className="p-6 overflow-y-auto space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Run Logs & Activity</h2>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 uppercase mr-2">{log.step}</span>
                    <span className="text-slate-600">{log.message}</span>
                    {log.note && <p className="text-slate-400 text-[11px] mt-0.5">{log.note}</p>}
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Credential Drawer Modal */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <h2 className="text-base font-bold text-slate-900">Jira Credentials</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Repo Name</label>
                  <input
                    type="text"
                    value={credentialForm.displayName}
                    onChange={(e) => updateCredentialField('displayName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                  <ConfigHint>Use the Jira space/project display name you want this local repo profile to represent.</ConfigHint>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jira Base URL</label>
                  <input
                    type="text"
                    value={credentialForm.baseUrl}
                    onChange={(e) => updateCredentialField('baseUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                  <ConfigHint>Copy only the Jira site origin from your browser, for example https://siliconstack.atlassian.net.</ConfigHint>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Account Email</label>
                  <input
                    type="text"
                    value={credentialForm.accountEmail}
                    onChange={(e) => updateCredentialField('accountEmail', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                  <ConfigHint>Use the email account that can open the Jira project and board in Atlassian.</ConfigHint>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">API Token</label>
                  <input
                    type="password"
                    value={credentialForm.apiToken}
                    onChange={(e) => updateCredentialField('apiToken', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                  <ConfigHint>Create this from Atlassian account settings under Security, then API tokens.</ConfigHint>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Project Key</label>
                  <input
                    type="text"
                    value={credentialForm.projectKey}
                    onChange={(e) => updateCredentialField('projectKey', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                  <ConfigHint>Open the project in Jira and copy the key from the URL or issue keys, for example WCE from WCE-877.</ConfigHint>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Board ID</label>
                  <input
                    type="text"
                    value={credentialForm.boardId}
                    onChange={(e) => updateCredentialField('boardId', e.target.value)}
                    placeholder="e.g. 123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                  <ConfigHint>Open the exact Jira board and copy the number after /boards/ in the board URL; leave blank to scan issues without board sprint lookup.</ConfigHint>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">JQL Scope</label>
                  <textarea
                    rows={3}
                    value={credentialForm.jqlScope}
                    onChange={(e) => updateCredentialField('jqlScope', e.target.value)}
                    placeholder='project = WCE AND component = "Eager"'
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md resize-none"
                  />
                  <ConfigHint>Use Jira Advanced issue search, filter the exact repo scope, then copy the JQL such as project = WCE AND component = "Eager".</ConfigHint>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Sprint Field IDs</label>
                  <input
                    type="text"
                    value={credentialForm.sprintFieldIds}
                    onChange={(e) => updateCredentialField('sprintFieldIds', e.target.value)}
                    placeholder="customfield_10020"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                  <ConfigHint>Usually customfield_10020 on Jira Cloud; add comma-separated field IDs if your Jira uses another Sprint custom field.</ConfigHint>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-3 text-xs" aria-live="polite">
                <span className="font-semibold text-slate-600">Connection test</span>
                <span
                  className={`text-right font-medium ${
                    connectionState === 'connected'
                      ? 'text-emerald-700'
                      : connectionState === 'failed'
                        ? 'text-red-600'
                        : connectionState === 'testing'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                  }`}
                >
                  {connectionMessage}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={testConnection}
                  disabled={connectionState === 'testing'}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 rounded-md"
                >
                  {connectionState === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCredential}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

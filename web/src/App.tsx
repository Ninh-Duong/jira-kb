import { useMemo, useState } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { HeaderNav } from './components/HeaderNav';
import { Activity, LayoutGrid, Kanban as KanbanIcon } from 'lucide-react';

type ConnectionState = 'idle' | 'testing' | 'connected' | 'failed';
type ScanState = 'idle' | 'scanning' | 'succeeded' | 'failed';
type WorkspaceView = 'board' | 'overview' | 'activity';

interface JiraCredentialPayload {
  repoId: string;
  displayName: string;
  jiraBaseUrl: string;
  accountEmail: string;
  apiToken: string;
  projectKey: string;
  mode: 'cloud' | 'server';
}

interface RepoView {
  id: string;
  name: string;
  projectKey: string;
  sprints: string[];
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
}

interface JiraScanIssue {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  updatedAt: string;
  url: string;
}

interface JiraScanResponse {
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

const repos: RepoView[] = [
  {
    id: 'wecrm-eager',
    name: 'WeCRM-eager',
    projectKey: 'WECRM',
    sprints: ['Sprint 42', 'Sprint 43']
  }
];

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
  const [liveTicketCount, setLiveTicketCount] = useState(0);
  const [credentialForm, setCredentialForm] = useState({
    displayName: 'WeCRM-eager',
    baseUrl: 'https://wecrm.atlassian.net',
    accountEmail: 'ninh.duong@wecrm.io',
    apiToken: '',
    projectKey: 'WECRM'
  });

  const repo = useMemo(
    () => repos.find((item) => item.id === selectedRepoId) ?? repos[0],
    [selectedRepoId]
  );
  const recentScanIssues = scanResult?.issues.slice(0, 8) ?? [];
  const scanStatusColorMap = {
    idle: 'bg-slate-100 text-slate-600 border-slate-200',
    scanning: 'bg-amber-50 text-amber-700 border-amber-200',
    succeeded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-700 border-red-200'
  };

  function appendLog(entry: Omit<LogEntry, 'id' | 'time'>) {
    const nextEntry: LogEntry = {
      ...entry,
      id: `log-${Date.now()}`,
      time: new Date().toLocaleTimeString()
    };
    setLogs((current) => [nextEntry, ...current]);
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
        setConnectionState('failed');
        setConnectionMessage(message);
        appendLog({
          step: 'credential',
          level: 'error',
          message: 'Connection failed',
          note: message
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
    setWorkspaceView('overview');
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

      setScanState('succeeded');
      setScanResult(result);
      setScanMessage(result.message);
      appendLog({
        step: 'scan',
        level: 'info',
        message: 'Jira scan completed',
        note: `${result.issueCount} issues scanned in ${result.durationMs}ms`
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
              <p className="font-bold text-sm text-white">{repo.name}</p>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-700/60">
                <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-blue-400">
                  {repo.projectKey}
                </span>
                <span>{liveTicketCount} issues</span>
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
              onClick={() => setWorkspaceView('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                workspaceView === 'overview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Workspace Overview</span>
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
          projectName={repo.name}
          projectKey={repo.projectKey}
          connectionState={connectionState}
          scanState={scanState}
          onOpenCredential={() => setDrawerOpen(true)}
          onScan={scanJira}
        />

        {/* View Switch Content */}
        {workspaceView === 'board' && (
          <KanbanBoard onTicketCountChange={setLiveTicketCount} />
        )}

        {workspaceView === 'overview' && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Workspace Overview</h2>
              <p className="text-xs text-slate-600 mb-4">
                Current metrics for project {repo.projectKey} ({repo.name}).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-md">
                  <span className="text-xs text-slate-500 uppercase font-bold">Board Issues</span>
                  <p className="text-2xl font-extrabold text-blue-600 mt-1">{liveTicketCount}</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-md">
                  <span className="text-xs text-slate-500 uppercase font-bold">Project Key</span>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{repo.projectKey}</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-md">
                  <span className="text-xs text-slate-500 uppercase font-bold">Last Jira Scan</span>
                  <p className="text-sm font-bold text-slate-800 mt-2">
                    {scanResult ? new Date(scanResult.scannedAt).toLocaleString() : 'Not scanned yet'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Jira Scan</h3>
                  <p className="text-xs text-slate-500 mt-1">{scanMessage}</p>
                </div>
                <span
                  className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${scanStatusColorMap[scanState]}`}
                >
                  {scanState}
                </span>
              </div>

              {scanResult ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="border-l-2 border-blue-500 pl-3">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Scanned</span>
                      <p className="text-2xl font-extrabold text-slate-900">{scanResult.issueCount}</p>
                    </div>
                    <div className="border-l-2 border-emerald-500 pl-3">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Jira Total</span>
                      <p className="text-2xl font-extrabold text-slate-900">
                        {scanResult.total ?? scanResult.issueCount}
                      </p>
                    </div>
                    <div className="border-l-2 border-amber-500 pl-3">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Duration</span>
                      <p className="text-2xl font-extrabold text-slate-900">{scanResult.durationMs}ms</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Status Breakdown</h4>
                      <div className="space-y-2">
                        {Object.entries(scanResult.statusCounts).length > 0 ? (
                          Object.entries(scanResult.statusCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">{status}</span>
                              <span className="font-bold text-slate-900">{count}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400">No statuses returned.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Issue Types</h4>
                      <div className="space-y-2">
                        {Object.entries(scanResult.typeCounts).length > 0 ? (
                          Object.entries(scanResult.typeCounts).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">{type}</span>
                              <span className="font-bold text-slate-900">{count}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400">No issue types returned.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Recent Issues</h4>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
                      {recentScanIssues.length > 0 ? (
                        recentScanIssues.map((issue) => (
                          <a
                            key={issue.key}
                            href={issue.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-slate-50"
                          >
                            <span className="min-w-0">
                              <span className="font-bold text-blue-700 mr-2">{issue.key}</span>
                              <span className="text-slate-700">{issue.summary}</span>
                            </span>
                            <span className="shrink-0 text-slate-500">
                              {issue.status} - {issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : 'Unknown'}
                            </span>
                          </a>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-slate-400">No issues returned.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 rounded-md px-4 py-5 text-xs text-slate-500">
                  No scan result yet.
                </div>
              )}
            </div>
          </div>
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
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jira Base URL</label>
                  <input
                    type="text"
                    value={credentialForm.baseUrl}
                    onChange={(e) => updateCredentialField('baseUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Account Email</label>
                  <input
                    type="text"
                    value={credentialForm.accountEmail}
                    onChange={(e) => updateCredentialField('accountEmail', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">API Token</label>
                  <input
                    type="password"
                    value={credentialForm.apiToken}
                    onChange={(e) => updateCredentialField('apiToken', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Project Key</label>
                  <input
                    type="text"
                    value={credentialForm.projectKey}
                    onChange={(e) => updateCredentialField('projectKey', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
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

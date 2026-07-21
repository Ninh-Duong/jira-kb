import { useMemo, useState } from 'react';

type ConnectionState = 'idle' | 'testing' | 'connected' | 'failed';
type WorkspaceView = 'overview' | 'sprint' | 'activity';

interface RepoView {
  id: string;
  name: string;
  projectKey: string;
  lastSync: string;
  ticketCount: number;
  sprints: string[];
  statusCounts: Record<string, number>;
}

interface LogEntry {
  id: string;
  step: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  time: string;
  note?: string;
}

const repos: RepoView[] = [
  {
    id: 'wecrm-eager',
    name: 'WeCRM-eager',
    projectKey: 'WECRM',
    lastSync: 'Today 09:42',
    ticketCount: 68,
    sprints: ['All repo', 'Sprint 42', 'Sprint 43'],
    statusCounts: {
      Backlog: 18,
      'In Progress': 8,
      'Review / QA': 3,
      Done: 39
    }
  }
];

const initialLogs: LogEntry[] = [
  {
    id: 'log-1',
    step: 'preflight',
    level: 'info',
    message: 'Workspace ready',
    time: 'local',
    note: 'Dependency gate passed.'
  }
];

const viewModes: Array<{ id: WorkspaceView; label: string; note: string }> = [
  { id: 'overview', label: 'Overview', note: 'Repo structure' },
  { id: 'sprint', label: 'Sprint', note: 'Selected sprint' },
  { id: 'activity', label: 'Activity', note: 'Run log and notes' }
];

function connectionClass(state: ConnectionState): string {
  return `status-pill ${state}`;
}

function createMermaid(repo: RepoView, scopeLabel: string): string {
  const lines = ['flowchart LR', `  scope["${scopeLabel}"]`];

  for (const [status, count] of Object.entries(repo.statusCounts)) {
    const nodeId = status.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    lines.push(`  scope --> ${nodeId}["${status} (${count})"]`);
  }

  return lines.join('\n');
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export default function App() {
  const [selectedRepoId, setSelectedRepoId] = useState(repos[0].id);
  const [selectedSprint, setSelectedSprint] = useState(repos[0].sprints[0]);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectionMessage, setConnectionMessage] = useState('No connection checked yet');
  const [logs, setLogs] = useState(initialLogs);
  const [note, setNote] = useState('');
  const [credentialForm, setCredentialForm] = useState({
    displayName: 'WeCRM-eager',
    baseUrl: '',
    accountEmail: '',
    apiToken: '',
    projectKey: 'WECRM'
  });

  const repo = useMemo(() => repos.find((item) => item.id === selectedRepoId) ?? repos[0], [selectedRepoId]);
  const overviewMermaid = useMemo(() => createMermaid(repo, repo.name), [repo]);
  const sprintMermaid = useMemo(() => createMermaid(repo, selectedSprint), [repo, selectedSprint]);

  const summaryCards = [
    { label: 'Tickets', value: repo.ticketCount },
    { label: 'Active sprints', value: repo.sprints.length - 1 },
    { label: 'Last sync', value: repo.lastSync }
  ];

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

  function selectRepo(id: string) {
    const next = repos.find((item) => item.id === id) ?? repos[0];
    setSelectedRepoId(id);
    setSelectedSprint(next.sprints[0]);
    setConnectionMessage(`Workspace loaded for ${next.projectKey}`);
  }

  function testConnection() {
    setConnectionState('testing');
    setConnectionMessage('Testing Jira connection...');

    window.setTimeout(() => {
      const hasRequiredFields =
        credentialForm.displayName &&
        credentialForm.baseUrl &&
        credentialForm.accountEmail &&
        credentialForm.apiToken &&
        credentialForm.projectKey;

      if (!hasRequiredFields) {
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

      setConnectionState('connected');
      setConnectionMessage('Connection succeeded');
      appendLog({
        step: 'credential',
        level: 'info',
        message: 'Connection succeeded',
        note: note || 'Credential saved locally.'
      });
    }, 700);
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

  function renderMainContent() {
    if (workspaceView === 'activity') {
      return (
        <>
          <div className="panel-copy">
            <p className="eyebrow">Recent runs</p>
            <h3>Logs and notes</h3>
            <p className="panel-note">Use this view to trace connection checks, scan failures, and daily sync notes.</p>
          </div>

          <div className="log-list log-list-large">
            {logs.map((entry) => (
              <article className={`log-entry ${entry.level}`} key={entry.id}>
                <div className="log-topline">
                  <strong>{entry.step}</strong>
                  <span>{entry.time}</span>
                </div>
                <p>{entry.message}</p>
                {entry.note ? <small>{entry.note}</small> : null}
              </article>
            ))}
          </div>
        </>
      );
    }

    if (workspaceView === 'sprint') {
      return (
        <>
          <div className="panel-copy">
            <p className="eyebrow">Sprint focus</p>
            <h3>{selectedSprint}</h3>
            <p className="panel-note">This view shows only the selected sprint so DEV, BA, and QC can scan scope quickly.</p>
          </div>

          <div className="sprint-picker" role="tablist" aria-label="Sprint">
            {repo.sprints.map((sprint) => (
              <button
                className={sprint === selectedSprint ? 'sprint-pill active' : 'sprint-pill'}
                key={sprint}
                onClick={() => setSelectedSprint(sprint)}
                type="button"
              >
                {sprint}
              </button>
            ))}
          </div>

          <div className="lane-grid">
            {Object.entries(repo.statusCounts).map(([status, count]) => (
              <div className="lane-card" key={`sprint-${status}`}>
                <span>{status}</span>
                <strong>{formatNumber(count)}</strong>
              </div>
            ))}
          </div>

          <pre className="mermaid-preview">{sprintMermaid}</pre>
        </>
      );
    }

    return (
      <>
        <div className="panel-copy">
          <p className="eyebrow">Repo overview</p>
          <h3>All issues in this workspace</h3>
          <p className="panel-note">This view gives a fast picture of the whole repo without opening Jira ticket by ticket.</p>
        </div>

        <div className="lane-grid">
          {Object.entries(repo.statusCounts).map(([status, count]) => (
            <div className="lane-card" key={status}>
              <span>{status}</span>
              <strong>{formatNumber(count)}</strong>
            </div>
          ))}
        </div>

        <pre className="mermaid-preview">{overviewMermaid}</pre>
      </>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div>
            <p className="eyebrow sidebar-eyebrow">Local tool</p>
            <h1>jira-kb</h1>
          </div>

          <button className="ghost-button" onClick={() => setDrawerOpen(true)} type="button">
            Add
          </button>
        </div>

        <section className="workspace-card">
          <div className="workspace-card-head">
            <span>Workspace</span>
            <span className={connectionClass(connectionState)}>{connectionState}</span>
          </div>

          <strong>{repo.name}</strong>
          <p>{connectionMessage}</p>

          <div className="workspace-meta">
            <span>{repo.projectKey}</span>
            <span>{formatNumber(repo.ticketCount)} tickets</span>
            <span>{repo.sprints.length - 1} sprints</span>
          </div>
        </section>

        <nav className="repo-list" aria-label="Repositories">
          {repos.map((item) => (
            <button
              className={item.id === selectedRepoId ? 'repo-item active' : 'repo-item'}
              key={item.id}
              onClick={() => selectRepo(item.id)}
              type="button"
            >
              <strong>{item.name}</strong>
              <span>{item.projectKey}</span>
            </button>
          ))}
        </nav>

        <section className="sidebar-footnote">
          Keep secrets, logs, and sync data local. Git only gets the scaffold and docs.
        </section>
      </aside>

      <main className="main">
        <header className="page-head">
          <div className="page-copy">
            <p className="eyebrow">{repo.projectKey}</p>
            <h2>{repo.name}</h2>
            <p className="page-subtitle">Workspace overview for DEV, BA, and QC</p>
          </div>

          <div className="page-actions">
            <span className={connectionClass(connectionState)}>{connectionState}</span>
            <button onClick={() => setDrawerOpen(true)} type="button">
              Credential
            </button>
            <button className="primary-button" type="button">
              Sync
            </button>
          </div>
        </header>

        <section className="summary-grid">
          {summaryCards.map((item) => (
            <article className="summary-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{typeof item.value === 'number' ? formatNumber(item.value) : item.value}</strong>
            </article>
          ))}
        </section>

        <section className="toolbar">
          <div className="segmented">
            {viewModes.map((mode) => (
              <button
                aria-pressed={workspaceView === mode.id}
                className={workspaceView === mode.id ? 'segment active' : 'segment'}
                key={mode.id}
                onClick={() => setWorkspaceView(mode.id)}
                type="button"
              >
                <strong>{mode.label}</strong>
                <span>{mode.note}</span>
              </button>
            ))}
          </div>

          {workspaceView === 'sprint' ? (
            <label className="inline-field">
              <span>Sprint</span>
              <select value={selectedSprint} onChange={(event) => setSelectedSprint(event.target.value)}>
                {repo.sprints.map((sprint) => (
                  <option key={sprint} value={sprint}>
                    {sprint}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="toolbar-hint">Switch mode to narrow the scan surface.</div>
          )}
        </section>

        <section className="workspace-layout">
          <article className="panel panel-main">
            <div className="panel-head">
              <div>
                <p className="eyebrow">
                  {workspaceView === 'overview' ? 'Repo flow' : workspaceView === 'sprint' ? 'Sprint flow' : 'Activity'}
                </p>
                <h3>
                  {workspaceView === 'overview'
                    ? 'Whole repository'
                    : workspaceView === 'sprint'
                      ? selectedSprint
                      : 'Recent run log'}
                </h3>
              </div>

              {workspaceView === 'overview' ? <span className="panel-chip">all data</span> : null}
            </div>

            {renderMainContent()}
          </article>

          <aside className="panel panel-side">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Workspace facts</p>
                <h3>Quick reference</h3>
              </div>
            </div>

            <div className="fact-list">
              <div>
                <span>Repo id</span>
                <strong>{repo.id}</strong>
              </div>
              <div>
                <span>Project key</span>
                <strong>{repo.projectKey}</strong>
              </div>
              <div>
                <span>Last sync</span>
                <strong>{repo.lastSync}</strong>
              </div>
              <div>
                <span>Connection</span>
                <strong>{connectionMessage}</strong>
              </div>
            </div>

            <div className="side-divider" />

            <div className="side-block">
              <p className="eyebrow">Known sprints</p>
              <div className="mini-list">
                {repo.sprints.slice(1).map((sprint) => (
                  <span key={sprint}>{sprint}</span>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>

      {drawerOpen ? (
        <div className="drawer-backdrop" role="presentation">
          <section className="drawer" aria-label="Credential">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Credential vault</p>
                <h3>{credentialForm.displayName}</h3>
              </div>

              <button onClick={() => setDrawerOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="drawer-status-row">
              <span className={connectionClass(connectionState)}>{connectionState}</span>
              <button onClick={testConnection} type="button">
                Test connection
              </button>
            </div>

            <p className="drawer-message">{connectionMessage}</p>

            <label>
              Repo name
              <input
                value={credentialForm.displayName}
                onChange={(event) => updateCredentialField('displayName', event.target.value)}
              />
            </label>

            <label>
              Jira URL
              <input
                placeholder="https://your-domain.atlassian.net"
                value={credentialForm.baseUrl}
                onChange={(event) => updateCredentialField('baseUrl', event.target.value)}
              />
            </label>

            <label>
              Account
              <input
                value={credentialForm.accountEmail}
                onChange={(event) => updateCredentialField('accountEmail', event.target.value)}
              />
            </label>

            <label>
              API token
              <input
                type="password"
                value={credentialForm.apiToken}
                onChange={(event) => updateCredentialField('apiToken', event.target.value)}
              />
            </label>

            <label>
              Project key
              <input
                value={credentialForm.projectKey}
                onChange={(event) => updateCredentialField('projectKey', event.target.value)}
              />
            </label>

            <label>
              Note
              <textarea value={note} onChange={(event) => setNote(event.target.value)} />
            </label>

            <div className="drawer-actions">
              <button onClick={() => setDrawerOpen(false)} type="button">
                Cancel
              </button>
              <button className="primary-button" onClick={saveCredential} type="button">
                Save
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

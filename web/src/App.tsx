import { useMemo, useState } from 'react';

type ConnectionState = 'idle' | 'testing' | 'connected' | 'failed';

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
    lastSync: 'Not synced',
    ticketCount: 0,
    sprints: ['All repo', 'Sprint 42', 'Sprint 43'],
    statusCounts: {
      Backlog: 18,
      'In Progress': 8,
      'Review / QA': 3,
      Done: 42
    }
  }
];

const initialLogs: LogEntry[] = [
  {
    id: 'log-1',
    step: 'preflight',
    level: 'info',
    message: 'Waiting for first run',
    time: 'local',
    note: 'Workspace is ready.'
  }
];

function connectionClass(state: ConnectionState): string {
  return `status-pill ${state}`;
}

function createMermaid(repo: RepoView, sprintName: string): string {
  const label = sprintName === 'All repo' ? repo.name : sprintName;
  const lines = ['flowchart LR', `  scope["${label}"]`];

  for (const [status, count] of Object.entries(repo.statusCounts)) {
    const nodeId = status.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    lines.push(`  scope --> ${nodeId}["${status} (${count})"]`);
  }

  return lines.join('\n');
}

export default function App() {
  const [selectedRepoId, setSelectedRepoId] = useState(repos[0].id);
  const [selectedSprint, setSelectedSprint] = useState(repos[0].sprints[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
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
  const mermaid = useMemo(() => createMermaid(repo, selectedSprint), [repo, selectedSprint]);

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

  function testConnection() {
    setConnectionState('testing');

    window.setTimeout(() => {
      const hasRequiredFields =
        credentialForm.displayName &&
        credentialForm.baseUrl &&
        credentialForm.accountEmail &&
        credentialForm.apiToken &&
        credentialForm.projectKey;

      if (!hasRequiredFields) {
        setConnectionState('failed');
        appendLog({
          step: 'credential',
          level: 'error',
          message: 'Connection test failed',
          note: 'Missing required Jira credential fields.'
        });
        return;
      }

      setConnectionState('connected');
      appendLog({
        step: 'credential',
        level: 'info',
        message: 'Connection test completed',
        note: note || 'Ready to save credential reference.'
      });
    }, 700);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span>jira-kb</span>
          <button onClick={() => setDrawerOpen(true)}>Add</button>
        </div>

        <nav className="repo-list">
          {repos.map((item) => (
            <button
              className={item.id === selectedRepoId ? 'active' : ''}
              key={item.id}
              onClick={() => {
                setSelectedRepoId(item.id);
                setSelectedSprint(item.sprints[0]);
              }}
            >
              <strong>{item.name}</strong>
              <span>{item.projectKey}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{repo.projectKey}</p>
            <h1>{repo.name}</h1>
          </div>

          <div className="actions">
            <span className={connectionClass(connectionState)}>{connectionState}</span>
            <button onClick={() => setDrawerOpen(true)}>Credential</button>
            <button>Sync</button>
          </div>
        </header>

        <section className="metrics">
          <div>
            <span>Tickets</span>
            <strong>{repo.ticketCount}</strong>
          </div>
          <div>
            <span>Sprints</span>
            <strong>{repo.sprints.length - 1}</strong>
          </div>
          <div>
            <span>Last sync</span>
            <strong>{repo.lastSync}</strong>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Workflow</h2>
              <select value={selectedSprint} onChange={(event) => setSelectedSprint(event.target.value)}>
                {repo.sprints.map((sprint) => (
                  <option key={sprint} value={sprint}>
                    {sprint}
                  </option>
                ))}
              </select>
            </div>

            <div className="workflow-lanes">
              {Object.entries(repo.statusCounts).map(([status, count]) => (
                <div className="lane" key={status}>
                  <span>{status}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>

            <pre className="mermaid-preview">{mermaid}</pre>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Run Log</h2>
              <span>{logs.length}</span>
            </div>

            <div className="log-list">
              {logs.map((entry) => (
                <article className={`log-entry ${entry.level}`} key={entry.id}>
                  <div>
                    <strong>{entry.step}</strong>
                    <span>{entry.time}</span>
                  </div>
                  <p>{entry.message}</p>
                  {entry.note ? <small>{entry.note}</small> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {drawerOpen ? (
        <div className="drawer-backdrop" role="presentation">
          <section className="drawer" aria-label="Credential">
            <div className="panel-header">
              <h2>Credential</h2>
              <button onClick={() => setDrawerOpen(false)}>Close</button>
            </div>

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
              <span className={connectionClass(connectionState)}>{connectionState}</span>
              <button onClick={testConnection}>Test</button>
              <button onClick={() => setDrawerOpen(false)}>Save</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

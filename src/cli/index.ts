import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildWorkflowSummary } from '../builders/workflow';
import type { NormalizedTicket } from '../models/ticket';
import { formatPreflightReport, createPreflightReport } from '../utils/preflight';
import { getRepoWorkspacePaths, getWorkspacesRoot, slugifyRepoId } from '../utils/paths';

const REQUIRED_PACKAGES = ['react', 'react-dom', 'typescript', 'vite', 'tsx', '@vitejs/plugin-react'];

function printUsage(): void {
  console.log([
    'jira-kb commands:',
    '  preflight',
    '  workspace root',
    '  workspace init --repo <name> --display-name <name> --base-url <url> --project-key <key> --mode <cloud|server>',
    '  workspace show --repo <name>',
    '  workflow render --input <tickets.json> --repo <name> --scope <repo|sprint> --label <name>'
  ].join('\n'));
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith('--')) {
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith('--')) {
      result[value] = next;
      index += 1;
    } else {
      result[value] = true;
    }
  }

  return result;
}

function getFlag(args: Record<string, string | boolean>, name: string, fallback = ''): string {
  const value = args[name];
  return typeof value === 'string' ? value : fallback;
}

async function ensureWorkspace(repoId: string, displayName: string, baseUrl: string, projectKey: string, mode: string): Promise<void> {
  const workspace = getRepoWorkspacePaths(repoId);
  await mkdir(workspace.root, { recursive: true });
  await mkdir(workspace.rawDir, { recursive: true });
  await mkdir(workspace.normalizedDir, { recursive: true });
  await mkdir(workspace.kbDir, { recursive: true });
  await mkdir(workspace.workflowsDir, { recursive: true });
  await mkdir(workspace.indexesDir, { recursive: true });
  await mkdir(workspace.logsDir, { recursive: true });
  await mkdir(workspace.cacheDir, { recursive: true });

  const manifest = {
    repoId,
    displayName,
    jiraBaseUrl: baseUrl,
    projectKey,
    authRef: `jira-kb/${repoId}/jira-api-token`,
    mode: mode === 'server' ? 'server' : 'cloud',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const state = {
    repoId,
    trackedIssueCount: 0
  };

  await writeFile(workspace.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(workspace.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await writeFile(workspace.vaultRef, `jira-kb/${repoId}/jira-api-token\n`, 'utf8');

  console.log(`workspace ready: ${workspace.root}`);
}

async function showWorkspace(repoId: string): Promise<void> {
  const workspace = getRepoWorkspacePaths(repoId);
  console.log(JSON.stringify(workspace, null, 2));
}

async function renderWorkflow(inputPath: string, repoId: string, scope: 'repo' | 'sprint', label: string): Promise<void> {
  const raw = await readFile(resolve(inputPath), 'utf8');
  const tickets = JSON.parse(raw) as NormalizedTicket[];
  const summary = buildWorkflowSummary(slugifyRepoId(repoId), label, tickets, scope);
  console.log(summary.mermaid);
}

async function main(): Promise<void> {
  const [command, subcommand, ...rest] = process.argv.slice(2);

  if (!command) {
    printUsage();
    return;
  }

  if (command === 'preflight') {
    const report = createPreflightReport(process.cwd(), REQUIRED_PACKAGES);
    console.log(formatPreflightReport(report));
    process.exitCode = report.ready ? 0 : 1;
    return;
  }

  if (command === 'workspace') {
    if (subcommand === 'root') {
      console.log(getWorkspacesRoot());
      return;
    }

    const flags = parseArgs(rest);
    const repo = getFlag(flags, '--repo');
    if (!repo) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    if (subcommand === 'init') {
      await ensureWorkspace(
        repo,
        getFlag(flags, '--display-name', repo),
        getFlag(flags, '--base-url'),
        getFlag(flags, '--project-key'),
        getFlag(flags, '--mode', 'cloud')
      );
      return;
    }

    if (subcommand === 'show') {
      await showWorkspace(repo);
      return;
    }

    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === 'workflow' && subcommand === 'render') {
    const flags = parseArgs(rest);
    const input = getFlag(flags, '--input');
    const repo = getFlag(flags, '--repo');
    const scope = (getFlag(flags, '--scope', 'repo') === 'sprint' ? 'sprint' : 'repo') as 'repo' | 'sprint';
    const label = getFlag(flags, '--label', scope === 'repo' ? repo : 'Sprint');

    if (!input || !repo) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    await renderWorkflow(input, repo, scope, label);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

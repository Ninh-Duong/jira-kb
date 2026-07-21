import { join, resolve } from 'node:path';

export interface RepoWorkspacePaths {
  repoId: string;
  root: string;
  manifest: string;
  state: string;
  vaultRef: string;
  rawDir: string;
  normalizedDir: string;
  kbDir: string;
  workflowsDir: string;
  indexesDir: string;
  logsDir: string;
  cacheDir: string;
}

export function getProjectRoot(cwd = process.cwd()): string {
  return resolve(cwd);
}

export function slugifyRepoId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getWorkspacesRoot(cwd = process.cwd()): string {
  return join(getProjectRoot(cwd), 'workspaces');
}

export function getRepoWorkspacePaths(repoIdOrName: string, cwd = process.cwd()): RepoWorkspacePaths {
  const repoId = slugifyRepoId(repoIdOrName);
  const root = join(getWorkspacesRoot(cwd), repoId);

  return {
    repoId,
    root,
    manifest: join(root, 'manifest.json'),
    state: join(root, 'state.json'),
    vaultRef: join(root, 'vault.ref'),
    rawDir: join(root, 'raw'),
    normalizedDir: join(root, 'normalized'),
    kbDir: join(root, 'kb'),
    workflowsDir: join(root, 'workflows'),
    indexesDir: join(root, 'indexes'),
    logsDir: join(root, 'logs'),
    cacheDir: join(root, 'cache')
  };
}

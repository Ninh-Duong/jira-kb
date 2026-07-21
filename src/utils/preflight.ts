import { createRequire } from 'node:module';
import { join } from 'node:path';

import type { DependencyCheckResult, PreflightReport } from '../models/runtime';

function resolveProjectPackagePath(rootDir: string): string {
  return join(rootDir, 'package.json');
}

function checkPackage(rootDir: string, packageName: string): DependencyCheckResult {
  const requireFromRoot = createRequire(resolveProjectPackagePath(rootDir));

  let present = false;
  try {
    requireFromRoot.resolve(packageName);
    present = true;
  } catch {
    present = false;
  }

  return {
    name: packageName,
    required: true,
    present,
    installHint: present ? undefined : `npm install ${packageName}`,
    reason: present ? 'Installed locally' : 'Missing from node_modules'
  };
}

export function buildBootstrapCommand(missing: DependencyCheckResult[]): string {
  if (missing.length === 0) {
    return 'npm install';
  }

  return `npm install ${missing.map((item) => item.name).join(' ')}`;
}

export function createPreflightReport(rootDir: string, requiredPackages: string[]): PreflightReport {
  const present: DependencyCheckResult[] = [];
  const missing: DependencyCheckResult[] = [];

  for (const packageName of requiredPackages) {
    const check = checkPackage(rootDir, packageName);
    if (check.present) {
      present.push(check);
    } else {
      missing.push(check);
    }
  }

  return {
    ready: missing.length === 0,
    checkedAt: new Date().toISOString(),
    missing,
    present,
    bootstrapCommand: buildBootstrapCommand(missing)
  };
}

export function formatPreflightReport(report: PreflightReport): string {
  const lines = [
    `ready: ${report.ready ? 'yes' : 'no'}`,
    `checkedAt: ${report.checkedAt}`,
    `bootstrap: ${report.bootstrapCommand}`
  ];

  if (report.present.length > 0) {
    lines.push(`present: ${report.present.map((item) => item.name).join(', ')}`);
  }

  if (report.missing.length > 0) {
    lines.push(`missing: ${report.missing.map((item) => item.name).join(', ')}`);
  }

  return lines.join('\n');
}

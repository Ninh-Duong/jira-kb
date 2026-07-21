export interface SecretVault {
  get(ref: string): Promise<string | null>;
  set(ref: string, value: string): Promise<void>;
  delete(ref: string): Promise<void>;
  has(ref: string): Promise<boolean>;
}

export class MemorySecretVault implements SecretVault {
  private readonly store = new Map<string, string>();

  async get(ref: string): Promise<string | null> {
    return this.store.get(ref) ?? null;
  }

  async set(ref: string, value: string): Promise<void> {
    this.store.set(ref, value);
  }

  async delete(ref: string): Promise<void> {
    this.store.delete(ref);
  }

  async has(ref: string): Promise<boolean> {
    return this.store.has(ref);
  }
}

export function createSecretRef(repoId: string, secretName = 'jira-api-token'): string {
  return `jira-kb/${repoId}/${secretName}`;
}

export function maskSecretValue(value: string): string {
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, 2)}${'*'.repeat(Math.max(0, value.length - 6))}${value.slice(-4)}`;
}

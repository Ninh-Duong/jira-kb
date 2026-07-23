# jira-kb

Local-first Jira knowledge tool for DEV, BA, and QC.

## What it does

- keeps one isolated workspace per repo
- stores credential refs without committing secrets
- syncs Jira incrementally
- keeps a lightweight knowledge base for fast impact checks
- renders simple repo and sprint workflows
- writes run logs locally for later issue tracing

## Layout

- `src/`: core models, Jira connector, normalizer, query, workflow builder, CLI
- `web/`: local UI shell
- `workspaces/`: per-repo data, logs, KB, indexes, and workflow snapshots
- `config/`: sample config only
- `docs/`: architecture and UI notes
- `scripts/`: bootstrap helpers
- `tests/`: automated checks

## Safety rules

- never commit Jira API tokens, passwords, or vault contents
- never commit run logs or repo scan outputs
- keep each repo in its own workspace folder
- treat `workspaces/` as runtime-only data

## Local commands

```bash
npm install
npm run preflight
npm run dev:local
npm run build
```

Local UI:

```txt
http://127.0.0.1:4173
```

Create a local repo workspace:

```bash
npm run workspace -- init --repo WeCRM-eager --display-name WeCRM-eager --base-url https://your-domain.atlassian.net --project-key WECRM --mode cloud
```

More docs:

- [Local run guide](docs/local-run.md)
- [Feature notes](docs/features.md)
- [GitHub push checklist](docs/github-push-checklist.md)
- [Architecture](docs/architecture.md)
- [UI outline](docs/ui.md)

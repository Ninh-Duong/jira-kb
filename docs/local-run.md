# Local Run Guide

This tool is designed to run on your local machine only.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm `>=10`
- Jira API token for Jira Cloud

Do not use a Jira account password for Jira Cloud. Use an API token.

## First Run

Install dependencies:

```bash
npm install
```

Check local packages before running the tool:

```bash
npm run preflight
```

Expected result:

```txt
ready: yes
```

Start the local UI:

```bash
npm run dev:local
```

Open:

```txt
http://127.0.0.1:4173
```

Stop the local server with `Ctrl+C` in the terminal running Vite.

## Change Local Port

Use another port if `4173` is busy:

```bash
npm run dev:local -- --port 5173
```

Then open:

```txt
http://127.0.0.1:5173
```

## Build Check

Before pushing code, run:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Open:

```txt
http://127.0.0.1:4174
```

## Create A Local Repo Workspace

Example:

```bash
npm run workspace -- init --repo WeCRM-eager --display-name WeCRM-eager --base-url https://your-domain.atlassian.net --project-key WECRM --mode cloud
```

This creates runtime data under:

```txt
workspaces/wecrm-eager/
```

That folder is ignored by Git.

## Runtime Data

Runtime API calls write local JSONL logs to:

```txt
logs/system.jsonl
```

When a request includes a repo id, the same entry is also copied to:

```txt
workspaces/<repo-id>/logs/system.jsonl
```

The tool stores local-only data in:

```txt
workspaces/
  <repo-id>/
    manifest.json
    state.json
    vault.ref
    raw/
    normalized/
    kb/
    workflows/
    indexes/
    logs/
```

Never commit files from `workspaces/`.

## Credential Safety

Credential input should be stored through a vault adapter later. Current rules:

- do not commit `.env`
- do not commit Jira API tokens
- do not commit real config files under `config/`
- do not commit runtime logs
- do not commit scanned Jira data

Only example files are intended for Git.

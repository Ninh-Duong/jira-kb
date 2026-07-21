# GitHub Push Checklist

Use this checklist before pushing the repository to GitHub.

## Required Checks

Run:

```bash
npm run preflight
npm run build
```

Both commands should pass.

## Files Safe To Commit

These are expected:

```txt
README.md
package.json
package-lock.json
tsconfig.json
vite.config.ts
.gitignore
.env.example
config/jira.example.json
docs/
src/
web/
tests/.gitkeep
scripts/.gitkeep
workspaces/.gitkeep
```

## Files That Must Not Be Committed

Do not push:

```txt
.env
.env.*
config/*.json except config/*.example.json
workspaces/*
data/*
kb/*
indexes/*
logs/*
dist/*
node_modules/*
*.sqlite
*.db
*.token
*.key
*.pem
.npmrc
.netrc
```

## Recommended Git Commands

Initialize the repository:

```bash
git init
```

Check status:

```bash
git status --short
```

Add only safe files:

```bash
git add README.md package.json package-lock.json tsconfig.json vite.config.ts .gitignore .env.example config docs src web tests scripts workspaces/.gitkeep
```

Review staged files:

```bash
git diff --cached --name-only
```

Commit:

```bash
git commit -m "Initial jira-kb scaffold"
```

## Secret Scan Habit

Before pushing, search for common secret words:

```bash
rg -i "api[_-]?token|password|secret|authorization|basic " .
```

If the result shows a real token, remove it before committing.

## Current Security Position

- `workspaces/` is runtime-only and ignored
- Jira credentials should live outside Git
- real Jira data should stay local
- docs and example config are safe to publish

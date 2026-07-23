# UI Guide

## Open The Local UI

Start the local app:

```bash
npm run dev:local
```

Open:

```txt
http://127.0.0.1:4173
```

## Configure Jira Credentials

Use `Credentials` or `Config` to open the credential drawer.

Required fields:

- repo name
- Jira base URL
- account email
- API token
- project key

Use `Test Connection` to verify the credentials against Jira.

## Scan Jira

Use `Scan Jira` in the header after entering credentials.

When the scan finishes, the UI switches to `Workspace Overview` and shows:

- scanned issue count
- Jira total
- scan duration
- status breakdown
- issue type breakdown
- recent scanned issues

## Kanban Board

The Kanban board is local browser state. It supports:

- create issue
- drag issue between columns
- filter by search text, assignee, priority, and issue type
- open issue detail
- delete issue

Kanban tickets are stored in browser `localStorage` and are not populated by `Scan Jira` yet.

## Activity Logs

Use `Activity Logs` to see UI-level events such as credential tests and scan attempts.

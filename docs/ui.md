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
- JQL scope

Optional but recommended:

- board ID
- sprint field IDs, for example `customfield_10020`

Use `Test Connection` to verify the credentials against Jira.

## Scan Jira

Use `Scan Jira` in the header after entering credentials.

When the scan finishes, the UI switches to `Project Info` and shows:

- sprint inventory for the repo
- completed and in-progress sprint status
- tickets grouped by sprint
- tickets without sprint
- latest scan JQL and run ID

## Project Info

Use `Project Info` in the sidebar to review sprint history and the tickets attached to each sprint.

## Kanban Board

The Kanban board is local browser state. It supports:

- create issue
- drag issue between columns
- filter by search text, assignee, priority, and issue type
- open issue detail
- delete issue
- assign an issue to a sprint

Kanban tickets are stored in browser `localStorage`. Project Info reads the same local ticket set.

## Activity Logs

Use `Activity Logs` to see UI-level events such as credential tests and scan attempts.

# Feature Notes

## Local Jira Workspace

The app is a local-first Jira workspace for DEV, BA, and QC. Runtime data stays under `workspaces/` and should not be committed.

Current implemented pieces:

- create a per-repo workspace with manifest, state, raw, normalized, KB, indexes, workflows, logs, and cache folders
- test Jira credentials through the local Vite API
- scan recent Jira issues for a project through the local Vite API
- extract Jira issue snapshots into lightweight records
- normalize issue snapshots into markdown, search text, and simple impact notes
- search normalized tickets with a lightweight scorer
- render workflow summaries as Mermaid flowcharts from normalized ticket JSON
- run a local Kanban shell backed by browser `localStorage`

## Jira Scan

The `Scan Jira` action is a read-only scan. It calls `/api/jira/scan`, fetches up to 25 recently updated Jira issues for the configured project, and returns:

- scanned issue count
- Jira total from the search response
- status breakdown
- issue type breakdown
- recent issue keys, summaries, statuses, update dates, and Jira links
- scan duration and timestamp

The scan does not persist Jira issues to `workspaces/` yet. It also does not rebuild KB files or update the Kanban board.

## Planned Full Sync

The future full sync should extend the scan flow to:

- fetch changed issues incrementally from the last cursor
- write raw Jira payloads to the repo workspace
- normalize changed issues into local records
- rebuild affected KB and workflow slices
- write a run log file
- expose saved scan/sync history in the UI

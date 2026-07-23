# Feature Notes

## Local Jira Workspace

The app is a local-first Jira workspace for DEV, BA, and QC. Runtime data stays under `workspaces/` and should not be committed.

Current implemented pieces:

- create a per-repo workspace with manifest, state, raw, normalized, KB, indexes, workflows, logs, and cache folders
- test Jira credentials through the local Vite API
- scan recent Jira issues for a project through the local Vite API
- write runtime API logs to `logs/system.jsonl`
- review project sprints and sprint tickets in a dedicated Project Info page
- extract Jira issue snapshots into lightweight records
- normalize issue snapshots into markdown, search text, and simple impact notes
- search normalized tickets with a lightweight scorer
- render workflow summaries as Mermaid flowcharts from normalized ticket JSON
- run a local Kanban shell backed by browser `localStorage`

## Jira Scan

The `Scan Jira` action is a read-only scan. It calls `/api/jira/scan`, uses the configured `jqlScope`, fetches Jira issues through Jira Cloud enhanced search with pagination, and returns:

- scanned issue count
- Jira total from the search response
- status breakdown
- issue type breakdown
- recent issue keys, summaries, statuses, update dates, and Jira links
- board sprints when `boardId` is configured
- scan duration and timestamp

The scan loads Jira issues into the local UI state so Project Info and the Kanban board reflect the latest scan. It does not persist raw Jira payloads to `workspaces/` yet and does not rebuild KB files.

## Planned Full Sync

The future full sync should extend the scan flow to:

- fetch changed issues incrementally from the last cursor
- write raw Jira payloads to the repo workspace
- normalize changed issues into local records
- rebuild affected KB and workflow slices
- persist full sync run history
- expose saved scan/sync history in the UI

# Architecture

## Goal

Build a local-first Jira scanner that helps DEV, BA, and QC understand repo structure quickly without rereading Jira every time.

## Main rules

- one workspace per repo
- credentials are stored outside source control
- raw scan data, normalized notes, KB outputs, indexes, and logs stay local
- daily runs should be incremental, not full rescans

## Workspace shape

```txt
workspaces/
  wecrm-eager/
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

## Sync flow

1. preflight dependency check
2. load repo workspace
3. test Jira connection
4. fetch changed issues only
5. normalize to lightweight records
6. rebuild affected KB and workflow slices
7. write run log

## Preflight

Before each run, check the local environment for required packages and missing runtime pieces. If something is missing, bootstrap it before the main job starts.

## Logging

Each run should record:

- repo id
- run id
- start/end time
- status
- step failures
- short operator note

Logs stay local and are ignored by Git.

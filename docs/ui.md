# UI Outline

## Top-level screens

- Repo list
- Repo detail
- Credential drawer
- Sprint workflow
- Repo workflow
- Run log panel

## Credential drawer

Small modal or drawer only.

Fields:

- repo name
- Jira base URL
- account email
- API token
- project key

Actions:

- test connection
- save profile
- cancel

States:

- idle
- testing
- connected
- failed

## Run log panel

Keep a compact log area that shows:

- step name
- status
- timestamp
- note
- error summary

This helps DEV, BA, and QC trace scan failures and follow-up questions without opening the raw data.

## Workflow view

Keep it simple:

- repo workflow: aggregate across the whole repo
- sprint workflow: only tickets in the selected sprint

Prefer a compact, readable view over a detailed graph in v1.

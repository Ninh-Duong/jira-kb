import { digestValue } from '../utils/hash';
import type { JiraIssueSnapshot, NormalizedTicket } from '../models/ticket';

function buildMarkdown(ticket: JiraIssueSnapshot): string {
  const lines = [
    `# ${ticket.key} ${ticket.summary}`,
    '',
    `- repo: ${ticket.repoId}`,
    `- type: ${ticket.issueType}`,
    `- status: ${ticket.status}`,
    `- updated: ${ticket.updatedAt}`
  ];

  if (ticket.epicKey) {
    lines.push(`- epic: ${ticket.epicKey}`);
  }

  if (ticket.sprintNames.length > 0) {
    lines.push(`- sprints: ${ticket.sprintNames.join(', ')}`);
  }

  if (ticket.labels.length > 0) {
    lines.push(`- labels: ${ticket.labels.join(', ')}`);
  }

  if (ticket.components.length > 0) {
    lines.push(`- components: ${ticket.components.join(', ')}`);
  }

  if (ticket.linkedKeys.length > 0) {
    lines.push(`- linked: ${ticket.linkedKeys.join(', ')}`);
  }

  if (ticket.description) {
    lines.push('', '## Description', ticket.description);
  }

  return lines.join('\n');
}

function buildSearchText(ticket: JiraIssueSnapshot): string {
  return [
    ticket.key,
    ticket.summary,
    ticket.status,
    ticket.issueType,
    ticket.labels.join(' '),
    ticket.components.join(' '),
    ticket.sprintNames.join(' '),
    ticket.epicKey ?? '',
    ticket.linkedKeys.join(' '),
    ticket.description ?? ''
  ]
    .join(' ')
    .toLowerCase();
}

function buildDevNotes(ticket: JiraIssueSnapshot): string[] {
  const notes: string[] = [];
  if (ticket.components.length > 0) {
    notes.push(`Touches components: ${ticket.components.join(', ')}`);
  }
  if (ticket.linkedKeys.length > 0) {
    notes.push(`Linked issues: ${ticket.linkedKeys.join(', ')}`);
  }
  if (ticket.epicKey) {
    notes.push(`Belongs to epic: ${ticket.epicKey}`);
  }
  return notes;
}

function buildQualityNotes(ticket: JiraIssueSnapshot): string[] {
  const notes: string[] = [];
  if (ticket.status.toLowerCase() !== 'done') {
    notes.push('Still active, check regression scope before closing.');
  }
  if (ticket.sprintNames.length > 0) {
    notes.push(`Appears in sprint(s): ${ticket.sprintNames.join(', ')}`);
  }
  return notes;
}

function buildImpactNotes(ticket: JiraIssueSnapshot): string[] {
  const notes: string[] = [];
  if (ticket.components.length > 0) {
    notes.push(`Potential impact area: ${ticket.components.join(', ')}`);
  }
  if (ticket.labels.length > 0) {
    notes.push(`Labels hint at risk: ${ticket.labels.join(', ')}`);
  }
  return notes;
}

export function normalizeTicket(ticket: JiraIssueSnapshot): NormalizedTicket {
  const searchText = buildSearchText(ticket);
  const markdown = buildMarkdown(ticket);

  return {
    ...ticket,
    digest: digestValue(ticket),
    markdown,
    searchText,
    devNotes: buildDevNotes(ticket),
    qualityNotes: buildQualityNotes(ticket),
    impactNotes: buildImpactNotes(ticket)
  };
}

export function ticketToMarkdown(ticket: JiraIssueSnapshot): string {
  return buildMarkdown(ticket);
}

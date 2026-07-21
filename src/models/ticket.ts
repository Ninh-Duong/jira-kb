export interface JiraIssuePayload {
  key: string;
  id?: string;
  fields: Record<string, unknown>;
}

export interface JiraIssueSnapshot {
  repoId: string;
  key: string;
  summary: string;
  status: string;
  issueType: string;
  labels: string[];
  components: string[];
  sprintNames: string[];
  epicKey?: string;
  linkedKeys: string[];
  description?: string;
  updatedAt: string;
  digest: string;
  sourcePath?: string;
}

export interface NormalizedTicket extends JiraIssueSnapshot {
  markdown: string;
  searchText: string;
  devNotes: string[];
  qualityNotes: string[];
  impactNotes: string[];
}

export interface TicketChange {
  key: string;
  digest: string;
  changeType: 'new' | 'updated' | 'unchanged' | 'removed';
}

export interface SprintSnapshot {
  repoId: string;
  sprintName: string;
  ticketKeys: string[];
  statusCounts: Record<string, number>;
  componentCounts: Record<string, number>;
  updatedAt: string;
}

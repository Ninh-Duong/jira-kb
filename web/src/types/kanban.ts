export type Priority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type IssueType = 'Story' | 'Task' | 'Bug' | 'Epic';
export type ColumnStatus = 'Backlog' | 'Selected for Development' | 'In Progress' | 'Review / QA' | 'Done';

export interface Assignee {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
}

export interface Ticket {
  id: string;
  key: string;
  summary: string;
  type: IssueType;
  priority: Priority;
  status: ColumnStatus;
  assignee: Assignee | null;
  reporter?: Assignee;
  storyPoints?: number;
  description?: string;
  createdAt: string;
}

export interface ColumnDefinition {
  id: ColumnStatus;
  title: string;
  limit?: number;
  color: string;
}

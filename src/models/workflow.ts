export type WorkflowBucket = 'blocked' | 'backlog' | 'in-progress' | 'review' | 'done' | 'unknown';

export interface WorkflowLane {
  bucket: WorkflowBucket;
  label: string;
  count: number;
  ticketKeys: string[];
}

export interface WorkflowNode {
  id: string;
  label: string;
  kind: 'scope' | 'lane';
  count?: number;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  count: number;
}

export interface WorkflowSummary {
  repoId: string;
  scope: 'repo' | 'sprint';
  scopeLabel: string;
  lanes: WorkflowLane[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  mermaid: string;
  updatedAt: string;
}

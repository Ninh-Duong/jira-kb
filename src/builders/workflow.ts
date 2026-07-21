import type { NormalizedTicket } from '../models/ticket';
import type { WorkflowBucket, WorkflowLane, WorkflowNode, WorkflowSummary } from '../models/workflow';
import { renderWorkflowMermaid } from '../renderers/mermaid';

const BUCKETS: Array<{
  bucket: WorkflowBucket;
  label: string;
  aliases: string[];
}> = [
  {
    bucket: 'blocked',
    label: 'Blocked',
    aliases: ['blocked', 'on hold', 'impeded', 'waiting']
  },
  {
    bucket: 'backlog',
    label: 'Backlog',
    aliases: ['backlog', 'open', 'to do', 'selected for development', 'new']
  },
  {
    bucket: 'in-progress',
    label: 'In Progress',
    aliases: ['in progress', 'development', 'implementing', 'doing']
  },
  {
    bucket: 'review',
    label: 'Review / QA',
    aliases: ['review', 'qa', 'testing', 'code review', 'validation']
  },
  {
    bucket: 'done',
    label: 'Done',
    aliases: ['done', 'resolved', 'closed', 'complete']
  }
];

function classifyStatus(status: string): WorkflowBucket {
  const normalized = status.trim().toLowerCase();
  const match = BUCKETS.find((bucket) => bucket.aliases.some((alias) => normalized.includes(alias)));
  return match?.bucket ?? 'unknown';
}

function emptyLane(bucket: WorkflowBucket, label: string): WorkflowLane {
  return {
    bucket,
    label,
    count: 0,
    ticketKeys: []
  };
}

export function buildWorkflowSummary(
  repoId: string,
  scopeLabel: string,
  tickets: NormalizedTicket[],
  scope: 'repo' | 'sprint' = 'repo'
): WorkflowSummary {
  const lanes: WorkflowLane[] = [
    emptyLane('blocked', 'Blocked'),
    emptyLane('backlog', 'Backlog'),
    emptyLane('in-progress', 'In Progress'),
    emptyLane('review', 'Review / QA'),
    emptyLane('done', 'Done'),
    emptyLane('unknown', 'Other')
  ];

  const laneMap = new Map<WorkflowBucket, WorkflowLane>(lanes.map((lane) => [lane.bucket, lane]));

  for (const ticket of tickets) {
    const bucket = classifyStatus(ticket.status);
    const lane = laneMap.get(bucket) ?? laneMap.get('unknown');
    if (!lane) {
      continue;
    }

    lane.count += 1;
    lane.ticketKeys.push(ticket.key);
  }

  const scopeNode: WorkflowNode = {
    id: 'scope',
    label: scopeLabel,
    kind: 'scope',
    count: tickets.length
  };

  const nodes: WorkflowNode[] = [scopeNode];
  const edges = lanes
    .filter((lane) => lane.count > 0)
    .map((lane) => ({
      from: scopeNode.id,
      to: lane.bucket,
      count: lane.count
    }));

  for (const lane of lanes) {
    nodes.push({
      id: lane.bucket,
      label: lane.label,
      kind: 'lane',
      count: lane.count
    });
  }

  const summary: WorkflowSummary = {
    repoId,
    scope,
    scopeLabel,
    lanes,
    nodes,
    edges,
    mermaid: '',
    updatedAt: new Date().toISOString()
  };

  summary.mermaid = renderWorkflowMermaid(summary);
  return summary;
}

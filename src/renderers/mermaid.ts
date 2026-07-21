import type { WorkflowSummary } from '../models/workflow';

function escapeLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/\r?\n/g, ' ');
}

export function renderWorkflowMermaid(summary: WorkflowSummary): string {
  const lines = ['flowchart LR'];
  lines.push(`  scope["${escapeLabel(summary.scopeLabel)}"]`);

  for (const lane of summary.lanes) {
    lines.push(`  scope --> ${lane.bucket}["${escapeLabel(lane.label)} (${lane.count})"]`);
  }

  return lines.join('\n');
}

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock3, ClipboardList, Ticket as TicketIcon } from 'lucide-react';

import { TicketDetailModal } from './TicketDetailModal';
import type { Ticket } from '../types/kanban';
import type { RepoSprint, RepoView, SprintStatus } from '../types/project';

interface SprintSummary extends RepoSprint {
  ticketCount: number;
  doneCount: number;
  activeCount: number;
  backlogCount: number;
  tickets: Ticket[];
}

interface ProjectInfoPageProps {
  repo: RepoView;
  tickets: Ticket[];
  scanResult?: {
    status: 'succeeded' | 'failed';
    message: string;
    issueCount: number;
    total?: number;
    durationMs: number;
    scannedAt: string;
    runId: string;
    boardId?: string;
    jql: string;
    warnings?: string[];
  } | null;
}

const ACTIVE_STATUS_KEYWORDS = ['in progress', 'ready', 'testing', 'review', 'uat'];

function getTicketStatus(ticket: Ticket): string {
  return ticket.jiraStatus ?? ticket.status;
}

function getDefaultSprintName(sprints: RepoSprint[]): string {
  return sprints.find((sprint) => sprint.status === 'in-progress')?.name ?? sprints[0]?.name ?? '';
}

function isDone(ticket: Ticket): boolean {
  const status = getTicketStatus(ticket).toLowerCase();
  return status.includes('done') || status.includes('closed') || status.includes('resolved');
}

function isActive(ticket: Ticket): boolean {
  const status = getTicketStatus(ticket).toLowerCase();
  return ACTIVE_STATUS_KEYWORDS.some((keyword) => status.includes(keyword));
}

function getTicketRank(ticket: Ticket): number {
  if (isActive(ticket)) {
    return 0;
  }

  if (isDone(ticket)) {
    return 2;
  }

  return 1;
}

function getSprintStateLabel(status: SprintStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'In Progress';
    default:
      return 'Planned';
  }
}

function getSprintStateClass(status: SprintStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'in-progress':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function buildSprintSummaries(sprints: RepoSprint[], tickets: Ticket[]): SprintSummary[] {
  const ticketsBySprint = new Map<string, Ticket[]>();

  for (const ticket of tickets) {
    const sprintName = ticket.sprintName?.trim();
    if (!sprintName) {
      continue;
    }

    const nextTickets = ticketsBySprint.get(sprintName) ?? [];
    nextTickets.push(ticket);
    ticketsBySprint.set(sprintName, nextTickets);
  }

  const orderedSprints: RepoSprint[] = [...sprints];
  for (const sprintName of ticketsBySprint.keys()) {
    if (!orderedSprints.some((sprint) => sprint.name === sprintName)) {
      orderedSprints.push({
        name: sprintName,
        status: 'planned'
      });
    }
  }

  return orderedSprints.map((sprint) => {
    const sprintTickets = [...(ticketsBySprint.get(sprint.name) ?? [])].sort((left, right) => {
      const rankDelta = getTicketRank(left) - getTicketRank(right);
      if (rankDelta !== 0) {
        return rankDelta;
      }

      return right.createdAt.localeCompare(left.createdAt) || left.key.localeCompare(right.key);
    });

    return {
      ...sprint,
      ticketCount: sprintTickets.length,
      doneCount: sprintTickets.filter(isDone).length,
      activeCount: sprintTickets.filter(isActive).length,
      backlogCount: sprintTickets.filter((ticket) => !isDone(ticket) && !isActive(ticket)).length,
      tickets: sprintTickets
    };
  });
}

function getTicketStateLabel(ticket: Ticket): string {
  if (isDone(ticket)) {
    return 'Done';
  }

  if (isActive(ticket)) {
    return getTicketStatus(ticket);
  }

  return getTicketStatus(ticket);
}

function getTicketStateClass(ticket: Ticket): string {
  if (isDone(ticket)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (isActive(ticket)) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export const ProjectInfoPage: React.FC<ProjectInfoPageProps> = ({ repo, tickets, scanResult }) => {
  const sprintSummaries = useMemo(() => buildSprintSummaries(repo.sprints, tickets), [repo.sprints, tickets]);
  const [selectedSprintName, setSelectedSprintName] = useState(() => getDefaultSprintName(repo.sprints));
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!sprintSummaries.some((sprint) => sprint.name === selectedSprintName)) {
      setSelectedSprintName(getDefaultSprintName(repo.sprints));
    }
  }, [repo.sprints, selectedSprintName, sprintSummaries]);

  const selectedSprint = sprintSummaries.find((sprint) => sprint.name === selectedSprintName) ?? sprintSummaries[0] ?? null;
  const unassignedTickets = tickets
    .filter((ticket) => !ticket.sprintName?.trim())
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.key.localeCompare(right.key));

  const completedSprintCount = sprintSummaries.filter((sprint) => sprint.status === 'completed').length;
  const activeSprintCount = sprintSummaries.filter((sprint) => sprint.status === 'in-progress').length;
  const totalTickets = tickets.length;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Project Info</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {repo.name} <span className="text-slate-400">/</span> {repo.projectKey}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Sprint inventory and ticket history.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-full bg-slate-50 text-slate-700 border-slate-200">
              <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
              {sprintSummaries.length} sprints
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completedSprintCount} completed
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-full bg-amber-50 text-amber-700 border-amber-200">
              <Clock3 className="w-3.5 h-3.5" />
              {activeSprintCount} in progress
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-full bg-sky-50 text-sky-700 border-sky-200">
              <TicketIcon className="w-3.5 h-3.5" />
              {totalTickets} tickets
            </span>
          </div>
        </div>
      </section>

      {scanResult && (
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Latest Jira Scan</h3>
              <p className="text-xs text-slate-500 mt-1">{scanResult.message}</p>
              <p className="text-[11px] font-mono text-slate-500 mt-2 break-all">{scanResult.jql}</p>
              {scanResult.warnings && scanResult.warnings.length > 0 && (
                <p className="text-[11px] text-amber-700 mt-2">{scanResult.warnings.join('; ')}</p>
              )}
            </div>
            <span
              className={`inline-flex w-fit items-center px-2.5 py-1 text-[10px] font-bold uppercase border rounded-full ${
                scanResult.status === 'succeeded'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {scanResult.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 mt-4 border border-slate-200 rounded-md overflow-hidden">
            <div className="bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Scanned</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{scanResult.issueCount}</p>
            </div>
            <div className="bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Jira Total</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{scanResult.total ?? scanResult.issueCount}</p>
            </div>
            <div className="bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Duration</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{scanResult.durationMs}ms</p>
            </div>
            <div className="bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Run ID</p>
              <p className="text-xs font-mono text-slate-700 mt-2 break-all">{scanResult.runId}</p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sprints</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Select a sprint to review its tickets.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {sprintSummaries.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
            {sprintSummaries.map((sprint) => {
              const isSelected = sprint.name === selectedSprintName;

              return (
                <button
                  key={sprint.name}
                  type="button"
                  onClick={() => setSelectedSprintName(sprint.name)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{sprint.name}</p>
                      {sprint.goal && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{sprint.goal}</p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border rounded-full ${getSprintStateClass(sprint.status)}`}>
                      {getSprintStateLabel(sprint.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span>{sprint.ticketCount} tickets</span>
                    <span>{sprint.doneCount} done</span>
                    <span>{sprint.activeCount} active</span>
                    <span>{sprint.backlogCount} backlog</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedSprint ? selectedSprint.name : 'No sprint selected'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedSprint?.goal ?? 'Sprint ticket list and delivery status.'}
              </p>
            </div>

            {selectedSprint && (
              <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase border rounded-full ${getSprintStateClass(selectedSprint.status)}`}>
                {getSprintStateLabel(selectedSprint.status)}
              </span>
            )}
          </div>

          {selectedSprint ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 border-b border-slate-200">
                <div className="bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Tickets</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{selectedSprint.ticketCount}</p>
                </div>
                <div className="bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Done</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">{selectedSprint.doneCount}</p>
                </div>
                <div className="bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">In progress</p>
                  <p className="text-lg font-bold text-amber-700 mt-1">{selectedSprint.activeCount}</p>
                </div>
                <div className="bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Backlog</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{selectedSprint.backlogCount}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_130px_140px] gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <span>Key</span>
                    <span>Summary</span>
                    <span>Status</span>
                    <span>Assignee</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {selectedSprint.tickets.length > 0 ? (
                      selectedSprint.tickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => setSelectedTicket(ticket)}
                          className="w-full grid grid-cols-[120px_minmax(0,1fr)_130px_140px] gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <span className="font-semibold text-blue-700 text-xs truncate">{ticket.key}</span>
                          <span className="text-sm text-slate-900 truncate">{ticket.summary}</span>
                          <span className={`inline-flex w-fit items-center px-2 py-0.5 text-[10px] font-bold uppercase border rounded-full ${getTicketStateClass(ticket)}`}>
                            {getTicketStateLabel(ticket)}
                          </span>
                          <span className="text-xs text-slate-600 truncate">
                            {ticket.assignee ? ticket.assignee.name : 'Unassigned'}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-10 text-sm text-slate-500">
                        No tickets have been assigned to this sprint yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-10 text-sm text-slate-500">No sprint data available.</div>
          )}
        </div>
      </section>

      {unassignedTickets.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Tickets without sprint</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">These issues are not attached to any sprint yet.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {unassignedTickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedTicket(ticket)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-blue-700 text-xs truncate">{ticket.key}</span>
                      <span className="text-xs text-slate-400 truncate">{getTicketStatus(ticket)}</span>
                    </div>
                    <p className="text-sm text-slate-900 truncate mt-1">{ticket.summary}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { ColumnStatus, IssueType, Priority, Ticket } from '../types/kanban';
import { defaultColumns, mockAssignees } from '../mock/jiraData';
import { Column } from './Column';
import { ControlBar } from './ControlBar';
import { CreateIssueModal } from './CreateIssueModal';
import { TicketDetailModal } from './TicketDetailModal';

const STORAGE_KEY = 'jira-kb-tickets';

interface KanbanBoardProps {
  onTicketCountChange?: (count: number) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ onTicketCountChange }) => {
  // Initialize state from localStorage
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load tickets from localStorage:', e);
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'All'>('All');
  const [selectedType, setSelectedType] = useState<IssueType | 'All'>('All');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<ColumnStatus>('Backlog');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Persist tickets to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (e) {
      console.warn('Failed to save tickets to localStorage:', e);
    }

    if (onTicketCountChange) {
      onTicketCountChange(tickets.length);
    }
  }, [tickets, onTicketCountChange]);

  // Handle Drag & Drop move
  const handleDropTicket = (ticketId: string, targetStatus: ColumnStatus) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: targetStatus } : ticket
      )
    );
  };

  // Create issue handler
  const handleCreateTicket = (newTicketData: Omit<Ticket, 'id' | 'key' | 'createdAt'>) => {
    const nextNumber = tickets.length + 101;
    const newTicket: Ticket = {
      ...newTicketData,
      id: `t-${Date.now()}`,
      key: `WECRM-${nextNumber}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTickets((prev) => [newTicket, ...prev]);
  };

  // Delete issue handler
  const handleDeleteTicket = (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedAssigneeId(null);
    setSelectedPriority('All');
    setSelectedType('All');
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedAssigneeId !== null ||
    selectedPriority !== 'All' ||
    selectedType !== 'All';

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search text match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesKey = ticket.key.toLowerCase().includes(query);
        const matchesSummary = ticket.summary.toLowerCase().includes(query);
        const matchesDesc = ticket.description?.toLowerCase().includes(query);
        if (!matchesKey && !matchesSummary && !matchesDesc) return false;
      }

      // Assignee match
      if (selectedAssigneeId !== null) {
        if (!ticket.assignee || ticket.assignee.id !== selectedAssigneeId) return false;
      }

      // Priority match
      if (selectedPriority !== 'All' && ticket.priority !== selectedPriority) {
        return false;
      }

      // Issue type match
      if (selectedType !== 'All' && ticket.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [tickets, searchQuery, selectedAssigneeId, selectedPriority, selectedType]);

  return (
    <div className="flex flex-col h-full bg-slate-50 flex-1 overflow-hidden">
      {/* Control Bar & Filters */}
      <ControlBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedAssigneeId={selectedAssigneeId}
        onSelectAssignee={setSelectedAssigneeId}
        selectedPriority={selectedPriority}
        onSelectPriority={setSelectedPriority}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        assignees={mockAssignees}
        onCreateClick={() => {
          setCreateDefaultStatus('Backlog');
          setIsCreateModalOpen(true);
        }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Board Columns Swimlane Horizontal Grid */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-4 items-start custom-scrollbar">
        {defaultColumns.map((col) => {
          const colTickets = filteredTickets.filter((t) => t.status === col.id);
          return (
            <Column
              key={col.id}
              column={col}
              tickets={colTickets}
              onDropTicket={handleDropTicket}
              onSelectTicket={setSelectedTicket}
              onCreateInColumn={(status) => {
                setCreateDefaultStatus(status);
                setIsCreateModalOpen(true);
              }}
            />
          );
        })}
      </div>

      {/* Modals */}
      <CreateIssueModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTicket}
        assignees={mockAssignees}
        defaultStatus={createDefaultStatus}
      />

      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onDelete={handleDeleteTicket}
      />
    </div>
  );
};

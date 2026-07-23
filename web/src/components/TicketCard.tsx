import React from 'react';
import { IssueType, Priority, Ticket } from '../types/kanban';
import {
  Bookmark,
  CheckSquare,
  AlertCircle,
  Zap,
  ChevronsUp,
  ChevronUp,
  Equal,
  ChevronDown,
  ChevronsDown,
  GripVertical
} from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onSelect?: (ticket: Ticket) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, ticketId: string) => void;
  isDragging?: boolean;
}

export const renderIssueTypeIcon = (type: IssueType) => {
  switch (type) {
    case 'Story':
      return (
        <span title="Story" className="flex items-center justify-center w-5 h-5 bg-emerald-500 text-white rounded-[3px]">
          <Bookmark className="w-3.5 h-3.5 fill-current" />
        </span>
      );
    case 'Task':
      return (
        <span title="Task" className="flex items-center justify-center w-5 h-5 bg-sky-500 text-white rounded-[3px]">
          <CheckSquare className="w-3.5 h-3.5" />
        </span>
      );
    case 'Bug':
      return (
        <span title="Bug" className="flex items-center justify-center w-5 h-5 bg-red-500 text-white rounded-[3px]">
          <AlertCircle className="w-3.5 h-3.5" />
        </span>
      );
    case 'Epic':
      return (
        <span title="Epic" className="flex items-center justify-center w-5 h-5 bg-purple-600 text-white rounded-[3px]">
          <Zap className="w-3.5 h-3.5 fill-current" />
        </span>
      );
  }
};

export const renderPriorityIcon = (priority: Priority) => {
  switch (priority) {
    case 'Highest':
      return (
        <span title="Highest Priority">
          <ChevronsUp className="w-4 h-4 text-red-600 stroke-[2.5]" />
        </span>
      );
    case 'High':
      return (
        <span title="High Priority">
          <ChevronUp className="w-4 h-4 text-red-500 stroke-[2.5]" />
        </span>
      );
    case 'Medium':
      return (
        <span title="Medium Priority">
          <Equal className="w-4 h-4 text-amber-500 stroke-[2.5]" />
        </span>
      );
    case 'Low':
      return (
        <span title="Low Priority">
          <ChevronDown className="w-4 h-4 text-blue-500 stroke-[2.5]" />
        </span>
      );
    case 'Lowest':
      return (
        <span title="Lowest Priority">
          <ChevronsDown className="w-4 h-4 text-blue-400 stroke-[2.5]" />
        </span>
      );
  }
};

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onSelect,
  onDragStart,
  isDragging
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, ticket.id)}
      onClick={() => onSelect && onSelect(ticket)}
      className={`group relative bg-white border rounded-md p-3.5 mb-2.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'opacity-60 scale-[1.02] rotate-1 shadow-xl border-blue-500 ring-2 ring-blue-400/30'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Drag handle icon indicator on hover */}
      <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      {/* Summary */}
      <p className="text-[13.5px] font-medium text-slate-800 line-clamp-2 leading-snug mb-3 pr-4">
        {ticket.summary}
      </p>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/80">
        <div className="flex items-center gap-1.5">
          {renderIssueTypeIcon(ticket.type)}
          <span className="font-semibold text-[11.5px] text-slate-500 hover:text-blue-600 hover:underline cursor-pointer transition-colors">
            {ticket.key}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {ticket.storyPoints !== undefined && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-full border border-slate-200" title="Story Points">
              {ticket.storyPoints}
            </span>
          )}

          {renderPriorityIcon(ticket.priority)}

          {/* Assignee Avatar */}
          {ticket.assignee ? (
            <img
              src={ticket.assignee.avatarUrl}
              alt={ticket.assignee.name}
              title={`Assignee: ${ticket.assignee.name}`}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div
              title="Unassigned"
              className="w-5 h-5 rounded-full bg-slate-200 border border-dashed border-slate-400 flex items-center justify-center text-[9px] font-bold text-slate-500"
            >
              ?
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

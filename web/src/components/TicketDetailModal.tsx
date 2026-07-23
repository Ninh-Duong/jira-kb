import React from 'react';
import { Ticket } from '../types/kanban';
import { renderIssueTypeIcon, renderPriorityIcon } from './TicketCard';
import { X, Calendar, User, AlignLeft, Hash } from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onDelete?: (ticketId: string) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onDelete
}) => {
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top bar with Key & actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            {renderIssueTypeIcon(ticket.type)}
            <span className="font-bold text-sm text-slate-700">{ticket.key}</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">
              {ticket.jiraStatus ?? ticket.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(ticket.id);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                Delete Issue
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info (Left 2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {ticket.summary}
            </h2>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-1">
                <AlignLeft className="w-4 h-4" />
                <span>Description</span>
              </div>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200 leading-relaxed whitespace-pre-wrap">
                {ticket.description || 'No description provided for this issue.'}
              </p>
            </div>
          </div>

          {/* Details Sidebar (Right 1 col) */}
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Assignee</span>
              <div className="flex items-center gap-2">
                {ticket.assignee && ticket.assignee.avatarUrl ? (
                  <>
                    <img
                      src={ticket.assignee.avatarUrl}
                      alt={ticket.assignee.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-semibold text-slate-800">{ticket.assignee.name}</span>
                  </>
                ) : ticket.assignee ? (
                  <>
                    <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">
                      {ticket.assignee.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-800">{ticket.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-slate-400 italic">Unassigned</span>
                )}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Priority</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                {renderPriorityIcon(ticket.priority)}
                <span>{ticket.priority}</span>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Sprint</span>
              <div className="font-semibold text-slate-700">
                {ticket.sprintName || 'No sprint'}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Story Points</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>{ticket.storyPoints ?? 'None'}</span>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Created</span>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{ticket.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

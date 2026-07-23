import React, { useState } from 'react';
import { ColumnDefinition, Ticket } from '../types/kanban';
import { TicketCard } from './TicketCard';
import { Plus } from 'lucide-react';

interface ColumnProps {
  column: ColumnDefinition;
  tickets: Ticket[];
  onDropTicket: (ticketId: string, targetStatus: ColumnDefinition['id']) => void;
  onSelectTicket: (ticket: Ticket) => void;
  onCreateInColumn: (status: ColumnDefinition['id']) => void;
}

export const Column: React.FC<ColumnProps> = ({
  column,
  tickets,
  onDropTicket,
  onSelectTicket,
  onCreateInColumn
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const ticketId = e.dataTransfer.getData('text/plain');
    if (ticketId) {
      onDropTicket(ticketId, column.id);
    }
    setDraggedTicketId(null);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ticketId: string) => {
    e.dataTransfer.setData('text/plain', ticketId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTicketId(ticketId);
  };

  const isExceeded = column.limit !== undefined && tickets.length > column.limit;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col flex-shrink-0 w-72 max-h-full bg-slate-100/90 rounded-lg border p-2.5 transition-colors duration-150 ${
        isDragOver
          ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-300/40 shadow-inner'
          : 'border-slate-200/80'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2.5 px-1 pt-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-xs font-bold tracking-wider text-slate-600 uppercase">
            {column.title}
          </h3>
          <span
            className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
              isExceeded
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-slate-200/80 text-slate-600'
            }`}
          >
            {tickets.length}
            {column.limit ? ` / ${column.limit}` : ''}
          </span>
        </div>

        <button
          onClick={() => onCreateInColumn(column.id)}
          title={`Add issue to ${column.title}`}
          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Ticket List Container */}
      <div className="flex-1 overflow-y-auto min-h-[120px] pr-0.5 custom-scrollbar">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 rounded-md text-slate-400 text-xs my-1">
            <span>No issues</span>
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onSelect={onSelectTicket}
              onDragStart={handleDragStart}
              isDragging={draggedTicketId === ticket.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

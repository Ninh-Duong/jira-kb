import React from 'react';
import { Assignee, IssueType, Priority } from '../types/kanban';
import { Search, Plus, Filter, X } from 'lucide-react';

interface ControlBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedAssigneeId: string | null;
  onSelectAssignee: (id: string | null) => void;
  selectedPriority: Priority | 'All';
  onSelectPriority: (priority: Priority | 'All') => void;
  selectedType: IssueType | 'All';
  onSelectType: (type: IssueType | 'All') => void;
  assignees: Assignee[];
  onCreateClick: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedAssigneeId,
  onSelectAssignee,
  selectedPriority,
  onSelectPriority,
  selectedType,
  onSelectType,
  assignees,
  onCreateClick,
  onClearFilters,
  hasActiveFilters
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-white border-b border-slate-200">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search issues... (/)"
            className="pl-9 pr-8 py-1.5 w-60 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Assignee Avatar Filter Pill List */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
          <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Assignees:</span>
          {assignees.map((assignee) => {
            const isSelected = selectedAssigneeId === assignee.id;
            return (
              <button
                key={assignee.id}
                onClick={() => onSelectAssignee(isSelected ? null : assignee.id)}
                title={assignee.name}
                className={`relative rounded-full transition-transform ${
                  isSelected
                    ? 'ring-2 ring-blue-600 scale-110 z-10'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={assignee.avatarUrl}
                  alt={assignee.name}
                  className="w-7 h-7 rounded-full object-cover border border-white"
                />
              </button>
            );
          })}
        </div>

        {/* Priority Dropdown Filter */}
        <div className="flex items-center gap-1">
          <select
            value={selectedPriority}
            onChange={(e) => onSelectPriority(e.target.value as Priority | 'All')}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">Priority: All</option>
            <option value="Highest">Highest</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Lowest">Lowest</option>
          </select>
        </div>

        {/* Issue Type Dropdown Filter */}
        <div className="flex items-center gap-1">
          <select
            value={selectedType}
            onChange={(e) => onSelectType(e.target.value as IssueType | 'All')}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">Type: All</option>
            <option value="Story">Story</option>
            <option value="Task">Task</option>
            <option value="Bug">Bug</option>
            <option value="Epic">Epic</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors font-medium"
          >
            <Filter className="w-3 h-3" />
            <span>Clear filters</span>
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create Issue</span>
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Assignee, ColumnStatus, IssueType, Priority, Ticket } from '../types/kanban';
import { X, Plus } from 'lucide-react';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newTicket: Omit<Ticket, 'id' | 'key' | 'createdAt'>) => void;
  assignees: Assignee[];
  sprintOptions: string[];
  defaultSprintName?: string;
  defaultStatus?: ColumnStatus;
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assignees,
  sprintOptions,
  defaultSprintName,
  defaultStatus = 'Backlog'
}) => {
  const [summary, setSummary] = useState('');
  const [type, setType] = useState<IssueType>('Story');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<ColumnStatus>(defaultStatus);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState<number>(3);
  const [description, setDescription] = useState('');
  const [sprintName, setSprintName] = useState<string>(defaultSprintName ?? sprintOptions[0] ?? '');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSummary('');
    setType('Story');
    setPriority('Medium');
    setStatus(defaultStatus);
    setAssigneeId('');
    setStoryPoints(3);
    setDescription('');
    setSprintName(defaultSprintName ?? sprintOptions[0] ?? '');
  }, [defaultSprintName, defaultStatus, isOpen, sprintOptions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    const selectedAssignee = assignees.find((a) => a.id === assigneeId) || null;

    onSubmit({
      summary: summary.trim(),
      type,
      priority,
      status,
      assignee: selectedAssignee,
      sprintName: sprintName || undefined,
      storyPoints,
      description: description.trim()
    });

    // Reset form
    setSummary('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Create Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Implement user permission roles API"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Type & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Issue Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IssueType)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Story">Story 🟩</option>
                <option value="Task">Task 🟦</option>
                <option value="Bug">Bug 🟥</option>
                <option value="Epic">Epic 🟪</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Highest">Highest 🔴</option>
                <option value="High">High 🟠</option>
                <option value="Medium">Medium 🟡</option>
                <option value="Low">Low 🔵</option>
                <option value="Lowest">Lowest ⚪</option>
              </select>
            </div>
          </div>

          {/* Status & Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ColumnStatus)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Backlog">Backlog</option>
                <option value="Selected for Development">Selected for Dev</option>
                <option value="In Progress">In Progress</option>
                <option value="Review / QA">Review / QA</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Sprint
            </label>
            <select
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No sprint</option>
              {sprintOptions.map((sprint) => (
                <option key={sprint} value={sprint}>
                  {sprint}
                </option>
              ))}
            </select>
          </div>

          {/* Story Points */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Story Points
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={storyPoints}
              onChange={(e) => setStoryPoints(parseInt(e.target.value) || 0)}
              className="w-28 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, acceptance criteria, or context..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
            >
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

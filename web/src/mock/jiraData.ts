import { Assignee, ColumnDefinition, Ticket } from '../types/kanban';

export const mockAssignees: Assignee[] = [
  {
    id: 'user-1',
    name: 'Ninh Duong',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    email: 'ninh.duong@wecrm.io'
  },
  {
    id: 'user-2',
    name: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    email: 'alex.rivera@wecrm.io'
  },
  {
    id: 'user-3',
    name: 'Sarah Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    email: 'sarah.chen@wecrm.io'
  },
  {
    id: 'user-4',
    name: 'Marcus Vance',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    email: 'marcus.vance@wecrm.io'
  }
];

export const defaultColumns: ColumnDefinition[] = [
  { id: 'Backlog', title: 'BACKLOG', limit: 10, color: '#6B7280' },
  { id: 'Selected for Development', title: 'SELECTED FOR DEV', limit: 5, color: '#3B82F6' },
  { id: 'In Progress', title: 'IN PROGRESS', limit: 4, color: '#F59E0B' },
  { id: 'Review / QA', title: 'REVIEW / QA', limit: 3, color: '#8B5CF6' },
  { id: 'Done', title: 'DONE', color: '#10B981' }
];

// Clean initial tickets array (no dummy mock data)
export const initialMockTickets: Ticket[] = [];

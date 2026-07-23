export type SprintStatus = 'completed' | 'in-progress' | 'planned';

export interface RepoSprint {
  name: string;
  status: SprintStatus;
  goal?: string;
}

export interface RepoView {
  id: string;
  name: string;
  projectKey: string;
  sprints: RepoSprint[];
}

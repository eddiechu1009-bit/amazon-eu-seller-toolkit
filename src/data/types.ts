export interface TaskItem {
  id: string;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeline?: string;
  cost?: string;
  tips?: string[];
  warning?: string;
  prerequisites?: string[];
  documents?: { name: string; description: string; fields?: string[] }[];
  source?: string;
}

export interface Module {
  id: string;
  title: string;
  icon: string;
  description: string;
  items: TaskItem[];
}

export type ModuleId = 'brand' | 'listing' | 'fba' | 'postlaunch' | 'ppc' | 'promotions';

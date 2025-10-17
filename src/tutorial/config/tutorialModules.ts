export interface TutorialModule {
  id: string;
  name: string;
  description: string;
  icon?: string;
  order: number;
}

export const TUTORIAL_MODULES = {
  BASICS: 'basics',
  EDITOR: 'editor',
  TEMPLATES: 'templates',
  ADVANCED: 'advanced'
} as const;

export type TutorialModuleId = typeof TUTORIAL_MODULES[keyof typeof TUTORIAL_MODULES];

export const tutorialModules: TutorialModule[] = [
  {
    id: TUTORIAL_MODULES.BASICS,
    name: 'tutorial.modules.basics.name',
    description: 'tutorial.modules.basics.description',
    order: 1
  },
  {
    id: TUTORIAL_MODULES.EDITOR,
    name: 'tutorial.modules.editor.name',
    description: 'tutorial.modules.editor.description',
    order: 2
  },
  {
    id: TUTORIAL_MODULES.TEMPLATES,
    name: 'tutorial.modules.templates.name',
    description: 'tutorial.modules.templates.description',
    order: 3
  },
  {
    id: TUTORIAL_MODULES.ADVANCED,
    name: 'tutorial.modules.advanced.name',
    description: 'tutorial.modules.advanced.description',
    order: 4
  }
];

export function getModuleById(id: string): TutorialModule | undefined {
  return tutorialModules.find(m => m.id === id);
}

export function getModuleStepRange(moduleId: string, allSteps: any[]): { start: number; end: number } {
  const moduleSteps = allSteps.filter(s => s.module === moduleId);
  if (moduleSteps.length === 0) return { start: -1, end: -1 };
  
  const firstIndex = allSteps.indexOf(moduleSteps[0]);
  const lastIndex = allSteps.indexOf(moduleSteps[moduleSteps.length - 1]);
  
  return { start: firstIndex, end: lastIndex };
}

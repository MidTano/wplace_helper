import { writable, derived } from 'svelte/store';
import { tutorialSteps } from '../config/tutorialSteps';
import { tutorialModules } from '../config/tutorialModules';
import { 
  saveTutorialProgress, 
  saveTutorialComplete, 
  saveTutorialSkipped,
  getTutorialProgress 
} from './tutorialProgress';

export interface TutorialState {
  isActive: boolean;
  isWelcomeShown: boolean;
  currentStepIndex: number;
  totalSteps: number;
  isPaused: boolean;
  isCompleted: boolean;
}

function createTutorialStore() {
  const initialState: TutorialState = {
    isActive: false,
    isWelcomeShown: false,
    currentStepIndex: 0,
    totalSteps: tutorialSteps.length,
    isPaused: false,
    isCompleted: false
  };

  const { subscribe, set, update } = writable<TutorialState>(initialState);

  const currentStep = derived(
    { subscribe },
    $state => tutorialSteps[$state.currentStepIndex] || null
  );

  const currentModule = derived(
    currentStep,
    $currentStep => {
      if (!$currentStep) return null;
      return tutorialModules.find(m => m.id === $currentStep.module) || null;
    }
  );

  const progress = derived(
    { subscribe },
    $state => {
      if ($state.totalSteps === 0) return 0;
      return Math.round(($state.currentStepIndex / $state.totalSteps) * 100);
    }
  );

  const isFirstStep = derived(
    { subscribe },
    $state => $state.currentStepIndex === 0
  );

  const isLastStep = derived(
    { subscribe },
    $state => $state.currentStepIndex === $state.totalSteps - 1
  );

  return {
    subscribe,
    currentStep,
    currentModule,
    progress,
    isFirstStep,
    isLastStep,

    start: () => {
      update(state => ({
        ...state,
        isActive: true,
        isWelcomeShown: false,
        currentStepIndex: 0,
        isCompleted: false
      }));
    },

    showWelcome: () => {
      update(state => ({
        ...state,
        isWelcomeShown: true
      }));
    },

    hideWelcome: () => {
      update(state => ({
        ...state,
        isWelcomeShown: false
      }));
    },

    next: () => {
      update(state => {
        const nextIndex = state.currentStepIndex + 1;
        if (nextIndex >= state.totalSteps) {
          saveTutorialComplete();
          return {
            ...state,
            isActive: false,
            isCompleted: true,
            currentStepIndex: state.totalSteps - 1
          };
        }
        saveTutorialProgress(nextIndex);
        return {
          ...state,
          currentStepIndex: nextIndex
        };
      });
    },

    prev: () => {
      update(state => {
        const prevIndex = Math.max(0, state.currentStepIndex - 1);
        saveTutorialProgress(prevIndex);
        return {
          ...state,
          currentStepIndex: prevIndex
        };
      });
    },

    goToStep: (index: number) => {
      update(state => {
        const clampedIndex = Math.max(0, Math.min(state.totalSteps - 1, index));
        saveTutorialProgress(clampedIndex);
        return {
          ...state,
          currentStepIndex: clampedIndex
        };
      });
    },

    skip: () => {
      saveTutorialSkipped();
      set({
        ...initialState,
        isActive: false,
        isCompleted: false
      });
    },

    complete: () => {
      saveTutorialComplete();
      set({
        ...initialState,
        isActive: false,
        isCompleted: true
      });
    },

    pause: () => {
      update(state => ({
        ...state,
        isPaused: true
      }));
    },

    resume: () => {
      update(state => ({
        ...state,
        isPaused: false
      }));
    },

    reset: () => {
      set(initialState);
    },

    loadProgress: () => {
      const savedProgress = getTutorialProgress();
      update(state => ({
        ...state,
        currentStepIndex: savedProgress
      }));
    },

    restart: () => {
      set({
        ...initialState,
        isActive: false,
        isWelcomeShown: true
      });
    }
  };
}

export const tutorialStore = createTutorialStore();

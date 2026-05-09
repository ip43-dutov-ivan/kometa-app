import { createStore } from "zustand/vanilla";

export type OnboardingStep = 0 | 1 | 2;

const STEP_COUNT = 3 as const;
const SKIPPABLE_FROM_STEP = 1 as const;

export interface OnboardingState {
  step: OnboardingStep;
  direction: 1 | -1;
  name: string;
  bio: string;
  skills: string[];
  isSubmitting: boolean;
  error: string | null;
}

export interface OnboardingActions {
  setName: (name: string) => void;
  setBio: (bio: string) => void;
  setSkills: (skills: string[]) => void;
  goNext: () => void;
  goPrev: () => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

const initialState: OnboardingState = {
  step: 0,
  direction: 1,
  name: "",
  bio: "",
  skills: [],
  isSubmitting: false,
  error: null,
};

export { STEP_COUNT, SKIPPABLE_FROM_STEP };

export const onboardingStore = createStore<OnboardingStore>()((set, get) => ({
  ...initialState,
  setName: (name) => set({ name }),
  setBio: (bio) => set({ bio }),
  setSkills: (skills) => set({ skills }),
  goNext: () => {
    const { step } = get();
    if (step < STEP_COUNT - 1) {
      set({ step: (step + 1) as OnboardingStep, direction: 1 });
    }
  },
  goPrev: () => {
    const { step } = get();
    if (step > 0) {
      set({ step: (step - 1) as OnboardingStep, direction: -1 });
    }
  },
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));

export const selectOnboardingStep = (s: OnboardingStore) => s.step;
export const selectOnboardingDirection = (s: OnboardingStore) => s.direction;
export const selectOnboardingName = (s: OnboardingStore) => s.name;
export const selectOnboardingBio = (s: OnboardingStore) => s.bio;
export const selectOnboardingSkills = (s: OnboardingStore) => s.skills;
export const selectOnboardingIsSubmitting = (s: OnboardingStore) => s.isSubmitting;
export const selectOnboardingError = (s: OnboardingStore) => s.error;

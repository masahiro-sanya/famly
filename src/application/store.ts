import create from 'zustand';

type Tab = 'tasks' | 'defaults' | 'profile' | 'settings';

type UIState = {
  tab: Tab;
  isEditingTask: boolean;
  setTab: (tab: Tab) => void;
  setEditingTask: (editing: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  tab: 'tasks',
  isEditingTask: false,
  setTab: (tab) => set({ tab }),
  setEditingTask: (isEditingTask) => set({ isEditingTask }),
}));

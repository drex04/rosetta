import { create } from 'zustand';

export type RightTab = 'SOURCE' | 'ONTOLOGY' | 'MAP' | 'OUTPUT' | 'VALIDATE';

interface UiState {
  activeRightTab: RightTab;
  setActiveRightTab: (tab: RightTab) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  activeRightTab: 'SOURCE',
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
}));

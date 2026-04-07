import { create } from 'zustand';

export type RightTab = 'SOURCE' | 'ONTOLOGY' | 'MAP' | 'OUTPUT' | 'VALIDATE';

interface UiState {
  activeRightTab: RightTab;
  setActiveRightTab: (tab: RightTab) => void;
  tourRunning: boolean;
  setTourRunning: (v: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  activeRightTab: 'SOURCE',
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
  tourRunning: !localStorage.getItem('rosetta-tour-seen'),
  setTourRunning: (tourRunning) => set({ tourRunning }),
}));

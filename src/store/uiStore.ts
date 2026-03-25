import { create } from 'zustand'

type RightTab = 'SRC' | 'ONTO' | 'MAP' | 'OUT'

interface UiState {
  activeRightTab: RightTab
  setActiveRightTab: (tab: RightTab) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeRightTab: 'SRC',
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
}))

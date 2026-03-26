import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type RightTab = 'SRC' | 'ONTO' | 'MAP' | 'OUT'

interface UiState {
  activeRightTab: RightTab
  setActiveRightTab: (tab: RightTab) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeRightTab: 'SRC',
      setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
    }),
    { name: 'rosetta-ui' }
  )
)

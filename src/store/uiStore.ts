import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type RightTab = 'INPUT' | 'ONTOLOGY' | 'MAP' | 'OUTPUT' | 'VALIDATE'

interface UiState {
  activeRightTab: RightTab
  setActiveRightTab: (tab: RightTab) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeRightTab: 'INPUT',
      setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
    }),
    { name: 'rosetta-ui' }
  )
)

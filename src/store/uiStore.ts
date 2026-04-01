import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type RightTab = 'SOURCE' | 'ONTOLOGY' | 'MAP' | 'OUTPUT' | 'VALIDATE'

interface UiState {
  activeRightTab: RightTab
  setActiveRightTab: (tab: RightTab) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeRightTab: 'SOURCE',
      setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
    }),
    { name: 'rosetta-ui' }
  )
)

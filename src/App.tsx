import { Header } from './components/layout/Header'
import { Toolbar } from './components/layout/Toolbar'
import { SourceSelector } from './components/layout/SourceSelector'
import { RightPanel } from './components/layout/RightPanel'
import { OntologyCanvas } from './components/canvas/OntologyCanvas'

function App() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <Toolbar />
      <SourceSelector />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <OntologyCanvas />
        </div>
        <RightPanel />
      </div>
    </div>
  )
}

export default App

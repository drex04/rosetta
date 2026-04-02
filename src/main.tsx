import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlowProvider } from '@xyflow/react';
import './index.css';
import App from './App.tsx';
import { subscribeFusionToMappings } from './store/fusionStore.ts';

subscribeFusionToMappings();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  </StrictMode>,
);

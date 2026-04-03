import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import App from '../App';

test('app renders', () => {
  render(
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>,
  );
  expect(screen.getByText('Rosetta Workbench')).toBeInTheDocument();
});

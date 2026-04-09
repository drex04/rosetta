import { Joyride, STATUS } from 'react-joyride';
import type { EventData } from 'react-joyride';
import { tourSteps } from './tourSteps';
import { useUiStore } from '@/store/uiStore';
import type { RightTab } from '@/store/uiStore';

const TOUR_KEY = 'rosetta-tour-seen';

const TAB_FOR_STEP: Record<number, RightTab | null> = {
  0: 'SOURCE',
  1: 'SOURCE',
  2: 'ONTOLOGY',
  3: null,
  4: 'MAP',
  5: 'OUTPUT',
  6: 'VALIDATE',
  7: null,
};

export function TourProvider() {
  const tourRunning = useUiStore((s) => s.tourRunning);
  const setTourRunning = useUiStore((s) => s.setTourRunning);
  const setActiveRightTab = useUiStore((s) => s.setActiveRightTab);

  function handleEvent(data: EventData) {
    const { status, type, index } = data;

    if (type === 'step:before') {
      const tab = TAB_FOR_STEP[index as number];
      if (tab) setActiveRightTab(tab);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_KEY, '1');
      setTourRunning(false);
    }
  }

  return (
    <Joyride
      steps={tourSteps}
      run={tourRunning}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
        blockTargetInteraction: false,
        primaryColor: '#3b82f6',
        zIndex: 10000,
      }}
      styles={{
        tooltip: {
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        },
      }}
    />
  );
}

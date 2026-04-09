import { Joyride, STATUS } from 'react-joyride';
import type { EventData } from 'react-joyride';
import { tourSteps } from './tourSteps';
import { useUiStore } from '@/store/uiStore';
import type { RightTab } from '@/store/uiStore';

const TOUR_KEY = 'rosetta-tour-seen';

export function TourProvider() {
  const tourRunning = useUiStore((s) => s.tourRunning);
  const setTourRunning = useUiStore((s) => s.setTourRunning);
  const setActiveRightTab = useUiStore((s) => s.setActiveRightTab);

  function handleEvent(data: EventData) {
    const { status, type, step } = data;

    if (type === 'step:before') {
      const tab = (step.data as { tab?: RightTab | null } | undefined)?.tab;
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

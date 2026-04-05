import { useState, useCallback } from 'react';
import { Header } from './Header';
import { AboutDialog } from '@/components/ui/about-dialog';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [aboutOpen, setAboutOpen] = useState(
    () => !localStorage.getItem('rosetta-onboarding-v1'),
  );

  const handleAboutClose = useCallback(() => {
    localStorage.setItem('rosetta-onboarding-v1', 'seen');
    setAboutOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header onAboutClick={() => setAboutOpen(true)} />
      {children}
      <AboutDialog open={aboutOpen} onClose={handleAboutClose} />
    </div>
  );
}

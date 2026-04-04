import { useState, useEffect, useCallback } from 'react';
import { Header } from './Header';
import { AboutDialog } from '@/components/ui/about-dialog';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('rosetta-onboarding-v1')) {
      setAboutOpen(true);
    }
  }, []);

  const handleAboutClose = useCallback(() => {
    localStorage.setItem('rosetta-onboarding-v1', 'seen');
    setAboutOpen(false);
  }, []);

  return (
    <>
      <Header onAboutClick={() => setAboutOpen(true)} />
      {children}
      <AboutDialog open={aboutOpen} onClose={handleAboutClose} />
    </>
  );
}

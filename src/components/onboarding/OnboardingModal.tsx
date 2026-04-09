import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onLoadExample: () => void;
  onStartFresh: () => void;
}

export function OnboardingModal({ open, onLoadExample, onStartFresh }: Props) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg focus:outline-none"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <Dialog.Title className="text-base font-semibold text-foreground mb-2">
            Welcome to Rosetta
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-6">
            Rosetta is a visual tool for mapping heterogeneous data sources to a
            shared ontology. Load the NATO air defense scenario to see a working
            example, or start with a blank canvas.
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onStartFresh}>
              Start Fresh
            </Button>
            <Button variant="default" size="sm" onClick={onLoadExample}>
              Load Example &amp; Start Tour
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

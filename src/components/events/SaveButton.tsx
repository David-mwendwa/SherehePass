'use client';

import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { useOptimistic, useTransition } from 'react';

import { toast } from '@/components/ui/Toaster';
import { toggleSaveAction } from '@/app/events/actions';
import { cn } from '@/lib/cn';

/**
 * `useOptimistic` so the bookmark fills the instant it is clicked rather than
 * after a server round trip. React reverts it automatically if the action
 * throws, which is the behaviour you want: the button should end up showing
 * what the server actually stored, not what the click hoped for.
 */
export type SaveButtonProps = {
  eventId: string;
  initialSaved: boolean;
  signedIn: boolean;
};

export function SaveButton({
  eventId,
  initialSaved,
  signedIn,
}: SaveButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useOptimistic(initialSaved);

  function onClick() {
    if (!signedIn) {
      router.push(
        `/signin?next=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    startTransition(async () => {
      setSaved(!saved);
      const result = await toggleSaveAction(eventId);
      if (result.ok) {
        toast(result.saved ? 'Saved to your list.' : 'Removed from your list.', {
          tone: 'info',
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      disabled={pending}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
        saved
          ? 'border-primary-500/40 bg-primary-500/10 text-primary-200'
          : 'border-white/10 bg-white/[0.04] text-dark-300 hover:border-white/20 hover:text-white'
      )}
    >
      <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
      {saved ? 'Saved' : 'Save for later'}
    </button>
  );
}

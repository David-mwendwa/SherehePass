'use client';

import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * Transient messages.
 *
 * Deliberately tiny and dependency-free — a toast library is a lot of bytes for
 * "say a sentence and go away". The store lives on the window rather than in a
 * context provider wrapping the tree, so a Server Component page can hand a
 * message to a small client component without the whole app becoming client.
 *
 * Toasts are announced through a polite live region: a message that only
 * appears visually is invisible to a screen reader, and "ticket saved" is
 * exactly the kind of confirmation that matters most to someone who cannot see
 * the button change.
 */

const listeners = new Set();
let nextId = 0;

export function toast(message, { tone = 'success', duration = 4000 } = {}) {
  const entry = { id: ++nextId, message, tone };
  listeners.forEach((fn) => fn({ type: 'add', entry }));
  if (duration) {
    setTimeout(() => {
      listeners.forEach((fn) => fn({ type: 'remove', id: entry.id }));
    }, duration);
  }
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONE_CLASSES = {
  success: 'border-success-500/30 text-success-400',
  error: 'border-danger-500/30 text-danger-400',
  info: 'border-primary-500/30 text-primary-300',
};

export function Toaster() {
  const [items, setItems] = useState([]);

  const subscribe = useCallback((event) => {
    setItems((current) =>
      event.type === 'add'
        ? [...current, event.entry]
        : current.filter((item) => item.id !== event.id)
    );
  }, []);

  useEffect(() => {
    listeners.add(subscribe);
    return () => listeners.delete(subscribe);
  }, [subscribe]);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {items.map((item) => {
        const Icon = ICONS[item.tone] ?? Info;
        return (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border bg-dark-900/95 px-4 py-3 text-sm text-white shadow-card-hover backdrop-blur-xl',
              TONE_CLASSES[item.tone]
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-dark-100">{item.message}</span>
            <button
              type="button"
              onClick={() => setItems((c) => c.filter((i) => i.id !== item.id))}
              className="text-dark-400 transition-colors hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

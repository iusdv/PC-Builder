import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

type ToastVariant = 'success' | 'info' | 'error';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastApi = {
  show: (message: string, opts?: { variant?: ToastVariant; durationMs?: number }) => void;
  success: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current[id];
    if (t) window.clearTimeout(t);
    delete timers.current[id];
  }, []);

  const show = useCallback(
    (message: string, opts?: { variant?: ToastVariant; durationMs?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const variant = opts?.variant ?? 'info';
      const durationMs = opts?.durationMs ?? 2200;

      setToasts((prev) => [{ id, message, variant }, ...prev].slice(0, 3));

      timers.current[id] = window.setTimeout(() => remove(id), durationMs);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, d) => show(m, { variant: 'success', durationMs: d }),
      info: (m, d) => show(m, { variant: 'info', durationMs: d }),
      error: (m, d) => show(m, { variant: 'error', durationMs: d }),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const tone =
              t.variant === 'success'
                ? 'border-[color-mix(in_srgb,var(--accent-cyan)_45%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] text-[var(--text)]'
                : t.variant === 'error'
                  ? 'border-[var(--danger-border)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] text-[var(--danger-text)]'
                  : 'border-[color-mix(in_srgb,var(--primary)_38%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] text-[var(--text)]';

            return (
              <motion.div
                key={t.id}
                className={`pointer-events-auto min-w-[220px] max-w-[320px] rounded-xl border shadow-sm backdrop-blur px-3 py-2 text-sm ${tone}`}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                onClick={() => remove(t.id)}
                role="status"
                aria-live="polite"
                title="Click to dismiss"
              >
                {t.message}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

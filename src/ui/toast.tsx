import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckIcon } from "./icons";

type ToastContextValue = {
  /** Shows a short confirmation at the bottom of the screen for 2.2 s; a new message replaces the current one. */
  show: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_MS = 2200;

/** Hosts the single toast (design-home §3.3). The status region is always in the DOM so screen readers announce each message. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setToast((current) => ({ id: (current?.id ?? 0) + 1, text }));
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-8 z-[60] h-0">
        {toast && (
          <div
            key={toast.id}
            className="absolute bottom-0 left-1/2 flex w-max max-w-[calc(100vw-32px)] items-center gap-2 rounded-btn bg-ink px-[18px] py-3 text-sm text-bg shadow-toast animate-toast-in [transform:translateX(-50%)]"
          >
            <CheckIcon className="flex-none" />
            <span>{toast.text}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
};

/** Copies text to the clipboard; resolves false when the browser refuses (insecure context, permission denied). */
export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

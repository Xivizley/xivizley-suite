"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  id?: string | undefined;
  type?: ToastType | undefined;
  title?: string | undefined;
  duration?: number | undefined;
  action?:
    | {
        label: string;
        onClick: () => void;
      }
    | undefined;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: ReactNode;
  title?: string | undefined;
  duration: number;
  action?:
    | {
        label: string;
        onClick: () => void;
      }
    | undefined;
  createdAt: number;
}

export interface ToastMethods {
  (message: ReactNode, options?: ToastOptions): string;
  success: (message: ReactNode, options?: Omit<ToastOptions, "type">) => string;
  error: (message: ReactNode, options?: Omit<ToastOptions, "type">) => string;
  info: (message: ReactNode, options?: Omit<ToastOptions, "type">) => string;
  warning: (message: ReactNode, options?: Omit<ToastOptions, "type">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  toast: ToastMethods;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 0;
function generateToastId(): string {
  toastSeq = (toastSeq + 1) % Number.MAX_SAFE_INTEGER;
  return `aurora-toast-${Date.now()}-${toastSeq}`;
}

// ─── Toast Kartı İkonları ───────────────────────────────────

function SuccessIcon() {
  return (
    <svg
      className="w-4 h-4 text-emerald-400 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="w-4 h-4 text-rose-400 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="w-4 h-4 text-amber-400 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="w-4 h-4 text-[#38bdf8] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Tekil Toast Kart Bileşeni ──────────────────────────────

export function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef<number>(toast.duration);
  const startTimeRef = useRef<number>(Date.now());

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (toast.duration <= 0 || toast.duration === Infinity) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, remainingRef.current);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        const elapsed = Date.now() - startTimeRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, handleDismiss, toast.duration]);

  const typeStyles = {
    success:
      "border-emerald-500/30 bg-[#142321] text-emerald-100 shadow-[0_8px_24px_rgba(16,185,129,0.12)]",
    error:
      "border-rose-500/35 bg-[#25171b] text-rose-100 shadow-[0_8px_24px_rgba(244,63,94,0.14)]",
    warning:
      "border-amber-500/35 bg-[#252016] text-amber-100 shadow-[0_8px_24px_rgba(245,158,11,0.12)]",
    info: "border-[#0082c9]/35 bg-[#14202c] text-sky-100 shadow-[0_8px_24px_rgba(0,130,201,0.15)]",
  };

  const barStyles = {
    success: "bg-emerald-500",
    error: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-[#0082c9]",
  };

  const icons = {
    success: <SuccessIcon />,
    error: <ErrorIcon />,
    warning: <WarningIcon />,
    info: <InfoIcon />,
  };

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={clsx(
        "pointer-events-auto relative w-full overflow-hidden rounded-xl border p-3.5 backdrop-blur-md transition-all duration-200 select-none",
        typeStyles[toast.type],
        isExiting
          ? "opacity-0 translate-y-2 scale-95"
          : "opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-3 duration-200",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icons[toast.type]}</div>

        <div className="flex-1 min-w-0 pr-1">
          {toast.title && (
            <h5 className="text-xs font-semibold text-white tracking-tight mb-0.5 truncate">
              {toast.title}
            </h5>
          )}
          <div className="text-xs text-slate-200 font-medium leading-relaxed break-words">
            {toast.message}
          </div>

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                handleDismiss();
              }}
              className="mt-2 text-xs font-semibold text-white underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 -mr-1 -mt-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
          aria-label="Kapat"
        >
          <CloseIcon />
        </button>
      </div>

      {/* İlerleme Çubuğu */}
      {toast.duration > 0 && toast.duration !== Infinity && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
          <div
            className={clsx(
              "h-full transition-all ease-linear",
              barStyles[toast.type],
            )}
            style={{
              animation: `aurora-toast-progress ${toast.duration}ms linear forwards`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Toast Container ────────────────────────────────────────

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Bildirimler"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── Toast Provider & Hook ──────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (message: ReactNode, options?: ToastOptions): string => {
      const id = options?.id || generateToastId();
      const newItem: ToastItem = {
        id,
        type: options?.type || "info",
        message,
        title: options?.title,
        duration: options?.duration ?? 3500,
        action: options?.action,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // En fazla son 5 toast tut
        const filtered = prev.filter((t) => t.id !== id);
        return [...filtered.slice(-4), newItem];
      });

      return id;
    },
    [],
  );

  const toastMethods = useCallback(
    Object.assign(
      (message: ReactNode, options?: ToastOptions) =>
        addToast(message, options),
      {
        success: (message: ReactNode, options?: Omit<ToastOptions, "type">) =>
          addToast(message, { ...options, type: "success" }),
        error: (message: ReactNode, options?: Omit<ToastOptions, "type">) =>
          addToast(message, { ...options, type: "error" }),
        info: (message: ReactNode, options?: Omit<ToastOptions, "type">) =>
          addToast(message, { ...options, type: "info" }),
        warning: (message: ReactNode, options?: Omit<ToastOptions, "type">) =>
          addToast(message, { ...options, type: "warning" }),
        dismiss,
        clear,
      },
    ),
    [addToast, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={{ toasts, toast: toastMethods, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastMethods {
  const context = useContext(ToastContext);
  if (!context) {
    // Güvenli fallback: Eğer Provider dışında çağrılırsa console uyarısı verir
    const fallbackFn = (msg: ReactNode) => {
      console.warn("useToast ToastProvider dışında çağrıldı:", msg);
      return "";
    };
    return Object.assign(fallbackFn, {
      success: fallbackFn,
      error: fallbackFn,
      info: fallbackFn,
      warning: fallbackFn,
      dismiss: () => {},
      clear: () => {},
    }) as ToastMethods;
  }
  return context.toast;
}

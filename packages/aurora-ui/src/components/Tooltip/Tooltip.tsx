import {
  type ReactNode,
  type HTMLAttributes,
  forwardRef,
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
} from "react";
import { clsx } from "clsx";

// ─── Props ──────────────────────────────────────────────────

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  /** Tooltip içeriği (metin veya JSX) */
  content: ReactNode;
  /** Konum */
  position?: TooltipPosition;
  /** Gecikme süresi (ms) — hover ettikten sonra ne kadar beklesin */
  delay?: number;
  /** Devre dışı bırakma */
  disabled?: boolean;
  /** Tetikleyici element (children) */
  children: ReactNode;
}

// ─── Konum Stilleri ─────────────────────────────────────────

const positionStyles: Record<TooltipPosition, string> = {
  top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left:   "right-full top-1/2 -translate-y-1/2 mr-2",
  right:  "left-full top-1/2 -translate-y-1/2 ml-2",
};

// Ok (triangle) yönleri
const arrowStyles: Record<TooltipPosition, string> = {
  top:    "top-full left-1/2 -translate-x-1/2 border-t-aurora-elevated border-l-transparent border-r-transparent border-b-transparent border-4",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-aurora-elevated border-l-transparent border-r-transparent border-t-transparent border-4",
  left:   "left-full top-1/2 -translate-y-1/2 border-l-aurora-elevated border-t-transparent border-b-transparent border-r-transparent border-4",
  right:  "right-full top-1/2 -translate-y-1/2 border-r-aurora-elevated border-t-transparent border-b-transparent border-l-transparent border-4",
};

// ─── Tooltip Bileşeni ───────────────────────────────────────

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(
    {
      content,
      position = "top",
      delay = 200,
      disabled = false,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tooltipId = useId();

    const show = useCallback(() => {
      if (disabled) return;
      timerRef.current = setTimeout(() => setVisible(true), delay);
    }, [delay, disabled]);

    const hide = useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
    }, []);

    // Temizlik
    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    return (
      <div
        ref={ref}
        className={clsx("relative inline-flex", className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        {...rest}
      >
        {/* Tetikleyici */}
        <div aria-describedby={visible ? tooltipId : undefined}>
          {children}
        </div>

        {/* Tooltip balonu */}
        {visible && content && (
          <div
            id={tooltipId}
            role="tooltip"
            className={clsx(
              "absolute z-50 pointer-events-none",
              "px-3 py-1.5 rounded-aurora-sm",
              "bg-aurora-elevated text-aurora-text-primary",
              "text-xs font-medium whitespace-nowrap",
              "shadow-[var(--aurora-shadow-md)]",
              "border border-aurora",
              // Giriş animasyonu
              "animate-in fade-in-0 zoom-in-95 duration-150",
              positionStyles[position],
            )}
          >
            {content}
            {/* Ok */}
            <span
              className={clsx("absolute w-0 h-0", arrowStyles[position])}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    );
  },
);

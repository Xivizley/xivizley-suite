import { type HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

// ─── Props ──────────────────────────────────────────────────

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerColor = "cyan" | "white" | "green" | "amber" | "rose" | "current";

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  color?: SpinnerColor;
  /** Ekran okuyucu etiketi */
  label?: string;
}

// ─── Stiller ────────────────────────────────────────────────

const sizeMap: Record<SpinnerSize, number> = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 36,
  xl: 48,
};

const strokeMap: Record<SpinnerSize, number> = {
  xs: 2,
  sm: 2,
  md: 2.5,
  lg: 3,
  xl: 3.5,
};

const colorMap: Record<SpinnerColor, string> = {
  cyan:    "text-aurora-cyan",
  white:   "text-white",
  green:   "text-aurora-green",
  amber:   "text-aurora-amber",
  rose:    "text-aurora-rose",
  current: "text-current",
};

// ─── Spinner Bileşeni ───────────────────────────────────────

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  function Spinner(
    {
      size = "md",
      color = "cyan",
      label = "Yükleniyor",
      className,
      ...rest
    },
    ref,
  ) {
    const dim = sizeMap[size];
    const stroke = strokeMap[size];
    const r = (dim - stroke) / 2;

    return (
      <div
        ref={ref}
        role="status"
        className={clsx("inline-flex items-center justify-center", className)}
        {...rest}
      >
        <svg
          className={clsx("animate-aurora-spin", colorMap[color])}
          width={dim}
          height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          fill="none"
          aria-hidden="true"
        >
          {/* Arka plan halkası */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth={stroke}
          />
          {/* Dönen yay */}
          <path
            d={`M${dim / 2} ${stroke / 2} A${r} ${r} 0 0 1 ${dim - stroke / 2} ${dim / 2}`}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
        {/* Ekran okuyucu metni */}
        <span className="sr-only">{label}</span>
      </div>
    );
  },
);

import { type HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

// ─── Props ──────────────────────────────────────────────────

export type CardVariant = "default" | "outlined" | "elevated" | "neon";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** İç dolgu devre dışı bırakılır (ConsoleViewer gibi tam ekran içerik için) */
  noPadding?: boolean;
  /** Başlık alanı (opsiyonel) */
  header?: React.ReactNode;
  /** Alt bilgi alanı (opsiyonel) */
  footer?: React.ReactNode;
}

// ─── Stiller ────────────────────────────────────────────────

const variantStyles: Record<CardVariant, string> = {
  default: [
    "aurora-glass",
    "rounded-aurora",
  ].join(" "),

  outlined: [
    "bg-transparent",
    "border border-aurora",
    "rounded-aurora",
  ].join(" "),

  elevated: [
    "aurora-glass",
    "rounded-aurora",
    "shadow-[var(--aurora-shadow-md)]",
  ].join(" "),

  neon: [
    "aurora-glass",
    "rounded-aurora",
    "border border-aurora-glow",
    "shadow-aurora-sm",
    "hover:shadow-aurora-md transition-shadow",
  ].join(" "),
};

// ─── Card Bileşeni ──────────────────────────────────────────

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card(
    {
      variant = "default",
      noPadding = false,
      header,
      footer,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={clsx(
          variantStyles[variant],
          "flex flex-col overflow-hidden",
          className,
        )}
        {...rest}
      >
        {/* Header */}
        {header && (
          <div className="px-5 py-3.5 border-b border-aurora flex items-center">
            {header}
          </div>
        )}

        {/* İçerik */}
        <div className={clsx("flex-1", !noPadding && "p-5")}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-aurora flex items-center">
            {footer}
          </div>
        )}
      </div>
    );
  },
);

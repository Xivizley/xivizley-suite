"use client";

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
    "bg-[#222933]",
    "border border-[#2d3748]",
    "rounded-xl shadow-sm",
  ].join(" "),

  outlined: [
    "bg-transparent",
    "border border-[#2d3748]",
    "rounded-xl",
  ].join(" "),

  elevated: [
    "bg-[#222933]",
    "border border-[#2d3748]",
    "rounded-xl shadow-md",
  ].join(" "),

  neon: [
    "bg-[#222933]",
    "border border-[#2d3748]",
    "hover:border-[#0082c9]/60",
    "rounded-xl shadow-sm transition-all",
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

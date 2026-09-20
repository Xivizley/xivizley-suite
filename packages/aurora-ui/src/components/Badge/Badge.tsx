"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

// ─── Varyant Tanımları ──────────────────────────────────────

export type BadgeVariant =
  | "default"   // Nötr gri
  | "cyan"      // Bilgi / aktif
  | "green"     // Başarı / running
  | "amber"     // Uyarı / dikkat
  | "rose"      // Hata / tehlike
  | "purple";   // Özel / premium

export type BadgeSize = "sm" | "md";

// ─── Props ──────────────────────────────────────────────────

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Neon nokta animasyonu (sunucu durumu vb. için) */
  pulse?: boolean;
}

// ─── Stiller ────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-aurora-elevated text-aurora-text-secondary border-aurora",
  cyan:    "bg-aurora-cyan/15 text-aurora-cyan border-aurora-cyan/30",
  green:   "bg-aurora-green/15 text-aurora-green border-aurora-green/30",
  amber:   "bg-aurora-amber/15 text-aurora-amber border-aurora-amber/30",
  rose:    "bg-aurora-rose/15  text-aurora-rose  border-aurora-rose/30",
  purple:  "bg-aurora-purple/15 text-aurora-purple border-aurora-purple/30",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-aurora-text-muted",
  cyan:    "bg-aurora-cyan",
  green:   "bg-aurora-green",
  amber:   "bg-aurora-amber",
  rose:    "bg-aurora-rose",
  purple:  "bg-aurora-purple",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "h-5 px-1.5 text-[10px] gap-1",
  md: "h-6 px-2.5 text-xs gap-1.5",
};

// ─── Badge Bileşeni ─────────────────────────────────────────

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    {
      variant = "default",
      size = "md",
      pulse = false,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <span
        ref={ref}
        className={clsx(
          "inline-flex items-center font-medium rounded-aurora-sm border",
          "leading-none select-none whitespace-nowrap",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...rest}
      >
        {/* Opsiyonel neon nokta */}
        {pulse && (
          <span className="relative flex h-2 w-2 shrink-0">
            {/* Dış pulse halkası */}
            <span
              className={clsx(
                "absolute inset-0 rounded-full animate-aurora-pulse",
                dotColors[variant],
                "opacity-60",
              )}
            />
            {/* İç sabit nokta */}
            <span
              className={clsx(
                "relative inline-flex h-2 w-2 rounded-full",
                dotColors[variant],
              )}
            />
          </span>
        )}
        {children}
      </span>
    );
  },
);

// ─── StatusBadge — Sunucu Durumu Kısayolu ───────────────────

export type ServerStatus = "running" | "stopped" | "starting" | "stopping" | "crashed" | "unknown";

const statusConfig: Record<ServerStatus, { variant: BadgeVariant; label: string; pulse: boolean }> = {
  running:  { variant: "green",   label: "Çalışıyor",    pulse: true },
  stopped:  { variant: "default", label: "Durduruldu",   pulse: false },
  starting: { variant: "amber",   label: "Başlatılıyor", pulse: true },
  stopping: { variant: "amber",   label: "Durduruluyor", pulse: true },
  crashed:  { variant: "rose",    label: "Çöktü",        pulse: false },
  unknown:  { variant: "default", label: "Bilinmiyor",   pulse: false },
};

export interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "pulse"> {
  status: ServerStatus;
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  function StatusBadge({ status, children, ...rest }, ref) {
    const config = statusConfig[status];
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        pulse={config.pulse}
        {...rest}
      >
        {children ?? config.label}
      </Badge>
    );
  },
);

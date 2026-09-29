"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

// ─── Varyant ve Boyut Tanımları ─────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "icon";
export type ButtonSize = "sm" | "md" | "lg";

// ─── Props ──────────────────────────────────────────────────

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Görsel varyant */
  variant?: ButtonVariant;
  /** Boyut */
  size?: ButtonSize;
  /** Yükleniyor durumu — spinner gösterir, butonu devre dışı bırakır */
  isLoading?: boolean;
  /** Sol taraftaki ikon (React node) */
  leftIcon?: React.ReactNode;
  /** Sağ taraftaki ikon (React node) */
  rightIcon?: React.ReactNode;
  /** Tam genişlik */
  fullWidth?: boolean;
}

// ─── Stiller ────────────────────────────────────────────────

const baseStyles = [
  "inline-flex items-center justify-center gap-2",
  "font-medium leading-none select-none",
  "rounded-aurora transition-all",
  "focus-visible:aurora-focus-ring",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
].join(" ");

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-[#0082c9] text-white",
    "hover:bg-[#006aa3] shadow-sm",
    "active:brightness-95 active:scale-[0.98]",
  ].join(" "),

  secondary: [
    "bg-[#222933] text-slate-100",
    "border border-[#2d3748]",
    "hover:bg-[#2b3442] hover:border-slate-500 shadow-sm",
    "active:scale-[0.98]",
  ].join(" "),

  danger: [
    "bg-rose-600 text-white",
    "hover:bg-rose-700 shadow-sm",
    "active:brightness-95 active:scale-[0.98]",
  ].join(" "),

  ghost: [
    "bg-transparent text-slate-300",
    "hover:bg-[#2b3442] hover:text-white",
    "active:scale-[0.98]",
  ].join(" "),

  icon: [
    "bg-[#222933] text-slate-300",
    "border border-[#2d3748] rounded-lg",
    "hover:bg-[#2b3442] hover:text-white hover:border-[#0082c9]",
    "active:scale-[0.95]",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 w-8 p-0",
  md: "h-10 w-10 p-0",
  lg: "h-12 w-12 p-0",
};

// ─── Spinner SVG ────────────────────────────────────────────

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx("animate-aurora-spin", className)}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Button Bileşeni ────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    const isIcon = variant === "icon";

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          isIcon ? iconSizeStyles[size] : sizeStyles[size],
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...rest}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
);

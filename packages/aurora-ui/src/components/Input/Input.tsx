"use client";

import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { clsx } from "clsx";

// ─── Props ──────────────────────────────────────────────────

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Boyut */
  size?: InputSize;
  /** Etiket */
  label?: string;
  /** Alt açıklama / ipucu */
  hint?: string;
  /** Hata mesajı — varsa kırmızı kenarlık + mesaj gösterir */
  error?: string;
  /** Sol taraftaki ikon */
  leftIcon?: React.ReactNode;
  /** Sağ taraftaki ikon veya aksyon */
  rightIcon?: React.ReactNode;
  /** Tam genişlik */
  fullWidth?: boolean;
}

// ─── Stiller ────────────────────────────────────────────────

const wrapperSizeStyles: Record<InputSize, string> = {
  sm: "h-8 text-xs",
  md: "h-10 text-sm",
  lg: "h-12 text-base",
};

// ─── Input Bileşeni ─────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      size = "md",
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      id: externalId,
      disabled,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = externalId ?? autoId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const hasError = !!error;

    return (
      <div className={clsx("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-aurora-text-secondary text-[var(--aurora-text-sm)] font-medium"
          >
            {label}
          </label>
        )}

        {/* Input Wrapper — Glassmorphism */}
        <div
          className={clsx(
            "relative flex items-center",
            "aurora-glass rounded-aurora",
            "border transition-all",
            wrapperSizeStyles[size],
            hasError
              ? "border-aurora-rose shadow-aurora-danger"
              : "border-aurora hover:border-aurora-glow focus-within:border-aurora-cyan focus-within:shadow-aurora-sm",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          {/* Sol ikon */}
          {leftIcon && (
            <span className="pl-3 text-aurora-text-muted shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              "w-full h-full bg-transparent px-3",
              "text-aurora-text-primary placeholder:text-aurora-text-muted",
              "outline-none",
              "disabled:cursor-not-allowed",
              leftIcon && "pl-1.5",
              rightIcon && "pr-1.5",
            )}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={
              [hintId, errorId].filter(Boolean).join(" ") || undefined
            }
            {...rest}
          />

          {/* Sağ ikon */}
          {rightIcon && (
            <span className="pr-3 text-aurora-text-muted shrink-0" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </div>

        {/* Hata mesajı */}
        {error && (
          <p id={errorId} className="text-aurora-rose text-[var(--aurora-text-xs)]" role="alert">
            {error}
          </p>
        )}

        {/* İpucu */}
        {!error && hint && (
          <p id={hintId} className="text-aurora-text-muted text-[var(--aurora-text-xs)]">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

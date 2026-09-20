"use client";

import {
  type HTMLAttributes,
  forwardRef,
  useEffect,
  useRef,
  type ReactNode,
  useCallback,
} from "react";
import { clsx } from "clsx";
import { Button } from "../Button";

// ─── Props ──────────────────────────────────────────────────

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  /** Modal görünürlüğü */
  isOpen: boolean;
  /** Kapatma çağrısı (dışarı tıklandığında, X'e basıldığında veya Escape'e basıldığında) */
  onClose: () => void;
  /** Modal başlığı */
  title?: ReactNode;
  /** Başlık altı açıklama */
  description?: ReactNode;
  /** Genişlik boyutu (varsayılan: md) */
  size?: ModalSize;
  /** Alt aksiyon butonları yuvası */
  footer?: ReactNode;
  /** Dışarıya (backdrop) tıklandığında kapansın mı? (varsayılan: true) */
  closeOnBackdrop?: boolean;
  /** Escape tuşuna basıldığında kapansın mı? (varsayılan: true) */
  closeOnEscape?: boolean;
}

// ─── Boyut Haritası ─────────────────────────────────────────

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

// ─── Modal Bileşeni ─────────────────────────────────────────

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  function Modal(
    {
      isOpen,
      onClose,
      title,
      description,
      size = "md",
      footer,
      closeOnBackdrop = true,
      closeOnEscape = true,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const modalRef = useRef<HTMLDivElement | null>(null);

    // Escape tuşu kontrolü
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (closeOnEscape && e.key === "Escape") {
          onClose();
        }
      },
      [closeOnEscape, onClose],
    );

    useEffect(() => {
      if (isOpen) {
        window.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";
      }

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-aurora-bg-dark/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        {/* Modal Gövdesi */}
        <div
          ref={ref ?? modalRef}
          className={clsx(
            "relative w-full rounded-aurora-lg border border-aurora-glow/30 aurora-glass bg-aurora-bg-surface/95",
            "shadow-[0_0_24px_var(--aurora-cyan-glow)] flex flex-col overflow-hidden",
            "animate-in zoom-in-95 duration-200",
            sizeStyles[size],
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          {...rest}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-aurora">
              <div className="space-y-1">
                {title && (
                  <h3 className="text-lg font-semibold text-aurora-text-primary tracking-tight">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs text-aurora-text-secondary">
                    {description}
                  </p>
                )}
              </div>

              {/* Kapat Butonu (X) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full text-aurora-text-muted hover:text-aurora-text-primary -mr-2"
                aria-label="Kapat"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 4L4 12" />
                  <path d="M4 4l8 8" />
                </svg>
              </Button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 p-6 overflow-y-auto text-sm text-aurora-text-secondary">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-aurora bg-aurora-bg-dark/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  },
);

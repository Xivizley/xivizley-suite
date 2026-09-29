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

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        {/* Modal Gövdesi */}
        <div
          ref={ref ?? modalRef}
          className={clsx(
            "relative w-full rounded-2xl border border-[#2d3748] bg-[#222933]",
            "shadow-2xl flex flex-col overflow-hidden",
            "animate-in zoom-in-95 duration-200",
            sizeStyles[size],
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          {...rest}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#2d3748]">
              <div className="space-y-1">
                {title && (
                  <h3 className="text-lg font-semibold text-slate-100 tracking-tight">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs text-slate-400">
                    {description}
                  </p>
                )}
              </div>

              {/* Kapat Butonu (X) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-white -mr-2"
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
          <div className="flex-1 p-6 overflow-y-auto text-sm text-slate-200">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#2d3748] bg-[#181e24]">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  },
);

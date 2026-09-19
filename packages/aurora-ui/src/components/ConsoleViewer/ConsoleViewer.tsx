import {
  type HTMLAttributes,
  forwardRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { clsx } from "clsx";
import { Button } from "../Button/index.js";
import { StatusBadge, type ServerStatus } from "../Badge/index.js";

// ─── Props ──────────────────────────────────────────────────

export interface ConsoleViewerProps extends HTMLAttributes<HTMLDivElement> {
  /** Sunucu veya oturum başlığı (örn: "FiveM Roleplay Server") */
  title: string;
  /** Sunucu çalışma durumu */
  status?: ServerStatus;
  /** Terminalin mount edileceği DOM elemanı için harici ref yuvası */
  terminalRef?: RefObject<HTMLDivElement | null>;
  /** Terminal temizleme aksiyonu tetiklendiğinde çağrılır */
  onClear?: () => void;
  /** Konsol içeriğini kopyalama aksiyonu tetiklendiğinde çağrılır */
  onCopy?: () => void;
  /** Otomatik kaydırma durumu harici kontrolü (varsayılan: true) */
  autoScroll?: boolean;
  /** Otomatik kaydırma değiştiğinde çağrılır */
  onAutoScrollChange?: (enabled: boolean) => void;
  /** Konsol pencere yüksekliği (varsayılan: h-96 / 384px) */
  height?: string;
  /** Harici başlık aksiyonları / butonlar */
  extraActions?: ReactNode;
  /** xterm veya özel DOM çocukları için alan */
  children?: ReactNode;
}

// ─── ConsoleViewer Bileşeni ─────────────────────────────────

export const ConsoleViewer = forwardRef<HTMLDivElement, ConsoleViewerProps>(
  function ConsoleViewer(
    {
      title,
      status = "running",
      terminalRef,
      onClear,
      onCopy,
      autoScroll: externalAutoScroll,
      onAutoScrollChange,
      height = "h-96",
      extraActions,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [internalAutoScroll, setInternalAutoScroll] = useState(true);
    const [copied, setCopied] = useState(false);

    const isAutoScrollActive =
      externalAutoScroll !== undefined ? externalAutoScroll : internalAutoScroll;

    const toggleAutoScroll = () => {
      const next = !isAutoScrollActive;
      if (externalAutoScroll === undefined) {
        setInternalAutoScroll(next);
      }
      onAutoScrollChange?.(next);
    };

    const handleCopy = () => {
      onCopy?.();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const toggleFullscreen = () => {
      setIsFullscreen((prev) => !prev);
    };

    return (
      <div
        ref={ref}
        className={clsx(
          "flex flex-col rounded-aurora overflow-hidden border border-aurora bg-aurora-bg-dark transition-all duration-200",
          isFullscreen
            ? "fixed inset-0 z-50 rounded-none border-none h-screen w-screen"
            : clsx("w-full shadow-[var(--aurora-shadow-md)]", height),
          className,
        )}
        {...rest}
      >
        {/* Başlık ve Aksiyon Çubuğu */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-aurora-bg-surface border-b border-aurora select-none shrink-0">
          {/* Sol: Başlık + Durum Rozeti */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Terminal Pencere Noktaları */}
            <div className="flex items-center gap-1.5 mr-1 shrink-0" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-aurora-rose/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-aurora-amber/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-aurora-green/80" />
            </div>

            <span className="font-mono text-xs font-semibold text-aurora-text-primary truncate">
              {title}
            </span>

            <StatusBadge status={status} size="sm" />
          </div>

          {/* Sağ: Aksiyon Butonları */}
          <div className="flex items-center gap-1.5 shrink-0">
            {extraActions}

            {/* Otomatik Kaydırma Toggle */}
            <Button
              variant={isAutoScrollActive ? "primary" : "ghost"}
              size="sm"
              onClick={toggleAutoScroll}
              title={isAutoScrollActive ? "Otomatik Kaydırma: Açık" : "Otomatik Kaydırma: Kapalı"}
              className="text-xs px-2.5 h-7"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5l-4 4-4-4" />
                <path d="M12 9l-4 4-4-4" />
              </svg>
              <span className="hidden sm:inline">Oto Kaydır</span>
            </Button>

            {/* Kopyala */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              title="Konsol Çıktısını Kopyala"
              className="text-xs px-2.5 h-7"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="5" y="5" width="8" height="8" rx="1.5" />
                <path d="M3 11V3a1.5 1.5 0 0 1 1.5-1.5H11" />
              </svg>
              <span className="hidden sm:inline">{copied ? "Kopyalandı" : "Kopyala"}</span>
            </Button>

            {/* Temizle */}
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                title="Konsolu Temizle"
                className="text-xs px-2.5 h-7"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 4h12" />
                  <path d="M5 4V2.5A1.5 1.5 0 0 1 6.5 1h3A1.5 1.5 0 0 1 11 2.5V4" />
                  <path d="M13 4v9.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.5V4" />
                </svg>
                <span className="hidden sm:inline">Temizle</span>
              </Button>
            )}

            {/* Tam Ekran Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
              className="text-xs px-2 h-7"
            >
              {isFullscreen ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 14h3v-3H4v3zM12 14H9v-3h3v3zM4 2h3v3H4V2zM12 2H9v3h3V2z" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 6V2h4" />
                  <path d="M14 6V2h-4" />
                  <path d="M2 10v4h4" />
                  <path d="M14 10v4h-4" />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Terminal Enjeksiyon Yuvası (xterm veya children buraya bağlanır) */}
        <div
          ref={terminalRef}
          className="relative flex-1 w-full h-full p-2.5 overflow-hidden bg-aurora-bg-dark font-mono text-xs select-text focus:outline-none"
          tabIndex={0}
          role="region"
          aria-label={`${title} konsol çıktısı`}
        >
          {children}
        </div>
      </div>
    );
  },
);

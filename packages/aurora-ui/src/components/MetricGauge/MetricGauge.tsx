import { type HTMLAttributes, forwardRef, useMemo } from "react";
import { clsx } from "clsx";

// ─── Tipler ──────────────────────────────────────────────────

export type MetricGaugeSize = "sm" | "md" | "lg";

export interface MetricThresholds {
  /** Uyarı eşiği yüzdesi (örn: 80 → %80'de amber olur) - Varsayılan: 80 */
  warning?: number;
  /** Kritik durdurma eşiği yüzdesi (örn: 90 → %90'da rose olur) - Varsayılan: 90 */
  critical?: number;
}

export interface MetricGaugeProps extends HTMLAttributes<HTMLDivElement> {
  /** Metrik başlığı (örn: "RAM Kullanımı", "CPU Çekirdek 1") */
  label: string;
  /** Anlık değer (max verilmişse mutlak sayı örn: 6400, verilmemişse 0-100 arası yüzde) */
  value: number;
  /** Maksimum kapasite (örn: 8192 MB). Belirtilmezse value doğrudan yüzde kabul edilir */
  max?: number;
  /** Birim (örn: "MB", "GB", "GHz", "%") */
  unit?: string;
  /** Boyut */
  size?: MetricGaugeSize;
  /** Eşik değerleri (Resource Governor %80 ve %90 kurallarına uyumlu) */
  thresholds?: MetricThresholds;
  /** Çubuk üzerinde %80 ve %90 gibi eşik işaret çizgilerini göster */
  showThresholdMarkers?: boolean;
  /** Alt bilgi veya ipucu metni (örn: "LLM askıya alma eşiğine yakın") */
  helperText?: string;
  /** Değeri özel formatlamak için fonksiyon */
  formatValue?: (val: number, max?: number) => string;
}

// ─── Boyut Haritaları ───────────────────────────────────────

const trackHeightStyles: Record<MetricGaugeSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const labelTextStyles: Record<MetricGaugeSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base font-semibold",
};

const valueTextStyles: Record<MetricGaugeSize, string> = {
  sm: "text-xs font-mono",
  md: "text-sm font-mono font-medium",
  lg: "text-lg font-mono font-semibold",
};

// ─── MetricGauge Bileşeni ────────────────────────────────────

export const MetricGauge = forwardRef<HTMLDivElement, MetricGaugeProps>(
  function MetricGauge(
    {
      label,
      value,
      max,
      unit = "%",
      size = "md",
      thresholds = { warning: 80, critical: 90 },
      showThresholdMarkers = true,
      helperText,
      formatValue,
      className,
      ...rest
    },
    ref,
  ) {
    const warningThreshold = thresholds.warning ?? 80;
    const criticalThreshold = thresholds.critical ?? 90;

    // Yüzde hesabı (0 ile 100 arasında sınırla)
    const percentage = useMemo(() => {
      if (max !== undefined && max > 0) {
        return Math.min(Math.max((value / max) * 100, 0), 100);
      }
      return Math.min(Math.max(value, 0), 100);
    }, [value, max]);

    // Durum seviyesi: normal | warning | critical
    const statusLevel = useMemo(() => {
      if (percentage >= criticalThreshold) return "critical";
      if (percentage >= warningThreshold) return "warning";
      return "normal";
    }, [percentage, warningThreshold, criticalThreshold]);

    // Renk stilleri
    const statusColors = {
      normal: {
        bar: "bg-aurora-cyan shadow-[0_0_10px_var(--aurora-cyan-glow)]",
        text: "text-aurora-cyan",
        badgeBg: "bg-aurora-cyan/15 text-aurora-cyan border-aurora-cyan/30",
      },
      warning: {
        bar: "bg-aurora-amber shadow-[0_0_10px_var(--aurora-amber-glow)]",
        text: "text-aurora-amber",
        badgeBg: "bg-aurora-amber/15 text-aurora-amber border-aurora-amber/30",
      },
      critical: {
        bar: "bg-aurora-rose shadow-[0_0_12px_var(--aurora-rose-glow)]",
        text: "text-aurora-rose",
        badgeBg: "bg-aurora-rose/15 text-aurora-rose border-aurora-rose/30",
      },
    }[statusLevel];

    // Görüntülenecek metin
    const displayValue = useMemo(() => {
      if (formatValue) return formatValue(value, max);
      if (max !== undefined) {
        return `${value.toLocaleString("tr-TR")} / ${max.toLocaleString("tr-TR")} ${unit}`;
      }
      return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}${unit}`;
    }, [value, max, unit, formatValue]);

    return (
      <div
        ref={ref}
        className={clsx("flex flex-col gap-1.5 w-full", className)}
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max ?? 100}
        aria-valuetext={`${percentage.toFixed(1)}%`}
        {...rest}
      >
        {/* Üst Bilgi Satırı */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={clsx("text-aurora-text-primary font-medium", labelTextStyles[size])}>
              {label}
            </span>
            {/* Yüzde Rozeti */}
            <span
              className={clsx(
                "px-1.5 py-0.5 rounded-aurora-sm text-[10px] font-mono font-medium border leading-none",
                statusColors.badgeBg,
              )}
            >
              %{percentage.toFixed(0)}
            </span>
          </div>

          <span className={clsx(statusColors.text, valueTextStyles[size])}>
            {displayValue}
          </span>
        </div>

        {/* Gösterge Çubuğu (Progress Track) */}
        <div
          className={clsx(
            "relative w-full rounded-full overflow-hidden bg-aurora-surface border border-aurora/50 backdrop-blur-sm",
            trackHeightStyles[size],
          )}
        >
          {/* İlerleme Dolgusu */}
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-300 ease-out",
              statusColors.bar,
            )}
            style={{ width: `${percentage}%` }}
          />

          {/* Eşik Değer İşaretçileri (Markers) */}
          {showThresholdMarkers && (
            <>
              {/* %80 Eşiği (Brain Suspend) */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-aurora-amber/60 z-10 pointer-events-none"
                style={{ left: `${warningThreshold}%` }}
                title={`Uyarı Eşiği: %${warningThreshold}`}
              />
              {/* %90 Eşiği (Vault Halt) */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-aurora-rose/80 z-10 pointer-events-none"
                style={{ left: `${criticalThreshold}%` }}
                title={`Kritik Eşik: %${criticalThreshold}`}
              />
            </>
          )}
        </div>

        {/* Yardımcı / Uyarı Açıklama Metni */}
        {helperText && (
          <p className="text-aurora-text-muted text-xs flex items-center gap-1 mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

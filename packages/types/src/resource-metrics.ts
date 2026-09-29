// ─── XIVIZLEY Resource Metrics Tipleri ───────────────────
// Resource Governor ve Game Panel'in SSE akışında kullandığı tipler.

/** Host sistemin anlık kaynak durumu */
export interface HostMetrics {
  /** Ölçüm zamanı (Unix timestamp ms) */
  timestamp: number;
  /** Toplam RAM (MB) */
  totalRamMb: number;
  /** Kullanılan RAM (MB) */
  usedRamMb: number;
  /** Kullanım yüzdesi (0–100) */
  ramUsagePercent: number;
  /** Toplam CPU çekirdek sayısı */
  totalCpuCores: number;
  /** Anlık CPU kullanımı % (0–100) */
  cpuUsagePercent: number;
  /** Gerçek İşlemci Modeli (Örn: Intel® Xeon® E5-2697 v2, AMD Ryzen™ 9 9950X) */
  cpuModel?: string | undefined;
  /** Toplam Disk Boyutu (GB) */
  totalDiskGb?: number | undefined;
  /** Kullanılan Disk Boyutu (GB) */
  usedDiskGb?: number | undefined;
  /** Disk Kullanım Yüzdesi % (0–100) */
  diskUsagePercent?: number | undefined;
  /** Tespit edilen Sunucu IP veya Hostname */
  serverIp?: string | undefined;
  /** İşletim Sistemi ve Mimari Bilgisi (Örn: Linux x64) */
  osInfo?: string | undefined;
}

/** Tek bir Docker container'ın anlık kaynak kullanımı */
export interface ContainerMetrics {
  containerId: string;
  containerName: string;
  /** Kullanılan RAM (MB) */
  memUsageMb: number;
  /** RAM limiti (MB), -1 = limitsiz */
  memLimitMb: number;
  /** CPU kullanımı % (0–100) */
  cpuPercent: number;
  timestamp: number;
}

/** Resource Governor tarafından tetiklenen eylemler */
export type ResourceAction =
  | { type: "suspend"; target: "brain"; reason: string }
  | { type: "halt"; target: "vault"; reason: string }
  | { type: "restore"; target: "brain" | "vault" };

/** Eşik değer konfigürasyonu (resource-gov paketi içinden okunur) */
export interface ResourceGovernorConfig {
  /** Toplam RAM (MB) — varsayılan 8192 */
  totalRamMb: number;
  /** Toplam CPU çekirdek — varsayılan 4 */
  totalCpuCores: number;
  /** Brain'i askıya alma eşiği (0–1 arası oran) — varsayılan 0.80 */
  brainSuspendThreshold: number;
  /** Vault'u durdurma eşiği (0–1 arası oran) — varsayılan 0.90 */
  vaultHaltThreshold: number;
  /** Kontrol aralığı (ms) — varsayılan 2000 */
  pollIntervalMs: number;
}

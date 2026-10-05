import os from "node:os";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import Docker from "dockerode";
import type {
  HostMetrics,
  ResourceGovernorConfig,
  ResourceAction,
} from "@xivizley/types";

export interface ResourceGovernorEvents {
  "brain:suspend": (action: ResourceAction) => void;
  "vault:halt": (action: ResourceAction) => void;
  "resources:restored": (action: ResourceAction) => void;
  metrics: (metrics: HostMetrics) => void;
}

export class ResourceGovernor extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private docker: Docker;
  private config: ResourceGovernorConfig;
  private isBrainSuspended = false;
  private isVaultHalted = false;
  private cachedPublicIp: string | null = null;

  // CPU ölçümü için önceki değerler
  private prevCpuTimes: { idle: number; total: number } | null = null;

  constructor(
    customConfig?: Partial<ResourceGovernorConfig>,
    dockerOptions?: Docker.DockerOptions,
  ) {
    super();

    this.config = {
      totalRamMb:
        customConfig?.totalRamMb ?? Number(process.env["TOTAL_RAM_MB"] || 8192),
      totalCpuCores:
        customConfig?.totalCpuCores ??
        Number(process.env["TOTAL_CPU_CORES"] || os.cpus().length || 4),
      brainSuspendThreshold:
        customConfig?.brainSuspendThreshold ??
        Number(process.env["BRAIN_SUSPEND_THRESHOLD"] || 0.8),
      vaultHaltThreshold:
        customConfig?.vaultHaltThreshold ??
        Number(process.env["VAULT_HALT_THRESHOLD"] || 0.9),
      pollIntervalMs:
        customConfig?.pollIntervalMs ??
        Number(process.env["POLL_INTERVAL_MS"] || 2000),
    };

    // Docker API istemcisi (varsayılan: /var/run/docker.sock)
    this.docker = new Docker(
      dockerOptions ?? {
        socketPath: process.env["DOCKER_SOCKET_PATH"] || "/var/run/docker.sock",
      },
    );

    // Otomatik sunucu IP tespiti (Çevre değişkeni veya arka plan sorgusu)
    if (process.env["SERVER_PUBLIC_IP"]) {
      this.cachedPublicIp = process.env["SERVER_PUBLIC_IP"];
    } else {
      this.detectPublicIp();
    }
  }

  private detectPublicIp(): void {
    // 1. Dış servis üzerinden IP çöz
    fetch("https://api.ipify.org", { signal: AbortSignal.timeout(3000) })
      .then((res) => res.text())
      .then((ip) => {
        if (ip && ip.trim()) {
          this.cachedPublicIp = ip.trim();
        }
      })
      .catch(() => {
        // 2. Fallback: Host ağ arayüzlerinden ilk harici IPv4'ü al
        try {
          const nets = os.networkInterfaces();
          for (const name of Object.keys(nets)) {
            for (const net of nets[name] || []) {
              if (
                net.family === "IPv4" &&
                !net.internal &&
                !net.address.startsWith("172.")
              ) {
                this.cachedPublicIp = net.address;
                return;
              }
            }
          }
        } catch {
          // sessizce geç
        }
      });
  }

  /**
   * İzleme döngüsünü başlatır (Her 2000 ms'de bir os metriklerini okur).
   */
  public start(): void {
    if (this.timer) return;

    // İlk referans CPU değerini kaydet
    this.prevCpuTimes = this.calculateCpuTimes();

    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        this.emit("error", err);
      });
    }, this.config.pollIntervalMs);
  }

  /**
   * İzleme döngüsünü durdurur.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Node.js os ve fs modülü ile gerçek sistem donanım metriklerini okur.
   */
  public getMetrics(): HostMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const totalRamMb = Math.round(totalMem / (1024 * 1024));
    const usedRamMb = Math.round(usedMem / (1024 * 1024));
    const ramUsagePercent = Math.min(
      100,
      Math.round((usedMem / totalMem) * 100),
    );

    const cpuUsagePercent = this.calculateCpuPercent();

    // Gerçek CPU Modeli
    const cpus = os.cpus();
    const firstCpu = cpus && cpus.length > 0 ? cpus[0] : undefined;
    const rawCpuModel = firstCpu?.model ? firstCpu.model.trim() : "Generic CPU";
    const cpuModel = rawCpuModel
      .replace(/\(R\)/gi, "®")
      .replace(/\(TM\)/gi, "™")
      .replace(/\s+CPU\s+/gi, " ")
      .replace(/\s+Processor/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // Gerçek Disk Boyutu ve Kullanımı
    let totalDiskGb = 0;
    let usedDiskGb = 0;
    let diskUsagePercent = 0;
    try {
      if (typeof fs.statfsSync === "function") {
        const stats = fs.statfsSync("/");
        const totalBytes = Number(stats.blocks) * Number(stats.bsize);
        const freeBytes = Number(stats.bfree) * Number(stats.bsize);
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        totalDiskGb = Math.round(totalBytes / (1024 * 1024 * 1024));
        usedDiskGb = Math.round(usedBytes / (1024 * 1024 * 1024));
        diskUsagePercent =
          totalBytes > 0
            ? Math.min(100, Math.round((usedBytes / totalBytes) * 100))
            : 0;
      }
    } catch {
      // statfs desteklenmiyorsa varsayılan
    }

    return {
      timestamp: Date.now(),
      totalRamMb,
      usedRamMb,
      ramUsagePercent,
      totalCpuCores: cpus.length,
      cpuUsagePercent,
      cpuModel,
      totalDiskGb: totalDiskGb || undefined,
      usedDiskGb: usedDiskGb || undefined,
      diskUsagePercent: diskUsagePercent || undefined,
      serverIp: this.cachedPublicIp || undefined,
      osInfo: `${os.type()} ${os.arch()}`,
    };
  }

  /**
   * Periyodik kontrol adımı. Eşik değerleri değerlendirir ve Docker API ile müdahale eder.
   */
  private async tick(): Promise<void> {
    const metrics = this.getMetrics();
    this.emit("metrics", metrics);

    const ramRatio = metrics.ramUsagePercent / 100;

    // 1. %90 Eşiği Kontrolü -> Vault Halt (Durdur)
    if (ramRatio >= this.config.vaultHaltThreshold) {
      if (!this.isVaultHalted) {
        await this.handleVaultHalt(metrics);
      }
    } else if (
      ramRatio < this.config.vaultHaltThreshold - 0.05 &&
      this.isVaultHalted
    ) {
      // Histerezis: %85'in altına düşerse Vault yeniden başlatılabilir
      await this.handleVaultRestore();
    }

    // 2. %80 Eşiği Kontrolü -> Brain Suspend (Pause/Askıya al)
    if (ramRatio >= this.config.brainSuspendThreshold) {
      if (!this.isBrainSuspended) {
        await this.handleBrainSuspend(metrics);
      }
    } else if (
      ramRatio < this.config.brainSuspendThreshold - 0.05 &&
      this.isBrainSuspended
    ) {
      // Histerezis: %75'in altına düşerse Brain resume edilebilir
      await this.handleBrainRestore();
    }
  }

  /**
   * Brain (LLM) konteynerini Docker API üzerinden pause eder (askıya alır).
   */
  private async handleBrainSuspend(metrics: HostMetrics): Promise<void> {
    this.isBrainSuspended = true;
    const action: ResourceAction = {
      type: "suspend",
      target: "brain",
      reason: `RAM kullanımı %${metrics.ramUsagePercent.toFixed(1)} ile %${(this.config.brainSuspendThreshold * 100).toFixed(0)} eşiğini aştı.`,
    };

    this.emit("brain:suspend", action);

    try {
      const container = this.docker.getContainer("xivizley-brain");
      await container.pause();
    } catch {
      // Konteyner çalışmıyor veya bulunamıyor olabilir
    }
  }

  /**
   * Brain (LLM) konteynerini yeniden unpause eder.
   */
  private async handleBrainRestore(): Promise<void> {
    this.isBrainSuspended = false;
    const action: ResourceAction = {
      type: "restore",
      target: "brain",
    };

    this.emit("resources:restored", action);

    try {
      const container = this.docker.getContainer("xivizley-brain");
      await container.unpause();
    } catch {
      // hata yakala
    }
  }

  /**
   * Vault (Fotoğraf/AI analizi) konteynerini Docker API üzerinden stop eder (durdurur).
   */
  private async handleVaultHalt(metrics: HostMetrics): Promise<void> {
    this.isVaultHalted = true;
    const action: ResourceAction = {
      type: "halt",
      target: "vault",
      reason: `RAM kullanımı %${metrics.ramUsagePercent.toFixed(1)} ile kritik %${(this.config.vaultHaltThreshold * 100).toFixed(0)} eşiğini aştı.`,
    };

    this.emit("vault:halt", action);

    try {
      const container = this.docker.getContainer("xivizley-vault");
      await container.stop({ t: 5 }); // 5 sn graceful stop
    } catch {
      // hata yakala
    }
  }

  /**
   * Vault konteynerini yeniden start eder.
   */
  private async handleVaultRestore(): Promise<void> {
    this.isVaultHalted = false;
    const action: ResourceAction = {
      type: "restore",
      target: "vault",
    };

    this.emit("resources:restored", action);

    try {
      const container = this.docker.getContainer("xivizley-vault");
      await container.start();
    } catch {
      // hata yakala
    }
  }

  private calculateCpuTimes(): { idle: number; total: number } {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total +=
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.irq +
        cpu.times.idle;
    }

    return { idle, total };
  }

  private calculateCpuPercent(): number {
    const current = this.calculateCpuTimes();

    if (!this.prevCpuTimes) {
      this.prevCpuTimes = current;
      return 0;
    }

    const idleDiff = current.idle - this.prevCpuTimes.idle;
    const totalDiff = current.total - this.prevCpuTimes.total;

    this.prevCpuTimes = current;

    if (totalDiff <= 0) return 0;

    const usage = (1 - idleDiff / totalDiff) * 100;
    return Math.min(Math.max(Math.round(usage * 10) / 10, 0), 100);
  }
}

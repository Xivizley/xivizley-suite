import os from "node:os";
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

  // CPU ölçümü için önceki değerler
  private prevCpuTimes: { idle: number; total: number } | null = null;

  constructor(customConfig?: Partial<ResourceGovernorConfig>, dockerOptions?: Docker.DockerOptions) {
    super();

    this.config = {
      totalRamMb: customConfig?.totalRamMb ?? Number(process.env["TOTAL_RAM_MB"] || 8192),
      totalCpuCores: customConfig?.totalCpuCores ?? Number(process.env["TOTAL_CPU_CORES"] || os.cpus().length || 4),
      brainSuspendThreshold: customConfig?.brainSuspendThreshold ?? Number(process.env["BRAIN_SUSPEND_THRESHOLD"] || 0.80),
      vaultHaltThreshold: customConfig?.vaultHaltThreshold ?? Number(process.env["VAULT_HALT_THRESHOLD"] || 0.90),
      pollIntervalMs: customConfig?.pollIntervalMs ?? Number(process.env["POLL_INTERVAL_MS"] || 2000),
    };

    // Docker API istemcisi (varsayılan: /var/run/docker.sock)
    this.docker = new Docker(
      dockerOptions ?? {
        socketPath: process.env["DOCKER_SOCKET_PATH"] || "/var/run/docker.sock",
      },
    );
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
   * Node.js os modülü ile sistem metriklerini okur.
   */
  public getMetrics(): HostMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const totalRamMb = Math.round(totalMem / (1024 * 1024));
    const usedRamMb = Math.round(usedMem / (1024 * 1024));
    const ramUsagePercent = (usedMem / totalMem) * 100;

    const cpuUsagePercent = this.calculateCpuPercent();

    return {
      timestamp: Date.now(),
      totalRamMb,
      usedRamMb,
      ramUsagePercent,
      totalCpuCores: os.cpus().length,
      cpuUsagePercent,
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
    } else if (ramRatio < this.config.vaultHaltThreshold - 0.05 && this.isVaultHalted) {
      // Histerezis: %85'in altına düşerse Vault yeniden başlatılabilir
      await this.handleVaultRestore();
    }

    // 2. %80 Eşiği Kontrolü -> Brain Suspend (Pause/Askıya al)
    if (ramRatio >= this.config.brainSuspendThreshold) {
      if (!this.isBrainSuspended) {
        await this.handleBrainSuspend(metrics);
      }
    } else if (ramRatio < this.config.brainSuspendThreshold - 0.05 && this.isBrainSuspended) {
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
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
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

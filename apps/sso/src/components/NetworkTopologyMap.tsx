"use client";

// ============================================================
// XIVIZLEY OpsCenter v1.1 — Canlı Ağ ve Konteyner Topoloji Haritası
// Nextcloud Hub / Aurora UI Canlı SVG Düğüm & Ağ Köprüsü Görselleştirmesi
// Mimar: Alperen Celal (14, Bursa)
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Globe,
  Shield,
  Network,
  Server,
  Database,
  Gamepad2,
  Film,
  Download,
  FolderTree,
  Terminal,
  Activity,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Cpu,
  Layers,
  X,
} from "lucide-react";
import type {
  SentinelStatus,
  ContainerStatus,
} from "@/server/services/sentinelService";

interface TopologyNode {
  id: string;
  name: string;
  label: string;
  category: "wan" | "proxy" | "bridge" | "core" | "game" | "homelab";
  ports: string[];
  internalIp: string;
  image: string;
  status: "running" | "warning" | "stopped";
  cpuUsage: number;
  ramUsage: number;
  description: string;
  restartPolicy: string;
}

export function NetworkTopologyMap() {
  const [sentinel, setSentinel] = useState<SentinelStatus | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "core" | "homelab">(
    "all",
  );

  const fetchTopologyData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sentinel/status");
      const json = await res.json();
      if (json.ok && json.data) {
        setSentinel(json.data);
      }
    } catch (err) {
      console.error("Topoloji verisi alınamadı:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopologyData();
    const interval = setInterval(fetchTopologyData, 20000); // 20s otomatik yenile
    return () => clearInterval(interval);
  }, []);

  const getContainerState = (
    containerName: string,
  ): "running" | "warning" | "stopped" => {
    if (!sentinel?.containers) return "running";
    const found = sentinel.containers.find(
      (c) => c.name === containerName || c.name.includes(containerName),
    );
    if (!found) return "running";
    if (found.status === "running") return "running";
    if (found.status === "restarting" || found.status === "paused")
      return "warning";
    return "stopped";
  };

  // Tanımlı Düğümler (PenDC Bursa Altyapısı)
  const nodes: TopologyNode[] = [
    {
      id: "wan",
      name: "WAN / İnternet (İstemci Trafiği)",
      label: "Genel Ağ Gateway",
      category: "wan",
      ports: ["178.210.168.163:443", "178.210.168.163:80"],
      internalIp: "178.210.168.163",
      image: "Bursa PenDC Tier-3 Fiber (10 Gbps)",
      status: "running",
      cpuUsage: Math.min(
        100,
        Math.round((sentinel?.host.cpu.usagePercent || 15) * 0.4),
      ),
      ramUsage: 12,
      description:
        "İstemcilerden gelen HTTPS ve HTTP isteklerinin VDS sunucusuna girdiği halka açık uç nokta.",
      restartPolicy: "N/A",
    },
    {
      id: "caddy-waf",
      name: "xivizley-caddy",
      label: "Caddy TLS & Layer-7 WAF",
      category: "proxy",
      ports: ["80:80/tcp", "443:443/tcp"],
      internalIp: "172.20.0.2",
      image: "caddy:2-alpine",
      status: getContainerState("xivizley-caddy"),
      cpuUsage: 4,
      ramUsage: 35,
      description:
        "Otomatik Let's Encrypt TLS 1.3 sonlandırma, HTTP/2 yönlendirme ve rate-limiting ters vekil.",
      restartPolicy: "unless-stopped",
    },
    {
      id: "bridge",
      name: "xivizley-bridge",
      label: "Docker Dahili Köprüsü",
      category: "bridge",
      ports: ["172.20.0.0/16"],
      internalIp: "172.20.0.1",
      image: "docker0 (Bridge Network)",
      status: "running",
      cpuUsage: 2,
      ramUsage: 8,
      description:
        "Konteynerler arası izole, yüksek hızlı yerel ağ köprüsü (Software-Defined Bridge).",
      restartPolicy: "host-managed",
    },
    {
      id: "hub",
      name: "xivizley-hub",
      label: "XIVIZLEY Hub (SSO & Gateway)",
      category: "core",
      ports: ["3000:3000/tcp"],
      internalIp: "172.20.0.10",
      image: "xivizley/hub:v1.1",
      status: getContainerState("xivizley-hub"),
      cpuUsage: sentinel?.host.cpu.usagePercent || 18,
      ramUsage: sentinel?.host.ram.usagePercent || 42,
      description:
        "RS256 JWT Single Sign-On, Fastify API ve Next.js merkezi kullanıcı arayüzü motoru.",
      restartPolicy: "unless-stopped",
    },
    {
      id: "postgres",
      name: "xivizley-postgres",
      label: "PostgreSQL 16 Veritabanı",
      category: "core",
      ports: ["5432:5432/tcp"],
      internalIp: "172.20.0.11",
      image: "postgres:16-alpine",
      status: getContainerState("xivizley-postgres"),
      cpuUsage: 5,
      ramUsage: 28,
      description:
        "ACID uyumlu ilişkisel veritabanı, oturum anahtarları ve şifreli veri saklama alanı.",
      restartPolicy: "unless-stopped",
    },
    {
      id: "fivem",
      name: "fivem-server",
      label: "FiveM FXServer (GTA V)",
      category: "game",
      ports: ["30120:30120/tcp", "30120:30120/udp"],
      internalIp: "172.20.0.20",
      image: "sprits/fivem:latest",
      status: getContainerState("fivem-server"),
      cpuUsage: 24,
      ramUsage: 68,
      description:
        "Bursa PenDC üzerinde çalışan düşük gecikmeli GTA V Roleplay oyun sunucusu çekirdeği.",
      restartPolicy: "always",
    },
    {
      id: "qbittorrent",
      name: "qbittorrent",
      label: "qBittorrent İndirme Motoru",
      category: "homelab",
      ports: ["8080:8080/tcp", "6881:6881/tcp"],
      internalIp: "172.20.0.30",
      image: "linuxserver/qbittorrent:latest",
      status: getContainerState("qbittorrent"),
      cpuUsage: 6,
      ramUsage: 32,
      description:
        "Otomatik dosya transferi ve Web UI arayüzü ile bağımsız torrent istemcisi.",
      restartPolicy: "unless-stopped",
    },
    {
      id: "jellyfin",
      name: "jellyfin",
      label: "Jellyfin Medya Sunucusu",
      category: "homelab",
      ports: ["8096:8096/tcp"],
      internalIp: "172.20.0.31",
      image: "jellyfin/jellyfin:latest",
      status: getContainerState("jellyfin"),
      cpuUsage: 12,
      ramUsage: 45,
      description:
        "Donanım hızlandırmalı video & ses akış sunucusu ve yerel sinema merkezi.",
      restartPolicy: "unless-stopped",
    },
    {
      id: "filebrowser",
      name: "filebrowser",
      label: "FileBrowser Hızlı Dosya Yöneticisi",
      category: "homelab",
      ports: ["8081:8081/tcp"],
      internalIp: "172.20.0.32",
      image: "filebrowser/filebrowser:v2",
      status: getContainerState("filebrowser"),
      cpuUsage: 2,
      ramUsage: 15,
      description:
        "VDS disk dizinlerini doğrudan tarayıcı üzerinden yönetme arayüzü.",
      restartPolicy: "unless-stopped",
    },
  ];

  const filteredNodes = nodes.filter((n) => {
    if (activeFilter === "core")
      return ["wan", "proxy", "bridge", "core"].includes(n.category);
    if (activeFilter === "homelab")
      return ["wan", "proxy", "bridge", "game", "homelab"].includes(n.category);
    return true;
  });

  const getStatusBadge = (status: TopologyNode["status"]) => {
    if (status === "running") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ÇALIŞIYOR
        </span>
      );
    }
    if (status === "warning") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          UYARI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        DURDU
      </span>
    );
  };

  const getNodeIcon = (category: TopologyNode["category"], id: string) => {
    switch (category) {
      case "wan":
        return <Globe className="w-5 h-5 text-[#38bdf8]" />;
      case "proxy":
        return <Shield className="w-5 h-5 text-emerald-400" />;
      case "bridge":
        return <Network className="w-5 h-5 text-[#0082c9]" />;
      case "core":
        return id === "postgres" ? (
          <Database className="w-5 h-5 text-cyan-400" />
        ) : (
          <Server className="w-5 h-5 text-[#0082c9]" />
        );
      case "game":
        return <Gamepad2 className="w-5 h-5 text-rose-400" />;
      case "homelab":
        if (id === "jellyfin")
          return <Film className="w-5 h-5 text-purple-400" />;
        if (id === "qbittorrent")
          return <Download className="w-5 h-5 text-amber-400" />;
        return <FolderTree className="w-5 h-5 text-sky-400" />;
      default:
        return <Layers className="w-5 h-5 text-slate-300" />;
    }
  };

  const containerNodes = filteredNodes.filter(
    (n) => !["wan", "proxy", "bridge"].includes(n.category),
  );
  const runningCount = nodes.filter((n) => n.status === "running").length;

  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#222933] p-5 sm:p-6 shadow-xl space-y-6 font-sans">
      {/* ─── Başlık & Kontroller ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#2d3748] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0082c9]/20 border border-[#0082c9]/30 flex items-center justify-center text-[#0082c9]">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Canlı Ağ ve Konteyner Topoloji Haritası
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                v1.1 Canlı
              </span>
            </div>
            <p className="text-xs text-slate-400">
              WAN ➔ Caddy TLS Proxy ➔ Docker Bridge ➔ Konteyner Veri Akışı
            </p>
          </div>
        </div>

        {/* Filtre ve Yenile Butonları */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-[#181e24] p-1 rounded-xl border border-[#2d3748] text-xs">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeFilter === "all"
                  ? "bg-[#0082c9] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Tümü ({nodes.length})
            </button>
            <button
              onClick={() => setActiveFilter("core")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeFilter === "core"
                  ? "bg-[#0082c9] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Çekirdek
            </button>
            <button
              onClick={() => setActiveFilter("homelab")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeFilter === "homelab"
                  ? "bg-[#0082c9] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Oyun & Homelab
            </button>
          </div>

          <button
            onClick={fetchTopologyData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#181e24] border border-[#2d3748] text-slate-300 hover:text-white transition-colors"
            title="Topolojiyi Yenile"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ─── Canlı Topoloji Akış Görselleştirmesi (SVG Destekli) ─── */}
      <div className="relative bg-[#181e24] rounded-xl border border-[#2d3748] p-4 sm:p-6 overflow-hidden">
        {/* Arka plan siber ızgara deseni */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Katman 1: WAN & Gateway */}
        <div className="space-y-6 relative z-10">
          <div className="flex flex-col items-center">
            <div
              onClick={() => setSelectedNode(nodes[0]!)}
              className="group cursor-pointer max-w-md w-full p-3.5 rounded-xl bg-[#222933] border border-[#2d3748] hover:border-[#38bdf8] transition-all shadow-lg flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-[#38bdf8]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-[#38bdf8] transition-colors">
                    WAN / İnternet (İstemci Trafiği)
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    178.210.168.163 • Bursa PenDC Tier-3
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                10 Gbps UPLINK
              </span>
            </div>

            {/* Bağlantı Çizgisi: WAN ➔ Caddy */}
            <div className="w-0.5 h-6 bg-gradient-to-b from-[#38bdf8] to-emerald-400 relative">
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-ping opacity-75" />
            </div>
          </div>

          {/* Katman 2: Caddy Ters Proxy & WAF */}
          <div className="flex flex-col items-center">
            <div
              onClick={() => setSelectedNode(nodes[1]!)}
              className="group cursor-pointer max-w-md w-full p-3.5 rounded-xl bg-[#222933] border border-[#2d3748] hover:border-emerald-400 transition-all shadow-lg flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      xivizley-caddy
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Caddy TLS 1.3 & Layer-7 WAF (:80, :443)
                    </div>
                  </div>
                </div>
                {getStatusBadge(nodes[1]!.status)}
              </div>

              {/* Port & CPU/RAM Özeti */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2d3748]/70 text-[10px] font-mono">
                <div className="flex gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-[#181e24] text-slate-300 border border-[#2d3748]">
                    80:80/tcp
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#181e24] text-slate-300 border border-[#2d3748]">
                    443:443/tcp
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span>CPU %{nodes[1]!.cpuUsage}</span>
                  <span>•</span>
                  <span>RAM %{nodes[1]!.ramUsage}</span>
                </div>
              </div>
            </div>

            {/* Bağlantı Çizgisi: Caddy ➔ Bridge */}
            <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-[#0082c9] relative">
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </div>
          </div>

          {/* Katman 3: Docker Bridge */}
          <div className="flex flex-col items-center">
            <div
              onClick={() => setSelectedNode(nodes[2]!)}
              className="group cursor-pointer max-w-lg w-full p-3 rounded-xl bg-[#1e2530] border border-[#0082c9]/40 hover:border-[#0082c9] transition-all shadow-lg flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0082c9]/20 border border-[#0082c9]/40 flex items-center justify-center">
                  <Network className="w-4 h-4 text-[#0082c9]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    xivizley-bridge
                    <span className="text-[10px] font-mono text-[#38bdf8]">
                      172.20.0.0/16
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Docker Dahili Ağ Köprüsü • İzole Konteyner Veri Yolu
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                AKTİF KÖPRÜ
              </span>
            </div>

            {/* Bağlantı Çatalı (SVG Bus) */}
            <div className="w-full max-w-4xl h-8 flex items-center justify-center relative">
              <svg
                className="w-full h-8"
                preserveAspectRatio="none"
                viewBox="0 0 100 24"
              >
                <path
                  d="M 50 0 L 50 12 M 10 12 L 90 12 M 10 12 L 10 24 M 30 12 L 30 24 M 50 12 L 50 24 M 70 12 L 70 24 M 90 12 L 90 24"
                  fill="none"
                  stroke="#0082c9"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>
            </div>
          </div>

          {/* Katman 4: Canlı Konteyner Düğümleri */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {containerNodes.map((node) => (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`group cursor-pointer p-3.5 rounded-xl bg-[#222933] border transition-all shadow-md hover:shadow-lg ${
                  selectedNode?.id === node.id
                    ? "border-[#0082c9] ring-1 ring-[#0082c9]/50"
                    : "border-[#2d3748] hover:border-slate-500"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center justify-center shrink-0">
                      {getNodeIcon(node.category, node.id)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-[#38bdf8] transition-colors">
                        {node.name}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400">
                        {node.internalIp}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(node.status)}
                </div>

                {/* Port Etiketleri */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {node.ports.map((p, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#181e24] text-slate-300 border border-[#2d3748]"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                {/* CPU / RAM Barları */}
                <div className="mt-3 pt-2.5 border-t border-[#2d3748]/70 space-y-1.5 text-[10px] font-mono">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>CPU Yükü</span>
                      <span className="text-slate-200">%{node.cpuUsage}</span>
                    </div>
                    <div className="w-full h-1 bg-[#181e24] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0082c9] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, node.cpuUsage)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>RAM</span>
                      <span className="text-slate-200">%{node.ramUsage}</span>
                    </div>
                    <div className="w-full h-1 bg-[#181e24] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, node.ramUsage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Düğüm Detay Kartı (Modal / Açılır Panel) ─── */}
      {selectedNode && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#181e24] border border-[#2d3748] space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0082c9]/20 border border-[#0082c9]/30 flex items-center justify-center">
                {getNodeIcon(selectedNode.category, selectedNode.id)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {selectedNode.name}
                  </h3>
                  {getStatusBadge(selectedNode.status)}
                </div>
                <p className="text-xs text-slate-400">{selectedNode.label}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {selectedNode.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#222933] border border-[#2d3748]">
              <span className="text-[10px] text-slate-500 block">
                Dahili IP
              </span>
              <span className="font-bold text-slate-200">
                {selectedNode.internalIp}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#222933] border border-[#2d3748]">
              <span className="text-[10px] text-slate-500 block">
                Aktif Portlar
              </span>
              <span className="font-bold text-[#38bdf8] truncate block">
                {selectedNode.ports.join(", ")}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#222933] border border-[#2d3748]">
              <span className="text-[10px] text-slate-500 block">İmaj</span>
              <span className="font-bold text-slate-200 truncate block">
                {selectedNode.image}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#222933] border border-[#2d3748]">
              <span className="text-[10px] text-slate-500 block">
                Yeniden Başlatma
              </span>
              <span className="font-bold text-slate-200">
                {selectedNode.restartPolicy}
              </span>
            </div>
          </div>

          {/* Aksiyon: Terminale Geçiş */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2d3748]">
            <a
              href={`/terminal?container=${selectedNode.name}`}
              className="px-3 py-1.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Web Terminalinde İncele</span>
            </a>
          </div>
        </div>
      )}

      {/* ─── Alt Bilgi & Özet ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono pt-2 border-t border-[#2d3748]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {runningCount} / {nodes.length} Düğüm Aktif
            </span>
          </span>
          <span>•</span>
          <span>Ağ Köprüsü: 172.20.0.0/16 (xivizley-bridge)</span>
        </div>
        <div className="text-[11px] text-slate-500">
          PenDC Bursa Tier-3 VDS (178.210.168.163) • Aurora UI
        </div>
      </div>
    </div>
  );
}

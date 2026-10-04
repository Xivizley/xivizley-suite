"use client";

import React, { useEffect, useState } from "react";
import { Server, Activity, ArrowUpRight, X, RefreshCw, CheckCircle2, ShieldCheck, Globe } from "lucide-react";

export interface ClusterNode {
  id: string;
  name: string;
  ip: string;
  role: "production" | "staging" | "edge";
  location: string;
  networkSpec: string;
  latencyMs: number;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  activeContainers: number;
  cpuUsage: string;
  memoryUsage: string;
  webUrl: string;
  isCurrent: boolean;
}

export function ClusterSwitcherModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("xivizley:open-cluster-modal", handleOpen);
    return () => window.removeEventListener("xivizley:open-cluster-modal", handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const fetchNodes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cluster/nodes");
      const json = await res.json();
      if (json.ok && json.data) {
        setNodes(json.data);
      }
    } catch {
      // sessiz hata
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNodes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-[#1e2530] border border-[#2d3748] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d3748] bg-[#181e24]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0082c9]/20 border border-[#0082c9]/30 flex items-center justify-center text-[#38bdf8]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Çoklu Düğüm Küme Yöneticisi</h2>
              <p className="text-[11px] text-slate-400">XIVIZLEY Sovereign Cloud Düğüm ve VDS Dağıtımı</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchNodes}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
              title="Ping Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {nodes.length === 0 && !isLoading ? (
              <p className="text-center text-xs text-slate-400 py-6">Düğüm bilgisi yükleniyor...</p>
            ) : (
              nodes.map((node) => (
                <div
                  key={node.id}
                  className={`p-4 rounded-xl border transition-all ${
                    node.isCurrent
                      ? "bg-[#242c38] border-[#0082c9]/60 shadow-lg"
                      : "bg-[#181e24] border-[#2d3748] hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          node.role === "production"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : node.role === "staging"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{node.name}</span>
                          {node.isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                              Şu Anki Düğüm
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{node.ip} • {node.location}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {node.latencyMs} ms
                      </span>
                    </div>
                  </div>

                  {/* Resource Badges */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#2d3748] text-[11px] font-mono text-slate-300">
                    <div className="bg-[#12161c] p-2 rounded-lg border border-[#2d3748]">
                      <span className="text-[10px] text-slate-500 block">Konteyner</span>
                      <span className="font-bold text-white">{node.activeContainers} Aktif</span>
                    </div>
                    <div className="bg-[#12161c] p-2 rounded-lg border border-[#2d3748]">
                      <span className="text-[10px] text-slate-500 block">Ağ Altyapısı</span>
                      <span className="font-semibold text-slate-200 truncate block">{node.networkSpec}</span>
                    </div>
                    <div className="bg-[#12161c] p-2 rounded-lg border border-[#2d3748] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Bellek</span>
                        <span className="font-bold text-[#38bdf8]">{node.memoryUsage.split("/")[0]}</span>
                      </div>
                      {!node.isCurrent && (
                        <a
                          href={node.webUrl}
                          className="p-1.5 rounded bg-[#0082c9] hover:bg-[#006aa3] text-white transition-colors"
                          title="Düğüme Bağlan"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2d3748] bg-[#141a22] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>DIN 40719 CLUSTER ORCHESTRATION</span>
          <span>Bursa PenDC Tier-3 Backbone</span>
        </div>
      </div>
    </div>
  );
}

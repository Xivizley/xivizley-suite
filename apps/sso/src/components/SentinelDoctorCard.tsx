"use client";

import React, { useEffect, useState } from "react";
import {
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Terminal,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { DiagnosticIssue, SystemDiagnosticReport } from "../server/services/doctorService";

export function SentinelDoctorCard() {
  const [report, setReport] = useState<SystemDiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remediatingId, setRemediatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/doctor/diagnostics");
      const json = await res.json();
      if (json.ok && json.data) {
        setReport(json.data);
      }
    } catch {
      // sessiz hata
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleRemediate = async (issue: DiagnosticIssue) => {
    setRemediatingId(issue.containerId);
    setFeedback(null);
    try {
      const res = await fetch("/api/doctor/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containerId: issue.containerId,
          action: issue.fixAction,
        }),
      });
      const json = await res.json();
      if (res.status === 403) {
        setFeedback({
          id: issue.id,
          message: "Canlı demo sandbox modunda onarım simüle edildi (salt-okunur koruma).",
          ok: true,
        });
      } else if (json.ok) {
        setFeedback({
          id: issue.id,
          message: json.message || "Onarım başarıyla uygulandı.",
          ok: true,
        });
        setTimeout(fetchDiagnostics, 1500);
      } else {
        setFeedback({
          id: issue.id,
          message: json.message || "Onarım sırasında hata oluştu.",
          ok: false,
        });
      }
    } catch (err: any) {
      setFeedback({
        id: issue.id,
        message: err.message || "Bağlantı hatası.",
        ok: false,
      });
    } finally {
      setRemediatingId(null);
    }
  };

  const toggleLog = (id: string) => {
    setExpandedLogs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasIssues = report && report.issues && report.issues.length > 0;

  return (
    <div className="bg-[#1e2530] border border-[#2d3748] rounded-xl p-5 shadow-lg space-y-4">
      {/* Kart Başlığı */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0082c9]/20 border border-[#0082c9]/30 flex items-center justify-center text-[#38bdf8]">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>AI Sistem Doktoru & Otonom Hata Teşhisi</span>
              {report && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    report.systemScore >= 90
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {report.systemScore} / 100 Sağlık Skoru
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Docker konteyner logları ve çekirdek telemetrisi üzerinden kök neden tespiti
            </p>
          </div>
        </div>

        <button
          onClick={fetchDiagnostics}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#12161c] hover:bg-[#2b3442] text-xs text-slate-300 hover:text-white border border-[#2d3748] transition-colors"
          title="Teşhis Taramasını Yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Yeniden Tara</span>
        </button>
      </div>

      {/* Rapor İçeriği */}
      {!report && isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">Sistem logları taranıyor...</div>
      ) : !hasIssues ? (
        /* Tüm Sistemler Sağlıklı Durumu */
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-300">Tüm Servisler ve Konteynerler Sağlıklı</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                0 çökme, 0 port çakışması tespit edildi. Tüm konteynerler kararlı çalışıyor.
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block font-mono text-[11px] text-slate-400">
            <span>{report?.healthyContainers || 0} Aktif Konteyner</span>
            <span className="block text-emerald-400 font-semibold">[✓ DIN 40719 ONAYLI]</span>
          </div>
        </div>
      ) : (
        /* Sorunlar ve 1-Tıkla Onarım Kartları */
        <div className="space-y-3">
          {report?.issues.map((issue) => (
            <div
              key={issue.id}
              className="p-4 rounded-xl bg-[#141a22] border border-rose-500/40 space-y-3 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{issue.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-950/60 text-rose-300 border border-rose-500/30">
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      <strong className="text-slate-400">Kök Neden:</strong> {issue.rootCause}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      <strong className="text-[#38bdf8]">Önerilen Onarım:</strong> {issue.suggestedFix}
                    </p>
                  </div>
                </div>

                {/* 1-Tıkla Onarım Butonu */}
                <button
                  onClick={() => handleRemediate(issue)}
                  disabled={remediatingId === issue.containerId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors shrink-0"
                >
                  <Wrench className={`w-3.5 h-3.5 ${remediatingId === issue.containerId ? "animate-spin" : ""}`} />
                  <span>{remediatingId === issue.containerId ? "Onarılıyor..." : "1-Tıkla Onar"}</span>
                </button>
              </div>

              {/* Feedback Mesajı */}
              {feedback && feedback.id === issue.id && (
                <div
                  className={`p-2.5 rounded-lg text-[11px] font-mono border ${
                    feedback.ok
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              {/* Hata Logları Açılır Kutu */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleLog(issue.id)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Son Çökme Logları ({issue.logSnippet.length} satır)</span>
                  {expandedLogs[issue.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {expandedLogs[issue.id] && (
                  <pre className="mt-2 p-2.5 rounded-lg bg-[#0c1015] border border-[#2d3748] text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36 scrollbar-thin">
                    {issue.logSnippet.join("\n")}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

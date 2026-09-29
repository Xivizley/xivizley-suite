import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NextcloudHeader } from "@xivizley/aurora-ui";
import {
  HardDrive,
  Key,
  Activity,
  ShieldCheck,
  Gamepad2,
  Image as ImageIcon,
  FileText,
  Server,
  ArrowRight,
  Cpu,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.client_id || params.redirect_uri) {
    const q = new URLSearchParams();
    if (params.client_id) q.set("client_id", String(params.client_id));
    if (params.redirect_uri) q.set("redirect_uri", String(params.redirect_uri));
    redirect(`/login?${q.toString()}`);
  }

  const suiteApps = [
    {
      id: "files",
      name: "Dosyalar (Drive)",
      category: "Depolama",
      desc: "Bulut depolama, klasörler, toplu ZIP indirme ve güvenli paylaşım bağlantıları.",
      icon: <HardDrive className="w-6 h-6 text-[#0082c9]" />,
      href: "/files",
      badge: "Güncellendi",
    },
    {
      id: "photos",
      name: "Fotoğraflar & Galeri",
      category: "Medya",
      desc: "Drive'daki tüm fotoğraflarınız için otomatik zaman tüneli ve lightbox önizleme.",
      icon: <ImageIcon className="w-6 h-6 text-sky-400" />,
      href: "/photos",
      badge: "Yeni",
    },
    {
      id: "notes",
      name: "Notlar",
      category: "Üretkenlik",
      desc: "Hızlı not alma, anlık Markdown önizleme, etiketleme ve otomatik kaydetme.",
      icon: <FileText className="w-6 h-6 text-emerald-400" />,
      href: "/notes",
      badge: "Yeni",
    },
    {
      id: "pass",
      name: "Parolalar (Pass)",
      category: "Güvenlik",
      desc: "Sıfır bilgili şifre kasası, 2FA TOTP anahtarları ve güçlü parola üretici.",
      icon: <Key className="w-6 h-6 text-amber-400" />,
      href: "/pass",
      badge: "Aktif",
    },
    {
      id: "pulse",
      name: "İzleme (Pulse)",
      category: "Altyapı",
      desc: "Gerçek zamanlı sunucu ve port nabız monitörü, %100 uptime takibi.",
      icon: <Activity className="w-6 h-6 text-emerald-400" />,
      href: "/pulse",
      badge: "Aktif",
    },
    {
      id: "shield",
      name: "Güvenlik (Shield)",
      category: "Güvenlik",
      desc: "Heuristic WAF savunma kalkanı, Caddy log analizcisi ve karantina.",
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
      href: "/shield",
      badge: "Aktif",
    },
    {
      id: "game",
      name: "Oyun Paneli",
      category: "Oyun Sunucuları",
      desc: "FiveM ve Minecraft PaperMC sunucu orkestrasyonu, RAM ve durum kontrolü.",
      icon: <Gamepad2 className="w-6 h-6 text-purple-400" />,
      href: "/game",
      badge: "Aktif",
    },
  ];

  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      {/* ─── Signature Nextcloud Header Bar ─────────────────── */}
      <NextcloudHeader activeApp="hub" title="Hub Dashboard" />

      {/* ─── Main Hub Content ───────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Welcome Hero Banner */}
        <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                XIVIZLEY Cloud Hub • Operasyonel
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Hoş Geldiniz, Alperen
            </h1>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              Tüm kişisel bulut araçlarınız, dosyalarınız, notlarınız, fotoğraflarınız ve sunucu kontrolleriniz tek çatı altında devrede.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/files"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <HardDrive className="w-4 h-4" />
              <span>Dosyalara Git</span>
            </Link>
            <Link
              href="/notes"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2b3442] hover:bg-[#343e4f] text-slate-200 text-xs font-medium border border-[#3b4758] transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Hızlı Not</span>
            </Link>
          </div>
        </div>

        {/* ─── Nextcloud Apps Grid ────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0082c9]" />
              <span>Bulut Uygulamaları</span>
            </h2>
            <span className="text-xs text-slate-400">{suiteApps.length} Uygulama Entegre</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suiteApps.map((app) => (
              <Link
                key={app.id}
                href={app.href}
                className="group rounded-xl border border-[#2d3748] bg-[#222933] p-5 hover:border-[#0082c9] transition-all hover:shadow-md flex flex-col justify-between space-y-4 text-left"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center justify-center group-hover:border-[#0082c9]/40 transition-colors">
                      {app.icon}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#181e24] text-slate-400 border border-[#2d3748] group-hover:text-[#0082c9] group-hover:border-[#0082c9]/40 transition-colors">
                      {app.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors flex items-center justify-between">
                      <span>{app.name}</span>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#0082c9] group-hover:translate-x-0.5 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {app.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2d3748]/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{app.category}</span>
                  <span className="text-[#0082c9] font-sans font-medium group-hover:underline">
                    Aç →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ─── VDS System Status Footer Card ──────────────────── */}
        <div className="rounded-xl border border-[#2d3748] bg-[#1a202c] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#222933] flex items-center justify-center border border-[#2d3748] text-[#0082c9]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-200">Tek Çatı Monolitik Mimarisi</p>
              <p className="text-slate-400 text-[11px]">
                {typeof window !== "undefined" ? window.location.hostname : "Self-Hosted Homelab"} • Caddy Reverse Proxy & HTTPS • Fastify + Next.js
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Veritabanı: PostgreSQL 16</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Yedekleme: Aktif (03:00)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import {
  HardDrive,
  Image as ImageIcon,
  FileText,
  Key,
  Activity,
  ShieldCheck,
  Gamepad2,
  ShoppingBag,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function SuiteAppsWidget() {
  const apps = [
    {
      id: "files",
      name: "Dosyalar",
      desc: "Drive bulut depolama",
      icon: <HardDrive className="w-5 h-5 text-[#0082c9]" />,
      href: "/files",
    },
    {
      id: "photos",
      name: "Fotoğraflar",
      desc: "Galeri & zaman tüneli",
      icon: <ImageIcon className="w-5 h-5 text-sky-400" />,
      href: "/photos",
    },
    {
      id: "notes",
      name: "Notlar",
      desc: "Markdown & üretkenlik",
      icon: <FileText className="w-5 h-5 text-emerald-400" />,
      href: "/notes",
    },
    {
      id: "pass",
      name: "Parolalar",
      desc: "Kasa & 2FA TOTP",
      icon: <Key className="w-5 h-5 text-amber-400" />,
      href: "/pass",
    },
    {
      id: "pulse",
      name: "İzleme",
      desc: "Uptime & port monitörü",
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      href: "/pulse",
    },
    {
      id: "shield",
      name: "Güvenlik",
      desc: "WAF & Caddy kalkanı",
      icon: <ShieldCheck className="w-5 h-5 text-rose-400" />,
      href: "/shield",
    },
    {
      id: "game",
      name: "Oyun Paneli",
      desc: "FiveM & Minecraft",
      icon: <Gamepad2 className="w-5 h-5 text-purple-400" />,
      href: "/game",
    },
    {
      id: "store",
      name: "Mağaza",
      desc: "115+ Docker uygulaması",
      icon: <ShoppingBag className="w-5 h-5 text-sky-400" />,
      href: "/store",
    },
  ];

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0082c9]/20 text-[#0082c9] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100">Bulut Uygulamaları</h3>
            <p className="text-[10px] text-slate-400">XIVIZLEY Ekosistem servisleri</p>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono">8 Servis Entegre</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="group p-3 rounded-lg border border-[#2d3748] bg-[#181e24] hover:border-[#0082c9] hover:bg-[#1a2330] transition-all flex flex-col justify-between space-y-2 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#222933] border border-[#2d3748] flex items-center justify-center group-hover:border-[#0082c9]/40 transition-colors">
                {app.icon}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#0082c9] group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                {app.name}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {app.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

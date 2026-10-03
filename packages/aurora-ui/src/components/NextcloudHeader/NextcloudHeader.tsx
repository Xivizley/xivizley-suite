"use client";

import React, { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";

export type NextcloudAppId =
  | "hub"
  | "files"
  | "drive"
  | "photos"
  | "notes"
  | "pass"
  | "pulse"
  | "shield"
  | "sso"
  | "store"
  | "game";

export interface NextcloudHeaderProps {
  /** Aktif uygulama ID'si (uygulama ikonunu pill ile vurgular) */
  activeApp?: NextcloudAppId;
  /** Arama kutusu değeri */
  searchQuery?: string;
  /** Arama metni değiştiğinde */
  onSearchChange?: (val: string) => void;
  /** Arama yer tutucu metni */
  searchPlaceholder?: string;
  /** Sağ alanda gösterilecek özel butonlar (+ Yeni, filtreler vb.) */
  rightActions?: React.ReactNode;
  /** Özel başlık / etiket (opsiyonel) */
  title?: string;
  /** Koyu arka plan seçeneği (varsayılan: false, Nextcloud #0082c9 imza mavisi) */
  darkTheme?: boolean;
}

interface AppNavDef {
  id: NextcloudAppId;
  name: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
}

const APPS_LIST: AppNavDef[] = [
  {
    id: "hub",
    name: "Hub",
    href: "/",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "store",
    name: "Mağaza",
    href: "/store",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "files",
    name: "Dosyalar",
    href: "/files",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "photos",
    name: "Fotoğraflar",
    href: "/photos",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
  {
    id: "notes",
    name: "Notlar",
    href: "/notes",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
        <path d="M15 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
    ),
  },
  {
    id: "pass",
    name: "Parolalar",
    href: "/pass",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="m21 2-9.6 9.6" />
        <path d="m15.5 7.5 3 3L22 7l-3-3" />
      </svg>
    ),
  },
  {
    id: "pulse",
    name: "İzleme",
    href: "/pulse",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: "shield",
    name: "Güvenlik",
    href: "/shield",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: "game",
    name: "Oyunlar",
    href: "/game",
    icon: (active) => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
        <line x1="18" y1="11" x2="18.01" y2="11" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    ),
  },
];

export function NextcloudHeader({
  activeApp,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Dosya, parola veya servis ara...",
  rightActions,
  title,
  darkTheme = false,
}: NextcloudHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ displayName: string; email: string; role?: string } | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.ok && json?.data) {
          setCurrentUser({
            displayName: json.data.displayName || "Yönetici",
            email: json.data.email || "",
            role: json.data.role || "admin",
          });
        }
      })
      .catch(() => {});
  }, []);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    files: Array<{ id: string; name: string; size?: number; type?: string }>;
    notes: Array<{ id: string; title: string; category?: string }>;
    vault: Array<{ id: string; title: string; username?: string }>;
    apps: Array<{ id: string; name: string; category: string; description: string }>;
  }>({ files: [], notes: [], vault: [], apps: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global Cmd+K / Ctrl+K dinleyicisi
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchModalOpen]);

  // Global arama sorgulama motoru
  useEffect(() => {
    if (!isSearchModalOpen || !globalQuery.trim()) {
      setSearchResults({ files: [], notes: [], vault: [], apps: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const q = encodeURIComponent(globalQuery.trim());
      try {
        const [filesRes, notesRes, vaultRes, appsRes] = await Promise.allSettled([
          fetch(`/api/files?filter=recent`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/notes?search=${q}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/vault`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/store/apps?search=${q}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
        ]);

        const rawFiles = filesRes.status === "fulfilled" && filesRes.value?.data ? filesRes.value.data : [];
        const rawNotes = notesRes.status === "fulfilled" && notesRes.value?.data ? notesRes.value.data : [];
        const rawVault = vaultRes.status === "fulfilled" && vaultRes.value?.data ? vaultRes.value.data : [];
        const rawApps = appsRes.status === "fulfilled" && appsRes.value?.data ? appsRes.value.data : [];

        const lowerQ = globalQuery.toLowerCase();

        setSearchResults({
          files: rawFiles
            .filter((f: any) => f.name && f.name.toLowerCase().includes(lowerQ))
            .slice(0, 4)
            .map((f: any) => ({ id: f.id, name: f.name, size: f.size, type: f.mimeType })),
          notes: rawNotes.slice(0, 4).map((n: any) => ({ id: n.id, title: n.title, category: n.category })),
          vault: rawVault
            .filter((v: any) => v.title && v.title.toLowerCase().includes(lowerQ))
            .slice(0, 4)
            .map((v: any) => ({ id: v.id, title: v.title, username: v.username })),
          apps: rawApps.slice(0, 4).map((a: any) => ({ id: a.id, name: a.name, category: a.category, description: a.description })),
        });
        setSelectedIndex(0);
      } catch {
        // Sessiz hata toleransı
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [globalQuery, isSearchModalOpen]);

  // Düzleştirilmiş sonuç listesi ve klavye gezintisi
  const flattenedResults = [
    ...searchResults.apps.map((a) => ({ ...a, kind: "app", link: `/store?id=${a.id}` })),
    ...searchResults.files.map((f) => ({ ...f, kind: "file", link: `/files` })),
    ...searchResults.notes.map((n) => ({ ...n, kind: "note", link: `/notes` })),
    ...searchResults.vault.map((v) => ({ ...v, kind: "vault", link: `/pass` })),
  ];

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (flattenedResults.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (flattenedResults.length || 1)) % (flattenedResults.length || 1));
    } else if (e.key === "Enter" && flattenedResults[selectedIndex]) {
      e.preventDefault();
      window.location.href = flattenedResults[selectedIndex].link;
    }
  };

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isUserMenuOpen]);

  const bgClass = darkTheme ? "bg-[#181e24] border-b border-[#2d3748]" : "bg-[#0082c9] border-b border-[#006aa3]";
  const initials = currentUser?.displayName
    ? currentUser.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  return (
    <header className={clsx("h-12 w-full text-white select-none z-40 sticky top-0 px-3 md:px-5 flex items-center justify-between shadow-sm", bgClass)}>
      {/* ─── SOL ALAN: Logo & Uygulama Değiştirici ──────────── */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        {/* Nextcloud / XIVIZLEY Hub Markası */}
        <a
          href="/"
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 group mr-1"
          title="XIVIZLEY Hub Ana Sayfa"
        >
          {/* Nextcloud Üçlü Daire Bulut Logosu */}
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shadow-inner">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
            </svg>
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline-flex items-center gap-1.5 text-white">
            <span>XIVIZLEY</span>
            <span className="font-normal text-white/80 text-xs">{title ? `• ${title}` : "Hub"}</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-400/20 text-amber-200 border border-amber-300/30">
              v0.1 Açık Beta
            </span>
          </span>
        </a>

        {/* Nextcloud Yatay Uygulama Çubuğu */}
        <nav className="hidden lg:flex items-center gap-0.5 shrink-0">
          {APPS_LIST.map((app) => {
            const isActive =
              activeApp === app.id ||
              (activeApp === "sso" && app.id === "hub") ||
              (activeApp === "drive" && app.id === "files");
            return (
              <a
                key={app.id}
                href={app.href}
                className={clsx(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0",
                  isActive
                    ? "bg-white/20 text-white font-semibold shadow-inner"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
                title={app.name}
              >
                {app.icon(isActive)}
                <span className={clsx("hidden", isActive ? "inline-block" : "2xl:inline-block")}>{app.name}</span>
              </a>
            );
          })}
        </nav>

        {/* Mobil Uygulama Açılır Menü Butonu */}
        <button
          onClick={() => setIsMobileMenuOpen((p) => !p)}
          className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-white/90"
          aria-label="Uygulamalar"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* ─── ORTA ALAN: Nextcloud Tarzı Arama Çubuğu & Cmd+K ─────────── */}
      <div className="flex-1 min-w-[100px] max-w-xs md:max-w-sm mx-2 sm:mx-4 shrink">
        <div
          onClick={() => setIsSearchModalOpen(true)}
          className="relative flex items-center w-full cursor-pointer group"
        >
          <svg
            className="w-3.5 h-3.5 absolute left-3 text-white/60 pointer-events-none group-hover:text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            readOnly
            value={searchQuery || ""}
            placeholder="Dosya, not, parola veya mağazada ara..."
            className="w-full h-8 pl-8 pr-12 rounded-full bg-black/15 hover:bg-black/25 text-xs text-white placeholder-white/70 border border-white/20 hover:border-white/40 focus:outline-none transition-all cursor-pointer"
          />
          <kbd className="absolute right-2.5 hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white/90 border border-white/20 pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ─── SAĞ ALAN: Aksiyonlar, Bildirim & Kullanıcı Menüsü ─ */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Özel Uygulama Butonları (+ Yeni vb.) */}
        {rightActions && <div className="hidden sm:flex items-center gap-1.5">{rightActions}</div>}

        {/* Canlı Sunucu Durumu */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/15 text-[11px] text-white/90 font-mono"
          title="Homelab Durumu: Çevrimiçi"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Homelab VDS</span>
        </div>

        {/* Bildirim Çanı */}
        <a
          href="/pulse"
          className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors relative"
          title="Sistem Bildirimleri"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
        </a>

        {/* Nextcloud Kullanıcı Avatarı & Menüsü */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen((p) => !p)}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center justify-center border border-white/40 transition-colors shadow-sm focus:outline-none"
            title={currentUser ? `Kullanıcı Menüsü (${currentUser.displayName})` : "Kullanıcı Menüsü"}
          >
            {initials}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#222933] border border-[#2d3748] text-slate-200 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[#2d3748]">
                <p className="font-semibold text-sm text-slate-100">
                  {currentUser ? currentUser.displayName : "Misafir Kullanıcı"}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentUser ? currentUser.email : "Oturum açılmadı"}
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#0082c9]/20 text-[#38bdf8] font-medium border border-[#0082c9]/30">
                  <span>{currentUser ? "Yönetici (Admin)" : "Salt Okunur (Misafir)"}</span>
                </div>
              </div>

              <div className="py-1">
                <a
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2b3442] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>XIVIZLEY Suite Paneli</span>
                </a>
                <a
                  href="/store"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2b3442] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <span>Uygulama Mağazası</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (window.location.pathname === "/") {
                      window.dispatchEvent(new CustomEvent("xivizley:open-customize"));
                    } else {
                      window.location.href = "/?customize=true";
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2b3442] hover:text-white transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Paneli Özelleştir</span>
                </button>
                <a
                  href="/pass"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2b3442] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Güvenlik & 2FA</span>
                </a>
                <a
                  href="/pulse"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2b3442] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 14 14" />
                  </svg>
                  <span>Genel Durum Sayfası</span>
                </a>
              </div>

              <div className="pt-1 border-t border-[#2d3748]">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch("/api/auth/logout", {
                          method: "POST",
                          credentials: "include",
                        });
                      } catch {}
                      window.location.href = "/login";
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Çıkış Yap</span>
                  </button>
                ) : (
                  <a
                    href="/login"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <span>🔐</span>
                    <span>Yönetici Girişi Yap</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── GLOBAL CMD+K SEARCH MODAL OVERLAY ────────────────── */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24 animate-in fade-in duration-150"
          onClick={() => setIsSearchModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#1e2530] border border-[#2d3748] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleSearchKeyDown}
          >
            {/* Search Input Bar */}
            <div className="p-3 border-b border-[#2d3748] flex items-center gap-3 bg-[#181e24]">
              <svg className="w-5 h-5 text-[#0082c9] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                autoFocus
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Dosya, not, kasa parolası veya mağaza uygulaması ara..."
                className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              {isSearching && (
                <div className="w-4 h-4 border-2 border-[#0082c9] border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="text-xs px-2 py-1 rounded bg-[#2b3442] hover:bg-[#343e4f] text-slate-300 font-mono"
              >
                ESC
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
              {!globalQuery.trim() ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <p className="font-medium text-slate-300">Tüm Homelab Ekosisteminde Arayın</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Drive dosyaları, Notlar, 2FA parolaları ve 115+ Mağaza uygulaması içinde canlı arama yapabilirsiniz.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <span className="px-2 py-1 rounded bg-[#222933] border border-[#2d3748] text-[11px]">📁 Dosyalar</span>
                    <span className="px-2 py-1 rounded bg-[#222933] border border-[#2d3748] text-[11px]">📝 Notlar</span>
                    <span className="px-2 py-1 rounded bg-[#222933] border border-[#2d3748] text-[11px]">🔑 Parola Kasası</span>
                    <span className="px-2 py-1 rounded bg-[#222933] border border-[#2d3748] text-[11px]">📦 115+ Docker Uygulaması</span>
                  </div>
                </div>
              ) : flattenedResults.length === 0 && !isSearching ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <p className="text-slate-300 font-medium">&ldquo;{globalQuery}&rdquo; ile eşleşen sonuç bulunamadı.</p>
                  <p className="mt-1 text-slate-500 text-[11px]">Farklı bir arama terimi deneyin.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mağaza Uygulamaları */}
                  {searchResults.apps.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] flex items-center gap-1.5">
                        <span>📦</span>
                        <span>Uygulama Mağazası ({searchResults.apps.length})</span>
                      </p>
                      <div className="space-y-1 mt-1">
                        {searchResults.apps.map((app) => (
                          <a
                            key={app.id}
                            href={`/store?id=${app.id}`}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2b3442] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded bg-[#222933] border border-[#2d3748] flex items-center justify-center text-[#0082c9]">
                                📦
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-100 group-hover:text-white">{app.name}</p>
                                <p className="text-[10px] text-slate-400 truncate max-w-sm">{app.description}</p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#0082c9]/20 text-[#38bdf8] border border-[#0082c9]/30">
                              Kur / İncele →
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dosyalar */}
                  {searchResults.files.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span>📁</span>
                        <span>Drive Dosyaları ({searchResults.files.length})</span>
                      </p>
                      <div className="space-y-1 mt-1">
                        {searchResults.files.map((file) => (
                          <a
                            key={file.id}
                            href="/files"
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2b3442] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">📄</span>
                              <div>
                                <p className="text-xs font-semibold text-slate-100 group-hover:text-white">{file.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {file.size ? `${Math.round(file.size / 1024)} KB` : "Dosya"}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 group-hover:text-emerald-400">Dosyaya Git →</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notlar */}
                  {searchResults.notes.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span>📝</span>
                        <span>Notlar ({searchResults.notes.length})</span>
                      </p>
                      <div className="space-y-1 mt-1">
                        {searchResults.notes.map((note) => (
                          <a
                            key={note.id}
                            href="/notes"
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2b3442] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">📌</span>
                              <div>
                                <p className="text-xs font-semibold text-slate-100 group-hover:text-white">{note.title}</p>
                                <p className="text-[10px] text-slate-400">{note.category || "Genel"}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 group-hover:text-amber-400">Notu Aç →</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parola Kasası */}
                  {searchResults.vault.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                        <span>🔑</span>
                        <span>Parola Kasası ({searchResults.vault.length})</span>
                      </p>
                      <div className="space-y-1 mt-1">
                        {searchResults.vault.map((item) => (
                          <a
                            key={item.id}
                            href="/pass"
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2b3442] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">🔐</span>
                              <div>
                                <p className="text-xs font-semibold text-slate-100 group-hover:text-white">{item.title}</p>
                                <p className="text-[10px] text-slate-400">{item.username || "Kasa Öğesi"}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 group-hover:text-rose-400">Kasada Gör →</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="p-2.5 px-4 bg-[#141a22] border-t border-[#2d3748] flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1 py-0.5 bg-[#222933] border border-[#2d3748] rounded text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-[#222933] border border-[#2d3748] rounded text-[10px]">↓</kbd> Gezin</span>
                <span><kbd className="px-1 py-0.5 bg-[#222933] border border-[#2d3748] rounded text-[10px]">↵</kbd> Seç</span>
                <span><kbd className="px-1 py-0.5 bg-[#222933] border border-[#2d3748] rounded text-[10px]">ESC</kbd> Kapat</span>
              </div>
              <span className="text-slate-500">XIVIZLEY Universal Search</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

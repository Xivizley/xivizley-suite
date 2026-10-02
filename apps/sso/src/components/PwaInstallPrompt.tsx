"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share, PlusSquare } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Service Worker Kaydı
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[XIVIZLEY PWA] Service Worker kayıtlı:", reg.scope);
          })
          .catch((err) => {
            console.warn("[XIVIZLEY PWA] Service Worker kayıt hatası:", err);
          });
      });
    }

    // 2. Halihazırda PWA Standalone modunda mı?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. Kullanıcı yakın zamanda "Daha Sonra" dedi mi? (7 gün sessizlik)
    const dismissedAt = localStorage.getItem("xivizley_pwa_dismissed");
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // 4. iOS Safari Tespiti
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isSafari =
      userAgent.includes("safari") &&
      !userAgent.includes("chrome") &&
      !userAgent.includes("crios");

    if (isIosDevice && isSafari && !(window.navigator as any).standalone) {
      setIsIos(true);
      setShowPrompt(true);
      return;
    }

    // 5. Chromium / Android / Desktop PWA Kurulum Olayı
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("xivizley_pwa_dismissed", Date.now().toString());
    setShowPrompt(false);
    setShowIosGuide(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300 font-sans">
      <div className="p-4 rounded-2xl border border-[#2d3748] bg-[#222933] shadow-2xl backdrop-blur-md space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/icon-192.png"
              alt="XIVIZLEY Cloud"
              className="w-11 h-11 rounded-xl shadow-md border border-[#2d3748]"
            />
            <div>
              <h4 className="text-sm font-bold text-white">
                XIVIZLEY Cloud'u Cihazınıza Yükleyin
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Daha hızlı, tam ekran ve yerel uygulama deneyimi için ana ekranınıza ekleyin.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* iOS Safari Rehberi Açılır Kutusu */}
        {showIosGuide && (
          <div className="p-3 rounded-xl bg-[#181e24] border border-[#2d3748] text-xs text-slate-300 space-y-2 animate-in fade-in">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-[#0082c9]" />
              iOS Safari Kurulum Adımları:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>
                Safari alt menüsündeki <Share className="inline h-3.5 w-3.5 mx-1 text-[#0082c9]" /> <strong>Paylaş</strong> butonuna dokunun.
              </li>
              <li>
                Açılan menüde aşağı kaydırıp <PlusSquare className="inline h-3.5 w-3.5 mx-1 text-emerald-400" /> <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin.
              </li>
              <li>
                Sağ üstteki <strong>"Ekle"</strong> butonuna basarak kurulumu tamamlayın.
              </li>
            </ol>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Daha Sonra
          </button>

          <button
            onClick={handleInstallClick}
            className="px-4 py-1.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isIos ? "Nasıl Yüklenir?" : "Uygulamayı Yükle"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

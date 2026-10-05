"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "./cockpit-store";

/**
 * Next.js 15 SSR Hydration Güvenliği Bileşeni
 * skipHydration: true ile başlatılan Zustand store'u yalnızca istemci tarafında rehydrate eder.
 */
export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Client mount olunca rehydrate et
    useGameStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#090d14] text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">
            Oyun Kokpiti Yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

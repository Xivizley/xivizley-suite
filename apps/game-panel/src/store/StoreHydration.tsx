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

  return <>{children}</>;
}

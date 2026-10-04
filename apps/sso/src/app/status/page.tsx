import React from "react";
import { NextcloudHeader } from "@xivizley/aurora-ui";
import { PublicStatusClient } from "@/components/PublicStatusClient";
import { ClusterSwitcherModal } from "@/components/ClusterSwitcherModal";

export const metadata = {
  title: "Sistem Durumu & Uptime • XIVIZLEY Suite",
  description: "XIVIZLEY bulut ekosistemi ve VDS sunucu altyapısı canlı uptime ve servis sağlık durumu.",
};

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      <NextcloudHeader activeApp="status" title="Sistem Durumu" />
      <main className="flex-1">
        <PublicStatusClient />
      </main>
      <ClusterSwitcherModal />
    </div>
  );
}

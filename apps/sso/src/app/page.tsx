import React from "react";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata = {
  title: "XIVIZLEY Cloud Hub • Homelab Dashboard",
  description:
    "Kişisel bulut işletim sistemi, canlı modüler paneller ve Docker uygulama merkezi.",
};

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params?.client_id || params?.redirect_uri) {
    const q = new URLSearchParams();
    if (params.client_id) q.set("client_id", String(params.client_id));
    if (params.redirect_uri) q.set("redirect_uri", String(params.redirect_uri));
    redirect(`/login?${q.toString()}`);
  }

  return <DashboardClient />;
}

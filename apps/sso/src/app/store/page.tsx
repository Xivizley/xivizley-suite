import React from "react";
import { StoreClient } from "./StoreClient";

export const metadata = {
  title: "Uygulama Mağazası • XIVIZLEY Hub",
  description:
    "115+ küratörlü homelab Docker uygulaması, 1-tıkla kurulum ve Compose desteği.",
};

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  return <StoreClient initialAppId={params?.id} />;
}

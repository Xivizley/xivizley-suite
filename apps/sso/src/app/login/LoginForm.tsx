"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Button, Input, Badge } from "@xivizley/aurora-ui";

const clientNameMap: Record<string, { name: string; variant: "cyan" | "purple" | "green" | "amber" }> = {
  "game-panel": { name: "Game Panel", variant: "cyan" },
  "drive": { name: "Drive", variant: "purple" },
  "cinema": { name: "Cinema", variant: "purple" },
  "vault": { name: "Vault", variant: "amber" },
  "pulse": { name: "Pulse", variant: "green" },
  "sound": { name: "Sound", variant: "cyan" },
  "docs": { name: "Docs", variant: "cyan" },
  "pass": { name: "Pass", variant: "amber" },
  "fortress": { name: "Fortress", variant: "green" },
  "brain": { name: "Brain", variant: "purple" },
  "flow": { name: "Flow", variant: "amber" },
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client_id") || "suite";
  const redirectUri = searchParams.get("redirect_uri");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const targetApp = clientNameMap[clientId] ?? {
    name: clientId === "suite" ? "XIVIZLEY Suite" : clientId,
    variant: "cyan" as const,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Lütfen e-posta ve şifrenizi girin.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            client_id: clientId,
            redirect_uri: redirectUri,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          setError(data.message || "Giriş yapılamadı. Bilgilerinizi kontrol edin.");
          return;
        }

        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          window.location.href = "/";
        }
      } catch {
        setError("Sunucuya bağlanırken bir hata oluştu.");
      }
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Nextcloud Hub Logo & Başlık Alanı */}
      <div className="flex flex-col items-center mb-8 text-center">
        {/* Nextcloud İkonik Cloud Logo Arması */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0082c9] text-white shadow-md mb-4">
          <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          XIVIZLEY <span className="text-[#0082c9]">ID</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Merkezi Kimlik & Erişim Yönetimi
        </p>

        {/* Client ID Hedef Uygulama Rozeti */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-400">Hedef Uygulama:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0082c9]/15 text-[#0082c9] border border-[#0082c9]/30">
            {targetApp.name}
          </span>
        </div>
      </div>

      {/* Oturum Açma Kartı */}
      <Card variant="outlined" className="p-6 md:p-8 bg-[#222933] border-[#2d3748] rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div
              className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
              role="alert"
            >
              {error}
            </div>
          )}

          <Input
            label="E-posta Adresi"
            type="email"
            placeholder="admin@xivizley.com.tr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            autoComplete="email"
            autoFocus
            leftIcon={
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z" />
              </svg>
            }
          />

          <Input
            label="Şifre"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            autoComplete="current-password"
            leftIcon={
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              </svg>
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isPending}
            fullWidth
            className="mt-2 bg-[#0082c9] hover:bg-[#006aa3] text-white font-semibold"
          >
            {isPending ? "Doğrulanıyor..." : "Giriş Yap"}
          </Button>
        </form>
      </Card>

      {/* Footer / Telif */}
      <p className="text-center text-[11px] text-slate-400 mt-8">
        XIVIZLEY Suite © 2026 — Güvenli Tek Oturum Açma (SSO)
      </p>
    </div>
  );
}

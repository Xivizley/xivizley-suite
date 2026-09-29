"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";

export interface PlayerData {
  name: string;
  isOp: boolean;
  avatarUrl: string;
}

export function ServerPlayerRoster() {
  const { activeGameId } = useGameStore();
  const game = GAME_CATALOG[activeGameId] || GAME_CATALOG.minecraft;

  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Manuel komut alanları
  const [manualPlayerName, setManualPlayerName] = useState("");
  const [manualMessage, setManualMessage] = useState("");

  const loadPlayers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/server/players?gameId=${activeGameId}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setPlayers(data.players || []);
        setOnlineCount(data.onlineCount || 0);
        setMaxPlayers(data.maxPlayers || 30);
      }
    } catch {
      // sessizce geç
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
    const interval = setInterval(loadPlayers, 5000);
    return () => clearInterval(interval);
  }, [activeGameId]);

  const handlePlayerAction = async (
    action: "kick" | "ban" | "op" | "deop" | "msg",
    player: string,
    reasonOrMsg?: string
  ) => {
    setActionFeedback(null);
    try {
      const res = await fetch("/api/server/players/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          action,
          player,
          reason: reasonOrMsg,
          message: reasonOrMsg,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActionFeedback(`✅ [${player}] ${data.message || "İşlem başarılı"}`);
        setTimeout(() => loadPlayers(), 1000);
      } else {
        setActionFeedback(`❌ Hata: ${data.message || "İşlem başarısız"}`);
      }
    } catch (err: any) {
      setActionFeedback(`❌ Bağlantı hatası: ${err.message}`);
    } finally {
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-[#0e141f] border border-[#1c2838] rounded-2xl shadow-sm text-slate-100">
      {/* Üst Bilgi Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c2838]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {game.name} Canlı Oyuncu Masası
            </h3>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1AD76F]/10 text-[#1AD76F] border border-[#1AD76F]/30 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1AD76F] animate-pulse" />
              {onlineCount} / {maxPlayers} Çevrimiçi
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sunucudaki aktif oyuncuları anlık izleyin, yetkilendirin veya yaptırım uygulayın.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadPlayers}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-[#141d2a] border border-[#1f2d40] hover:border-[#1AD76F]/50 text-xs text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>🔄</span> {isLoading ? "Taranıyor..." : "Yenile"}
          </button>
        </div>
      </div>

      {/* Doluluk Çubuğu */}
      <div className="p-3.5 rounded-xl bg-[#111824] border border-[#1c2838] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <span className="font-semibold text-slate-200">Sunucu Doluluk Oranı</span>
          <span className="font-bold text-[#1AD76F]">
            %{maxPlayers > 0 ? Math.round((onlineCount / maxPlayers) * 100) : 0}
          </span>
        </div>
        <div className="w-full h-2 bg-[#0a0f16] rounded-full overflow-hidden border border-[#1b2636]">
          <div
            className="h-full bg-gradient-to-r from-[#10b981] to-[#1AD76F] transition-all duration-500 shadow-[0_0_8px_rgba(26,215,111,0.5)]"
            style={{ width: `${Math.min(100, maxPlayers > 0 ? (onlineCount / maxPlayers) * 100 : 0)}%` }}
          />
        </div>
      </div>

      {/* Geri Bildirim Bildirimi */}
      {actionFeedback && (
        <div className="p-2.5 rounded-xl bg-[#181e24] border border-[#2d3748] text-center font-mono text-xs text-slate-200">
          {actionFeedback}
        </div>
      )}

      {/* Oyuncu Kartları Listesi */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Aktif Oyuncular ({players.length}):
        </span>

        {players.length === 0 ? (
          <div className="p-10 rounded-xl bg-[#181e24] border border-[#2d3748] text-center flex flex-col items-center gap-2">
            <span className="text-3xl opacity-40">🎮</span>
            <span className="text-xs text-slate-400">
              Şu anda sunucuda bağlı oyuncu bulunmuyor.
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              IP: {typeof window !== "undefined" ? window.location.hostname : "localhost"}:{game.defaultPort}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map((p) => (
              <div
                key={p.name}
                className="p-3 rounded-xl bg-[#121a26] border border-[#1d2a3c] flex items-center justify-between gap-3 shadow-sm hover:border-[#1AD76F]/50 transition-colors"
              >
                {/* Sol: Avatar & İsim */}
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.avatarUrl}
                    alt={p.name}
                    className="w-10 h-10 rounded-lg bg-[#182333] border border-[#223348] shrink-0"
                    onError={(e) => {
                      (e.target as any).style.display = "none";
                    }}
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {p.name}
                      </span>
                      {p.isOp && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold shrink-0">
                          👑 OP
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#1AD76F] font-mono font-semibold">● Çevrimiçi</span>
                  </div>
                </div>

                {/* Sağ: Hızlı Aksiyon Butonları */}
                <div className="flex items-center gap-1 shrink-0">
                  {p.isOp ? (
                    <button
                      type="button"
                      onClick={() => handlePlayerAction("deop", p.name)}
                      className="px-2.5 py-1 rounded-lg bg-[#182333] hover:bg-slate-700 text-amber-400 text-[10px] font-semibold border border-[#273850] transition-colors cursor-pointer"
                      title="OP yetkisini geri al"
                    >
                      👑 OP Al
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePlayerAction("op", p.name)}
                      className="px-2.5 py-1 rounded-lg bg-[#1AD76F] hover:bg-[#18c465] text-black text-[10px] font-extrabold shadow-[0_0_8px_rgba(26,215,111,0.2)] transition-colors cursor-pointer"
                      title="Yönetici (OP) yap"
                    >
                      👑 OP Ver
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt(`${p.name} oyuncusunu atma sebebi:`, "Sunucu yöneticisi tarafından atıldınız.");
                      if (reason !== null) {
                        handlePlayerAction("kick", p.name, reason);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition-colors cursor-pointer"
                    title="Oyuncuyu sunucudan at"
                  >
                    👢 Kick
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt(`${p.name} oyuncusunu banlama sebebi:`, "Sunucu kurallarına uymadığınız için yasaklandınız.");
                      if (reason !== null) {
                        handlePlayerAction("ban", p.name, reason);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                    title="Oyuncuyu sunucudan kalıcı olarak yasakla"
                  >
                    🚫 Ban
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manuel / Çevrimdışı Oyuncu İşlemleri */}
      <div className="p-3.5 rounded-xl bg-[#111824] border border-[#1c2838] flex flex-col gap-2 mt-2">
        <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
          <span className="text-[#1AD76F]">⚡</span> Hızlı Yönetici Komutu veya Çevrimdışı Oyuncu İşlemi
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            value={manualPlayerName}
            onChange={(e) => setManualPlayerName(e.target.value)}
            placeholder="Oyuncu adı..."
            className="sm:col-span-4 bg-[#162232] border border-[#223348] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#1AD76F] font-mono"
          />
          <input
            type="text"
            value={manualMessage}
            onChange={(e) => setManualMessage(e.target.value)}
            placeholder="Mesaj veya sebep (opsiyonel)..."
            className="sm:col-span-5 bg-[#162232] border border-[#223348] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#1AD76F]"
          />
          <div className="sm:col-span-3 flex items-center gap-1">
            <button
              type="button"
              disabled={!manualPlayerName.trim()}
              onClick={() => {
                handlePlayerAction("op", manualPlayerName.trim());
                setManualPlayerName("");
              }}
              className="flex-1 py-1.5 rounded-lg bg-[#1AD76F] text-black text-[11px] font-extrabold hover:bg-[#18c465] shadow-[0_0_8px_rgba(26,215,111,0.2)] disabled:opacity-40 cursor-pointer text-center"
            >
              👑 OP
            </button>
            <button
              type="button"
              disabled={!manualPlayerName.trim()}
              onClick={() => {
                handlePlayerAction("kick", manualPlayerName.trim(), manualMessage.trim());
                setManualPlayerName("");
                setManualMessage("");
              }}
              className="flex-1 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700 disabled:opacity-40 cursor-pointer text-center"
            >
              👢 Kick
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

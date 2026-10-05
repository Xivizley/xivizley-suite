"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Maximize2,
  Minimize2,
  Trash2,
  Server,
  Shield,
  Zap,
  Info,
} from "lucide-react";

export interface TerminalTarget {
  id: string;
  name: string;
  image?: string;
  state: string;
  isHost: boolean;
}

export function WebTerminalClient() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const [targets, setTargets] = useState<TerminalTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>("host");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  const [terminalReady, setTerminalReady] = useState<boolean>(false);
  const [reconnectKey, setReconnectKey] = useState<number>(0);

  // 1. Hedef Listesini Çek ve URL query parametresini oku
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const initialTarget =
        searchParams.get("container") || searchParams.get("target");
      if (initialTarget) {
        setSelectedTarget(initialTarget);
      }
    }

    fetch("/api/terminal/targets")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data) {
          setTargets(json.data);
        }
      })
      .catch(() => {});

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.role === "guest") {
          setIsDemoUser(true);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Terminal Nesnesini Tek Seferlik Başlat (Mount Zamanında)
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    let isDisposed = false;
    container.innerHTML = "";

    const term = new Terminal({
      theme: {
        background: "#12161c",
        foreground: "#f8fafc",
        cursor: "#0082c9",
        cursorAccent: "#ffffff",
        selectionBackground: "rgba(0, 130, 201, 0.35)",
        black: "#1e2530",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#38bdf8",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#f8fafc",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      convertEol: true,
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);

    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;
    setTerminalReady(true);

    const safeFit = () => {
      if (
        !isDisposed &&
        container &&
        container.clientWidth > 0 &&
        container.clientHeight > 0
      ) {
        try {
          fitAddon.fit();
        } catch {}
      }
    };

    // İlk render sonrası layout oturunca fit et
    const timer = setTimeout(safeFit, 150);

    const resizeObserver = new ResizeObserver(() => {
      safeFit();
    });
    resizeObserver.observe(container);

    const handleWindowResize = () => {
      safeFit();
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      isDisposed = true;
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      setTerminalReady(false);
      try {
        term.dispose();
      } catch {}
      termInstanceRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // 3. WebSocket Bağlantısını Yönet (Hedef Değiştiğinde veya Yeniden Bağlanıldığında)
  useEffect(() => {
    if (!terminalReady || !termInstanceRef.current) return;

    const term = termInstanceRef.current;
    const fitAddon = fitAddonRef.current;

    // Önceki soketi kapat
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    term.reset();
    term.writeln(
      `\x1b[36m[XIVIZLEY]\x1b[0m Web terminal sunucusuna bağlanıyor (${selectedTarget})...`,
    );

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/terminal/ws?target=${encodeURIComponent(selectedTarget)}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      term.focus();
      try {
        if (terminalRef.current && terminalRef.current.clientWidth > 0) {
          fitAddon?.fit();
        }
      } catch {}
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onerror = () => {
      term.writeln(
        "\r\n\x1b[31m[HATA]\x1b[0m WebSocket terminal bağlantı hatası oluştu.",
      );
      setIsConnected(false);
    };

    ws.onclose = () => {
      term.writeln("\r\n\x1b[33m[XIVIZLEY]\x1b[0m Terminal oturumu kapandı.");
      setIsConnected(false);
    };

    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    return () => {
      dataDisposable.dispose();
      ws.close();
      setIsConnected(false);
    };
  }, [terminalReady, selectedTarget, reconnectKey]);

  // Tam ekran değiştiğinde fit et
  useEffect(() => {
    if (!terminalReady || !fitAddonRef.current) return;
    const timer = setTimeout(() => {
      try {
        if (terminalRef.current && terminalRef.current.clientWidth > 0) {
          fitAddonRef.current?.fit();
        }
      } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, terminalReady]);

  const handleSendCommand = (cmd: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(cmd + "\r");
      termInstanceRef.current?.focus();
    }
  };

  const handleClear = () => {
    termInstanceRef.current?.clear();
    termInstanceRef.current?.focus();
  };

  const handleReconnect = () => {
    setReconnectKey((k) => k + 1);
  };

  return (
    <div
      className={`flex flex-col bg-[#181e24] text-slate-200 ${
        isFullscreen
          ? "fixed inset-0 z-50 p-4"
          : "w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4"
      }`}
    >
      {/* ─── TERMINAL ÜST ARAÇ ÇUBUĞU ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#1e2530] border border-[#2d3748] rounded-xl shadow-lg">
        {/* Sol Alan: Hedef Konteyner / Shell Seçici */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0082c9]/20 border border-[#0082c9]/30 flex items-center justify-center text-[#38bdf8]">
              <TerminalIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Hedef Konsol
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {isConnected ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Bağlandı ({selectedTarget})
                  </span>
                ) : (
                  <span className="text-amber-400">Bağlantı Bekleniyor...</span>
                )}
              </span>
            </div>
          </div>

          {/* Konteyner Seçim Menüsü */}
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="h-8 pl-3 pr-8 rounded-lg bg-[#12161c] border border-[#2d3748] text-xs text-white focus:outline-none focus:border-[#0082c9] font-mono cursor-pointer"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Orta/Sağ Alan: Durum ve Eylemler */}
        <div className="flex items-center gap-2">
          {isDemoUser && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono"
              title="Misafir Demo Sandbox: Sadece salt-okunur denetim komutları çalıştırılabilir."
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Güvenli Sandbox</span>
            </div>
          )}

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#12161c] hover:bg-[#2b3442] text-xs text-slate-300 hover:text-white border border-[#2d3748] transition-colors"
            title="Ekranı Temizle"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Temizle</span>
          </button>

          <button
            onClick={handleReconnect}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#12161c] hover:bg-[#2b3442] text-xs text-slate-300 hover:text-white border border-[#2d3748] transition-colors"
            title="Yeniden Bağlan"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Yenile</span>
          </button>

          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-[#12161c] hover:bg-[#2b3442] text-slate-300 hover:text-white border border-[#2d3748] transition-colors"
            title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ─── HIZLI KOMUT ÇUBUĞU ─── */}
      <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
        <span className="text-[11px] text-slate-400 font-mono mr-1">
          Hızlı Komutlar:
        </span>
        {[
          "help",
          "docker ps",
          "uptime",
          "uname -a",
          "free -m",
          "df -h",
          "top",
          "clear",
        ].map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleSendCommand(cmd)}
            className="px-2 py-0.5 rounded-md bg-[#1e2530] hover:bg-[#0082c9]/30 hover:text-white border border-[#2d3748] text-[11px] font-mono text-slate-300 transition-colors"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* ─── XTERM TERMİNAL PENCERESİ ─── */}
      <div
        className={`w-full rounded-xl overflow-hidden border border-[#2d3748] shadow-2xl bg-[#12161c] p-3 ${
          isFullscreen ? "flex-1 h-[calc(100vh-140px)]" : "h-[580px]"
        }`}
      >
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* ─── BİLGİ DİPNOTU ─── */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>
            WebSocket Çift Yönlü İletişim • DIN 40719 Terminal Protokolü
          </span>
        </span>
        <span>XIVIZLEY Sovereign Cloud v1.0</span>
      </div>
    </div>
  );
}

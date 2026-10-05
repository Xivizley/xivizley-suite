"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ConsoleViewer, type ServerStatus } from "@xivizley/aurora-ui";

export interface TerminalLogViewerProps {
  title: string;
  status: ServerStatus;
  gameId?: string;
  onTerminalReady?: (
    term: {
      write: (text: string) => void;
      writeln: (text: string) => void;
    } | null,
  ) => void;
}

export function TerminalLogViewer({
  title,
  status,
  gameId = "minecraft",
  onTerminalReady,
}: TerminalLogViewerProps) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const autoScrollRef = useRef(true);

  // autoScroll güncellendikçe ref'i senkronize et ve gerekirse alta kaydır
  useEffect(() => {
    autoScrollRef.current = autoScroll;
    if (autoScroll && termInstanceRef.current) {
      termInstanceRef.current.scrollToBottom();
    }
  }, [autoScroll]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Önceki xterm DOM kalıntılarını temizle
    terminalRef.current.innerHTML = "";

    // xterm terminal örneği oluştur
    const term = new Terminal({
      theme: {
        background: "#181e24",
        foreground: "#f8fafc",
        cursor: "#0082c9",
        selectionBackground: "rgba(0, 130, 201, 0.3)",
      },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      lineHeight: 1.25,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    try {
      fitAddon.fit();
    } catch {}

    const fitTimer = setTimeout(() => {
      try {
        fitAddon.fit();
      } catch {}
    }, 150);

    termInstanceRef.current = term;
    onTerminalReady?.(term);

    term.writeln(
      `\x1b[36m[XIVIZLEY]\x1b[0m ${title} konsol akışı bağlanıyor...`,
    );

    // SSE Log Stream dinle (oyun ID'sine göre)
    const eventSource = new EventSource(
      `/api/logs/stream?gameId=${encodeURIComponent(gameId)}`,
    );

    let hasShownDisconnect = false;

    eventSource.onopen = () => {
      hasShownDisconnect = false;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.log) {
          term.write(data.log);
          if (autoScrollRef.current) {
            term.scrollToBottom();
          }
          try {
            fitAddon.fit();
          } catch {}
        }
      } catch {
        // parsing hatası
      }
    };

    eventSource.onerror = () => {
      if (!hasShownDisconnect) {
        term.writeln(
          "\x1b[33m[XIVIZLEY]\x1b[0m Bağlantı yenileniyor veya sunucu bekleniyor...",
        );
        hasShownDisconnect = true;
      }
    };

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {}
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(fitTimer);
      window.removeEventListener("resize", handleResize);
      eventSource.close();
      term.dispose();
      termInstanceRef.current = null;
      onTerminalReady?.(null);
    };
  }, [gameId, title]);

  const handleClear = () => {
    termInstanceRef.current?.clear();
  };

  const handleCopy = () => {
    if (termInstanceRef.current) {
      termInstanceRef.current.selectAll();
      const text = termInstanceRef.current.getSelection();
      navigator.clipboard.writeText(text);
      termInstanceRef.current.clearSelection();
    }
  };

  return (
    <ConsoleViewer
      title={title}
      status={status}
      terminalRef={terminalRef}
      onClear={handleClear}
      onCopy={handleCopy}
      autoScroll={autoScroll}
      onAutoScrollChange={(enabled) => {
        setAutoScroll(enabled);
        autoScrollRef.current = enabled;
        if (enabled) {
          termInstanceRef.current?.scrollToBottom();
        }
      }}
      height="h-[400px]"
    />
  );
}

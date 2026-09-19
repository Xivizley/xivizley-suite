"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ConsoleViewer, type ServerStatus } from "@xivizley/aurora-ui";

export interface TerminalLogViewerProps {
  title: string;
  status: ServerStatus;
}

export function TerminalLogViewer({ title, status }: TerminalLogViewerProps) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const termInstanceRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // xterm terminal örneği oluştur
    const term = new Terminal({
      theme: {
        background: "#050709",
        foreground: "#f1f5f9",
        cursor: "#00f2fe",
        selectionBackground: "rgba(0, 242, 254, 0.3)",
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
    fitAddon.fit();
    termInstanceRef.current = term;

    term.writeln("\x1b[36m[XIVIZLEY]\x1b[0m Konsol akışı bağlanıyor...");

    // SSE Log Stream dinle
    const eventSource = new EventSource("/api/logs/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.log) {
          term.write(data.log);
        }
      } catch {
        // parsing hatası
      }
    };

    eventSource.onerror = () => {
      term.writeln("\x1b[33m[XIVIZLEY]\x1b[0m Bağlantı kesildi, yeniden deneniyor...");
    };

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      eventSource.close();
      term.dispose();
      termInstanceRef.current = null;
    };
  }, []);

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
      height="h-[420px]"
    />
  );
}

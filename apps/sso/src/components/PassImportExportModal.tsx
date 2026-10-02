"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  FileText,
  FileCode,
  Check,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileSpreadsheet,
  Key,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import type { VaultItem } from "@/server/services/passService";
import { useToast } from "@xivizley/aurora-ui";

interface PassImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VaultItem[];
  onImportSuccess: () => void;
  initialTab?: "export" | "import";
}

interface ParsedItem {
  type: VaultItem["type"];
  title: string;
  username?: string | undefined;
  password?: string | undefined;
  url?: string | undefined;
  totpSecret?: string | undefined;
  notes?: string | undefined;
  folder: string;
  isFavorite: boolean;
}

export function PassImportExportModal({
  isOpen,
  onClose,
  items,
  onImportSuccess,
  initialTab = "export",
}: PassImportExportModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"export" | "import">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Export State
  const [exportFormat, setExportFormat] = useState<"bitwarden_json" | "csv">("bitwarden_json");

  // Import State
  const [dragActive, setDragActive] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // ─── Export Fonksiyonu ──────────────────────────────────────
  const handleExport = () => {
    try {
      const timestamp = new Date().toISOString().split("T")[0];
      let content = "";
      let filename = "";
      let mimeType = "";

      if (exportFormat === "bitwarden_json") {
        // Bitwarden Uyumlu Standart JSON Şeması
        const foldersMap = new Map<string, string>();
        let folderIdCounter = 1;

        items.forEach((item) => {
          if (item.folder && !foldersMap.has(item.folder)) {
            foldersMap.set(item.folder, String(folderIdCounter++));
          }
        });

        const bwFolders = Array.from(foldersMap.entries()).map(([name, id]) => ({
          id,
          name,
        }));

        const bwItems = items.map((item) => {
          let bwType = 1; // Login
          if (item.type === "secure_note") bwType = 2;
          if (item.type === "card") bwType = 3;

          return {
            id: item.id,
            organizationId: null,
            folderId: item.folder ? foldersMap.get(item.folder) || null : null,
            type: bwType,
            name: item.title,
            notes: item.notes || null,
            favorite: Boolean(item.isFavorite),
            login: {
              uris: item.url ? [{ match: null, uri: item.url }] : [],
              username: item.username || null,
              password: item.password || null,
              totp: item.totpSecret || null,
            },
          };
        });

        content = JSON.stringify(
          {
            encrypted: false,
            folders: bwFolders,
            items: bwItems,
          },
          null,
          2
        );
        filename = `xivizley-vault-bitwarden-${timestamp}.json`;
        mimeType = "application/json";
      } else {
        // Standart Bitwarden & Chrome Uyumlu CSV
        const headers = [
          "folder",
          "favorite",
          "type",
          "name",
          "notes",
          "fields",
          "reprompt",
          "login_uri",
          "login_username",
          "login_password",
          "login_totp",
        ];

        const escapeCsv = (str?: string | boolean | null) => {
          if (str === undefined || str === null) return '""';
          const text = String(str).replace(/"/g, '""');
          return `"${text}"`;
        };

        const rows = items.map((item) => {
          return [
            escapeCsv(item.folder || "Genel"),
            escapeCsv(item.isFavorite ? "1" : "0"),
            escapeCsv("login"),
            escapeCsv(item.title),
            escapeCsv(item.notes || ""),
            escapeCsv(""),
            escapeCsv("0"),
            escapeCsv(item.url || ""),
            escapeCsv(item.username || ""),
            escapeCsv(item.password || ""),
            escapeCsv(item.totpSecret || ""),
          ].join(",");
        });

        content = [headers.join(","), ...rows].join("\n");
        filename = `xivizley-vault-${timestamp}.csv`;
        mimeType = "text/csv;charset=utf-8;";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${items.length} parola başarıyla dışa aktarıldı (${filename})`);
    } catch (err: any) {
      toast.error(err.message || "Dışa aktarma başarısız.");
    }
  };

  // ─── CSV Parser Yardımcısı (RFC-4180 Uyumlu Çok Satırlı Alan & 1Password Desteği) ───
  const parseCSV = (text: string): ParsedItem[] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Tırnak kaçışını atla ("")
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((col) => col.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) return [];

    const header = rows[0]!.map((h) => h.toLowerCase().trim());
    const titleIdx = header.findIndex((h) => h === "name" || h === "title");
    const userIdx = header.findIndex(
      (h) => h === "login_username" || h === "username" || h === "user" || h === "email"
    );
    const passIdx = header.findIndex(
      (h) => h === "login_password" || h === "password" || h === "pass"
    );
    const urlIdx = header.findIndex(
      (h) => h === "login_uri" || h === "url" || h === "uri" || h === "website"
    );
    const totpIdx = header.findIndex(
      (h) =>
        h === "login_totp" ||
        h === "totp" ||
        h === "otp" ||
        h === "one-time password" ||
        h.includes("totp") ||
        h.includes("one-time")
    );
    const notesIdx = header.findIndex((h) => h === "notes" || h === "note" || h === "comments");
    const folderIdx = header.findIndex((h) => h === "folder" || h === "category");
    const favIdx = header.findIndex((h) => h === "favorite");

    const parsed: ParsedItem[] = [];

    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i]!;
      const title = (titleIdx !== -1 ? parts[titleIdx] : parts[0]) || "";
      if (!title) continue;

      parsed.push({
        type: "login",
        title,
        username: (userIdx !== -1 ? parts[userIdx] : "") || "",
        password: (passIdx !== -1 ? parts[passIdx] : "") || "",
        url: (urlIdx !== -1 ? parts[urlIdx] : "") || "",
        totpSecret: (totpIdx !== -1 ? parts[totpIdx] : "") || "",
        notes: (notesIdx !== -1 ? parts[notesIdx] : "") || "",
        folder: (folderIdx !== -1 ? parts[folderIdx] : "") || "İçe Aktarılanlar",
        isFavorite: favIdx !== -1 ? parts[favIdx] === "1" || parts[favIdx]?.toLowerCase() === "true" : false,
      });
    }

    return parsed;
  };

  // ─── JSON Parser Yardımcısı ─────────────────────────────────
  const parseJSON = (jsonStr: string): ParsedItem[] => {
    const data = JSON.parse(jsonStr);

    // Bitwarden Export Formatı
    if (data && Array.isArray(data.items)) {
      const folderMap = new Map<string, string>();
      if (Array.isArray(data.folders)) {
        data.folders.forEach((f: any) => folderMap.set(f.id, f.name));
      }

      return data.items.map((item: any) => {
        let type: VaultItem["type"] = "login";
        if (item.type === 2) type = "secure_note";
        if (item.type === 3) type = "card";

        return {
          type,
          title: item.name || "İsimsiz Parola",
          username: item.login?.username || "",
          password: item.login?.password || "",
          url: item.login?.uris?.[0]?.uri || "",
          totpSecret: item.login?.totp || "",
          notes: item.notes || "",
          folder: folderMap.get(item.folderId) || "Bitwarden Kasa",
          isFavorite: Boolean(item.favorite),
        };
      });
    }

    // Doğrudan Array (XIVIZLEY Vault Array)
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        type: item.type || "login",
        title: item.title || item.name || "İsimsiz Parola",
        username: item.username || "",
        password: item.password || "",
        url: item.url || "",
        totpSecret: item.totpSecret || item.totp || "",
        notes: item.notes || "",
        folder: item.folder || "İçe Aktarılanlar",
        isFavorite: Boolean(item.isFavorite),
      }));
    }

    throw new Error("Desteklenmeyen JSON yapısı. Lütfen geçerli bir Bitwarden veya XIVIZLEY yedeği seçin.");
  };

  // ─── Dosya Okuma Pipeline'ı ─────────────────────────────────
  const handleFileProcess = (file: File) => {
    setParseError(null);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let itemsResult: ParsedItem[] = [];

        if (file.name.endsWith(".json")) {
          itemsResult = parseJSON(text);
        } else if (file.name.endsWith(".csv")) {
          itemsResult = parseCSV(text);
        } else {
          // Uzantı belirsizse önce JSON sonra CSV dene
          try {
            itemsResult = parseJSON(text);
          } catch {
            itemsResult = parseCSV(text);
          }
        }

        if (itemsResult.length === 0) {
          setParseError("Dosya içerisinde aktarılacak parola veya kayıt bulunamadı.");
        } else {
          setParsedItems(itemsResult);
        }
      } catch (err: any) {
        setParseError(`Dosya okuma hatası: ${err.message}`);
        setParsedItems([]);
      }
    };

    reader.onerror = () => {
      setParseError("Dosya okunamadı.");
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // ─── İçe Aktarmayı Sunucuya Gönder ──────────────────────────
  const handleCommitImport = async () => {
    if (parsedItems.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/vault/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedItems }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`${data.importedCount || parsedItems.length} parola kasanıza aktarıldı!`);
        onImportSuccess();
        onClose();
      } else {
        toast.error(data.error || "İçe aktarma işlemi tamamlanamadı.");
      }
    } catch (err: any) {
      toast.error(err.message || "Ağ hatası.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-[#2d3748] bg-[#1e2530] p-6 shadow-2xl space-y-5 text-slate-100 font-sans">
        {/* Modal Başlığı & Kapat Butonu */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2d3748]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0082c9]/15 flex items-center justify-center text-[#0082c9]">
              <Key className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              Kasa Verilerini İçe / Dışa Aktar
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sekme Seçici */}
        <div className="flex rounded-xl bg-[#141920] p-1 border border-[#2d3748]">
          <button
            onClick={() => setActiveTab("export")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "export"
                ? "bg-[#0082c9] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>📤 Dışa Aktar (Export)</span>
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "import"
                ? "bg-[#0082c9] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>📥 İçe Aktar (Import)</span>
          </button>
        </div>

        {/* ─── TAB 1: DIŞA AKTAR ──────────────────────────────── */}
        {activeTab === "export" && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Kasanızdaki toplam <strong className="text-white font-mono">{items.length}</strong> parolayı başka bir şifre yöneticisine veya yerel yedek olarak dışa aktarabilirsiniz.
            </p>

            <div className="space-y-2">
              <label className="font-semibold text-slate-300">Format Seçimi</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat("bitwarden_json")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    exportFormat === "bitwarden_json"
                      ? "bg-[#0082c9]/15 border-[#0082c9] text-white"
                      : "bg-[#141920] border-[#2d3748] text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-[#0082c9]" />
                    <span className="font-bold text-white">Bitwarden JSON</span>
                  </div>
                  <span className="text-[11px] opacity-80">
                    Klasörler, 2FA anahtarları ve URL'leri eksiksiz korur.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    exportFormat === "csv"
                      ? "bg-[#0082c9]/15 border-[#0082c9] text-white"
                      : "bg-[#141920] border-[#2d3748] text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-white">Standart CSV</span>
                  </div>
                  <span className="text-[11px] opacity-80">
                    Chrome, 1Password ve KeePass ile tam uyumludur.
                  </span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Güvenlik Hatırlatması</span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                Dışa aktarılan dosya parolalarınızı düz metin olarak barındırır. İndirdikten sonra dosyayı güvenli bir yerde saklayınız veya USB depolamaya taşıyınız.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#2d3748]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 rounded-xl bg-[#0082c9] hover:bg-[#006aa3] text-white font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Yedek Dosyasını İndir</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 2: İÇE AKTAR ──────────────────────────────── */}
        {activeTab === "import" && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Bitwarden, 1Password, LastPass veya Chrome'dan dışa aktardığınız `.json` ya da `.csv` dosyasını yükleyin.
            </p>

            {/* Dosya Yükleme / Sürükle Bırak Alanı */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                dragActive
                  ? "border-[#0082c9] bg-[#0082c9]/10"
                  : "border-[#2d3748] bg-[#141920] hover:border-[#0082c9]/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <Upload className="h-8 w-8 text-[#0082c9] opacity-80" />
              <div className="font-semibold text-slate-200">
                {importFileName ? (
                  <span className="text-[#0082c9] font-mono">{importFileName}</span>
                ) : (
                  <span>Dosyayı buraya sürükleyin veya tıklayarak seçin</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Desteklenen formatlar: Bitwarden JSON, Bitwarden CSV, 1Password CSV
              </span>
            </div>

            {/* Parse Hatası */}
            {parseError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Parse Başarı Önizlemesi */}
            {parsedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    {parsedItems.length} parola içe aktarılmaya hazır
                  </span>
                  <span className="text-slate-400">Önizleme (İlk 5)</span>
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-[#2d3748] bg-[#141920] divide-y divide-[#2d3748]">
                  {parsedItems.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-200">{item.title}</p>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.username || "Kullanıcı adı yok"} {item.url ? `• ${item.url}` : ""}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                        {item.folder}
                      </span>
                    </div>
                  ))}
                  {parsedItems.length > 5 && (
                    <div className="p-2 text-center text-[11px] text-slate-400 bg-[#161d26]">
                      ... ve {parsedItems.length - 5} parola daha
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#2d3748]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={parsedItems.length === 0 || isImporting}
                className="px-4 py-2 rounded-xl bg-[#0082c9] hover:bg-[#006aa3] text-white font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-40 cursor-pointer"
              >
                {isImporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                <span>
                  {isImporting
                    ? "Aktarılıyor..."
                    : `${parsedItems.length} Öğeyi Kasaya Aktar`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

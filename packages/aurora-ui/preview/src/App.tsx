import { useState } from "react";
import { Button, Input, Badge, StatusBadge, Card, Spinner, Tooltip } from "@xivizley/aurora-ui";
import type { ServerStatus } from "@xivizley/aurora-ui";

// ─── Section Wrapper ────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold text-aurora-cyan mb-6 pb-2 border-b border-aurora">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-aurora-text-muted text-xs uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// ─── Ana Uygulama ───────────────────────────────────────────

export function App() {
  const [inputValue, setInputValue] = useState("");
  const [loadingBtn, setLoadingBtn] = useState(false);

  const handleLoadingClick = () => {
    setLoadingBtn(true);
    setTimeout(() => setLoadingBtn(false), 2000);
  };

  const statuses: ServerStatus[] = ["running", "stopped", "starting", "stopping", "crashed", "unknown"];

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      {/* Başlık */}
      <header className="mb-16 text-center">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-aurora-cyan">Aurora</span>{" "}
          <span className="text-aurora-text-primary">Workbench</span>
        </h1>
        <p className="text-aurora-text-secondary">
          XIVIZLEY Native Suite — UI Bileşen Kataloğu
        </p>
      </header>

      {/* ═══════════════ BUTTON ═══════════════ */}
      <Section title="Button">
        <Row label="Varyantlar">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="icon" aria-label="Ayarlar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
          </Button>
        </Row>

        <Row label="Boyutlar (Primary)">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Row>

        <Row label="Durumlar">
          <Button disabled>Disabled</Button>
          <Button isLoading={loadingBtn} onClick={handleLoadingClick}>
            {loadingBtn ? "Yükleniyor…" : "Tıkla — Loading"}
          </Button>
          <Button fullWidth variant="secondary" className="max-w-xs">
            Full Width
          </Button>
        </Row>

        <Row label="İkon Desteği">
          <Button
            leftIcon={
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a.5.5 0 0 1 .5.5V7h5.5a.5.5 0 0 1 0 1H8.5v5.5a.5.5 0 0 1-1 0V8H2a.5.5 0 0 1 0-1h5.5V1.5A.5.5 0 0 1 8 1z" />
              </svg>
            }
          >
            Sunucu Ekle
          </Button>
          <Button
            variant="danger"
            rightIcon={
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
              </svg>
            }
          >
            Sil
          </Button>
        </Row>
      </Section>

      {/* ═══════════════ INPUT ═══════════════ */}
      <Section title="Input">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <Input
            label="Sunucu Adı"
            placeholder="FiveM RP Server"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            hint="2–64 karakter arası"
          />
          <Input
            label="Port"
            placeholder="30120"
            type="number"
          />
          <Input
            label="E-posta"
            placeholder="admin@xivizley.com.tr"
            error="Geçersiz e-posta adresi"
          />
          <Input
            label="Şifre"
            placeholder="••••••••"
            type="password"
            disabled
            hint="SSO entegrasyonundan sonra aktif"
          />
          <Input
            label="Arama"
            placeholder="Sunucu ara..."
            size="sm"
            leftIcon={
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242 1.15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
              </svg>
            }
          />
          <Input
            label="Büyük Input"
            placeholder="Açıklama yaz…"
            size="lg"
          />
        </div>
      </Section>

      {/* ═══════════════ BADGE ═══════════════ */}
      <Section title="Badge / StatusBadge">
        <Row label="Renk Varyantları">
          <Badge variant="default">Default</Badge>
          <Badge variant="cyan">Cyan</Badge>
          <Badge variant="green">Green</Badge>
          <Badge variant="amber">Amber</Badge>
          <Badge variant="rose">Rose</Badge>
          <Badge variant="purple">Purple</Badge>
        </Row>

        <Row label="Pulse Animasyonu">
          <Badge variant="green" pulse>Canlı</Badge>
          <Badge variant="amber" pulse>Dikkat</Badge>
          <Badge variant="rose" pulse>Kritik</Badge>
        </Row>

        <Row label="Boyutlar">
          <Badge variant="cyan" size="sm">Small</Badge>
          <Badge variant="cyan" size="md">Medium</Badge>
        </Row>

        <Row label="Sunucu Durumları (StatusBadge)">
          {statuses.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </Row>
      </Section>

      {/* ═══════════════ CARD ═══════════════ */}
      <Section title="Card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card header={<span className="text-sm font-medium">Default Card</span>}>
            <p className="text-aurora-text-secondary text-sm">
              Aurora glassmorphism arkaplan, ince border, backdrop-blur efekti.
            </p>
          </Card>

          <Card
            variant="neon"
            header={<span className="text-sm font-medium text-aurora-cyan">Neon Card</span>}
          >
            <p className="text-aurora-text-secondary text-sm">
              Hover'da neon glow yoğunluğu artar. Game Panel sunucu kartları için ideal.
            </p>
          </Card>

          <Card
            variant="elevated"
            header={<span className="text-sm font-medium">Elevated Card</span>}
            footer={
              <div className="flex gap-2 ml-auto">
                <Button size="sm" variant="ghost">İptal</Button>
                <Button size="sm">Kaydet</Button>
              </div>
            }
          >
            <p className="text-aurora-text-secondary text-sm">
              Header ve footer slotları ile — form kartları, ayar panelleri.
            </p>
          </Card>

          <Card variant="outlined">
            <p className="text-aurora-text-secondary text-sm">
              Outlined — minimal, arka plan yok, sadece kenarlık.
            </p>
          </Card>
        </div>
      </Section>

      {/* ═══════════════ SPINNER ═══════════════ */}
      <Section title="Spinner">
        <Row label="Boyutlar">
          <Spinner size="xs" />
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <Spinner size="xl" />
        </Row>

        <Row label="Renkler">
          <Spinner color="cyan" />
          <Spinner color="white" />
          <Spinner color="green" />
          <Spinner color="amber" />
          <Spinner color="rose" />
          <Spinner color="current" className="text-aurora-purple" />
        </Row>

        <Row label="Kart İçinde Yüklenme">
          <Card variant="neon" className="w-48 h-32 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-aurora-text-muted">Yükleniyor…</span>
            </div>
          </Card>
        </Row>
      </Section>

      {/* ═══════════════ TOOLTIP ═══════════════ */}
      <Section title="Tooltip">
        <Row label="Konumlar">
          <Tooltip content="Üstte tooltip" position="top">
            <Button variant="secondary" size="sm">Top</Button>
          </Tooltip>
          <Tooltip content="Altta tooltip" position="bottom">
            <Button variant="secondary" size="sm">Bottom</Button>
          </Tooltip>
          <Tooltip content="Solda tooltip" position="left">
            <Button variant="secondary" size="sm">Left</Button>
          </Tooltip>
          <Tooltip content="Sağda tooltip" position="right">
            <Button variant="secondary" size="sm">Right</Button>
          </Tooltip>
        </Row>

        <Row label="İkon Butonla Kullanım">
          <Tooltip content="Sunucuyu yeniden başlat">
            <Button variant="icon" aria-label="Yeniden Başlat">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
                <path d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z" />
              </svg>
            </Button>
          </Tooltip>
          <Tooltip content="Konsol loglarını aç" delay={0}>
            <Button variant="icon" aria-label="Konsol">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6 9a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 9zM3.854 4.146a.5.5 0 1 0-.708.708L4.793 6.5 3.146 8.146a.5.5 0 1 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2z" />
                <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12z" />
              </svg>
            </Button>
          </Tooltip>
        </Row>
      </Section>

      {/* ═══════════════ RENK PALETİ ═══════════════ */}
      <Section title="Aurora Night Renk Paleti">
        <Row label="Arka Plan Katmanları">
          {[
            { name: "Dark", var: "--aurora-bg-dark" },
            { name: "Deeper", var: "--aurora-bg-deeper" },
            { name: "Surface", var: "--aurora-bg-surface" },
            { name: "Card", var: "--aurora-bg-card" },
            { name: "Elevated", var: "--aurora-bg-elevated" },
          ].map((c) => (
            <div key={c.var} className="flex flex-col items-center gap-1">
              <div
                className="w-16 h-16 rounded-aurora border border-aurora"
                style={{ background: `var(${c.var})` }}
              />
              <span className="text-[10px] text-aurora-text-muted">{c.name}</span>
            </div>
          ))}
        </Row>

        <Row label="Neon Aksanlar">
          {[
            { name: "Cyan", var: "--aurora-cyan" },
            { name: "Purple", var: "--aurora-purple" },
            { name: "Green", var: "--aurora-green" },
            { name: "Amber", var: "--aurora-amber" },
            { name: "Rose", var: "--aurora-rose" },
          ].map((c) => (
            <div key={c.var} className="flex flex-col items-center gap-1">
              <div
                className="w-16 h-16 rounded-aurora"
                style={{ background: `var(${c.var})` }}
              />
              <span className="text-[10px] text-aurora-text-muted">{c.name}</span>
            </div>
          ))}
        </Row>
      </Section>

      {/* Footer */}
      <footer className="mt-16 pt-6 border-t border-aurora text-center">
        <p className="text-aurora-text-muted text-xs">
          XIVIZLEY Native Suite © 2026 — Aurora Night Tasarım Sistemi v0.1.0
        </p>
      </footer>
    </div>
  );
}

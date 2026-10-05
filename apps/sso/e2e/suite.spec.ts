import { test, expect } from "@playwright/test";

test.describe("XIVIZLEY Industrial OpsCenter v1.1 — E2E Test Süiti", () => {
  test("1. Halka Açık Uptime Durum Sayfası (/status) HTTP 200 ve SSL Radarı rozeti", async ({ page }) => {
    const response = await page.goto("/status");
    expect(response?.status()).toBe(200);

    // Başlık ve metrik kartlarının varlığını doğrula
    await expect(page.locator("h1")).toContainText(/Tüm Sistemler Operasyonel|Sistem Durumu/i);
    await expect(page.getByText(/Ortalama Uptime|99\./i).first()).toBeVisible();
    await expect(page.getByText(/XIVIZLEY Hub/i).first()).toBeVisible();

    // SSL / TLS & Let's Encrypt Sertifika Radarı rozetini doğrula
    await expect(
      page.getByText(/SSL \/ TLS Sertifika Sağlık Radarı|Let's Encrypt|Gün Kaldı/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/suite\.xivizley\.com\.tr/i).first()).toBeVisible();
  });

  test("2. SSL / TLS Radar API Endpoint (/api/ssl/radar) doğrulaması", async ({ page }) => {
    const res = await page.request.get("/api/ssl/radar");
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.domains)).toBe(true);
    expect(json.domains.length).toBeGreaterThanOrEqual(5);

    const domainNames = json.domains.map((d: any) => d.domain);
    expect(domainNames).toContain("suite.xivizley.com.tr");
    expect(domainNames).toContain("drive.xivizley.com.tr");
    expect(domainNames).toContain("pass.xivizley.com.tr");
    expect(domainNames).toContain("pulse.xivizley.com.tr");
    expect(domainNames).toContain("xivizley.com.tr");

    // Sertifika geçerlilik ve kalan gün kontrolü
    const firstDomain = json.domains[0];
    expect(firstDomain.daysRemaining).toBeGreaterThan(0);
    expect(firstDomain.protocol).toBeDefined();
    expect(firstDomain.ip).toBe("178.210.168.163");
  });

  test("3. Canlı Ağ ve Konteyner Topoloji Haritası (/pulse)", async ({ page }) => {
    const response = await page.goto("/pulse");
    expect([200, 302]).toContain(response?.status());

    // Topoloji haritası başlığı ve düğümlerin varlığını doğrula
    await expect(
      page.getByText(/Canlı Ağ ve Konteyner Topoloji Haritası|Topoloji/i).first()
    ).toBeVisible({ timeout: 15000 });

    // WAN, Caddy, Bridge ve Core konteyner düğümlerini doğrula
    await expect(page.getByText(/WAN \/ İnternet/i).first()).toBeVisible();
    await expect(page.getByText(/xivizley-caddy/i).first()).toBeVisible();
    await expect(page.getByText(/xivizley-bridge/i).first()).toBeVisible();
    await expect(page.getByText(/xivizley-hub/i).first()).toBeVisible();
  });

  test("4. Çok Kanallı Discord Bildirim ve Alarm API'si (/api/notifications)", async ({ page }) => {
    // 1. Konfigürasyon sorgusu
    const configRes = await page.request.get("/api/notifications/config");
    expect(configRes.status()).toBe(200);

    const configJson = await configRes.json();
    expect(configJson.ok).toBe(true);
    expect(configJson.data.debounceMinutes).toBe(30);

    // 2. Test alarmı tetikleme endpoint'i (Mock webhook URL ile)
    const testRes = await page.request.post("/api/notifications/test-discord", {
      data: {
        webhookUrl: "https://discord.com/api/webhooks/mock/test-channel",
      },
    });

    // Mock URL discord sunucusu tarafından reddedilebilir (400) veya başarılı olabilir (200)
    expect([200, 400]).toContain(testRes.status());
    const testJson = await testRes.json();
    expect(typeof testJson.message).toBe("string");
  });

  test("5. Canlı Demo Giriş Akışı ve Misafir RS256 JWT Doğrulaması", async ({ page, context }) => {
    await page.goto("/login");
    await expect(page.getByText(/Giriş Yap|Canlı Demo Olarak Keşfet/i).first()).toBeVisible();

    // Canlı demo butonuna tıkla ve yanıtı bekle
    const demoBtn = page.getByRole("button", { name: /Canlı Demo Olarak Keşfet/i });
    if (await demoBtn.isVisible()) {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/auth/demo") && res.status() === 200),
        demoBtn.click(),
      ]);
      await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 }).catch(() => {});
    } else {
      // Doğrudan API çağrısı ile demo oturumu aç
      const res = await page.request.post("/api/auth/demo", { data: {} });
      expect(res.status()).toBe(200);
    }

    // Çerezleri doğrula
    const cookies = await context.cookies();
    const hasToken = cookies.some((c) => c.name === "xivizley_access_token");
    expect(hasToken).toBe(true);
  });

  test("6. 115-Uygulama Mağazası (/store) Kataloğu ve Arama Filtreleme", async ({ page }) => {
    const response = await page.goto("/store");
    expect([200, 302]).toContain(response?.status());

    // Mağaza içi arama kutusunun yüklenmesini bekle
    const searchInput = page.getByPlaceholder(/Uygulama adı, Docker imajı/i);
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // Arama filtrelemesi yap: "jellyfin"
    await searchInput.fill("jellyfin");
    await page.waitForTimeout(500);

    // Sonuçlarda Jellyfin yer almalı
    await expect(page.getByText(/Jellyfin/i).first()).toBeVisible();
  });

  test("7. Web Terminal (/terminal) Yüklenme ve Hedef Konsol Arayüzü", async ({ page }) => {
    const response = await page.goto("/terminal");
    expect([200, 302]).toContain(response?.status());

    // Hedef konsol başlığı veya topoloji sekmesini doğrula
    await expect(page.getByText(/Hedef Konsol|Terminal|Konsol/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "docker ps" })).toBeVisible();
    await expect(page.getByRole("button", { name: "help" })).toBeVisible();
  });
});

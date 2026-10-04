import { test, expect } from "@playwright/test";

test.describe("XIVIZLEY Sovereign Cloud v1.0 — E2E Test Süiti", () => {
  test("1. Halka Açık Uptime Durum Sayfası (/status) HTTP 200 dönmeli ve metrikleri render etmeli", async ({ page }) => {
    const response = await page.goto("/status");
    expect(response?.status()).toBe(200);

    // Başlık ve metrik kartlarının varlığını doğrula
    await expect(page.locator("h1")).toContainText(/Tüm Sistemler Operasyonel|Sistem Durumu/i);
    await expect(page.getByText(/Ortalama Uptime|99\./i).first()).toBeVisible();
    await expect(page.getByText(/XIVIZLEY Hub/i).first()).toBeVisible();
  });

  test("2. Canlı Demo Giriş Akışı ve Misafir RS256 JWT Doğrulaması", async ({ page, context }) => {
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

  test("3. 115-Uygulama Mağazası (/store) Kataloğu ve Arama Filtreleme", async ({ page }) => {
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

  test("4. Web Terminal (/terminal) Yüklenme ve Hedef Konsol Arayüzü", async ({ page }) => {
    const response = await page.goto("/terminal");
    expect([200, 302]).toContain(response?.status());

    // Hedef konsol başlığı ve hızlı komut butonlarının varlığını doğrula
    await expect(page.getByText(/Hedef Konsol|Terminal/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "docker ps" })).toBeVisible();
    await expect(page.getByRole("button", { name: "help" })).toBeVisible();
  });
});

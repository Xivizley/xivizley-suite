# Reddit `r/CodingTR` Paylaşım Şablonu

**Hedef Topluluk:** [r/CodingTR](https://reddit.com/r/CodingTR)  
**Paylaşım Türü:** Metin Gönderisi  
**Flair:** `[Proje Tanıtımı]` veya `[Açık Kaynak]`  
**Not:** _r/CodingTR Kural 2 (yaş/abartı yerine doğrudan teknik mimariye odaklanma) ilkelerine tam uyumlu olarak kaleme alınmıştır._

---

## 📌 Gönderi Başlığı

`[Açık Kaynak Proje] XIVIZLEY Suite: Next.js 15, Fastify ve Docker ile Geliştirdiğim Özel Bulut ve Konteyner Yönetim Ekosistemi`

---

## 📝 Gönderi Metni

Herkese merhaba,

Son dönemde homelab ortamımda ve VDS üzerinde dağınık çalışan servisleri (depolama, şifre kasası, uptime izleme, sunucu panelleri) tek bir çatı altında toplamak amacıyla geliştirdiğim açık kaynaklı **XIVIZLEY Suite** projesini ve arkasındaki mimari kararları paylaşmak istiyorum.

Projenin temel amacı; Nextcloud Hub tasarım dilini referans alarak modern web teknolojileri (Next.js 15, Fastify, Drizzle ORM) ve Docker API'si üzerinden merkezi bir özel bulut deneyimi sunmak.

### 🔗 Bağlantılar

- **Canlı Demo (Kayıtsız/Şifresiz):** [https://suite.xivizley.com.tr](https://suite.xivizley.com.tr) _(Giriş ekranında "Canlı Demo Olarak Keşfet" butonuyla test edebilirsiniz)_
- **Tuval Mimarisi:** [https://xivizley.com.tr/architect](https://xivizley.com.tr/architect)
- **GitHub Deposu (MIT):** [github.com/Xivizley/xivizley-suite](https://github.com/Xivizley/xivizley-suite)
- **CLI Motoru:** `npx xivizley`

---

### 🏛️ Mimari Yapı ve Tercihler

Proje monorepo mimarisinde (`pnpm workspaces` + Turborepo) inşa edildi:

1. **Çekirdek Servis & API:**
   - **Fastify (Node.js):** Düşük gecikme süresi ve yüksek verim için Next.js API Routes yerine bağımsız Fastify mikroservisi tercih edildi.
   - **RS256 Asimetrik JWT SSO:** Tüm alt servisler (Drive, Pass, Pulse, Game Panel) tek bir SSO oturum belirteciyle asimetrik anahtar çifti üzerinden doğrulanıyor.
   - **Drizzle ORM & PostgreSQL 16:** Tip güvenli şema tanımları ve hafif SQL sorguları için Drizzle ORM kullanıldı.

2. **Frontend & Tasarım Sistemi:**
   - **Next.js 15 App Router:** Server Components ve istemci etkileşimleri ayrıştırıldı.
   - **Aurora UI:** Ekranlarda yapay zeka jenerik şablonları yerine Nextcloud Hub benzeri sakin, okunabilir (`#181e24` soft dark / `#ffffff` light) bir tasarım sistemi uygulandı.

3. **115 Uygulamalık Docker Kataloğu ve Port Çakışma Radarı:**
   - Uygulama mağazasında Jellyfin, Vaultwarden, Ollama, Caddy gibi 115 popüler açık kaynak yazılım kataloglandı.
   - Host makinedeki port çakışmalarını pre-flight aşamasında soket seviyesinde dinleyip çakışan servisleri bir sonraki boş porta dinamik olarak bağlayan bir port çözümleme algoritması eklendi.

4. **Canlı Demo İzolasyonu (Global Mutation Guard):**
   - Canlı demo kullanıcıları için `role: "guest"` tanımlı JWT üretiliyor.
   - Fastify katmanında çalışan global `preHandler` kancası, misafir kullanıcılardan gelen veri değiştirici (`POST`, `PUT`, `DELETE`) istekleri anında `HTTP 403 Forbidden` (`DEMO_READ_ONLY`) koduyla kesiyor.
   - Kasa ve dosya sorgularında admin verileri filtrelenerek tamamen izole sahte demo kayıtları servis ediliyor.

---

### 💻 Kurulum

Projeyi kendi sunucunuzda denemek isterseniz:

```bash
# Terminal arayüzü ile interaktif kurulum
npx xivizley suite

# Veya tek satır bash dağıtımı
curl -fsSL https://suite.xivizley.com.tr/install.sh | bash
```

### 💬 Yorum ve Geri Bildirim

Özellikle Fastify üzerinde kurguladığım asimetrik JWT doğrulama akışı, Docker soket proxy mimarisi ve port çakışma çözümleme mantığı hakkındaki görüş ve eleştirilerinizi paylaşırsanız çok sevinirim.

Kodları incelemek veya katkıda bulunmak isteyenler için GitHub deposu MIT lisansıyla yayındadır.

_Alperen Celal (Bursa)_

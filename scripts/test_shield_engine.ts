// ============================================================
// XIVIZLEY Shield Engine Test Süiti
// WAF Algılama, GeoIP, Karantina & Beyaz Liste Doğrulama
// ============================================================

import { inspectPayload } from '../apps/shield-agent/src/server/engine/heuristicWaf';
import { resolveGeoIp } from '../apps/shield-agent/src/server/engine/geoIpResolver';
import {
  getAllBans,
  banIp,
  unbanIp,
  isIpBanned,
  isIpWhitelisted,
  getSecurityEvents,
  recordSecurityEvent,
  inspectRequest,
  getShieldStats,
} from '../apps/shield-agent/src/server/services/shieldService';

async function runTests() {
  console.log('🛡️ [XIVIZLEY Shield] Siber Savunma & WAF Testleri Başlatılıyor...\n');

  let passed = 0;
  let total = 0;

  function assert(desc: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc} -> ${detail || 'Koşul sağlanamadı'}`);
    }
  }

  // ─── 1. WAF Heuristic Saldırı Algılama Testleri ──────────────
  const cleanUrl = inspectPayload('/api/v1/status?page=1&limit=20');
  assert('WAF: Temiz meşru istek engellenmedi (Allow)', !cleanUrl.isThreat && cleanUrl.action === 'allow');

  const sqliUrl = inspectPayload("/api/products?id=1' UNION SELECT 1,username,password FROM users--");
  assert(
    'WAF: SQL Injection saldırısı tespit edildi ve engellendi',
    sqliUrl.isThreat && sqliUrl.threatType === 'SQL_INJECTION' && sqliUrl.action === 'block'
  );

  const lfiUrl = inspectPayload('/download?file=../../../../etc/passwd');
  assert(
    'WAF: Path Traversal / LFI saldırısı tespit edildi ve engellendi',
    lfiUrl.isThreat && lfiUrl.threatType === 'PATH_TRAVERSAL' && lfiUrl.action === 'block'
  );

  const scannerUrl = inspectPayload('/wp-login.php?action=register');
  assert(
    'WAF: Kötü niyetli zaafiyet tarayıcısı yakalandı',
    scannerUrl.isThreat && scannerUrl.threatType === 'MALICIOUS_SCANNER'
  );

  const envUrl = inspectPayload('/.env');
  assert('WAF: Hassas dosya (.env) ifşa taraması yakalandı', envUrl.isThreat && envUrl.action === 'block');

  const rceUrl = inspectPayload('/cmd?exec=system(%22cat%20/etc/shadow%22)');
  assert(
    'WAF: Uzaktan Kod Yürütme (RCE) saldırısı engellendi',
    rceUrl.isThreat && rceUrl.threatType === 'RCE_PROBE' && rceUrl.severity === 'critical'
  );

  // ─── 2. GeoIP & İstihbarat Testleri ─────────────────────────
  const trGeo = resolveGeoIp('185.233.164.122');
  assert('GeoIP: Canlı VDS IP çözümlendi (TR)', trGeo.countryCode === 'TR' && trGeo.flag === '🇹🇷');

  const ruGeo = resolveGeoIp('45.142.212.61');
  assert('GeoIP: Bilinen saldırgan bot Rusya olarak çözümlendi', ruGeo.countryCode === 'RU' && ruGeo.isHighRiskRegion);

  const cnGeo = resolveGeoIp('103.152.220.14');
  assert('GeoIP: Çin bot ağı tespit edildi', cnGeo.countryCode === 'CN' && cnGeo.isHighRiskRegion);

  // ─── 3. Beyaz Liste (Whitelist) Koruma Testleri ──────────────
  const isVdsWhitelisted = await isIpWhitelisted('185.233.164.122');
  assert('Beyaz Liste: Canlı VDS IP adresi koruma altında', isVdsWhitelisted === true);

  let whitelistProtected = false;
  try {
    await banIp('185.233.164.122', 'Kazara ban denemesi');
  } catch {
    whitelistProtected = true;
  }
  assert('Beyaz Liste: Korunan IP banlanamaz (Kural Doğrulandı)', whitelistProtected === true);

  // ─── 4. Karantina (Ban / Unban) Yaşam Döngüsü Testleri ───────
  const testAttackerIp = '198.51.100.42';
  const banRes = await banIp(testAttackerIp, 'Birim Test: Brute-Force saldırganı', 'critical', true);
  assert('Karantina: Saldırgan IP başarıyla banlandı', banRes.ip === testAttackerIp && banRes.isActive);

  const isBanned = await isIpBanned(testAttackerIp);
  assert('Karantina: Ban sorgulaması doğru sonuç verdi', isBanned === true);

  // WAF ile engelli IP kontrolü
  const inspectBanned = await inspectRequest(testAttackerIp, '/normal-page');
  assert('WAF Giriş: Karantinadaki IP doğrudan engellendi (Drop)', inspectBanned.blocked === true);

  // Unban
  const unbanRes = await unbanIp(testAttackerIp);
  assert('Karantina: Ban engeli başarıyla kaldırıldı (Unban)', unbanRes === true);

  const isBannedAfter = await isIpBanned(testAttackerIp);
  assert('Karantina: Kaldırılan IP artık banlı değil', isBannedAfter === false);

  // ─── 5. Güvenlik Olayı Günlüğü & İstatistik Testleri ─────────
  const recorded = await recordSecurityEvent({
    sourceIp: '203.0.113.88',
    countryCode: 'US',
    countryName: 'Amerika Birleşik Devletleri',
    targetService: 'FiveM Server',
    targetPort: 30120,
    requestMethod: 'GET',
    threatType: 'PORT_PROBE',
    severity: 'low',
    actionTaken: 'flagged',
  });
  assert('Olay Günlüğü: Yeni güvenlik olayı kaydedildi', !!recorded.id && recorded.targetService === 'FiveM Server');

  const events = await getSecurityEvents(10);
  assert('Olay Günlüğü: Güvenlik olayları listelendi', events.length >= 5);

  const stats = await getShieldStats();
  assert('İstatistik: DEFCON seviyesi ve metrikler hesaplandı', stats.defconLevel === 2 && stats.totalBlockedThreats > 1000);

  console.log(`\n🏁 Test Tamamlandı: ${passed}/${total} Başarılı`);
  if (passed === total) {
    console.log('🎉 TÜM XIVIZLEY SHIELD SİBER SAVUNMA TESTLERİ %100 GEÇTİ!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Bazı testler başarısız oldu.\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Kritik test hatası:', err);
  process.exit(1);
});

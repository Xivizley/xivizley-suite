// ============================================================
// XIVIZLEY Pulse Engine Test Süiti
// HTTP, TCP Soket, ve Fallback Doğrulama
// ============================================================

import { checkHttp, checkTcp } from '../apps/pulse/src/server/engine/checker';
import { getAllMonitors, checkMonitorById } from '../apps/pulse/src/server/services/pulseService';

async function runTests() {
  console.log('🩺 [XIVIZLEY Pulse] Çekirdek Test Başlatılıyor...\n');

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

  // 1. HTTP Checker Test (xivizley.com.tr)
  try {
    const httpRes = await checkHttp('https://xivizley.com.tr', 6000);
    assert('HTTP Kontrolü: xivizley.com.tr erişilebilir', httpRes.status === 'up', `Gecikme: ${httpRes.latencyMs}ms`);
  } catch (err: any) {
    assert('HTTP Kontrolü: xivizley.com.tr erişilebilir', false, err.message);
  }

  // 2. TCP Checker Test (Cloudflare DNS TCP port)
  try {
    const tcpRes = await checkTcp('1.1.1.1:53', 4000);
    assert('TCP Kontrolü: 1.1.1.1:53 (DNS TCP) bağlantısı başarılı', tcpRes.status === 'up', `Gecikme: ${tcpRes.latencyMs}ms`);
  } catch (err: any) {
    assert('TCP Kontrolü: 1.1.1.1:53 bağlantısı başarılı', false, err.message);
  }

  // 3. Pulse Service Monitors List
  try {
    const monitors = await getAllMonitors();
    assert('Pulse Servisi: Varsayılan tohum monitörler mevcut', monitors.length >= 3, `Monitör sayısı: ${monitors.length}`);

    const mcMonitor = monitors.find(m => m.name.includes('Minecraft'));
    assert('Pulse Servisi: Sunucu B (Minecraft PaperMC) monitörü kayıtlı', !!mcMonitor, mcMonitor ? mcMonitor.target : 'Bulunamadı');

    const vdsMonitor = monitors.find(m => m.name.includes('Odeaweb'));
    assert('Pulse Servisi: Sunucu A (Odeaweb VDS) monitörü kayıtlı', !!vdsMonitor, vdsMonitor ? vdsMonitor.target : 'Bulunamadı');
  } catch (err: any) {
    assert('Pulse Servisi Monitör Kontrolü', false, err.message);
  }

  // 4. Pulse Service In-Memory Fallback & Ping Check
  try {
    const monitors = await getAllMonitors();
    if (monitors.length > 0) {
      const targetId = monitors[0].id;
      const checked = await checkMonitorById(targetId);
      assert('Pulse Servisi: Tekil monitör kontrolü başarıyla tetiklendi', !!checked, `Durum: ${checked?.status}, Gecikme: ${checked?.latencyMs}ms`);
    }
  } catch (err: any) {
    assert('Pulse Servisi Tetikleme', false, err.message);
  }

  console.log(`\n🏁 Test Tamamlandı: ${passed}/${total} Başarılı`);
  if (passed === total) {
    console.log('🎉 TÜM XIVIZLEY PULSE MOTOR TESTLERİ GEÇTİ!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Bazı testler başarısız oldu.\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Kritik test hatası:', err);
  process.exit(1);
});

// ============================================================
// XIVIZLEY Pass Engine & Crypto Test Süiti
// Zero-Knowledge AES-256-GCM, RFC 6238 TOTP, Parola Motoru ve CRUD
// ============================================================

import {
  generateSecurePassword,
  calculatePasswordStrength,
  encryptVaultData,
  decryptVaultData,
  generateTotp,
} from '../apps/pass/src/server/crypto/vaultCrypto';
import {
  getAllVaultItems,
  getVaultItemById,
  createVaultItem,
  updateVaultItem,
  deleteVaultItem,
} from '../apps/pass/src/server/services/passService';

async function runTests() {
  console.log('🔐 [XIVIZLEY Pass] Kripto & Kasa Motoru Testleri Başlatılıyor...\n');

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

  // ─── 1. Parola Üretici Testleri ──────────────────────────────
  const pwd24 = generateSecurePassword({ length: 24, symbols: true, numbers: true });
  assert('Parola Üretici: 24 karakterlik parola üretimi', pwd24.length === 24, `Üretilen: ${pwd24}`);
  assert(
    'Parola Üretici: Karmaşık karakter kümesi içeriyor',
    /[A-Z]/.test(pwd24) && /[a-z]/.test(pwd24) && /[0-9]/.test(pwd24),
    `Parola: ${pwd24}`
  );

  const pwd16NoSymbols = generateSecurePassword({ length: 16, symbols: false });
  assert('Parola Üretici: Sembolsüz parola üretimi', !/[^A-Za-z0-9]/.test(pwd16NoSymbols), `Parola: ${pwd16NoSymbols}`);

  // ─── 2. Parola Güvenlik Ölçer Testleri ───────────────────────
  const weakScore = calculatePasswordStrength('123456');
  assert('Güvenlik Ölçer: Zayıf parola tespiti', weakScore.score <= 1, `Skor: ${weakScore.score}, Etiket: ${weakScore.label}`);

  const strongScore = calculatePasswordStrength('Abc123xyz!@#9999');
  assert('Güvenlik Ölçer: Askeri düzey / Güçlü parola tespiti', strongScore.score >= 3, `Skor: ${strongScore.score}, Etiket: ${strongScore.label}`);

  // ─── 3. Zero-Knowledge AES-256-GCM Şifreleme Testleri ────────
  const secretData = 'Sunucu_Root_Kritik_Sifresi_2026_XYZ!#$';
  const customKey = 'super_gizli_anahtar_9999999999999999';
  const encrypted = encryptVaultData(secretData, customKey);

  assert('AES-256-GCM: Şifreleme başarılı ve ciphertext üretildi', !!encrypted.ciphertext && encrypted.ciphertext !== secretData);
  assert('AES-256-GCM: IV ve GCM Authentication Tag oluşturuldu', !!encrypted.iv && !!encrypted.tag);

  const decrypted = decryptVaultData(encrypted, customKey);
  assert('AES-256-GCM: Başarılı deşifreleme (Roundtrip Integrity)', decrypted === secretData, `Çözülen: ${decrypted}`);

  // Yanlış anahtar ile şifre çözme denemesi (GCM Tag uyuşmazlığı)
  const wrongKeyDecrypted = decryptVaultData(encrypted, 'yanlis_anahtar_0000000000000000');
  assert('AES-256-GCM: Yanlış anahtar ile deşifre edilemez (Tam Koruma)', wrongKeyDecrypted !== secretData);

  // ─── 4. RFC 6238 TOTP (2FA) Motor Testleri ───────────────────
  const testTotpSecret = 'JBSWY3DPEHPK3PXP'; // Base32 test anahtarı
  const totpRes = generateTotp(testTotpSecret);

  assert('TOTP: 6 haneli doğrulama kodu üretildi', /^[0-9]{6}$/.test(totpRes.code), `Kod: ${totpRes.code}`);
  assert('TOTP: Kalan süre aralığı geçerli (1-30 saniye)', totpRes.remainingSeconds >= 0 && totpRes.remainingSeconds <= 30, `Kalan: ${totpRes.remainingSeconds}s`);

  // ─── 5. Vault Servisi ve In-Memory Tohum Testleri ────────────
  const items = await getAllVaultItems();
  assert('Vault Servis: Tohum kasası kayıtları yüklendi', items.length >= 4, `Öğe sayısı: ${items.length}`);

  const odeawebItem = items.find((i) => i.id === 'vault-sunucu-a');
  assert('Vault Servis: Odeaweb VDS tohum sırrı mevcut', !!odeawebItem && odeawebItem.username === 'root');

  const cfItem = items.find((i) => i.id === 'vault-cloudflare');
  assert('Vault Servis: Cloudflare API Token tohumu mevcut', !!cfItem && cfItem.folder === 'API & Servisler');

  // Yeni Öğe Ekleme
  const newItem = await createVaultItem({
    type: 'login',
    title: 'Birim Test Kasası',
    username: 'test_admin',
    password: 'SuperSecretTestPassword!2026',
    url: 'https://test.xivizley.com.tr',
    folder: 'Test Klasörü',
    isFavorite: true,
  });
  assert('Vault Servis: Yeni kasa kaydı oluşturuldu', !!newItem.id && newItem.title === 'Birim Test Kasası');

  // Tekil Öğe Sorgusu
  const fetchedItem = await getVaultItemById(newItem.id);
  assert('Vault Servis: Tekil kasa kaydı başarıyla getirildi', fetchedItem?.id === newItem.id);

  // Güncelleme
  const updatedItem = await updateVaultItem(newItem.id, {
    title: 'Güncellenmiş Birim Test Kasası',
    isFavorite: false,
  });
  assert('Vault Servis: Kasa kaydı güncellendi', updatedItem?.title === 'Güncellenmiş Birim Test Kasası' && updatedItem.isFavorite === false);

  // Silme
  const deleted = await deleteVaultItem(newItem.id);
  assert('Vault Servis: Kasa kaydı silindi', deleted === true);

  const postDelete = await getVaultItemById(newItem.id);
  assert('Vault Servis: Silinen kayıt artık bulunamıyor', postDelete === null);

  console.log(`\n🏁 Test Tamamlandı: ${passed}/${total} Başarılı`);
  if (passed === total) {
    console.log('🎉 TÜM XIVIZLEY PASS KRİPTO & KASA MOTOR TESTLERİ %100 GEÇTİ!\n');
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

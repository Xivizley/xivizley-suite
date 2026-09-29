import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * XIVIZLEY Suite — RS256 Anahtar Çifti Üretici
 * SSO servisinin JWT imzalaması (Private Key) ve 
 * tüm alt uygulamaların stateless doğrulaması (Public Key) için çalıştırılır.
 */
async function main() {
  console.log("🔐 XIVIZLEY ID — RS256 Anahtar Çifti Üretiliyor (2048-bit RSA)...");

  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  // Base64 tek satır formatı (.env içinde temiz saklanabilmesi için)
  const pubBase64 = Buffer.from(publicKey).toString("base64");
  const privBase64 = Buffer.from(privateKey).toString("base64");

  console.log("\n================ [ KOPYALANACAK .ENV DEĞERLERİ ] ================\n");
  console.log(`JWT_PUBLIC_KEY="${pubBase64}"\n`);
  console.log(`JWT_PRIVATE_KEY="${privBase64}"\n`);
  console.log("==================================================================\n");

  // Kolaylık sağlamak için anahtarları doğrudan .keys klasörüne de kaydet
  const keysDir = path.resolve(process.cwd(), ".keys");
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  fs.writeFileSync(path.join(keysDir, "public.pem"), publicKey, "utf-8");
  fs.writeFileSync(path.join(keysDir, "private.pem"), privateKey, "utf-8");

  console.log(`✅ Anahtar dosyaları kaydedildi: ${keysDir}/public.pem & private.pem`);
}

main().catch((err) => {
  console.error("❌ Hata:", err);
  process.exit(1);
});

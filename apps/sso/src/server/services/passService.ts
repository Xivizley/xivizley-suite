// ============================================================
// XIVIZLEY Pass — Service Layer & Resilient Data Store
// Dual-mode: PostgreSQL (Drizzle) with Resilient In-Memory Fallback
// ============================================================

import { getDb, vaultItems, passFolders } from '@xivizley/db';
import { eq, desc } from 'drizzle-orm';
import {
  encryptVaultData,
  decryptVaultData,
  generateTotp,
  type EncryptedPayload,
} from '../crypto/vaultCrypto';

export interface VaultItem {
  id: string;
  type: 'login' | 'secure_note' | 'server_ssh' | 'api_key' | 'card';
  title: string;
  username?: string | undefined;
  password?: string | undefined; // Client'a decrypted veya maskeli döner
  url?: string | undefined;
  totpSecret?: string | undefined;
  notes?: string | undefined;
  folder: string;
  isFavorite: boolean;
  lastUsedAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export const DEMO_USER_ID = "d0000000-0000-0000-0000-000000000001";

// Canlı Demo Misafir Kullanıcıya Özel İnceltilmiş Güvenli & Zararsız Örnek Veriler
export const demoVaultItems: VaultItem[] = [
  {
    id: "vault-demo-ssh",
    type: "server_ssh",
    title: "🖥️ Demo Homelab SSH Sunucusu",
    username: "demo-user",
    password: "demo_ssh_pass_123",
    url: "demo.xivizley.com.tr:22",
    notes: "Canlı demo homelab test sunucusu örnek SSH bağlantı kaydı.",
    folder: "Sunucular & Altyapı",
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "vault-demo-2fa",
    type: "login",
    title: "🔒 Örnek 2FA Giriş Kaydı (Demo)",
    username: "demo@xivizley.com.tr",
    password: "demo_secure_pass_456",
    url: "https://demo.xivizley.com.tr",
    totpSecret: "JBSWY3DPEHPK3PXP",
    notes: "2FA (TOTP) doğrulama kodlu örnek servis kaydı.",
    folder: "E-Posta & İletişim",
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "vault-demo-note",
    type: "secure_note",
    title: "📝 Demo Güvenli Not",
    notes: "Canlı demo modunda tüm kasalar izole durumdadır. Salt-okunur moddasınız.",
    folder: "Genel",
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-Memory Güvenli Örnek Şablon Verileri (Yeni Kurulum Başlangıç Öğeleri)
const inMemoryVault: VaultItem[] = [...demoVaultItems];

export async function getAllVaultItems(folder?: string, isGuest: boolean = false): Promise<VaultItem[]> {
  if (isGuest) {
    return folder ? demoVaultItems.filter((i) => i.folder === folder) : [...demoVaultItems];
  }

  try {
    const db = getDb();
    const rows = await db.select().from(vaultItems).orderBy(desc(vaultItems.createdAt));

    if (rows.length === 0) {
      return folder ? inMemoryVault.filter((i) => i.folder === folder) : inMemoryVault;
    }

    const items: VaultItem[] = rows.map((r) => {
      let decrypted = r.encryptedPassword;
      try {
        const payload: EncryptedPayload = JSON.parse(r.encryptedPassword);
        decrypted = decryptVaultData(payload);
      } catch {
        // düz metin fallback
      }

      return {
        id: r.id,
        type: r.type as any,
        title: r.title,
        username: r.username || undefined,
        password: decrypted,
        url: r.url || undefined,
        totpSecret: r.totpSecret || undefined,
        notes: r.notes || undefined,
        folder: r.folder || "Genel",
        isFavorite: r.isFavorite,
        lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : undefined,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return folder ? items.filter((i) => i.folder === folder) : items;
  } catch {
    return folder ? inMemoryVault.filter((i) => i.folder === folder) : inMemoryVault;
  }
}

export async function getVaultItemById(id: string, isGuest: boolean = false): Promise<VaultItem | null> {
  const all = await getAllVaultItems(undefined, isGuest);
  return all.find((i) => i.id === id) || null;
}

export async function createVaultItem(data: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<VaultItem> {
  const enc = encryptVaultData(data.password || '');
  const encString = JSON.stringify(enc);

  try {
    const db = getDb();
    const [row] = await db
      .insert(vaultItems)
      .values({
        type: data.type,
        title: data.title,
        username: data.username,
        encryptedPassword: encString,
        url: data.url,
        totpSecret: data.totpSecret,
        notes: data.notes,
        folder: data.folder || 'Genel',
        isFavorite: data.isFavorite || false,
      })
      .returning();

    if (row) {
      return {
        id: row.id,
        type: row.type as any,
        title: row.title,
        username: row.username || undefined,
        password: data.password,
        url: row.url || undefined,
        totpSecret: row.totpSecret || undefined,
        notes: row.notes || undefined,
        folder: row.folder || 'Genel',
        isFavorite: row.isFavorite,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }
  } catch {
    // In-memory fallback
  }

  const newItem: VaultItem = {
    ...data,
    id: `vault-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  inMemoryVault.unshift(newItem);
  return newItem;
}

export async function updateVaultItem(id: string, data: Partial<VaultItem>): Promise<VaultItem | null> {
  try {
    const db = getDb();
    const updatePayload: any = { ...data };
    if (data.password) {
      updatePayload.encryptedPassword = JSON.stringify(encryptVaultData(data.password));
      delete updatePayload.password;
    }
    updatePayload.updatedAt = new Date();
    const [updatedRow] = await db
      .update(vaultItems)
      .set(updatePayload)
      .where(eq(vaultItems.id, id))
      .returning();

    if (updatedRow) {
      return {
        id: updatedRow.id,
        type: updatedRow.type as any,
        title: updatedRow.title,
        username: updatedRow.username || undefined,
        password: data.password,
        url: updatedRow.url || undefined,
        totpSecret: updatedRow.totpSecret || undefined,
        notes: updatedRow.notes || undefined,
        folder: updatedRow.folder || 'Genel',
        isFavorite: updatedRow.isFavorite,
        createdAt: updatedRow.createdAt.toISOString(),
        updatedAt: updatedRow.updatedAt.toISOString(),
      };
    }
  } catch {
    // ignore
  }

  const item = inMemoryVault.find((i) => i.id === id);
  if (item) {
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
    return item;
  }
  return null;
}

export async function deleteVaultItemById(id: string): Promise<boolean> {
  let dbDeleted = false;
  try {
    const db = getDb();
    const deleted = await db.delete(vaultItems).where(eq(vaultItems.id, id)).returning();
    if (deleted.length > 0) dbDeleted = true;
  } catch {
    // ignore
  }

  const idx = inMemoryVault.findIndex((i) => i.id === id);
  if (idx !== -1) {
    inMemoryVault.splice(idx, 1);
    return true;
  }
  return dbDeleted;
}

export const deleteVaultItem = deleteVaultItemById;

export async function toggleVaultFavorite(id: string): Promise<boolean> {
  try {
    const db = getDb();
    const [existing] = await db.select().from(vaultItems).where(eq(vaultItems.id, id));
    if (existing) {
      const [updated] = await db
        .update(vaultItems)
        .set({ isFavorite: !existing.isFavorite, updatedAt: new Date() })
        .where(eq(vaultItems.id, id))
        .returning();
      return updated?.isFavorite ?? !existing.isFavorite;
    }
  } catch {
    // ignore
  }

  const item = inMemoryVault.find((i) => i.id === id);
  if (item) {
    item.isFavorite = !item.isFavorite;
    return item.isFavorite;
  }
  return false;
}

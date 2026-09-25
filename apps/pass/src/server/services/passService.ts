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

// In-Memory Güvenli Tohum Verileri (Resilient Fallback)
const inMemoryVault: VaultItem[] = [
  {
    id: 'vault-sunucu-a',
    type: 'server_ssh',
    title: '🖥️ Sunucu A: Odeaweb Test VDS',
    username: 'root',
    password: '16Eam7800_XX',
    url: '109.104.120.126:22',
    notes: 'CasaOS (Port 80), Jellyfin (8096), Nginx Proxy Manager (81)',
    folder: 'Sunucular & Altyapı',
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vault-sunucu-b',
    type: 'server_ssh',
    title: '🎮 Sunucu B: Minecraft PaperMC VDS',
    username: 'root',
    password: '16Eam7800_XX',
    url: '178.210.168.163:22666',
    notes: 'Minecraft PaperMC Port 25565. Abisiyle oynadığı ana dünya sunucusu.',
    folder: 'Sunucular & Altyapı',
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vault-email',
    type: 'login',
    title: '📬 XIVIZLEY Kurumsal Yönetici Maili',
    username: 'alperen@xivizley.com.tr',
    password: '16Eam7800_',
    url: 'https://mail.xivizley.com.tr',
    totpSecret: 'JBSWY3DPEHPK3PXP', // 2FA Örnek Anahtarı
    notes: 'Kurucu ana kurumsal e-posta hesabı (IMAP 993, SMTP 465)',
    folder: 'E-Posta & İletişim',
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vault-cloudflare',
    type: 'api_key',
    title: '🌐 Cloudflare DNS & Zone Token',
    username: 'alperencelal16@gmail.com',
    password: 'cf_api_token_xivizley_dns_master_2026',
    url: 'https://dash.cloudflare.com',
    notes: 'NS: kai.ns.cloudflare.com & serena.ns.cloudflare.com',
    folder: 'API & Servisler',
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vault-telegram-bot',
    type: 'api_key',
    title: '🤖 Telegram AI Destek Botu',
    username: '@xivizley_destek_bot',
    password: '8642076722:AAFUZfYPMixrLKAMVrbHRORh4hNqrEi3ksA',
    url: 'https://t.me/xivizley_destek_bot',
    notes: 'SendPulse AI Chatbot & Pulse Alarm Bildirim Botu',
    folder: 'API & Servisler',
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function getAllVaultItems(folder?: string): Promise<VaultItem[]> {
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
        folder: r.folder || 'Genel',
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

export async function getVaultItemById(id: string): Promise<VaultItem | null> {
  const all = await getAllVaultItems();
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
    await db.update(vaultItems).set(updatePayload).where(eq(vaultItems.id, id));
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
  try {
    const db = getDb();
    await db.delete(vaultItems).where(eq(vaultItems.id, id));
  } catch {
    // ignore
  }

  const idx = inMemoryVault.findIndex((i) => i.id === id);
  if (idx !== -1) {
    inMemoryVault.splice(idx, 1);
    return true;
  }
  return false;
}

export const deleteVaultItem = deleteVaultItemById;

export async function toggleVaultFavorite(id: string): Promise<boolean> {
  const item = inMemoryVault.find((i) => i.id === id);
  if (item) {
    item.isFavorite = !item.isFavorite;
    return item.isFavorite;
  }
  return false;
}

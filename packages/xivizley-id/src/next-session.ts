import type { XivizleyUser } from "@xivizley/types";
import { verifyAccessToken } from "./verify.js";

export interface GetSessionOptions {
  /**
   * Özel cookie adı (Varsayılan: 'xivizley_access_token')
   */
  cookieName?: string;
  /**
   * Eğer cookie doğrudan fonksiyona aktarılmak istenirse (örneğin cookieStore.get() sonucu)
   */
  token?: string;
}

/**
 * Next.js Server Component ve Server Actions için oturum bilgisini getiren yardımcı.
 * next/headers paketini dinamik import ederek Next.js bağımlılığı olmayan ortamlarda patlamasını önler.
 */
export async function getSession(options: GetSessionOptions = {}): Promise<XivizleyUser | null> {
  let token = options.token;

  if (!token) {
    try {
      // next/headers dinamik import
      // @ts-ignore next/headers is dynamically loaded in Next.js environments
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const cookieName = options.cookieName || "xivizley_access_token";
      const tokenCookie = cookieStore.get(cookieName);
      token = tokenCookie?.value;
    } catch {
      // Next.js runtime ortamı dışında çalışıyorsa veya cookies erişimi yoksa
      return null;
    }
  }

  if (!token) {
    return null;
  }

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

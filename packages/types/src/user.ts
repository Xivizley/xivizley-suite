// ─── XIVIZLEY Kullanıcı Tipleri ───────────────────────────

/** SSO oturumu açmış kullanıcı */
export interface XivizleyUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | undefined;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/** Kullanıcı yetki seviyeleri */
export type UserRole = "owner" | "admin" | "member" | "guest";

/** JWT Access Token payload */
export interface XivizleyTokenPayload {
  sub: string;        // user.id
  email: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Oturum bilgisi */
export interface XivizleySession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// ─── XIVIZLEY API Sözleşmesi ──────────────────────────────
// Tüm Fastify servislerinin ortak HTTP response şeması.

/** Standart başarılı yanıt zarfı */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** Standart hata yanıtı zarfı */
export interface ApiError {
  ok: false;
  code: string;
  message: string;
  /** Ek hata detayları (validation vb.) */
  details?: Record<string, unknown> | undefined;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Sayfalanmış liste yanıtı */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

/** SSE (Server-Sent Events) olayı — Game Panel ve Pulse akışlarında kullanılır */
export interface SseEvent<T> {
  event: string;
  data: T;
}

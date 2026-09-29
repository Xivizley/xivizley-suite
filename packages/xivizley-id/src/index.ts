// ============================================================
// @xivizley/xivizley-id — SSO & Auth Client SDK
// ============================================================

export { verifyAccessToken, getPublicKey } from "./verify.js";
export { withXivizleyAuth, type WithXivizleyAuthOptions } from "./fastify-plugin.js";
export { getSession, type GetSessionOptions } from "./next-session.js";

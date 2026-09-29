// ============================================================
// XIVIZLEY Shield — Heuristic Web Application Firewall (WAF)
// Zero-latency pattern analyzer for SQLi, LFI, RCE, and Bot Probes
// ============================================================

export interface WafInspectionResult {
  isThreat: boolean;
  threatType?: 'SQL_INJECTION' | 'PATH_TRAVERSAL' | 'MALICIOUS_SCANNER' | 'RCE_PROBE' | 'BRUTE_FORCE' | undefined;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0 (temiz) - 100 (kesin saldırı)
  reason?: string | undefined;
  matchedPattern?: string | undefined;
  action: 'allow' | 'block' | 'challenge';
}

const SQLI_PATTERNS = [
  /\b(union\s+all\s+select|union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|delete\s+from|update\s+.*\s+set)\b/i,
  /\b(or\s+['"]?1['"]?\s*=\s*['"]?1|and\s+['"]?1['"]?\s*=\s*['"]?1)\b/i,
  /\b(sleep\s*\(\s*\d+\s*\)|waitfor\s+delay|benchmark\s*\()/i,
  /('|\b)(select|union|concat|information_schema|order\s+by\s+\d+)/i,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.[\/\\]/,
  /%2e%2e(%2f|%5c)/i,
  /(\/|\\)etc(\/|\\)passwd/i,
  /(\/|\\)proc(\/|\\)self/i,
  /(win\.ini|boot\.ini|windows(\/|\\)system32)/i,
];

const SCANNER_PATTERNS = [
  /(\.env|\.git(\/|\b)|\.aws|\.ssh)/i,
  /(wp-admin|wp-login\.php|xmlrpc\.php|wordpress)/i,
  /(phpmyadmin|pma|adminer|dbadmin|myadmin)/i,
  /(actuator\/health|api\/v1\/swagger|console\/login)/i,
  /(boaform|setup\.cgi|HNAP1|web_shell|cpanel)/i,
];

const RCE_PATTERNS = [
  /(\b(eval|passthru|system|shell_exec|assert)\s*\(|;\s*rm\s+-rf)/i,
  /(\/bin\/(sh|bash|zsh)|cmd\.exe|powershell)/i,
  /(`.*`|\$\(.*(whoami|id|cat\s+\/etc|curl\s+|wget\s+).*\))/i,
];

/**
 * URL, sorgu parametresi veya gövde içeriğini WAF kurallarına göre inceler.
 */
export function inspectPayload(input: string): WafInspectionResult {
  if (!input || input.trim() === '') {
    return { isThreat: false, severity: 'low', score: 0, action: 'allow' };
  }

  const decoded = decodeURIComponentSafe(input);

  // 1. RCE Kontrolü (En kritik tehdit)
  for (const pattern of RCE_PATTERNS) {
    if (pattern.test(decoded)) {
      return {
        isThreat: true,
        threatType: 'RCE_PROBE',
        severity: 'critical',
        score: 100,
        reason: 'Uzaktan Kod Yürütme (RCE) komut deseni tespit edildi',
        matchedPattern: pattern.toString(),
        action: 'block',
      };
    }
  }

  // 2. SQL Injection Kontrolü
  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(decoded)) {
      return {
        isThreat: true,
        threatType: 'SQL_INJECTION',
        severity: 'critical',
        score: 95,
        reason: 'Kötü niyetli SQL enjeksiyon sorgusu tespit edildi',
        matchedPattern: pattern.toString(),
        action: 'block',
      };
    }
  }

  // 3. Path Traversal & LFI Kontrolü
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(decoded)) {
      return {
        isThreat: true,
        threatType: 'PATH_TRAVERSAL',
        severity: 'high',
        score: 85,
        reason: 'Dizin atlama (Path Traversal / LFI) denemesi engellendi',
        matchedPattern: pattern.toString(),
        action: 'block',
      };
    }
  }

  // 4. Zaafiyet Tarayıcı & Bot Probları
  for (const pattern of SCANNER_PATTERNS) {
    if (pattern.test(decoded)) {
      return {
        isThreat: true,
        threatType: 'MALICIOUS_SCANNER',
        severity: 'medium',
        score: 75,
        reason: 'Otomatik zaafiyet ve admin paneli tarayıcı botu yakalandı',
        matchedPattern: pattern.toString(),
        action: 'block',
      };
    }
  }

  return {
    isThreat: false,
    severity: 'low',
    score: 0,
    action: 'allow',
  };
}

function decodeURIComponentSafe(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
}

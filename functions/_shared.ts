import { createDavClient, WebDAVClient } from './_webdav';

export interface Env {
  WEBDAV_URL?: string;
  WEBDAV_USERNAME?: string;
  WEBDAV_PASSWORD?: string;
  WEBDAV_PATH?: string;
  SITE_NAME?: string;
  AUTH_PASSWORD?: string;
  LOCK_PASSWORD?: string;
  KV_CACHE_TTL?: string;
  NOTE_CACHE?: KVNamespace;
}

export interface RuntimeConfig {
  url: string;
  username: string;
  password: string;
  path: string;
}

// Get environment WebDAV config
export function getEnvConfig(env: Env): RuntimeConfig {
  return {
    url: env.WEBDAV_URL || '',
    username: env.WEBDAV_USERNAME || '',
    password: env.WEBDAV_PASSWORD || '',
    path: env.WEBDAV_PATH || '/WebDAV-Notes',
  };
}

// Read runtime config from encrypted cookie (base64 for simplicity)
export function getRuntimeConfig(request: Request, env: Env): RuntimeConfig {
  const envCfg = getEnvConfig(env);
  
  // If env variables have WEBDAV_URL, always use those
  if (envCfg.url) {
    return envCfg;
  }

  // Otherwise try to read from cookie
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/webdav_cfg=([^;]+)/);
  if (match) {
    try {
      const decoded = atob(decodeURIComponent(match[1]));
      const parsed = JSON.parse(decoded);
      return {
        url: parsed.url || '',
        username: parsed.username || '',
        password: parsed.password || '',
        path: parsed.path || '/WebDAV-Notes',
      };
    } catch (_) {}
  }

  return { url: '', username: '', password: '', path: '/WebDAV-Notes' };
}

// Save runtime config to cookie
export function setRuntimeConfigCookie(response: Response, cfg: RuntimeConfig): Response {
  const encoded = encodeURIComponent(btoa(JSON.stringify(cfg)));
  const cookie = `webdav_cfg=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
  response.headers.append('Set-Cookie', cookie);
  return response;
}

// Get auth password from env
export function getExpectedAccessPassword(env: Env): string {
  const envAuthPass = env.AUTH_PASSWORD || env.LOCK_PASSWORD;
  if (envAuthPass && envAuthPass.trim().length > 0) {
    return envAuthPass.trim();
  }
  return '';
}

// Get WebDAV client from config
export function getClientInstance(cfg: RuntimeConfig): WebDAVClient | null {
  if (!cfg.url) return null;
  return createDavClient(cfg.url, cfg.username, cfg.password);
}

// Simple JSON response helper
export function jsonResponse(data: any, status = 200, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...(init?.headers || {}),
    },
    ...init,
  });
}

// Get auth token from request
export function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/webdav_notepad_token=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

// Set auth token cookie
export function setAuthTokenCookie(response: Response, token: string): Response {
  const cookie = `webdav_notepad_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
  response.headers.append('Set-Cookie', cookie);
  return response;
}

// =============================================================
// KV Cache 辅助函数
// =============================================================

// 根据 config 生成隔离前缀：不同的 WebDAV 地址/路径 用不同的缓存键
export function getCachePrefix(cfg: RuntimeConfig): string {
  const seed = `${cfg.url.toLowerCase()}|${cfg.path.toLowerCase()}`;
  // 8 字符 FNV-1a 风格哈希（足够避免冲突且 key 简短，节省 KV 存储）
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // 转成 8 位十六进制，带 >>>0 变为无符号
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `n:${hex}`;
}

export function getCacheTTL(env: Env): number {
  const parsed = parseInt(env.KV_CACHE_TTL || '3600', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
}

// 安全获取 KV 命名空间：若未绑定 NOTE_CACHE，返回 null，避免运行时报错
export function getKv(env: Env): KVNamespace | null {
  return env.NOTE_CACHE && typeof env.NOTE_CACHE.get === 'function' ? env.NOTE_CACHE : null;
}

// 读取 JSON 缓存
export async function kvGetJson<T = unknown>(env: Env, key: string): Promise<T | null> {
  const kv = getKv(env);
  if (!kv) return null;
  try {
    const raw = await kv.get(key, 'text');
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn('KV get JSON failed:', key, err);
    return null;
  }
}

// 写入 JSON 缓存
export async function kvPutJson(env: Env, key: string, value: unknown): Promise<void> {
  const kv = getKv(env);
  if (!kv) return;
  try {
    const ttl = getCacheTTL(env);
    await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
  } catch (err) {
    console.warn('KV put JSON failed:', key, err);
  }
}

// 读取二进制缓存（含 metadata 存 mimeType）
export async function kvGetBuffer(
  env: Env,
  key: string
): Promise<{ buffer: ArrayBuffer; mimeType?: string } | null> {
  const kv = getKv(env);
  if (!kv) return null;
  try {
    const result = await kv.getWithMetadata<{ m?: string }>(key, 'arrayBuffer');
    if (!result || !result.value) return null;
    return {
      buffer: result.value as ArrayBuffer,
      mimeType: result.metadata?.m,
    };
  } catch (err) {
    console.warn('KV get buffer failed:', key, err);
    return null;
  }
}

// 写入二进制缓存
export async function kvPutBuffer(
  env: Env,
  key: string,
  buffer: ArrayBuffer,
  mimeType?: string
): Promise<void> {
  const kv = getKv(env);
  if (!kv) return;
  try {
    const ttl = getCacheTTL(env);
    const metadata = mimeType ? { m: mimeType } : undefined;
    await kv.put(key, buffer as any, { expirationTtl: ttl, metadata });
  } catch (err) {
    console.warn('KV put buffer failed:', key, err);
  }
}

// 删除单个缓存键
export async function kvDelete(env: Env, key: string): Promise<void> {
  const kv = getKv(env);
  if (!kv) return;
  try {
    await kv.delete(key);
  } catch (err) {
    console.warn('KV delete failed:', key, err);
  }
}

// 按前缀批量删除（用于失效整组缓存，如所有 media 或 notes list）
// KV 免费用户 list 额度较宝贵，仅在写入时小范围调用
export async function kvDeletePrefix(env: Env, prefix: string): Promise<number> {
  const kv = getKv(env);
  if (!kv) return 0;
  let deleted = 0;
  try {
    let cursor: string | undefined;
    let listComplete = false;
    while (!listComplete) {
      const listed = await kv.list({ prefix, cursor });
      const deletes = listed.keys.map((k) => kv.delete(k.name));
      await Promise.all(deletes);
      deleted += deletes.length;
      listComplete = listed.list_complete;
      if (!listComplete) {
        cursor = (listed as { cursor: string }).cursor;
      }
    }
  } catch (err) {
    console.warn('KV deletePrefix failed:', prefix, err);
  }
  return deleted;
}

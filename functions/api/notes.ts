import {
  getRuntimeConfig,
  getClientInstance,
  jsonResponse,
  Env,
  getCachePrefix,
  kvGetJson,
  kvPutJson,
  kvDelete,
} from '../_shared';
import { fetchAllNotes, saveNoteToWebDAV } from '../_webdav';

// GET /api/notes
export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  try {
    const runtimeCfg = getRuntimeConfig(request, env);
    const prefix = getCachePrefix(runtimeCfg);
    const cacheKey = `${prefix}:notes:list`;

    // 1. 优先读 KV 缓存
    const cached = await kvGetJson<{ notes: any[] }>(env, cacheKey);
    if (cached && Array.isArray(cached.notes)) {
      return jsonResponse({ success: true, notes: cached.notes, cached: true });
    }

    // 2. 缓存未命中 -> 回源 WebDAV
    const client = getClientInstance(runtimeCfg);
    const notes = await fetchAllNotes(client, runtimeCfg.path);

    // 3. 异步回填缓存（不 await 阻塞响应）
    // 注意：如果 notes 非空才缓存，避免空值反复回源。不过也缓存空，防止不存在误判
    kvPutJson(env, cacheKey, { notes }).catch(() => undefined);

    return jsonResponse({ success: true, notes });
  } catch (err) {
    console.error('Error fetching notes:', err);
    return jsonResponse({ success: false, message: '获取笔记失败', notes: [] }, 500);
  }
}

// POST /api/notes
export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  try {
    const note = await request.json() as any;
    if (!note || !note.id || note.title === undefined) {
      return jsonResponse({ success: false, message: '无效的笔记数据' }, 400);
    }

    note.updatedAt = new Date().toISOString();
    if (!note.createdAt) {
      note.createdAt = note.updatedAt;
    }

    const runtimeCfg = getRuntimeConfig(request, env);
    const client = getClientInstance(runtimeCfg);
    const saved = await saveNoteToWebDAV(client, note, runtimeCfg.path);

    // 写入成功 -> 失效 notes list 缓存，下次 GET 会重新拉取最新
    const prefix = getCachePrefix(runtimeCfg);
    kvDelete(env, `${prefix}:notes:list`).catch(() => undefined);

    return jsonResponse({
      success: true,
      message: saved ? '已成功保存至 WebDAV 存储' : '保存失败（WebDAV 未配置）',
      note,
    });
  } catch (err) {
    console.error('Error saving note:', err);
    return jsonResponse({ success: false, message: '保存笔记失败' }, 500);
  }
}

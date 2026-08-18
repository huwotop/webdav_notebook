import {
  getRuntimeConfig,
  getClientInstance,
  jsonResponse,
  Env,
  getCachePrefix,
  kvDelete,
} from '../../_shared';
import {
  deleteNoteFromWebDAV,
  fetchAllNotes,
  extractMediaFilenamesFromNote,
} from '../../_webdav';

export async function onRequestDelete(context: EventContext<Env, any, any>) {
  const { request, env, params } = context;
  try {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      return jsonResponse({ success: false, message: '缺失笔记ID' }, 400);
    }

    const runtimeCfg = getRuntimeConfig(request, env);
    const client = getClientInstance(runtimeCfg);
    const prefix = getCachePrefix(runtimeCfg);

    // 先找到这篇笔记引用的附件文件名，稍后一起清缓存
    let relatedMediaFilenames: Set<string> = new Set();
    try {
      const allNotes = client ? await fetchAllNotes(client, runtimeCfg.path) : [];
      const targetNote = allNotes.find((n: any) => n.id === id);
      if (targetNote) {
        relatedMediaFilenames = extractMediaFilenamesFromNote(targetNote);
      }
    } catch (_) {}

    await deleteNoteFromWebDAV(client, id, runtimeCfg.path);

    // 失效 notes list 缓存
    kvDelete(env, `${prefix}:notes:list`).catch(() => undefined);

    // 失效关联的 media 缓存（异步，不阻塞响应）
    if (relatedMediaFilenames.size > 0) {
      Promise.all(
        [...relatedMediaFilenames].map((fn) =>
          kvDelete(env, `${prefix}:media:${fn}`)
        )
      ).catch(() => undefined);
    }

    return jsonResponse({ success: true, message: '笔记已成功删除' });
  } catch (err) {
    console.error('Error deleting note:', err);
    return jsonResponse({ success: false, message: '删除笔记失败' }, 500);
  }
}

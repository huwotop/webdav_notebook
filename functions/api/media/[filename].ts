import {
  getRuntimeConfig,
  getClientInstance,
  jsonResponse,
  Env,
  getCachePrefix,
  kvGetBuffer,
  kvPutBuffer,
  kvDelete,
} from '../../_shared';
import { getAttachmentFile, deleteAttachmentFromWebDAV } from '../../_webdav';

// GET /api/media/:filename
export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { request, env, params } = context;
  try {
    const filename = Array.isArray(params.filename) ? params.filename[0] : params.filename;
    if (!filename) {
      return new Response('Filename required', { status: 400 });
    }

    const runtimeCfg = getRuntimeConfig(request, env);
    const prefix = getCachePrefix(runtimeCfg);
    const cacheKey = `${prefix}:media:${filename}`;

    // 1. 优先从 KV 取缓存
    const cached = await kvGetBuffer(env, cacheKey);
    if (cached && cached.buffer && cached.buffer.byteLength > 0) {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      let contentType = cached.mimeType;
      if (!contentType) {
        contentType = 'application/octet-stream';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
          contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        } else if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
          contentType = `video/${ext}`;
        } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
          contentType = `audio/${ext}`;
        } else if (ext === 'pdf') {
          contentType = 'application/pdf';
        }
      }
      return new Response(cached.buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-KV-Cache': 'HIT',
        },
      });
    }

    // 2. 缓存未命中 -> 回源 WebDAV
    const client = getClientInstance(runtimeCfg);
    const fileResult = await getAttachmentFile(client, filename, runtimeCfg.path);

    if (!fileResult) {
      return new Response('File not found', { status: 404 });
    }

    // Guess content type by extension
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    } else if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
      contentType = `video/${ext}`;
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      contentType = `audio/${ext}`;
    } else if (ext === 'pdf') {
      contentType = 'application/pdf';
    }

    // 3. 回填 KV 缓存（异步，不阻塞响应）
    kvPutBuffer(env, cacheKey, fileResult.buffer, contentType).catch(() => undefined);

    return new Response(fileResult.buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-KV-Cache': 'MISS',
      },
    });
  } catch (err) {
    console.error('Error serving media file:', err);
    return new Response('Error serving file', { status: 500 });
  }
}

// DELETE /api/media/:filename
export async function onRequestDelete(context: EventContext<Env, any, any>) {
  const { request, env, params } = context;
  try {
    const filename = Array.isArray(params.filename) ? params.filename[0] : params.filename;
    if (!filename) {
      return jsonResponse({ success: false, message: '缺失文件名' }, 400);
    }

    const runtimeCfg = getRuntimeConfig(request, env);
    const client = getClientInstance(runtimeCfg);
    await deleteAttachmentFromWebDAV(client, filename, runtimeCfg.path);

    // 删除对应 KV 缓存（异步，不阻塞）
    const prefix = getCachePrefix(runtimeCfg);
    kvDelete(env, `${prefix}:media:${filename}`).catch(() => undefined);

    return jsonResponse({ success: true, message: '附件文件已从 WebDAV 删除' });
  } catch (err) {
    console.error('Error deleting attachment:', err);
    return jsonResponse({ success: false, message: '删除附件失败' }, 500);
  }
}

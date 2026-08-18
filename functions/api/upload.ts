import {
  getRuntimeConfig,
  getClientInstance,
  jsonResponse,
  Env,
  getCachePrefix,
  kvPutBuffer,
  kvDelete,
} from '../_shared';
import { uploadAttachmentToWebDAV } from '../_webdav';

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return jsonResponse({ success: false, message: '没有接收到上传文件' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const runtimeCfg = getRuntimeConfig(request, env);
    const client = getClientInstance(runtimeCfg);

    const attachment = await uploadAttachmentToWebDAV(
      client,
      arrayBuffer,
      file.name,
      file.type,
      runtimeCfg.path
    );

    // 预热 KV 缓存：刚上传的文件直接写入 KV，下次 GET /api/media/:filename 直接命中
    if (attachment && attachment.filename) {
      const prefix = getCachePrefix(runtimeCfg);
      kvPutBuffer(env, `${prefix}:media:${attachment.filename}`, arrayBuffer, attachment.mimeType)
        .catch(() => undefined);

      // 附件列表变了，这里不失效 notes list 缓存（不影响列表本身，引用关系需要保存笔记时再失效）
      // 但为了防止旧笔记缓存缺少新附件，清理一下 notes list 是更稳妥的方案
      kvDelete(env, `${prefix}:notes:list`).catch(() => undefined);
    }

    return jsonResponse({
      success: true,
      message: '附件上传成功并已同步至 WebDAV',
      attachment,
    });
  } catch (err) {
    console.error('Error uploading attachment:', err);
    return jsonResponse({ success: false, message: `上传失败: ${(err as Error).message}` }, 500);
  }
}

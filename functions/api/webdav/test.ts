import { getRuntimeConfig, jsonResponse } from '../../_shared';
import { testWebDAVConnection } from '../../_webdav';
export async function onRequestPost(context: EventContext<{ WEBDAV_URL?: string; WEBDAV_USERNAME?: string; WEBDAV_PASSWORD?: string; WEBDAV_PATH?: string }, any, any>) {
  const { request, env } = context;
  const body = await request.json() as any;
  const runtimeCfg = getRuntimeConfig(request, env);

  const { url, username, password, path: subPath } = body;
  const targetUrl = url || runtimeCfg.url;
  const targetUser = username !== undefined ? username : runtimeCfg.username;
  const targetPass = password !== undefined ? password : runtimeCfg.password;
  const targetPath = subPath || runtimeCfg.path;

  if (!targetUrl) {
    return jsonResponse({ success: false, message: '未设置 WebDAV 地址' });
  }

  const result = await testWebDAVConnection(targetUrl, targetUser, targetPass, targetPath);
  return jsonResponse(result);
}

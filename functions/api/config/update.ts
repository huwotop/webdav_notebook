import { getEnvConfig, setRuntimeConfigCookie, jsonResponse } from '../../_shared';
import { testWebDAVConnection } from '../../_webdav';

export async function onRequestPost(context: EventContext<{ WEBDAV_URL?: string; WEBDAV_USERNAME?: string; WEBDAV_PASSWORD?: string; WEBDAV_PATH?: string }, any, any>) {
  const { request, env } = context;
  const envCfg = getEnvConfig(env);

  // If env variables set WebDAV URL, disallow override
  if (envCfg.url) {
    return jsonResponse({ success: false, message: '系统已通过环境变量预设 WebDAV 配置，不可在此修改。' }, 400);
  }

  const body = await request.json() as any;
  const { url, username, password, path: subPath } = body;

  if (!url) {
    return jsonResponse({ success: false, message: 'WebDAV 地址不能为空' }, 400);
  }

  // Test connection first
  const testRes = await testWebDAVConnection(url, username, password, subPath || '/WebDAV-Notes');
  if (!testRes.success) {
    return jsonResponse(testRes, 400);
  }

  const newCfg = {
    url: url.trim(),
    username: (username || '').trim(),
    password: password || '',
    path: (subPath || '/WebDAV-Notes').trim(),
  };

  const response = jsonResponse({
    success: true,
    message: 'WebDAV 配置更新成功，已连通存储！',
    config: {
      url: newCfg.url,
      username: newCfg.username,
      path: newCfg.path,
    },
  });

  setRuntimeConfigCookie(response, newCfg);
  return response;
}

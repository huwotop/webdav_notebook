import { getEnvConfig, getRuntimeConfig, getExpectedAccessPassword, jsonResponse } from '../_shared';

export async function onRequestGet(context: EventContext<{ WEBDAV_URL?: string; WEBDAV_USERNAME?: string; WEBDAV_PASSWORD?: string; WEBDAV_PATH?: string; SITE_NAME?: string; AUTH_PASSWORD?: string; LOCK_PASSWORD?: string }, any, any>) {
  const { request, env } = context;
  const envCfg = getEnvConfig(env);
  const runtimeCfg = getRuntimeConfig(request, env);

  const siteName = env.SITE_NAME || '云端网络记事本';
  const hasWebDavEnv = Boolean(env.WEBDAV_URL);
  const hasAuthPassword = Boolean(env.AUTH_PASSWORD || env.LOCK_PASSWORD);

  const data = {
    siteName,
    webdavUrl: envCfg.url || runtimeCfg.url,
    webdavUsername: envCfg.username || runtimeCfg.username,
    hasWebDavEnv,
    hasAuthPassword,
    defaultPath: runtimeCfg.path || envCfg.path || '/WebDAV-Notes',
    isConfigured: Boolean(runtimeCfg.url || envCfg.url),
  };

  return jsonResponse(data);
}

import { getEnvConfig, getExpectedAccessPassword, getRuntimeConfig, setRuntimeConfigCookie, setAuthTokenCookie, jsonResponse } from '../../_shared';

export async function onRequestPost(context: EventContext<{ WEBDAV_URL?: string; WEBDAV_USERNAME?: string; WEBDAV_PASSWORD?: string; WEBDAV_PATH?: string; AUTH_PASSWORD?: string; LOCK_PASSWORD?: string }, any, any>) {
  const { request, env } = context;
  const body = await request.json() as any;
  const { password } = body;
  const inputPassword = (password || '').trim();

  const envCfg = getEnvConfig(env);
  const runtimeCfg = getRuntimeConfig(request, env);
  const envUrl = envCfg.url || runtimeCfg.url;
  const envUser = envCfg.username || runtimeCfg.username;
  const envPass = envCfg.password || runtimeCfg.password;

  // 1. Check AUTH_PASSWORD / LOCK_PASSWORD from env
  const expectedAccessPass = getExpectedAccessPassword(env);
  if (expectedAccessPass) {
    if (inputPassword === expectedAccessPass) {
      const sessionToken = btoa(`${Date.now()}:auth_ok`);
      const response = jsonResponse({
        success: true,
        token: sessionToken,
        message: '访问密码验证成功！',
        webdavUrl: envUrl,
      });
      setAuthTokenCookie(response, sessionToken);

      // Merge env config if available
      const finalCfg = {
        url: envUrl || runtimeCfg.url,
        username: envUser || runtimeCfg.username,
        password: envPass || runtimeCfg.password,
        path: runtimeCfg.path || envCfg.path || '/WebDAV-Notes',
      };
      setRuntimeConfigCookie(response, finalCfg);
      return response;
    } else {
      return jsonResponse({
        success: false,
        message: '访问密码错误，请重新输入。',
      }, 401);
    }
  }

  // 2. If AUTH_PASSWORD not set but WEBDAV_PASSWORD is
  if (envPass && envPass.trim().length > 0) {
    if (inputPassword === envPass.trim()) {
      const sessionToken = btoa(`${Date.now()}:auth_ok`);
      const response = jsonResponse({
        success: true,
        token: sessionToken,
        message: '访问密码验证成功！',
        webdavUrl: envUrl,
      });
      setAuthTokenCookie(response, sessionToken);

      const finalCfg = {
        url: envUrl || runtimeCfg.url,
        username: envUser || runtimeCfg.username,
        password: envPass || runtimeCfg.password,
        path: runtimeCfg.path || envCfg.path || '/WebDAV-Notes',
      };
      setRuntimeConfigCookie(response, finalCfg);
      return response;
    } else {
      return jsonResponse({
        success: false,
        message: '访问密码错误，请重新输入。',
      }, 401);
    }
  }

  // 3. No password required
  const sessionToken = btoa(`${Date.now()}:auth_ok`);
  const response = jsonResponse({
    success: true,
    token: sessionToken,
    message: '验证通过，已进入记事本。',
    webdavUrl: envUrl,
  });
  setAuthTokenCookie(response, sessionToken);
  return response;
}

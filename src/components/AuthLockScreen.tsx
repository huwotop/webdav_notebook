import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle, Github } from 'lucide-react';

interface Props {
  siteName: string;
  hasWebDavEnv: boolean;
  onLogin: (data: { password: string }) => Promise<{ success: boolean; message: string }>;
}

export const AuthLockScreen: React.FC<Props> = ({
  siteName,
  hasWebDavEnv,
  onLogin,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password.trim()) {
      setErrorMsg('请输入访问密码');
      return;
    }

    setLoading(true);
    try {
      const res = await onLogin({ password: password.trim() });
      if (!res.success) {
        setErrorMsg(res.message || '访问密码错误，请重新输入');
      }
    } catch (err) {
      setErrorMsg('网络请求异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors">
      {/* Background aesthetic shapes */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/90 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-xl dark:shadow-2xl p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30 mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{siteName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hasWebDavEnv ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 已连接 WebDAV 同步存储
              </span>
            ) : (
              '请输入访问密码进入云端网络记事本'
            )}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              访问密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入访问密码"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-900/80 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                title={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-normal">
              请输入在容器环境变量 <code className="text-blue-600 dark:text-blue-300 bg-slate-100 dark:bg-slate-900/80 px-1.5 py-0.5 rounded">AUTH_PASSWORD</code> 中配置的访问密码。
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在验证密码...
              </>
            ) : (
              <>
                进入网络记事本
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="text-slate-500 dark:text-slate-400">数据安全同步至个人 WebDAV</span>
          <span className="text-slate-400 dark:text-slate-500">v1.3.0</span>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 max-w-sm space-y-2">
        <p>支持 Docker 容器化一键部署与私有服务器，无需复杂数据库，轻松打造独立私有网络记事本。</p>
        <div className="pt-2 flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
          <span>作者：<span className="text-slate-700 dark:text-slate-300 font-medium">可乐虎</span></span>
          <span>•</span>
          <a
            href="https://github.com/huwotop/webdav_notebook"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <Github className="w-3.5 h-3.5 inline" />
            <span>webdav_notebook</span>
          </a>
        </div>
      </div>
    </div>
  );
};

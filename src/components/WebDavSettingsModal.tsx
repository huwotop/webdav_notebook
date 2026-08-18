import React, { useState } from 'react';
import {
  X,
  Server,
  Key,
  User,
  Folder,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Globe,
  Copy,
  Check,
  Shield,
  Code,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: {
    url: string;
    username: string;
    path: string;
  };
  onSaveConfig: (cfg: {
    url: string;
    username: string;
    password?: string;
    path: string;
  }) => Promise<{ success: boolean; message: string }>;
}

export const WebDavSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}) => {
  const [url, setUrl] = useState(currentConfig.url || '');
  const [username, setUsername] = useState(currentConfig.username || '');
  const [password, setPassword] = useState('');
  const [subPath, setSubPath] = useState(currentConfig.path || '/WebDAV-Notes');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedVar, setCopiedVar] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webdav/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, username, password, path: subPath }),
      });
      const data = await res.json() as any;
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: '测试异常: 网络未能响应' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const res = await onSaveConfig({ url, username, password, path: subPath });
      setTestResult(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setTestResult({ success: false, message: '保存配置异常' });
    } finally {
      setSaving(false);
    }
  };

  const copyEnvSnippet = () => {
    const snippet = `WEBDAV_URL="${url}"\nWEBDAV_USERNAME="${username}"\nWEBDAV_PASSWORD="${password || 'your_password'}"\nWEBDAV_PATH="${subPath}"\nSITE_NAME="云端网络记事本"`;
    navigator.clipboard.writeText(snippet);
    setCopiedVar(true);
    setTimeout(() => setCopiedVar(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">WebDAV 存储服务设置</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              WebDAV 服务器 URL 地址 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="例如：https://dav.jianguoyun.com/dav/"
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              支持坚果云 WebDAV、Nextcloud、ownCloud、InfiniCLOUD、群晖 Synology WebDAV 等。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                WebDAV 账号
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名 / 邮箱"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                应用独立密码 / Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="留空则保留原密码"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              WebDAV 存储子目录路径
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subPath}
                onChange={(e) => setSubPath(e.target.value)}
                placeholder="/WebDAV-Notes"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Docker & Env configuration tips */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-300">
              <span className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> 容器环境变量
              </span>
              <button
                type="button"
                onClick={copyEnvSnippet}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedVar ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedVar ? '已复制' : '复制变量'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              使用 Docker 或 docker-compose 部署时，可在环境变量中预设上述参数实现容器启动即免密/自动连接 WebDAV。
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !url}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              测试存储连接
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-medium cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存并链接'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

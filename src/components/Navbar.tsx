import React from 'react';
import { Plus, Search, Cloud, CloudOff, RefreshCw, Settings, Images, Lock, Menu, BookOpen, Sun, Moon } from 'lucide-react';

interface Props {
  siteName: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
  onOpenMediaLibrary: () => void;
  onLock: () => void;
  isSyncing: boolean;
  webdavConnected: boolean;
  notesCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleSidebarMobile?: () => void;
}

export const Navbar: React.FC<Props> = ({
  siteName,
  searchQuery,
  onSearchChange,
  onNewNote,
  onOpenSettings,
  onOpenMediaLibrary,
  onLock,
  isSyncing,
  webdavConnected,
  notesCount,
  theme,
  onToggleTheme,
  onToggleSidebarMobile,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 px-4 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs dark:shadow-md transition-colors">
      {/* Left: Mobile menu button + Logo & Title */}
      <div className="flex items-center gap-3">
        {onToggleSidebarMobile && (
          <button
            onClick={onToggleSidebarMobile}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="打开导航栏"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-slate-800 dark:text-slate-100 text-base tracking-tight leading-none flex items-center gap-2">
              {siteName}
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60 hidden md:inline-block">
                {notesCount} 篇笔记
              </span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs">
              {isSyncing ? (
                <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> WebDAV 同步中...
                </span>
              ) : webdavConnected ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> WebDAV 已连接
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CloudOff className="w-3 h-3 text-slate-400 dark:text-slate-500" /> WebDAV 未连接
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Search bar */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索笔记标题、正文、标签..."
            className="w-full bg-slate-100 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-slate-800/80 dark:border-slate-700/80 dark:text-slate-100 dark:placeholder-slate-400 rounded-xl pl-9 pr-4 py-1.5 text-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs bg-slate-200 dark:bg-slate-700 rounded-full w-4 h-4 flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Theme toggle button */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-amber-300 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-center"
          title={theme === 'dark' ? '切换为明亮模式' : '切换为暗黑模式'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        <button
          onClick={onNewNote}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm px-2.5 sm:px-3.5 py-1.5 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">新建笔记</span>
          <span className="sm:hidden">新建</span>
        </button>

        <button
          onClick={onOpenMediaLibrary}
          className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
          title="媒体与图片/视频/附件库"
        >
          <Images className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
          title="WebDAV 存储设置"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onLock}
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
          title="锁定网络记事本"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
